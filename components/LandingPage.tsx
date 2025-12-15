'use client';

import { useState } from 'react';
import { BookOpen, Sparkles, Feather, Globe, Star, Gift, Printer, ChevronDown, Library } from 'lucide-react';
import type { ClientBook } from '@/lib/types';

interface LandingPageProps {
  onStart: () => void;
  galleryBooks: ClientBook[];
  onViewBook: (book: ClientBook) => void;
  authSection?: React.ReactNode;
}

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-serif-display text-lg text-slate-800">{question}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-6 pb-5 text-slate-600 font-serif-display leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
};

export const LandingPage = ({ onStart, galleryBooks, onViewBook, authSection }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Auth Header */}
      {authSection && (
        <div className="absolute top-4 right-4 z-50">
          {authSection}
        </div>
      )}

      {/* Hero Section - Split Layout */}
      <div className="relative min-h-[90vh] flex items-center border-b border-amber-100 overflow-hidden">
        {/* Left Content */}
        <div className="w-full lg:w-1/2 px-8 md:px-16 lg:px-20 py-16 z-10">
          <div className="max-w-xl">
            {/* Tagline */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px bg-amber-600 w-8"></div>
              <span className="font-serif-display italic text-amber-700 text-lg">The Perfect Gift</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-cinzel text-4xl md:text-5xl lg:text-6xl text-slate-900 mb-2 tracking-tight leading-[1.1]">
              Their History.
            </h1>
            <h1 className="font-cinzel text-4xl md:text-5xl lg:text-6xl text-slate-900 mb-2 tracking-tight leading-[1.1]">
              Their Passions.
            </h1>
            <h1 className="font-cinzel text-4xl md:text-5xl lg:text-6xl text-amber-700 mb-2 tracking-tight leading-[1.1]">
              Woven Into
            </h1>
            <h1 className="font-cinzel text-4xl md:text-5xl lg:text-6xl text-amber-700 mb-8 tracking-tight leading-[1.1]">
              History.
            </h1>

            {/* Subheadline */}
            <p className="font-serif-display text-lg md:text-xl text-slate-600 mb-4 leading-relaxed">
              Create a personalized book where every day of the year reveals a fascinating historical event connected to the things they love.
            </p>

            <p className="font-serif-display text-base text-slate-500 mb-10 italic">
              A daily discovery. Curated for them. Timeless.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onStart}
                className="group relative px-8 py-4 bg-slate-900 text-white font-medium text-base tracking-wide hover:bg-slate-800 transition-all duration-300 shadow-xl hover:shadow-lg hover:-translate-y-0.5 rounded-sm flex items-center justify-center gap-3"
              >
                <Feather className="w-4 h-4 text-amber-400" />
                <span className="font-cinzel">Start Writing</span>
              </button>

              <button
                onClick={() => document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white text-slate-700 font-medium text-base tracking-wide hover:bg-slate-50 transition-all duration-300 border border-slate-200 rounded-sm flex items-center justify-center gap-3"
              >
                <Library className="w-4 h-4 text-slate-500" />
                <span className="font-cinzel">Explore Library</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Image */}
        <div className="hidden lg:block absolute right-0 top-0 w-[55%] h-full">
          <div className="relative w-full h-full">
            {/* Hero image */}
            <img
              src="/hero-gift.jpg"
              alt="Grandfather and granddaughter sharing a gift"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            {/* Left fade - strong fade into the content area */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#FDFBF7] via-[#FDFBF7]/70 to-transparent w-[40%]"></div>
            {/* Top fade */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#FDFBF7] to-transparent"></div>
            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FDFBF7] to-transparent"></div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-[#F8F6F1] py-20 border-b border-amber-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-cinzel text-3xl md:text-4xl text-slate-900 uppercase tracking-widest mb-4">
              How It Works
            </h2>
            <div className="w-16 h-1 bg-amber-600 mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center mx-auto mb-6 border border-amber-100">
                <Sparkles className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="font-cinzel text-xl text-slate-900 mb-4">1. Curate</h3>
              <p className="font-serif-display text-slate-600 leading-relaxed">
                Enter their name and interests. Our AI historian scans centuries of time to find specific events that match their passions for every single day of the calendar.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center mx-auto mb-6 border border-amber-100">
                <Printer className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="font-cinzel text-xl text-slate-900 mb-4">2. Create</h3>
              <p className="font-serif-display text-slate-600 leading-relaxed">
                Instantly generate a beautifully formatted book titled &quot;A Year&apos;s History of [Name]&quot;. Customize the cover art to match their style.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center mx-auto mb-6 border border-amber-100">
                <Gift className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="font-cinzel text-xl text-slate-900 mb-4">3. Gift</h3>
              <p className="font-serif-display text-slate-600 leading-relaxed">
                Download the EPUB to read on any device. Or simply share the digital edition link with family across the globe.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonial / Social Proof Section */}
      <div className="py-20 border-b border-amber-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Images */}
            <div className="flex gap-4 lg:w-1/2">
              <div className="w-48 h-64 bg-slate-200 rounded-lg overflow-hidden shadow-lg">
                <div className="w-full h-full bg-gradient-to-br from-amber-100 to-slate-200 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-slate-400" />
                </div>
              </div>
              <div className="w-48 h-64 bg-amber-100 rounded-lg overflow-hidden shadow-lg mt-8">
                <div className="w-full h-full bg-gradient-to-br from-amber-200 to-amber-100 flex items-center justify-center">
                  <Gift className="w-12 h-12 text-amber-500" />
                </div>
              </div>
            </div>

            {/* Quote */}
            <div className="lg:w-1/2">
              <blockquote className="font-cinzel text-3xl md:text-4xl text-slate-800 leading-tight mb-6">
                &quot;I&apos;ve never seen my grandfather smile like that.&quot;
              </blockquote>
              <p className="font-serif-display text-lg text-slate-600 italic leading-relaxed mb-8">
                There&apos;s something magical about seeing your own passions woven into the fabric of history. It&apos;s more than a book—it&apos;s a legacy.
              </p>

              {/* Social Proof */}
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 border-2 border-white flex items-center justify-center"
                    >
                      <span className="text-white text-xs font-bold">{String.fromCharCode(64 + i)}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="font-cinzel text-amber-700 font-semibold">1,000+</p>
                  <p className="font-serif-display text-slate-500 text-sm">Chronicles Created</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Section - Public Library */}
      <div id="library" className="max-w-[1400px] mx-auto px-6 py-20">
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

      {/* FAQ Section */}
      <div className="bg-[#F8F6F1] py-20 border-t border-amber-100">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-cinzel text-3xl md:text-4xl text-slate-900 text-center uppercase tracking-widest mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            <FAQItem
              question="How do I give this as a gift?"
              answer="After creating a book, you can share the digital link directly with your recipient, or download the EPUB file to send via email. The digital edition can be accessed on any device with a web browser."
            />
            <FAQItem
              question="Is the content really unique?"
              answer="Yes! Each book is generated specifically for the person based on their name, birth year, and interests. Our AI historian searches through centuries of historical events to find connections that are meaningful and personal to them."
            />
            <FAQItem
              question="What format is the book?"
              answer="Books are available as interactive digital editions that can be viewed in any web browser, plus downloadable EPUB files that work on e-readers like Kindle, Kobo, and Apple Books."
            />
            <FAQItem
              question="Can I edit the cover?"
              answer="Yes! You can regenerate the cover as many times as you like until you find one that perfectly matches the recipient's style. Each cover is uniquely generated by AI."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-6">
            <Feather className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="font-cinzel text-2xl mb-4">A Year&apos;s History Of</h3>
          <p className="font-serif-display text-slate-400 max-w-md mx-auto mb-8">
            Combining the art of history with the magic of AI to create personal artifacts for the ones you love.
          </p>
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Chronos Project
          </p>
        </div>
      </footer>
    </div>
  );
};
