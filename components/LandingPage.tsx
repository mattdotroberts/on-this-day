'use client';

import { BookOpen, Sparkles, Feather, Globe, Star, User } from 'lucide-react';
import type { ClientBook } from '@/lib/types';

interface LandingPageProps {
  onStart: () => void;
  galleryBooks: ClientBook[];
  onViewBook: (book: ClientBook) => void;
  authSection?: React.ReactNode;
}

export const LandingPage = ({ onStart, galleryBooks, onViewBook, authSection }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-20">
      {/* Auth Header */}
      {authSection && (
        <div className="absolute top-4 right-4 z-50">
          {authSection}
        </div>
      )}

      {/* Hero Section */}
      <div className="relative min-h-[70vh] flex flex-col items-center justify-center text-center overflow-hidden border-b border-amber-100">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-900 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-slate-900 blur-[120px]" />
        </div>

        <div className="z-10 max-w-5xl px-6 mt-10">
          <div className="mb-8 flex justify-center">
            <div className="p-4 rounded-full bg-white shadow-xl border border-amber-100">
              <Feather className="w-8 h-8 text-amber-700" />
            </div>
          </div>

          <h1 className="font-cinzel text-5xl md:text-8xl text-slate-900 mb-6 tracking-tight leading-[1.1]">
            A Year&apos;s
            <br />
            <span className="text-amber-700">History Of</span>
          </h1>

          <p className="font-serif-display text-xl md:text-2xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed italic">
            From January 1st to December 31st. <br />
            The story of the year you arrived, with you as the headline news.
          </p>

          <button
            onClick={onStart}
            className="group relative px-10 py-5 bg-slate-900 text-white font-medium text-lg tracking-wide hover:bg-slate-800 transition-all duration-300 shadow-2xl hover:shadow-xl hover:-translate-y-1 rounded-sm"
          >
            <span className="flex items-center gap-3 font-cinzel">
              Create Your Edition <Sparkles className="w-4 h-4 text-amber-400" />
            </span>
          </button>
        </div>
      </div>

      {/* Gallery Section - Bookstore Style */}
      <div className="max-w-[1400px] mx-auto px-6 py-20">
        <div className="flex items-center justify-center gap-4 mb-16">
          <div className="h-px bg-slate-300 w-12"></div>
          <h2 className="font-cinzel text-3xl text-slate-900 flex items-center gap-3 uppercase tracking-widest">
            <Globe className="w-6 h-6 text-amber-700" /> Public Library
          </h2>
          <div className="h-px bg-slate-300 w-12"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 gap-y-16">
          {galleryBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => onViewBook(book)}
              className="group cursor-pointer flex flex-col items-center"
            >
              {/* Realistic Book Cover Container */}
              <div className="relative w-full aspect-[2/3] mb-6 perspective-1000 transition-transform duration-500 group-hover:-translate-y-2">
                <div className="absolute inset-0 bg-white shadow-2xl rounded-sm overflow-hidden transform transition-transform duration-500 group-hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] border-r-4 border-b-4 border-slate-200">
                  {book.coverImage ? (
                    <img
                      src={book.coverImage}
                      alt={`Cover for ${book.prefs.name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 border border-slate-200">
                      <BookOpen className="w-12 h-12 mb-2 opacity-30" />
                      <span className="font-cinzel text-xs text-center opacity-50">No Cover Art</span>
                    </div>
                  )}

                  {/* Overlay Gradient/Sheen for realism */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/20 pointer-events-none"></div>
                  {/* Spine shadow */}
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-r from-white/40 to-transparent opacity-50"></div>
                </div>
              </div>

              {/* Book Metadata */}
              <div className="text-center w-full px-2">
                <h3 className="font-cinzel text-lg text-slate-900 leading-tight mb-1 truncate group-hover:text-amber-700 transition-colors">
                  {book.prefs.name}
                </h3>
                <p className="font-serif-display text-sm text-slate-500 italic mb-2">
                  The {book.prefs.birthYear} Edition
                </p>

                <div className="flex flex-wrap justify-center gap-1 mb-3 opacity-60 group-hover:opacity-100 transition-opacity">
                  {book.prefs.interests.slice(0, 2).map((i) => (
                    <span
                      key={i}
                      className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded-sm"
                    >
                      {i}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-1 text-amber-500 text-xs">
                  <Star className="w-3 h-3 fill-current" />
                  <Star className="w-3 h-3 fill-current" />
                  <Star className="w-3 h-3 fill-current" />
                  <Star className="w-3 h-3 fill-current" />
                  <Star className="w-3 h-3 fill-current" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
