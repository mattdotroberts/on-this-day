import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { db, books, generationJobs, users } from '@/lib/db';
import { stackServerApp, authEnabled } from '@/lib/stack';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import type { UserPreferences, ClientBookEntry } from '@/lib/types';

// Helper to ensure user exists in local DB
async function ensureUserInDb(user: { id: string; primaryEmail?: string | null; displayName?: string | null }) {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!existingUser) {
    await db.insert(users).values({
      id: user.id,
      email: user.primaryEmail || `${user.id}@noemail.local`,
      displayName: user.displayName || null,
    }).onConflictDoNothing();
  }
}

const COVER_PROMPTS: Record<string, string> = {
  classic: 'Classic antique leather bound history book cover. Elegant, sophisticated, vintage, gold leaf embossing texture, timeless design. Deep rich colors like burgundy, navy, or forest green.',
  minimalist: 'Modern minimalist book cover. Clean typography, plenty of negative space, abstract geometric shapes, high-end design magazine aesthetic. Bauhaus influence.',
  whimsical: 'Whimsical hand-drawn illustration style. Colorful, watercolor or ink textures, magical atmosphere, detailed and charming. Soft pastel or vibrant palette.',
  cinematic: 'Cinematic and dramatic book cover. Realistic lighting, moody atmosphere, movie poster quality, high contrast. Epic scale.',
  retro: 'Retro vintage poster style (1950s-1970s). Bold colors, distressed texture, pop art or mid-century modern influence. Screen print aesthetic.',
};

// Helper to get current user
async function getCurrentUser() {
  if (!authEnabled || !stackServerApp) return null;
  return stackServerApp.getUser();
}

export async function POST(request: NextRequest) {
  try {
    const prefs: UserPreferences = await request.json();
    const { searchParams } = new URL(request.url);
    const bookType = searchParams.get('type') || 'sample';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Full book generation requires authentication
    if (bookType === 'full') {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required for full books' },
          { status: 401 }
        );
      }

      // Ensure user exists in local database
      await ensureUserInDb(user);

      // Create book record with 'generating' status
      const shareToken = nanoid(12);
      const [book] = await db
        .insert(books)
        .values({
          userId: user.id,
          name: prefs.name,
          birthYear: parseInt(prefs.birthYear),
          birthMonth: prefs.birthMonth,
          birthDay: parseInt(prefs.birthDay),
          interests: prefs.interests,
          blendLevel: prefs.blendLevel,
          coverStyle: prefs.coverStyle,
          bookType: 'full',
          generationStatus: 'generating',
          isPublic: false, // Default to private for full books
          shareToken,
          entries: [],
        })
        .returning();

      // Create job record
      const [job] = await db
        .insert(generationJobs)
        .values({
          bookId: book.id,
          userId: user.id,
          status: 'pending',
        })
        .returning();

      return NextResponse.json({
        bookId: book.id,
        jobId: job.id,
        status: 'queued',
        message: 'Your full book is being generated. You will receive an email when complete.',
      });
    }

    // Sample generation - synchronous (existing logic)
    const ai = new GoogleGenAI({ apiKey });
    const [entries, coverImage] = await Promise.all([
      generateBookEntries(ai, prefs),
      generateBookCover(ai, prefs),
    ]);

    return NextResponse.json({ entries, coverImage });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate book' },
      { status: 500 }
    );
  }
}

