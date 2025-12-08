'use client';

import { useState } from 'react';
import type { ClientBook, ClientBookEntry } from '@/lib/types';
import { BookPreview } from '@/components/BookPreview';
import { Book, Calendar, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface SharePageClientProps {
  book: ClientBook;
  initialEntryIndex?: number;
}

export default function SharePageClient({ book, initialEntryIndex }: SharePageClientProps) {
  const [showFullBook, setShowFullBook] = useState(initialEntryIndex !== undefined);

  if (showFullBook) {
    return (
      <div className="relative">
        {/* Promo Banner */}
        <div className="sticky top-0 z-[60] bg-gradient-to-r from-amber-600 to-amber-700 text-white py-3 px-4 text-center shadow-lg">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">Create your own personalized history book!</span>
            <Link
              href="/"
              className="inline-flex items-center gap-1 bg-white text-amber-700 px-3 py-1 rounded-full text-sm font-semibold hover:bg-amber-50 transition-colors ml-2"
            >
              Get Started <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <BookPreview
          entries={book.entries}
          prefs={book.prefs}
          onReset={() => setShowFullBook(false)}
          isReadOnly={true}
          coverImage={book.coverImage}
          currentBook={book}
        />
      </div>
    );
  }

  // Teaser View
  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Hero Section with Cover */}
      <div className="relative bg-gradient-to-b from-slate-900 to-slate-800 text-white overflow-hidden">
        {/* Background cover image with overlay */}
        {book.coverImage && (
          <div className="absolute inset-0 z-0">
            <img
              src={book.coverImage}
              alt=""
              className="w-full h-full object-cover opacity-20 blur-sm"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900"></div>
          </div>
        )}

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Cover Image */}
            <div className="w-64 md:w-80 shrink-0">
              <div className="aspect-[148/210] rounded-lg shadow-2xl overflow-hidden border-4 border-white/10">
                {book.coverImage ? (
                  <img
                    src={book.coverImage}
                    alt={`${book.prefs.name}'s History Book Cover`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                    <Book className="w-16 h-16 text-slate-500" />
                  </div>
                )}
              </div>
            </div>

            {/* Book Info */}
            <div className="text-center md:text-left">
              <p className="font-serif-display italic text-amber-400 mb-2 text-lg">
                A Year's History Of
              </p>
              <h1 className="font-cinzel text-4xl md:text-5xl text-white mb-4 tracking-wide">
                {book.prefs.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-300 mb-6">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Est. {book.prefs.birthYear}
                </span>
                <span className="flex items-center gap-1.5">
                  <Book className="w-4 h-4" />
                  {book.entries.length} Historical Entries
                </span>
              </div>

              {/* Interests Tags */}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-8">
                {book.prefs.interests.map((interest, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-white/10 rounded-full text-sm text-amber-200 border border-amber-500/30"
                  >
                    {interest}
                  </span>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => setShowFullBook(true)}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-4 rounded-full text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                <Sparkles className="w-5 h-5" />
                Explore Inside
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Entries Section */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="font-cinzel text-2xl text-slate-900 text-center mb-8">
          Peek Inside This Chronicle
        </h2>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {book.entries.slice(0, 4).map((entry, i) => (
            <EntryPreviewCard key={i} entry={entry} index={i} />
          ))}
        </div>

        {book.entries.length > 4 && (
          <div className="text-center">
            <button
              onClick={() => setShowFullBook(true)}
              className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-800 font-medium transition-colors"
            >
              View all {book.entries.length} entries <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Create Your Own CTA */}
      <div className="bg-gradient-to-br from-amber-50 to-amber-100 py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <Sparkles className="w-10 h-10 text-amber-600 mx-auto mb-4" />
          <h2 className="font-cinzel text-3xl text-slate-900 mb-4">
            Create Your Own History Book
          </h2>
          <p className="text-slate-600 mb-8 font-serif-display">
            Discover the fascinating historical events that happened on your birth date
            and throughout your special year, all connected to your unique interests.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-full text-lg transition-all shadow-lg"
          >
            Start Your Chronicle <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-slate-400 text-sm">
        <p>A Year's History Of - Personalized History Books</p>
      </footer>
    </div>
  );
}

// Entry Preview Card for teaser view
function EntryPreviewCard({ entry, index }: { entry: ClientBookEntry; index: number }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-amber-100 hover:shadow-lg transition-shadow">
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-cinzel text-sm text-amber-700">{entry.day}</span>
        <span className="text-xs text-slate-400 font-serif-display italic">
          {entry.year}
        </span>
      </div>
      <h3 className="font-serif-display font-bold text-slate-900 mb-2 line-clamp-2">
        {entry.headline}
      </h3>
      <p className="text-sm text-slate-600 line-clamp-3 font-serif-display">
        {entry.historyEvent}
      </p>
      {entry.whyIncluded && (
        <p className="mt-3 text-xs text-amber-600 italic">
          ~ {entry.whyIncluded} ~
        </p>
      )}
    </div>
  );
}
