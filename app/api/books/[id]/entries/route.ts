import { NextRequest, NextResponse } from 'next/server';
import { db, books } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { stackServerApp, authEnabled } from '@/lib/stack';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import type { BookEntry } from '@/lib/db/schema';
import { MONTHS } from '@/lib/types';

const MAX_ADDITIONAL_ENTRIES = 10;

// POST /api/books/[id]/entries - Add a new entry for a specific date
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { month, day } = body;

    if (!month || !day) {
      return NextResponse.json({ error: 'Month and day are required' }, { status: 400 });
    }

    // Validate month
    if (!MONTHS.includes(month)) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
    }

    // Validate day (1-31)
    const dayNum = parseInt(day, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      return NextResponse.json({ error: 'Invalid day' }, { status: 400 });
    }

    // Get current user
    if (!authEnabled || !stackServerApp) {
      return NextResponse.json({ error: 'Auth not configured - must be logged in to add entries' }, { status: 401 });
    }

    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - must be logged in to add entries' }, { status: 401 });
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

    // Check max additional entries limit
    if (book.additionalEntryCount >= MAX_ADDITIONAL_ENTRIES) {
      return NextResponse.json({
        error: `Maximum of ${MAX_ADDITIONAL_ENTRIES} additional entries reached`
      }, { status: 400 });
    }

    const entries = book.entries || [];
    const dateStr = `${month} ${dayNum}`;

    // Check if entry already exists for this date
    const existingEntry = entries.find(e => {
      const entryDate = e.day.toLowerCase();
      // Parse the entry's day to get exact day number
      const parts = e.day.trim().split(/\s+/);
      const entryDayNum = parseInt(parts.find(p => /^\d+$/.test(p)) || '0', 10);
      const entryMonth = parts.find(p => MONTHS.some(m => m.toLowerCase().startsWith(p.toLowerCase())));

      // Match both month and exact day number
      return entryMonth?.toLowerCase().startsWith(month.toLowerCase().slice(0, 3)) && entryDayNum === dayNum;
    });

    if (existingEntry) {
      return NextResponse.json({
        error: `An entry already exists for ${dateStr}. Use regenerate instead.`
      }, { status: 400 });
    }

    // Set up Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a historian creating a personalized history book for someone named ${book.name}, born in ${book.birthYear}.
Their interests are: ${book.interests.join(', ')}.

Generate a historical event that happened on ${dateStr} (any year in history) that connects to their interests.

Return a single entry with these fields:
- day: "${dateStr}"
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

    // Insert entry in correct calendar order
    const monthIndex = MONTHS.indexOf(month);
    let insertIndex = entries.length;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      // Parse existing entry's date
      const parts = entry.day.trim().split(' ');
      const entryMonth = parts.find(p => MONTHS.some(m => m.toLowerCase().startsWith(p.toLowerCase())));
      const entryDay = parseInt(parts.find(p => /^\d+$/.test(p)) || '0', 10);

      if (entryMonth) {
        const entryMonthIndex = MONTHS.findIndex(m => m.toLowerCase().startsWith(entryMonth.toLowerCase()));

        // If new entry should come before this one
        if (monthIndex < entryMonthIndex || (monthIndex === entryMonthIndex && dayNum < entryDay)) {
          insertIndex = i;
          break;
        }
      }
    }

    // Insert at correct position
    const updatedEntries = [...entries];
    updatedEntries.splice(insertIndex, 0, newEntry);

    // Save to database
    await db
      .update(books)
      .set({
        entries: updatedEntries,
        additionalEntryCount: book.additionalEntryCount + 1,
        updatedAt: new Date()
      })
      .where(eq(books.id, id));

    return NextResponse.json({
      entry: newEntry,
      index: insertIndex,
      additionalEntryCount: book.additionalEntryCount + 1,
      remaining: MAX_ADDITIONAL_ENTRIES - (book.additionalEntryCount + 1)
    });
  } catch (error) {
    console.error('Error adding entry:', error);
    return NextResponse.json({ error: 'Failed to add entry' }, { status: 500 });
  }
}
