'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, authEnabled } from '@/lib/auth-client';
import { LandingPage } from '@/components/LandingPage';
import { GeneratorForm, type BookType } from '@/components/GeneratorForm';
import { BookPreview } from '@/components/BookPreview';
import { ProcessingScreen } from '@/components/ProcessingScreen';
import { AuthSection } from '@/components/AuthSection';
import type { UserPreferences, ClientBook, ClientBookEntry } from '@/lib/types';

enum AppState {
  LANDING,
  FORM,
  GENERATING,
  PREVIEW,
}

// Sample books for gallery
const SAMPLE_BOOKS: ClientBook[] = [
  {
    id: 'sample-1',
    createdAt: Date.now() - 10000000,
    author: 'Chronos Team',
    prefs: {
      name: 'Arthur',
      birthYear: '1985',
      birthDay: '12',
      birthMonth: 'March',
      interests: ['Astronomy', 'Jazz', 'Coffee'],
      blendLevel: 'diverse',
      coverStyle: 'cinematic',
    },
    entries: [
      {
        day: 'January 7',
        year: '1610',
        headline: 'Galileo Sees Jupiter',
        historyEvent:
          "In the cold winter of 1610, the Italian astronomer Galileo Galilei pointed his improved telescope towards the mighty planet Jupiter. What he saw changed the course of human history and our understanding of our place in the cosmos. Beside the bright disk of the planet were three faint stars, arranged in a straight line. The following nights revealed a fourth, and as he watched them move, he realized they were not fixed stars at all, but moons orbiting another world. This discovery shattered the Aristotelian belief that all celestial bodies revolved around the Earth. It was the first time in history that satellites were observed orbiting a planet other than our own, providing critical evidence for the Copernican system. The universe had suddenly opened up, revealing a dynamic, moving stage of celestial mechanics that operated on laws we were only beginning to understand.",
        whyIncluded: 'Major Astronomy Event.',
        sources: [
          { title: 'NASA Solar System Exploration', url: 'https://solarsystem.nasa.gov/' },
          { title: 'The Galileo Project', url: 'http://galileo.rice.edu/' },
        ],
      },
      {
        day: 'March 12',
        year: '1985',
        headline: 'A Star is Born: Arthur Arrives!',
        historyEvent:
          "On this Tuesday in 1985, the world turned on its axis just as it always had, but for one family, gravity shifted entirely. It was a year of transition; Mikhail Gorbachev had become the leader of the Soviet Union only the day before, signaling the beginning of the end of the Cold War. 'We Are the World' was being recorded to aid Africa, and the first .com domain name was registered. Amidst this global backdrop of technological and political change, a new life entered the scene. Arthur was born, bringing a light brighter than any comet. While historians recorded the treaties and the charts, the most significant event of the day was the arrival of a curious mind who would one day look up at the stars with the same wonder that defined the age.",
        whyIncluded: 'The Birthday Event!',
        sources: [],
      },
    ],
  },
  {
    id: 'sample-2',
    createdAt: Date.now() - 5000000,
    author: 'Chronos Team',
    prefs: {
      name: 'Sophia',
      birthYear: '2015',
      birthDay: '4',
      birthMonth: 'July',
      interests: ['Dinosaurs', 'Space', 'Ballet'],
      blendLevel: 'focused',
      coverStyle: 'whimsical',
    },
    entries: [
      {
        day: 'August 12',
        year: '1990',
        headline: 'Sue the T-Rex',
        historyEvent:
          "On a dusty summer day in South Dakota, paleontologist Sue Hendrickson noticed three huge bones jutting out of a cliff face. She had stumbled upon the largest, most extensive, and best-preserved Tyrannosaurus rex specimen ever found. Over 90% of the skeleton was recovered by the team. Named 'Sue' in her honor, this 67-million-year-old predator was 42 feet long and would have weighed 9 tons in life. The discovery revolutionized our understanding of these ancient giants, revealing details about their growth, pathologies, and movement. It was a find that captured the world's imagination, bringing the terrifying majesty of the Cretaceous period into the modern sunlight.",
        whyIncluded: 'Paleontology history.',
        sources: [{ title: 'Field Museum - Sue', url: 'https://www.fieldmuseum.org/blog/sue-t-rex' }],
      },
      {
        day: 'July 4',
        year: '2015',
        headline: "Sophia's Grand Entrance!",
        historyEvent:
          'Fireworks lit up the sky for Independence Day, painting the night with red, white, and blue. Parades marched down Main Street and families gathered for barbecues across the nation. But amidst the national celebration, a personal firework was launched. Sophia was born! It was a day of double celebration. While the country marked its freedom, Sophia began her own journey of discovery. The cheers for the holiday seemed to double as cheers for her arrival. It was a fittingly dramatic entrance for someone destined to shine.',
        whyIncluded: 'Birthday.',
        sources: [],
      },
    ],
  },
];

