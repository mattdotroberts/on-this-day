import { GoogleGenAI, Type, Schema } from '@google/genai';
import type { UserPreferences, ClientBookEntry } from '@/lib/types';
import type { BookEntry } from '@/lib/db/schema';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const COVER_PROMPTS: Record<string, string> = {
  classic: 'Classic antique leather bound history book cover. Elegant, sophisticated, vintage, gold leaf embossing texture, timeless design. Deep rich colors like burgundy, navy, or forest green.',
  minimalist: 'Modern minimalist book cover. Clean typography, plenty of negative space, abstract geometric shapes, high-end design magazine aesthetic. Bauhaus influence.',
  whimsical: 'Whimsical hand-drawn illustration style. Colorful, watercolor or ink textures, magical atmosphere, detailed and charming. Soft pastel or vibrant palette.',
  cinematic: 'Cinematic and dramatic book cover. Realistic lighting, moody atmosphere, movie poster quality, high contrast. Epic scale.',
  retro: 'Retro vintage poster style (1950s-1970s). Bold colors, distressed texture, pop art or mid-century modern influence. Screen print aesthetic.',
};

export interface BatchResult {
  complete: boolean;
  entries: BookEntry[];
  nextMonth: number;
  error?: string;
}

export interface BookPrefs {
  name: string;
  birthYear: number;
  birthMonth: string;
  birthDay: number;
  interests: string[];
  blendLevel: 'focused' | 'diverse';
  coverStyle: string;
}

function getStyleInstruction(age: number): string {
  if (age <= 7) {
    return 'READING LEVEL: EARLY READER (Ages 5-7). Use simple words but make the story long and descriptive (approx 100-150 words). Focus on magical details.';
  } else if (age <= 12) {
    return 'READING LEVEL: MIDDLE GRADE (Ages 8-12). Fun facts, adventurous tone. Length: approx 150-200 words.';
  } else if (age <= 18) {
    return 'READING LEVEL: YOUNG ADULT (Ages 13-18). Engaging, dynamic. Length: approx 200-250 words.';
  } else {
    return "READING LEVEL: ADULT. Sophisticated, witty, and elegant. Style similar to 'The New Yorker'. Length: approx 200-250 words.";
  }
}

function getBlendInstruction(blendLevel: 'focused' | 'diverse'): string {
  if (blendLevel === 'focused') {
    return `
      MODE: SINGULAR FOCUS PER DAY.
      - Each day's entry must focus on EXACTLY ONE interest.
      - **CRITICAL**: You must rotate through ALL the user's interests across the entries. Do not just stick to one.
    `;
  } else {
    return `
      MODE: INTERWOVEN CONNECTIONS.
      - Try to find events where multiple interests overlap (e.g. Science + Art).
      - If no overlap exists for a date, pick one interest and tell it beautifully.
    `;
  }
}

function buildContextSummary(entries: BookEntry[], monthIndex: number): string {
  if (entries.length === 0) {
    return 'This is the first month. No previous entries yet.';
  }

  // Get years covered so far
  const yearsCovered = new Set(entries.map(e => e.year));
  const uniqueYears = Array.from(yearsCovered).slice(-30).join(', ');

  // Get recent headlines for topic reference
  const recentHeadlines = entries.slice(-15).map(e => `${e.day}: ${e.headline}`).join('\n');

  return `
PREVIOUS MONTHS CONTEXT (Months 1-${monthIndex} completed, ${entries.length} entries):

Years already featured: ${uniqueYears}
Recent entries:
${recentHeadlines}

**IMPORTANT**: Do NOT repeat these years or similar topics. Find fresh, unique events.
  `;
}

export async function generateMonthEntries(
  ai: GoogleGenAI,
  prefs: BookPrefs,
  monthIndex: number,
  previousEntries: BookEntry[]
): Promise<ClientBookEntry[]> {
  const monthName = MONTH_NAMES[monthIndex];
  const daysInMonth = DAYS_PER_MONTH[monthIndex];
  const currentYear = new Date().getFullYear();
  const age = currentYear - prefs.birthYear;

  const styleInstruction = getStyleInstruction(age);
  const blendInstruction = getBlendInstruction(prefs.blendLevel);
  const contextSummary = buildContextSummary(previousEntries, monthIndex);

  // Check if birthday is in this month
  const birthdayInThisMonth = prefs.birthMonth === monthName;
  const birthdayInstruction = birthdayInThisMonth
    ? `
**BIRTHDAY ENTRY REQUIRED**:
The entry for **${monthName} ${prefs.birthDay}** MUST be about the specific year **${prefs.birthYear}** (the year they were born).
- Headline: "A Star is Born: ${prefs.name} Arrives!"
- Content: Focus on their birth, but mention one other real event from ${monthName} ${prefs.birthDay}, ${prefs.birthYear} as context.
`
    : '';

  const prompt = `
You are continuing to write "A Year's History Of ${prefs.name}".

**CURRENT TASK**: Generate entries for **${monthName}** (all ${daysInMonth} days: ${monthName} 1 through ${monthName} ${daysInMonth}).

TARGET AUDIENCE:
- Name: ${prefs.name}
- Age: ${age} (Born ${prefs.birthYear})
- Interests: ${prefs.interests.join(', ')}
- Birth Date: ${prefs.birthMonth} ${prefs.birthDay}, ${prefs.birthYear}

${contextSummary}

**CORE RULES:**
1. **GENERATE EXACTLY ${daysInMonth} ENTRIES** - One for EVERY day of ${monthName} (${monthName} 1, ${monthName} 2, ... ${monthName} ${daysInMonth}).

2. **ANY YEAR ALLOWED**: For each day, find the most fascinating historical event from ANY YEAR IN HUMAN HISTORY that relates to the user's interests.
   - Ancient history, medieval times, Renaissance, 1800s, 1900s, recent history - all valid!
   - The goal is the *best possible story* for each calendar day.

3. **AVOID REPETITION**: Do NOT use years or topics from previous months (see context above).

4. **INTEREST DRIVEN**: Every entry must relate to: ${prefs.interests.join(', ')}.

5. **CONTENT LENGTH**: Each 'historyEvent' narrative MUST be substantial (~200-250 words). Paint a vivid scene.

6. **SOURCES**: Provide 1-2 real sources (Wikipedia, Encyclopedia Britannica, Museum links) when available.

${birthdayInstruction}

${styleInstruction}
${blendInstruction}

**OUTPUT**: Return a JSON array of exactly ${daysInMonth} entries, one per day of ${monthName}.
`;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        day: { type: Type.STRING, description: `e.g. ${monthName} 1` },
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
      systemInstruction: `You are a professional biographer and historian writing "A Year's History Of ${prefs.name}". You find fascinating connections between specific dates and personal interests across all of human history. You write in depth and never repeat topics.`,
    },
  });

  if (!response.text) {
    throw new Error('No content generated');
  }

  const entries = JSON.parse(response.text) as ClientBookEntry[];
  return entries;
}

export async function generateBookCover(
  ai: GoogleGenAI,
  prefs: BookPrefs
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        responseModalities: ['image', 'text'],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (error) {
    console.error('Cover generation failed:', error);
    return undefined;
  }
}

export function sortEntriesByDate(entries: BookEntry[]): BookEntry[] {
  return [...entries].sort((a, b) => {
    const dateA = new Date(`${a.day}, 2000`);
    const dateB = new Date(`${b.day}, 2000`);
    const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
    const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
    return timeA - timeB;
  });
}
