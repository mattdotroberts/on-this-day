import { NextRequest, NextResponse } from 'next/server';
import { db, books } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { stackServerApp, authEnabled } from '@/lib/stack';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import type { BookEntry } from '@/lib/db/schema';

// POST /api/books/[id]/entries/[index]/regenerate - Regenerate a single entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  try {
    const { id, index } = await params;
    const entryIndex = parseInt(index, 10);

    if (isNaN(entryIndex) || entryIndex < 0) {
      return NextResponse.json({ error: 'Invalid entry index' }, { status: 400 });
    }

    // Get current user
    if (!authEnabled || !stackServerApp) {
      return NextResponse.json({ error: 'Auth not configured' }, { status: 401 });
    }

    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the book
    const [book] = await db
      .select()
      .from(books)
      .where(eq(books.id, id))
      .limit(1);

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Check ownership
    if (book.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const entries = book.entries || [];
    if (entryIndex >= entries.length) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const oldEntry = entries[entryIndex];

    // Set up Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a historian creating a personalized history book for someone named ${book.name}, born in ${book.birthYear}.
Their interests are: ${book.interests.join(', ')}.

Generate a DIFFERENT historical event for ${oldEntry.day} (any year in history) that connects to their interests.
The current entry is about "${oldEntry.headline}" - please generate something COMPLETELY DIFFERENT.

Return a single entry with these fields:
- day: "${oldEntry.day}"
- year: the year of the event (as string)
- headline: catchy 3-8 word headline
- historyEvent: 2-3 paragraphs about this historical event, written engagingly for someone born in ${book.birthYear}
- whyIncluded: brief reason why this connects to their interests
- nameLink: optional connection to the name ${book.name}, or null if no natural connection
- sources: array of objects with title and url`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        day: { type: Type.STRING },
        year: { type: Type.STRING },
        headline: { type: Type.STRING },
        historyEvent: { type: Type.STRING },
        whyIncluded: { type: Type.STRING },
        nameLink: { type: Type.STRING, nullable: true },
        sources: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
            },
            required: ['title', 'url'],
          },
        },
      },
      required: ['day', 'year', 'headline', 'historyEvent', 'whyIncluded'],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        systemInstruction: 'You are a professional biographer and historian. You find fascinating connections between specific dates and personal interests across all of history.',
      },
    });

    if (!response.text) {
      return NextResponse.json({ error: 'No content generated' }, { status: 500 });
    }

    const newEntry = JSON.parse(response.text) as BookEntry;

    // Update the entries array
    const updatedEntries = [...entries];
    updatedEntries[entryIndex] = newEntry;

    // Save to database
    await db
      .update(books)
      .set({ entries: updatedEntries, updatedAt: new Date() })
      .where(eq(books.id, id));

    return NextResponse.json({ entry: newEntry, index: entryIndex });
  } catch (error) {
    console.error('Error regenerating entry:', error);
    return NextResponse.json({ error: 'Failed to regenerate entry' }, { status: 500 });
  }
}