export default function Home() {
  const router = useRouter();
  const user = useUser();
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [prefs, setPrefs] = useState<UserPreferences>({
    name: '',
    birthYear: '',
    birthDay: '1',
    birthMonth: 'January',
    interests: [],
    blendLevel: 'focused',
    coverStyle: 'classic',
  });
  const [entries, setEntries] = useState<ClientBookEntry[]>([]);
  const [currentBook, setCurrentBook] = useState<ClientBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<ClientBook[]>(SAMPLE_BOOKS);

  // Load books from API on mount
  useEffect(() => {
    const loadBooks = async () => {
      try {
        const res = await fetch('/api/books?public=true');
        if (res.ok) {
          const dbBooks = await res.json();
          setGallery([...dbBooks, ...SAMPLE_BOOKS]);
        }
      } catch (err) {
        console.error('Failed to load books:', err);
      }
    };
    loadBooks();
  }, []);

  // Check for legacy ?book= URL and redirect to proper route
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('book');
    if (bookId) {
      router.replace(`/book/${bookId}`);
    }
  }, [router]);

  const handleStart = () => {
    setAppState(AppState.FORM);
  };

  const handleGenerate = async (newPrefs: UserPreferences, bookType: BookType) => {
    setPrefs(newPrefs);
    setError(null);

    // Handle full book generation - redirect to My Books
    if (bookType === 'full' && user) {
      try {
        const res = await fetch('/api/generate?type=full', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPrefs),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to start book generation');
        }

        const { bookId, jobId } = await res.json();

        // Redirect to My Books page
        router.push('/my-books');
        return;
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Something went wrong starting your book.');
        return;
      }
    }

    // Sample generation - synchronous flow
    setAppState(AppState.GENERATING);

    try {
      const res = await fetch('/api/generate?type=sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs),
      });

      if (!res.ok) {
        throw new Error('Failed to generate book');
      }

      const { entries: generatedEntries, coverImage } = await res.json();

      // Save to database
      const saveRes = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefs: newPrefs,
          entries: generatedEntries,
          coverImage,
        }),
      });

      if (!saveRes.ok) {
        const errorData = await saveRes.json();
        throw new Error(errorData.error || 'Failed to save book');
      }

      const { id, shareToken } = await saveRes.json();

      const newBook: ClientBook = {
        id,
        prefs: newPrefs,
        entries: generatedEntries,
        createdAt: Date.now(),
        author: user ? 'You' : 'Guest',
        coverImage,
        isPublic: true, // Default to public
        userId: user?.id,
      };

      setEntries(generatedEntries);
      setCurrentBook(newBook);
      setGallery((prev) => [newBook, ...prev]);

      // Redirect to the book page (proper URL routing)
      router.push(`/book/${id}`);

      setTimeout(() => {
        setAppState(AppState.PREVIEW);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong generating your book.');
      setAppState(AppState.FORM);
    }
  };

  const handleUpdateCover = async (bookId: string, newCoverImage: string, newStyle: string) => {
    if (!currentBook) return;

    const updatedBook = {
      ...currentBook,
      prefs: { ...currentBook.prefs, coverStyle: newStyle as any },
      coverImage: newCoverImage,
    };
    setCurrentBook(updatedBook);
    setGallery((prev) => prev.map((b) => (b.id === bookId ? updatedBook : b)));

    // Update in database
    await fetch(`/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coverImage: newCoverImage, coverStyle: newStyle }),
    });
  };

  const handleTogglePrivacy = async (bookId: string, isPublic: boolean) => {
    if (!currentBook) return;

    // Update in database
    const res = await fetch(`/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic }),
    });

    if (res.ok) {
      const updatedBook = { ...currentBook, isPublic };
      setCurrentBook(updatedBook);
      setGallery((prev) => {
        // If now private, remove from public gallery
        if (!isPublic) {
          return prev.filter((b) => b.id !== bookId);
        }
        // If now public, add back to gallery
        return prev.map((b) => (b.id === bookId ? updatedBook : b));
      });
    } else {
      throw new Error('Failed to update privacy');
    }
  };

  const handleRegenerateEntry = (index: number, newEntry: ClientBookEntry) => {
    if (!currentBook) return;

    const updatedEntries = [...entries];
    updatedEntries[index] = newEntry;
    setEntries(updatedEntries);

    const updatedBook = { ...currentBook, entries: updatedEntries };
    setCurrentBook(updatedBook);
    setGallery((prev) => prev.map((b) => (b.id === currentBook.id ? updatedBook : b)));
  };

  const handleAddEntry = (index: number, newEntry: ClientBookEntry) => {
    if (!currentBook) return;

    // Insert at correct position
    const updatedEntries = [...entries];
    updatedEntries.splice(index, 0, newEntry);
    setEntries(updatedEntries);

    const updatedBook = { ...currentBook, entries: updatedEntries };
    setCurrentBook(updatedBook);
    setGallery((prev) => prev.map((b) => (b.id === currentBook.id ? updatedBook : b)));
  };

  const handleReset = () => {
    setAppState(AppState.LANDING);
    setEntries([]);
    setCurrentBook(null);
    setError(null);
  };

  const handleViewBook = (book: ClientBook) => {
    // For sample books without real IDs, show inline preview
    if (book.id.startsWith('sample-')) {
      setPrefs(book.prefs);
      setEntries(book.entries);
      setCurrentBook(book);
      setAppState(AppState.PREVIEW);
    } else {
      // Real books get proper URL routing
      router.push(`/book/${book.id}`);
    }
  };

  return (
    <div>
      {appState === AppState.LANDING && (
        <LandingPage
          onStart={handleStart}
          galleryBooks={gallery}
          onViewBook={handleViewBook}
          authSection={authEnabled ? <AuthSection /> : undefined}
        />
      )}

      {appState === AppState.FORM && (
        <>
          <GeneratorForm onSubmit={handleGenerate} onBack={handleReset} isGenerating={false} />
          {error && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-lg shadow-lg z-50">
              {error}
            </div>
          )}
        </>
      )}

      {appState === AppState.GENERATING && <ProcessingScreen isGenerating={true} />}

      {appState === AppState.PREVIEW && (
        <BookPreview
          entries={entries}
          prefs={prefs}
          coverImage={currentBook?.coverImage}
          onReset={handleReset}
          isReadOnly={false}
          currentBook={currentBook}
          onUpdateCover={handleUpdateCover}
          onTogglePrivacy={handleTogglePrivacy}
          onRegenerateEntry={handleRegenerateEntry}
          onAddEntry={handleAddEntry}
          additionalEntryCount={0}
          isOwner={!!(user && currentBook?.userId === user.id)}
        />
      )}
    </div>
  );
}
