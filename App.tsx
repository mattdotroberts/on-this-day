import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { GeneratorForm } from './components/GeneratorForm';
import { BookPreview } from './components/BookPreview';
import { ProcessingScreen } from './components/ProcessingScreen';
import { AppState, BookEntry, UserPreferences, Book } from './types';
import { generateBookEntries, generateBookCover } from './services/geminiService';
import { decodeBookFromUrl } from './utils/sharing';
import { getAllBooksFromDB, saveBookToDB, updateBookInDB } from './services/dbService';

// Sample data for the gallery - Updated to remove interestLink
const SAMPLE_BOOKS: Book[] = [
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
      coverStyle: 'cinematic'
    },
    entries: [
      {
        day: "January 7",
        year: "1610",
        headline: "Galileo Sees Jupiter",
        historyEvent: "In the cold winter of 1610, the Italian astronomer Galileo Galilei pointed his improved telescope towards the mighty planet Jupiter. What he saw changed the course of human history and our understanding of our place in the cosmos. Beside the bright disk of the planet were three faint stars, arranged in a straight line. The following nights revealed a fourth, and as he watched them move, he realized they were not fixed stars at all, but moons orbiting another world. This discovery shattered the Aristotelian belief that all celestial bodies revolved around the Earth. It was the first time in history that satellites were observed orbiting a planet other than our own, providing critical evidence for the Copernican system. The universe had suddenly opened up, revealing a dynamic, moving stage of celestial mechanics that operated on laws we were only beginning to understand.",
        whyIncluded: "Major Astronomy Event.",
        sources: [
            { title: "NASA Solar System Exploration", url: "https://solarsystem.nasa.gov/" },
            { title: "The Galileo Project", url: "http://galileo.rice.edu/" }
        ]
      },
      {
        day: "March 12",
        year: "1985",
        headline: "A Star is Born: Arthur Arrives!",
        historyEvent: "On this Tuesday in 1985, the world turned on its axis just as it always had, but for one family, gravity shifted entirely. It was a year of transition; Mikhail Gorbachev had become the leader of the Soviet Union only the day before, signaling the beginning of the end of the Cold War. 'We Are the World' was being recorded to aid Africa, and the first .com domain name was registered. Amidst this global backdrop of technological and political change, a new life entered the scene. Arthur was born, bringing a light brighter than any comet. While historians recorded the treaties and the charts, the most significant event of the day was the arrival of a curious mind who would one day look up at the stars with the same wonder that defined the age.",
        whyIncluded: "The Birthday Event!",
        sources: []
      },
      {
         day: "September 29",
         year: "1650",
         headline: "Coffee reaches London",
         historyEvent: "In 1650, a Jewish entrepreneur named Jacob opened the very first coffee house in England, not in London, but in the scholarly city of Oxford. It was known as 'The Angel'. This marked the beginning of a social revolution. These establishments, soon to be known as 'Penny Universities', allowed anyone to enter for the price of a penny and engage in intellectual debate, sober and alert, fueled by the dark, bitter brew from the East. Unlike the alehouses that dulled the mind, coffee sharpened it. It was here that scientists, poets, and merchants mingled. The Royal Society, one of the world's most prestigious scientific academies, effectively grew out of these caffeine-fueled discussions. The modern world of stock markets, insurance, and Newtonian physics owes a debt to these humble rooms filled with smoke and the aroma of roasted beans.",
         whyIncluded: "History of Coffee.",
         sources: [
             { title: "History of Coffee", url: "https://www.ncausa.org/about-coffee/history-of-coffee" }
         ]
      }
    ]
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
      coverStyle: 'whimsical'
    },
    entries: [
        {
          day: "August 12",
          year: "1990",
          headline: "Sue the T-Rex",
          historyEvent: "On a dusty summer day in South Dakota, paleontologist Sue Hendrickson noticed three huge bones jutting out of a cliff face. She had stumbled upon the largest, most extensive, and best-preserved Tyrannosaurus rex specimen ever found. Over 90% of the skeleton was recovered by the team. Named 'Sue' in her honor, this 67-million-year-old predator was 42 feet long and would have weighed 9 tons in life. The discovery revolutionized our understanding of these ancient giants, revealing details about their growth, pathologies, and movement. It was a find that captured the world's imagination, bringing the terrifying majesty of the Cretaceous period into the modern sunlight.",
          whyIncluded: "Paleontology history.",
          sources: [
              { title: "Field Museum - Sue", url: "https://www.fieldmuseum.org/blog/sue-t-rex" }
          ]
        },
        {
          day: "July 4",
          year: "2015",
          headline: "Sophia's Grand Entrance!",
          historyEvent: "Fireworks lit up the sky for Independence Day, painting the night with red, white, and blue. Parades marched down Main Street and families gathered for barbecues across the nation. But amidst the national celebration, a personal firework was launched. Sophia was born! It was a day of double celebration. While the country marked its freedom, Sophia began her own journey of discovery. The cheers for the holiday seemed to double as cheers for her arrival. It was a fittingly dramatic entrance for someone destined to shine.",
          whyIncluded: "Birthday.",
          sources: []
        }
    ]
  }
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [prefs, setPrefs] = useState<UserPreferences>({ 
    name: '', 
    birthYear: '', 
    birthDay: '1', 
    birthMonth: 'January', 
    interests: [], 
    blendLevel: 'focused',
    coverStyle: 'classic'
  });
  const [entries, setEntries] = useState<BookEntry[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Gallery state - Initialize with samples
  const [gallery, setGallery] = useState<Book[]>(SAMPLE_BOOKS);

  // Load books from DB on mount
  useEffect(() => {
    const loadBooks = async () => {
      const dbBooks = await getAllBooksFromDB();
      // Combine DB books with samples (DB books first)
      // Filter out any duplicates if necessary, though IDs should be unique enough
      setGallery([...dbBooks, ...SAMPLE_BOOKS]);
    };
    loadBooks();
  }, []);

  // Check for shared book in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareData = params.get('share');
    if (shareData) {
      const sharedBook = decodeBookFromUrl(shareData);
      if (sharedBook) {
        setPrefs(sharedBook.prefs);
        setEntries(sharedBook.entries);
        setCurrentBook(sharedBook);
        setAppState(AppState.PREVIEW);
        // Clean URL without reload
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleStart = () => {
    setAppState(AppState.FORM);
  };

  const handleGenerate = async (newPrefs: UserPreferences) => {
    setPrefs(newPrefs);
    setAppState(AppState.GENERATING);
    setError(null);

    try {
      if (!process.env.API_KEY) {
        throw new Error("API Key is missing. Please select an API Key via the extension.");
      }

      // Generate both text and cover image in parallel
      const [generatedEntries, coverImage] = await Promise.all([
        generateBookEntries(newPrefs, process.env.API_KEY),
        generateBookCover(newPrefs, process.env.API_KEY)
      ]);
      
      const newBook: Book = {
        id: Date.now().toString(),
        prefs: newPrefs,
        entries: generatedEntries,
        createdAt: Date.now(),
        author: 'You',
        coverImage: coverImage // Add the generated image
      };

      // Save to local DB
      await saveBookToDB(newBook);

      setEntries(generatedEntries);
      setCurrentBook(newBook);
      setGallery(prev => [newBook, ...prev]); 
      
      // Artificial small delay if generation was too fast, to let the user enjoy the "Binding" animation
      setTimeout(() => {
         setAppState(AppState.PREVIEW);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong generating your book.");
      setAppState(AppState.FORM); 
    }
  };

  const handleUpdateCover = async (bookId: string, newCoverImage: string, newStyle: string) => {
     if (!currentBook) return;

     // 1. Update in memory current book
     const updatedBook = {
        ...currentBook,
        prefs: { ...currentBook.prefs, coverStyle: newStyle as any },
        coverImage: newCoverImage
     };
     setCurrentBook(updatedBook);

     // 2. Update Gallery State
     setGallery(prev => prev.map(b => b.id === bookId ? updatedBook : b));

     // 3. Update DB
     await updateBookInDB(updatedBook);
  };

  const handleReset = () => {
    setAppState(AppState.LANDING);
    setEntries([]);
    setCurrentBook(null);
    setError(null);
    // Ensure URL is clean
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleViewBook = (book: Book) => {
    setPrefs(book.prefs);
    setEntries(book.entries);
    setCurrentBook(book);
    setAppState(AppState.PREVIEW);
  };

  return (
    <div>
      {appState === AppState.LANDING && (
        <LandingPage 
          onStart={handleStart} 
          galleryBooks={gallery}
          onViewBook={handleViewBook}
        />
      )}

      {appState === AppState.FORM && (
        <>
          <GeneratorForm 
            onSubmit={handleGenerate} 
            isGenerating={false}
          />
          {error && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-lg shadow-lg z-50">
              {error}
            </div>
          )}
        </>
      )}

      {appState === AppState.GENERATING && (
        <ProcessingScreen isGenerating={true} />
      )}

      {appState === AppState.PREVIEW && (
        <BookPreview 
          entries={entries} 
          prefs={prefs} 
          coverImage={currentBook?.coverImage}
          onReset={handleReset} 
          isReadOnly={false}
          currentBook={currentBook} // Pass the full book for sharing
          onUpdateCover={handleUpdateCover}
        />
      )}
    </div>
  );
};

export default App;
