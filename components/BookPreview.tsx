import React, { useRef, useState } from 'react';
import { BookEntry, UserPreferences, Book, MONTHS, CoverStyle } from '../types';
import { EntryCard } from './EntryCard';
import { IntroductionPage, ChapterPage } from './BookPages';
import { Printer, ArrowLeft, Share2, Check, Image as ImageIcon, X, Loader2, Book as BookIcon, Box, Sparkles, Camera, Palette } from 'lucide-react';
import { encodeBookForUrl } from '../utils/sharing';
import { generateBookCover } from '../services/geminiService';

interface BookPreviewProps {
  entries: BookEntry[];
  prefs: UserPreferences;
  onReset: () => void;
  isReadOnly?: boolean;
  coverImage?: string; 
  currentBook?: Book | null;
  onUpdateCover?: (bookId: string, newCover: string, newStyle: string) => void;
}

export const BookPreview: React.FC<BookPreviewProps> = ({ entries, prefs, onReset, isReadOnly = false, coverImage, currentBook, onUpdateCover }) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // Edit Cover State
  const [isEditingCover, setIsEditingCover] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<CoverStyle>(prefs.coverStyle);
  const [isRegeneratingCover, setIsRegeneratingCover] = useState(false);

  const birthYearInt = parseInt(prefs.birthYear);
  const currentYear = new Date().getFullYear();
  const age = isNaN(birthYearInt) ? 0 : currentYear - birthYearInt;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!currentBook) return;
    
    setIsSharing(true);
    await new Promise(r => setTimeout(r, 500));
    const encoded = encodeBookForUrl(currentBook);
    const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } else {
        alert("Clipboard API not available. Copy this link manually:\n" + url);
      }
    } catch (err) {
      console.error('Failed to copy', err);
      alert("Failed to copy link. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleRegenerateCover = async () => {
    if (!currentBook || !onUpdateCover || !process.env.API_KEY) return;
    
    setIsRegeneratingCover(true);
    try {
        // Create temporary prefs with the new style
        const tempPrefs = { ...prefs, coverStyle: selectedStyle };
        const newCover = await generateBookCover(tempPrefs, process.env.API_KEY);
        
        if (newCover) {
            onUpdateCover(currentBook.id, newCover, selectedStyle);
            setIsEditingCover(false);
        }
    } catch (error) {
        console.error("Failed to update cover", error);
        alert("Could not generate new cover. Please try again.");
    } finally {
        setIsRegeneratingCover(false);
    }
  };

  // Styles configuration (Matches GeneratorForm)
  const coverStyles: { id: CoverStyle; label: string; icon: React.ReactNode }[] = [
    { id: 'classic', label: 'Antique', icon: <BookIcon className="w-4 h-4"/> },
    { id: 'minimalist', label: 'Modern', icon: <Box className="w-4 h-4"/> },
    { id: 'whimsical', label: 'Whimsical', icon: <Sparkles className="w-4 h-4"/> },
    { id: 'cinematic', label: 'Cinematic', icon: <Camera className="w-4 h-4"/> },
    { id: 'retro', label: 'Retro', icon: <Palette className="w-4 h-4"/> },
  ];

  // --- Rendering Logic for Book Pages ---
  
  const renderBookContent = () => {
    const pages = [];
    
    // 1. Cover (Custom Styling for A5)
    pages.push(
      <div key="cover" className="book-page bg-[#2A2A2A] text-white p-0 overflow-hidden relative print:block">
         {coverImage ? (
                <div className="absolute inset-0 z-0">
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2A2A2A] via-[#2A2A2A]/40 to-[#2A2A2A]/20"></div>
                </div>
            ) : (
                <div className="absolute top-0 left-0 w-full h-full bg-[#2A2A2A]" />
            )}
            
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-8 border-[12px] border-[#1a1a1a]">
                <div className="border border-white/20 p-8 h-full w-full flex flex-col items-center justify-center">
                    <p className="font-serif-display italic text-amber-500 mb-6 text-lg">A Year's History Of</p>
                    <h1 className="font-cinzel text-5xl text-amber-50 mb-8 tracking-wider leading-tight drop-shadow-lg">
                        {prefs.name}
                    </h1>
                    <div className="w-12 h-0.5 bg-amber-500/50 mb-8"></div>
                    <p className="font-cinzel text-xs text-slate-300 tracking-[0.3em] uppercase">
                        Est. {prefs.birthYear}
                    </p>
                </div>
            </div>
      </div>
    );

    // 2. Introduction Page
    pages.push(<IntroductionPage key="intro" prefs={prefs} />);

    // 3. Entries grouped by Month
    let currentMonth = "";
    
    entries.forEach((entry, index) => {
        // Try to extract month. Formats can be "January 1" or "1 January" or "Jan 1"
        let entryMonth = "Chapter";
        const parts = entry.day.trim().split(' ');
        
        // Find which part is a month name
        const foundMonth = parts.find(p => MONTHS.some(m => m.toLowerCase().startsWith(p.toLowerCase())));
        if (foundMonth) {
            // Expand short months if needed, or just use what is found. 
            // Better to normalize to full month name from MONTHS array.
            const normalized = MONTHS.find(m => m.toLowerCase().startsWith(foundMonth.toLowerCase()));
            entryMonth = normalized || foundMonth;
        }

        if (entryMonth !== currentMonth) {
            currentMonth = entryMonth;
            // Pick a random interest for this chapter icon
            // Use index to deterministically pick so it doesn't jitter
            const interest = prefs.interests[index % prefs.interests.length] || "History";
            
            pages.push(
                <ChapterPage 
                    key={`chapter-${index}`} 
                    month={currentMonth} 
                    interest={interest} 
                />
            );
        }

        pages.push(<EntryCard key={`entry-${index}`} entry={entry} index={index} />);
    });

    return pages;
  };

  return (
    <div className="min-h-screen bg-[#EAE8E3] pb-20 print:bg-white print:pb-0 relative">
      {/* Header / Controls */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-amber-100 shadow-sm px-6 py-4 no-print">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button 
            onClick={onReset}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to Library</span>
          </button>

          <div className="text-center">
            <h2 className="font-cinzel text-xl text-slate-900 hidden md:block">
              {prefs.name}'s Chronicle
            </h2>
          </div>

          <div className="flex items-center gap-3">
             {currentBook && onUpdateCover && (
                <button
                    onClick={() => setIsEditingCover(true)}
                    className="flex items-center gap-2 border border-slate-200 bg-white text-slate-700 px-4 py-2 rounded-full hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <ImageIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit Cover</span>
                </button>
             )}

             <button
               onClick={handleShare}
               disabled={isSharing || !currentBook}
               className={`flex items-center gap-2 border px-4 py-2 rounded-full transition-all shadow-sm ${copied ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
             >
                {copied ? <Check className="w-4 h-4" /> : isSharing ? <span className="animate-spin h-3 w-3 border-b-2 border-slate-500 rounded-full"></span> : <Share2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
             </button>

            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-full hover:bg-slate-800 transition-colors shadow-lg"
            >
              <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Print Book</span>
            </button>
          </div>
        </div>
      </div>

      {/* Book Content Container */}
      <div ref={componentRef} className="max-w-[210mm] mx-auto mt-10 print:mt-0 print:w-full">
        {renderBookContent()}
        
        {/* End of Book Message */}
        <div className="text-center py-10 no-print">
            <p className="font-serif-display italic text-slate-400">End of Preview</p>
        </div>
      </div>

      {/* Edit Cover Modal */}
      {isEditingCover && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="font-cinzel text-xl text-slate-900">Redesign Cover</h3>
                    <button 
                        onClick={() => setIsEditingCover(false)}
                        className="text-slate-400 hover:text-slate-600"
                        disabled={isRegeneratingCover}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6">
                    <p className="text-sm text-slate-500 mb-4 font-serif-display italic">
                        Choose a new artistic style for the front cover.
                    </p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                        {coverStyles.map(style => (
                            <button
                                key={style.id}
                                onClick={() => setSelectedStyle(style.id)}
                                disabled={isRegeneratingCover}
                                className={`p-3 rounded-lg border-2 text-center flex flex-col items-center justify-center transition-all ${selectedStyle === style.id ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-slate-100 hover:border-slate-200 text-slate-600'} ${isRegeneratingCover ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className={`mb-2 ${selectedStyle === style.id ? 'text-amber-600' : 'text-slate-400'}`}>
                                    {style.icon}
                                </div>
                                <div className="font-semibold text-xs uppercase tracking-wide">{style.label}</div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleRegenerateCover}
                        disabled={isRegeneratingCover}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    >
                        {isRegeneratingCover ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Painting new cover...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 text-amber-400" /> Generate New Cover
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
