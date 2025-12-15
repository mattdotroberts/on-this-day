import { NextRequest, NextResponse } from 'next/server';
import { db, books } from '@/lib/db';
import { eq, or } from 'drizzle-orm';
import { generateEpub, type EpubChapter } from '@/lib/epub-generator';
import type { BookEntry } from '@/lib/db/schema';
import { logError } from '@/lib/log-error';

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

// Escape HTML for safe inclusion in XHTML
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// GET /api/books/[id]/epub - Download book as EPUB
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
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
    const chapters: EpubChapter[] = [];

    // Title page chapter
    chapters.push({
      title: 'Title',
      content: `
<div class="title-page">
  <p class="subtitle">A Year's History Of</p>
  <h1>${escapeHtml(book.name)}</h1>
  <p class="date">Est. ${book.birthYear}</p>
  <hr/>
  <p class="subtitle">
    A personalized journey through history,<br/>
    connecting ${escapeHtml(book.name)}'s story to moments that shaped the world.
  </p>
</div>
      `
    });

    // Add chapters by month
    groupedEntries.forEach((monthEntries, month) => {
      let chapterContent = `<h1>${month}</h1>`;

      monthEntries.forEach((entry) => {
        chapterContent += `
<div style="margin-bottom: 2em;">
  <h2>${escapeHtml(entry.headline)}</h2>
  <p class="date">${escapeHtml(entry.day)}, ${entry.year}</p>
  <p>${escapeHtml(entry.historyEvent)}</p>
  ${entry.nameLink ? `
  <p class="name-connection">
    <strong>Name Connection:</strong> ${escapeHtml(entry.nameLink)}
  </p>
  ` : ''}
  ${entry.sources && entry.sources.length > 0 ? `
  <p class="sources">
    Sources: ${entry.sources.map(s => escapeHtml(s.title)).join(', ')}
  </p>
  ` : ''}
</div>
        `;
      });

      chapters.push({
        title: month,
        content: chapterContent
      });
    });

    // Generate EPUB in memory
    const epubBuffer = await generateEpub(
      {
        title: `${book.name}'s Year in History`,
        author: "A Year's History Of",
        description: `A personalized history book for ${book.name}, connecting historical events to their interests: ${book.interests.join(', ')}.`,
        publisher: "A Year's History Of",
        language: 'en',
      },
      chapters
    );

    // Return EPUB file
    return new NextResponse(epubBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': `attachment; filename="${book.name}-year-in-history.epub"`,
      },
    });

  } catch (error) {
    // Log error to database for monitoring
    await logError('epub', error, { bookId: id });

    console.error('Error generating EPUB:', error);
    return NextResponse.json({ error: 'Failed to generate EPUB' }, { status: 500 });
  }
}
