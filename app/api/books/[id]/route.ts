import { NextRequest, NextResponse } from 'next/server';
import { db, books } from '@/lib/db';
import { stackServerApp, authEnabled } from '@/lib/stack';
import { eq, or } from 'drizzle-orm';

// Helper to get current user
async function getCurrentUser() {
  if (!authEnabled || !stackServerApp) return null;
  return stackServerApp.getUser();
}

// GET /api/books/[id] - Get a single book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try to find by ID or share token
    const [book] = await db
      .select()
      .from(books)
      .where(or(eq(books.id, id), eq(books.shareToken, id)))
      .limit(1);

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Check access
    const user = await getCurrentUser();
    const isOwner = user && book.userId === user.id;

    if (!book.isPublic && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Increment view count
    if (!isOwner) {
      await db
        .update(books)
        .set({ viewCount: book.viewCount + 1 })
        .where(eq(books.id, book.id));
    }

    // Transform to client format
    const clientBook = {
      id: book.id,
      prefs: {
        name: book.name,
        birthYear: book.birthYear.toString(),
        birthDay: book.birthDay.toString(),
        birthMonth: book.birthMonth,
        interests: book.interests,
        blendLevel: book.blendLevel,
        coverStyle: book.coverStyle,
        birthdayMessage: book.birthdayMessage || undefined,
      },
      entries: book.entries || [],
      createdAt: book.createdAt.getTime(),
      author: book.userId ? 'User' : 'Guest',
      coverImage: book.coverImageUrl,
      isPublic: book.isPublic,
      userId: book.userId,
      viewCount: book.viewCount + (isOwner ? 0 : 1),
      shareToken: isOwner ? book.shareToken : undefined,
      birthdayMessage: book.birthdayMessage || undefined,
      prefaceText: book.prefaceText || undefined,
    };

    return NextResponse.json(clientBook);
  } catch (error) {
    console.error('Error fetching book:', error);
    return NextResponse.json({ error: 'Failed to fetch book' }, { status: 500 });
  }
}

// PATCH /api/books/[id] - Update a book
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check ownership
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [book] = await db.select().from(books).where(eq(books.id, id)).limit(1);

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (book.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update allowed fields
    const updateData: Partial<typeof books.$inferInsert> = {};

    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;
    if (body.coverImage) updateData.coverImageUrl = body.coverImage;
    if (body.coverStyle) updateData.coverStyle = body.coverStyle;
    if (body.prefaceText !== undefined) updateData.prefaceText = body.prefaceText;

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(books)
      .set(updateData)
      .where(eq(books.id, id))
      .returning();

    return NextResponse.json({ success: true, book: updated });
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
  }
}

// DELETE /api/books/[id] - Delete a book
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check ownership
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [book] = await db.select().from(books).where(eq(books.id, id)).limit(1);

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (book.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.delete(books).where(eq(books.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
