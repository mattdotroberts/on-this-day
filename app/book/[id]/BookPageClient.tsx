'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ClientBook, ClientBookEntry } from '@/lib/types';
import { BookPreview } from '@/components/BookPreview';
import { useUser } from '@/lib/auth-client';

interface BookPageClientProps {
  book: ClientBook & { additionalEntryCount?: number };
}

export default function BookPageClient({ book: initialBook }: BookPageClientProps) {
  const router = useRouter();
  const user = useUser();
  const [book, setBook] = useState(initialBook);
  const [entries, setEntries] = useState(initialBook.entries);

  const isOwner = !!(user && book.userId === user.id);

  const handleReset = () => {
    router.push('/');
  };

  const handleUpdateCover = async (bookId: string, newCoverImage: string, newStyle: string) => {
    const updatedBook = {
      ...book,
      prefs: { ...book.prefs, coverStyle: newStyle as any },
      coverImage: newCoverImage,
    };
    setBook(updatedBook);

    await fetch(`/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coverImage: newCoverImage, coverStyle: newStyle }),
    });
  };

  const handleTogglePrivacy = async (bookId: string, isPublic: boolean) => {
    const res = await fetch(`/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic }),
    });

    if (res.ok) {
      setBook({ ...book, isPublic });
    } else {
      throw new Error('Failed to update privacy');
    }
  };

  const handleRegenerateEntry = (index: number, newEntry: ClientBookEntry) => {
    const updatedEntries = [...entries];
    updatedEntries[index] = newEntry;
    setEntries(updatedEntries);
    setBook({ ...book, entries: updatedEntries });
  };

  const handleAddEntry = (index: number, newEntry: ClientBookEntry) => {
    const updatedEntries = [...entries];
    updatedEntries.splice(index, 0, newEntry);
    setEntries(updatedEntries);
    setBook({ ...book, entries: updatedEntries });
  };

  return (
    <BookPreview
      entries={entries}
      prefs={book.prefs}
      coverImage={book.coverImage}
      onReset={handleReset}
      isReadOnly={!isOwner}
      currentBook={book}
      onUpdateCover={isOwner ? handleUpdateCover : undefined}
      onTogglePrivacy={isOwner ? handleTogglePrivacy : undefined}
      onRegenerateEntry={isOwner ? handleRegenerateEntry : undefined}
      onAddEntry={isOwner ? handleAddEntry : undefined}
      additionalEntryCount={initialBook.additionalEntryCount || 0}
      isOwner={isOwner}
    />
  );
}
