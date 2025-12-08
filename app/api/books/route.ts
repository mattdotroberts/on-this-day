import { NextRequest, NextResponse } from 'next/server';
import { db, books, users } from '@/lib/db';
import { stackServerApp, authEnabled } from '@/lib/stack';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { UserPreferences, ClientBookEntry } from '@/lib/types';

// Helper to ensure user exists in local DB
async function ensureUserInDb(user: { id: string; primaryEmail?: string | null; displayName?: string | null }) {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!existingUser) {
    // Create user in local DB
    await db.insert(users).values({
      id: user.id,
      email: user.primaryEmail || `${user.id}@noemail.local`,
      displayName: user.displayName || null,
    }).onConflictDoNothing();
  }
}

// GET /api/books - Get public books or user's books
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const publicOnly = searchParams.get('public') === 'true';

    let query;

    if (publicOnly) {
      // Get public books only
      query = db
        .select()
        .from(books)
        .where(eq(books.isPublic, true))
        .orderBy(desc(books.createdAt))
        .limit(50);
    } else if (userId) {
      // Get user's books (both public and private)
      query = db
        .select()
        .from(books)
        .where(eq(books.userId, userId))
        .orderBy(desc(books.createdAt));
    } else {
      // Get all public books
      query = db
        .select()
        .from(books)
        .where(eq(books.isPublic, true))
        .orderBy(desc(books.createdAt))
        .limit(50);
    }

    const result = await query;

    // Transform to client format
    const clientBooks = result.map((book) => ({
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
      viewCount: book.viewCount,
      birthdayMessage: book.birthdayMessage || undefined,
    }));

    return NextResponse.json(clientBooks);
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}

// POST /api/books - Save a new book
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prefs, entries, coverImage, isPublic = true } = body as {
      prefs: UserPreferences;
      entries: ClientBookEntry[];
      coverImage?: string;
      isPublic?: boolean;
    };

    // Check if user is authenticated
    const user = authEnabled && stackServerApp ? await stackServerApp.getUser() : null;
    let userId: string | null = null;

    if (user) {
      // Ensure user exists in local database before creating book
      await ensureUserInDb(user);
      userId = user.id;
    }

    // Generate share token
    const shareToken = nanoid(12);

    const [newBook] = await db
      .insert(books)
      .values({
        userId,
        name: prefs.name,
        birthYear: parseInt(prefs.birthYear),
        birthMonth: prefs.birthMonth,
        birthDay: parseInt(prefs.birthDay),
        interests: prefs.interests,
        blendLevel: prefs.blendLevel,
        coverStyle: prefs.coverStyle,
        entries,
        coverImageUrl: coverImage,
        birthdayMessage: prefs.birthdayMessage || null,
        isPublic: userId ? isPublic : true, // Guests always public
        shareToken,
      })
      .returning();

    return NextResponse.json({
      id: newBook.id,
      shareToken: newBook.shareToken,
    });
  } catch (error) {
    console.error('Error saving book:', error);
    return NextResponse.json({ error: 'Failed to save book' }, { status: 500 });
  }
}
