import { NextRequest, NextResponse } from 'next/server';
import { db, books } from '@/lib/db';
import { eq, or } from 'drizzle-orm';
import Epub from 'epub-gen';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { BookEntry } from '@/lib/db/schema';

// Helper to group entries by month
function groupByMonth(entries: BookEntry[]): Map<string, BookEntry[]> {
  const months = new Map<string, BookEntry[]>();
  const monthOrder = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Initialize all months
  monthOrder.forEach(m => months.set(m, []));

  entries.forEach(entry => {
    const parts = entry.day.trim().split(' ');
    const foundMonth = parts.find(p =>
      monthOrder.some(m => m.toLowerCase().startsWith(p.toLowerCase()))
    );
    if (foundMonth) {
      const normalized = monthOrder.find(m =>
        m.toLowerCase().startsWith(foundMonth.toLowerCase())
      ) || foundMonth;
      const existing = months.get(normalized) || [];
      existing.push(entry);
      months.set(normalized, existing);
    }
  });

  // Remove empty months
  monthOrder.forEach(m => {
    if ((months.get(m) || []).length === 0) {
      months.delete(m);
    }
  });

  return months;
}

// GET /api/books/[id]/epub - Download book as EPUB
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tempPath = join(tmpdir(), `book-${Date.now()}.epub`);

  try {
    const { id } = await params;

    // Find book
    const [book] = await db
      .select()
      .from(books)
      .where(or(eq(books.id, id), eq(books.shareToken, id)))
      .limit(1);

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (!book.isPublic) {
      return NextResponse.json({ error: 'Book is private' }, { status: 403 });
    }

    const entries = book.entries || [];
    const groupedEntries = groupByMonth(entries);

    // Build chapters for EPUB
    const chapters: { title: string; data: string }[] = [];

    // Title page chapter
    chapters.push({
      title: 'Title',
      data: `
        <div style="text-align: center; padding: 3em;">
          <p style="font-style: italic; color: #666;">A Year's History Of</p>
          <h1 style="font-size: 2.5em; margin: 0.5em 0;">${book.name}</h1>
          <p style="color: #888;">Est. ${book.birthYear}</p>
          <hr style="width: 50%; margin: 2em auto; border: none; border-top: 1px solid #ccc;" />
          <p style="font-size: 0.9em; color: #666;">
            A personalized journey through history,<br/>
            connecting ${book.name}'s story to moments that shaped the world.
          </p>
        </div>
      `
    });

    // Add chapters by month
    groupedEntries.forEach((monthEntries, month) => {
      let chapterContent = `<h1>${month}</h1>`;

      monthEntries.forEach((entry) => {
        chapterContent += `
          <div style="margin-bottom: 2em; page-break-inside: avoid;">
            <h2 style="margin-bottom: 0.3em;">${entry.headline}</h2>
            <p style="font-style: italic; color: #666; margin-bottom: 1em;">
              ${entry.day}, ${entry.year}
            </p>
            <p style="text-align: justify; line-height: 1.6;">
              ${entry.historyEvent}
            </p>
            ${entry.nameLink ? `
              <p style="font-size: 0.9em; color: #555; margin-top: 1em; padding-left: 1em; border-left: 2px solid #ccc;">
                <strong>Name Connection:</strong> ${entry.nameLink}
              </p>
            ` : ''}
            <p style="text-align: center; font-size: 0.8em; color: #888; margin-top: 1em;">
              ~ ${entry.whyIncluded} ~
            </p>
            ${entry.sources && entry.sources.length > 0 ? `
              <p style="font-size: 0.8em; color: #999; margin-top: 0.5em;">
                Sources: ${entry.sources.map(s => s.title).join(', ')}
              </p>
            ` : ''}
          </div>
        `;
      });

      chapters.push({
        title: month,
        data: chapterContent
      });
    });

    // Generate EPUB to temp file
    await new Epub({
      title: `${book.name}'s Year in History`,
      author: "A Year's History Of",
      description: `A personalized history book for ${book.name}, connecting historical events to their interests: ${book.interests.join(', ')}.`,
      publisher: "A Year's History Of",
      tocTitle: 'Table of Contents',
      appendChapterTitles: false,
      content: chapters,
      output: tempPath,
    }).promise;

    // Read the file and return it
    const epubBuffer = await fs.readFile(tempPath);

    // Clean up temp file
    await fs.unlink(tempPath).catch(() => {});

    // Return EPUB file
    return new NextResponse(epubBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': `attachment; filename="${book.name}-year-in-history.epub"`,
      },
    });

  } catch (error) {
    console.error('Error generating EPUB:', error);
    // Clean up temp file on error
    await fs.unlink(tempPath).catch(() => {});
    return NextResponse.json({ error: 'Failed to generate EPUB' }, { status: 500 });
  }
}
