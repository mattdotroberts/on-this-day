import { Metadata } from 'next';
import { db, books } from '@/lib/db';
import { eq, or } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import BookPageClient from './BookPageClient';

interface BookPageProps {
  params: Promise<{ id: string }>;
}

// Fetch book data
async function getBook(id: string) {
  const [book] = await db
    .select()
    .from(books)
    .where(or(eq(books.id, id), eq(books.shareToken, id)))
    .limit(1);

  return book;
}

// Generate dynamic metadata
export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { id } = await params;
  const book = await getBook(id);

  if (!book) {
    return {
      title: 'Book Not Found',
    };
  }

  return {
    title: `${book.name}'s Year in History`,
    description: `A personalized history book for ${book.name}`,
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;
  const book = await getBook(id);

  if (!book) {
    notFound();
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
    coverImage: book.coverImageUrl || undefined,
    isPublic: book.isPublic,
    userId: book.userId || undefined,
    viewCount: book.viewCount,
    bookType: book.bookType as 'sample' | 'full' | undefined,
    generationStatus: book.generationStatus as 'pending' | 'generating' | 'complete' | 'failed' | undefined,
    birthdayMessage: book.birthdayMessage || undefined,
    additionalEntryCount: book.additionalEntryCount || 0,
    prefaceText: book.prefaceText || undefined,
  };

  return <BookPageClient book={clientBook} />;
}
