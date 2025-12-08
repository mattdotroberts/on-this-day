import { Metadata } from 'next';
import { db, books } from '@/lib/db';
import { eq, or } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import SharePageClient from './SharePageClient';

interface SharePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ entry?: string }>;
}

// Fetch book data for both metadata and page
async function getBook(id: string) {
  const [book] = await db
    .select()
    .from(books)
    .where(or(eq(books.id, id), eq(books.shareToken, id)))
    .limit(1);

  return book;
}

// Generate dynamic Open Graph metadata
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { id } = await params;
  const book = await getBook(id);

  if (!book) {
    return {
      title: 'Book Not Found',
    };
  }

  const title = `${book.name}'s Year in History`;
  const description = `Explore ${book.name}'s personalized history book with ${book.entries?.length || 0} historical events connected to their interests: ${book.interests.slice(0, 3).join(', ')}${book.interests.length > 3 ? '...' : ''}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'book',
      images: book.coverImageUrl ? [
        {
          url: book.coverImageUrl,
          width: 1200,
          height: 630,
          alt: `${book.name}'s History Book Cover`,
        }
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: book.coverImageUrl ? [book.coverImageUrl] : [],
    },
  };
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const { id } = await params;
  const { entry } = await searchParams;
  const book = await getBook(id);

  if (!book || !book.isPublic) {
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
    viewCount: book.viewCount,
    birthdayMessage: book.birthdayMessage || undefined,
  };

  const initialEntryIndex = entry ? parseInt(entry) : undefined;

  return <SharePageClient book={clientBook} initialEntryIndex={initialEntryIndex} />;
}