async function generateBookEntries(
  ai: GoogleGenAI,
  prefs: UserPreferences
): Promise<ClientBookEntry[]> {
  const birthDay = parseInt(prefs.birthDay) || 1;
  const birthMonth = prefs.birthMonth || 'January';
  const birthYear = parseInt(prefs.birthYear) || 2000;
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  let styleInstruction = '';
  if (age <= 7) {
    styleInstruction = 'READING LEVEL: EARLY READER (Ages 5-7). Use simple words but make the story long and descriptive (approx 100-150 words). Focus on magical details.';
  } else if (age <= 12) {
    styleInstruction = 'READING LEVEL: MIDDLE GRADE (Ages 8-12). Fun facts, adventurous tone. Length: approx 150-200 words.';
  } else if (age <= 18) {
    styleInstruction = 'READING LEVEL: YOUNG ADULT (Ages 13-18). Engaging, dynamic. Length: approx 200-250 words.';
  } else {
    styleInstruction = "READING LEVEL: ADULT. Sophisticated, witty, and elegant. Style similar to 'The New Yorker'. Length: approx 200-250 words.";
  }

  let blendInstruction = '';
  if (prefs.blendLevel === 'focused') {
    blendInstruction = `
      MODE: SINGULAR FOCUS PER DAY.
      - Each day's entry must focus on EXACTLY ONE interest.
      - **CRITICAL**: You must rotate through ALL the user's interests across the book. Do not just stick to one.
      - Example: Jan 1 is about [Interest A], Feb 14 is about [Interest B], Mar 20 is about [Interest A].
    `;
  } else {
    blendInstruction = `
      MODE: INTERWOVEN CONNECTIONS.
      - Try to find events where multiple interests overlap (e.g. Science + Art).
      - If no overlap exists for a date, pick one interest and tell it beautifully.
    `;
  }

  const prompt = `
    You are writing a book titled "A Year's History Of ${prefs.name}".

    TARGET AUDIENCE:
    - Name: ${prefs.name}
    - Age: ${age} (Born ${birthYear})
    - Interests: ${prefs.interests.join(', ')}
    - Birth Date: ${birthMonth} ${birthDay}, ${birthYear}

    **CORE HISTORY RULES (READ CAREFULLY):**
    1. **ANY YEAR ALLOWED**: For the daily entries, you can pick historical events from **ANY YEAR IN HUMAN HISTORY**. You are NOT limited to ${birthYear}.
       - Look for events from Ancient Rome, the Renaissance, the 1920s, or 1000 years ago.
       - The goal is to find the *best possible story* for that calendar day that relates to the user's interests.

    2. **BIRTHDAY EXCEPTION**:
       - The entry for **${birthMonth} ${birthDay}** MUST be about the specific year **${birthYear}** (the year they were born).
       - Headline: "A Star is Born: ${prefs.name} Arrives!"
       - Content: Focus on their birth, but mention one other real event from ${birthMonth} ${birthDay}, ${birthYear} as context.

    3. **INTEREST DRIVEN**:
       - EVERY entry must be directly related to the user's interests.
       - Do not include random general history unless it ties to an interest.

    4. **CONTENT LENGTH**:
       - The 'historyEvent' narrative MUST be substantial (approx 200-250 words).
       - It needs to fill about 50-60% of a book page.
       - Go into detail about the event. Paint a scene. Don't just summarize.

    5. **SOURCES**:
       - Provide 1-2 real sources (Title and URL) for the historical fact if available (e.g. Wikipedia link, Encyclopedia Britannica, or Museum link).

    ${styleInstruction}
    ${blendInstruction}

    TASK:
    Generate a JSON array of 12-15 daily entries covering the calendar year (Jan - Dec).

    **OUTPUT FORMAT**:
    Return strictly a valid JSON array of objects.
  `;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        day: { type: Type.STRING, description: 'e.g. January 1' },
        year: { type: Type.STRING, description: 'The year this event happened, e.g. 1923 or 44 BC' },
        headline: { type: Type.STRING },
        historyEvent: { type: Type.STRING, description: 'Long narrative text, approx 200 words.' },
        nameLink: { type: Type.STRING, nullable: true },
        whyIncluded: { type: Type.STRING },
        sources: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
            },
          },
        },
      },
      required: ['day', 'year', 'headline', 'historyEvent', 'whyIncluded'],
    },
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
      systemInstruction: 'You are a professional biographer and historian. You find fascinating connections between specific dates and personal interests across all of history. You write in depth.',
    },
  });

  if (!response.text) {
    throw new Error('No content generated');
  }

  const entries = JSON.parse(response.text) as ClientBookEntry[];

  // Sort by calendar date
  entries.sort((a, b) => {
    const dateA = new Date(`${a.day}, 2000`);
    const dateB = new Date(`${b.day}, 2000`);
    const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
    const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
    return timeA - timeB;
  });

  return entries;
}

async function generateBookCover(
  ai: GoogleGenAI,
  prefs: UserPreferences
): Promise<string | undefined> {
  const stylePrompt = COVER_PROMPTS[prefs.coverStyle] || COVER_PROMPTS.classic;

  const prompt = `
    A beautiful, high-quality book cover image for a book titled "A Year's History Of ${prefs.name}".

    The cover should visually represent these themes: ${prefs.interests.join(', ')}.

    STYLE: ${stylePrompt}
    FORMAT: Portrait aspect ratio (book cover).

    No text on the image if possible, or very minimal.
  `;

  try {
    // Use Imagen 3 for image generation
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '3:4', // Portrait for book cover
      },
    });

    // Imagen 3 returns images directly
    const image = response.generatedImages?.[0];
    if (image?.image?.imageBytes) {
      return `data:image/png;base64,${image.image.imageBytes}`;
    }
    return undefined;
  } catch (error) {
    console.error('Cover generation failed:', error);
    return undefined;
  }
}
