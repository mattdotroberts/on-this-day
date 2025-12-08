'use client';

import { useRef, useState } from 'react';
import type { ClientBookEntry, UserPreferences, ClientBook, CoverStyle } from '@/lib/types';
import { MONTHS } from '@/lib/types';
import { EntryCard } from './EntryCard';
import { IntroductionPage, ChapterPage } from './BookPages';
import { ArrowLeft, Share2, Check, Image as ImageIcon, X, Loader2, Book as BookIcon, Box, Sparkles, Camera, Palette, Download, Globe, Lock, BookOpen, Plus } from 'lucide-react';
import { AddEntryModal } from './AddEntryModal';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface BookPreviewProps {
  entries: ClientBookEntry[];
  prefs: UserPreferences;
  onReset: () => void;
  isReadOnly?: boolean;
  coverImage?: string;
  currentBook?: ClientBook | null;
  onUpdateCover?: (bookId: string, newCover: string, newStyle: string) => void;
  onTogglePrivacy?: (bookId: string, isPublic: boolean) => void;
  onRegenerateEntry?: (index: number, newEntry: ClientBookEntry) => void;
  onAddEntry?: (index: number, newEntry: ClientBookEntry) => void;
  additionalEntryCount?: number;
  isOwner?: boolean;
}

export const BookPreview = ({ entries, prefs, onReset, isReadOnly = false, coverImage, currentBook, onUpdateCover, onTogglePrivacy, onRegenerateEntry, onAddEntry, additionalEntryCount = 0, isOwner = false }: BookPreviewProps) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTogglingPrivacy, setIsTogglingPrivacy] = useState(false);
  const [localIsPublic, setLocalIsPublic] = useState(currentBook?.isPublic ?? true);
  const [isDownloadingEpub, setIsDownloadingEpub] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
  const [localAdditionalCount, setLocalAdditionalCount] = useState(additionalEntryCount);

  // Edit Cover State
  const [isEditingCover, setIsEditingCover] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<CoverStyle>(prefs.coverStyle);
  const [isRegeneratingCover, setIsRegeneratingCover] = useState(false);

  const birthYearInt = parseInt(prefs.birthYear);
  const currentYear = new Date().getFullYear();
  const age = isNaN(birthYearInt) ? 0 : currentYear - birthYearInt;

  const handleDownload = async () => {
    if (!componentRef.current) return;

    setIsDownloading(true);
    try {
      // Get all book pages
      const pages = componentRef.current.querySelectorAll('.book-page');
      if (pages.length === 0) {
        throw new Error('No pages found');
      }

      // A5 dimensions in mm
      const a5Width = 148;
      const a5Height = 210;

      // Create PDF in A5 format
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [a5Width, a5Height]
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;

        // Capture page as canvas
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        // Convert to image
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        // Calculate dimensions to fit A5 - constrain to page bounds
        let imgWidth = a5Width;
        let imgHeight = (canvas.height * a5Width) / canvas.width;

        // If image is taller than A5 page, scale down to fit
        if (imgHeight > a5Height) {
          imgHeight = a5Height;
          imgWidth = (canvas.width * a5Height) / canvas.height;
        }

        // Add new page for all pages after the first
        if (i > 0) {
          pdf.addPage();
        }

        // Center horizontally if image is narrower than page
        const xOffset = imgWidth < a5Width ? (a5Width - imgWidth) / 2 : 0;
        // Center vertically if image is shorter than page
        const yOffset = imgHeight < a5Height ? (a5Height - imgHeight) / 2 : 0;

        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
      }

      // Download the PDF
      pdf.save(`${prefs.name}-year-in-history.pdf`);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!currentBook || !currentBook.id) {
      alert('Book must be saved before sharing');
      return;
    }

    setIsSharing(true);
    await new Promise((r) => setTimeout(r, 500));
    const url = `${window.location.origin}/share/${currentBook.id}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } else {
        alert('Clipboard API not available. Copy this link manually:\n' + url);
      }
    } catch (err) {
      console.error('Failed to copy', err);
      alert('Failed to copy link. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRegenerateCover = async () => {
    if (!currentBook || !onUpdateCover) return;

    setIsRegeneratingCover(true);
    try {
      const tempPrefs = { ...prefs, coverStyle: selectedStyle };
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempPrefs),
      });

      if (!res.ok) throw new Error('Failed to regenerate cover');

      const { coverImage: newCover } = await res.json();

      if (newCover) {
        onUpdateCover(currentBook.id, newCover, selectedStyle);
        setIsEditingCover(false);
      }
    } catch (error) {
      console.error('Failed to update cover', error);
      alert('Could not generate new cover. Please try again.');
    } finally {
      setIsRegeneratingCover(false);
    }
  };

  const handleTogglePrivacy = async () => {
    if (!currentBook || !onTogglePrivacy) return;

    setIsTogglingPrivacy(true);
    try {
      const newIsPublic = !localIsPublic;
      await onTogglePrivacy(currentBook.id, newIsPublic);
      setLocalIsPublic(newIsPublic);
    } catch (error) {
      console.error('Failed to toggle privacy', error);
      alert('Could not update privacy setting. Please try again.');
    } finally {
      setIsTogglingPrivacy(false);
    }
  };

  const handleDownloadEpub = async () => {
    if (!currentBook || !currentBook.id) {
      alert('Book must be saved before downloading EPUB');
      return;
    }

    setIsDownloadingEpub(true);
    try {
      const response = await fetch(`/api/books/${currentBook.id}/epub`);
      if (!response.ok) {
        throw new Error('Failed to generate EPUB');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prefs.name}-year-in-history.epub`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('EPUB download failed:', error);
      alert('Failed to download EPUB. Please try again.');
    } finally {
      setIsDownloadingEpub(false);
    }
  };

  const handleRegenerateEntry = async (index: number) => {
    if (!currentBook || !onRegenerateEntry) return;

    setRegeneratingIndex(index);
    try {
      const res = await fetch(`/api/books/${currentBook.id}/entries/${index}/regenerate`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to regenerate entry');
      }

      const { entry: newEntry } = await res.json();
      onRegenerateEntry(index, newEntry);
    } catch (error) {
      console.error('Failed to regenerate entry', error);
      alert('Could not regenerate entry. Please try again.');
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleAddEntry = async (month: string, day: number) => {
    if (!currentBook || !onAddEntry) return;

    const res = await fetch(`/api/books/${currentBook.id}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, day }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to add entry');
    }

    const { entry: newEntry, index, additionalEntryCount: newCount } = await res.json();
    setLocalAdditionalCount(newCount);
    onAddEntry(index, newEntry);
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

        // Check if this entry is the birthday entry
        const isBirthdayEntry = entry.day.toLowerCase().includes(prefs.birthMonth.toLowerCase()) &&
          entry.day.includes(prefs.birthDay.toString()) &&
          entry.year === prefs.birthYear;

        pages.push(
          <EntryCard
            key={`entry-${index}`}
            entry={entry}
            index={index}
            isBirthday={isBirthdayEntry}
            birthdayMessage={currentBook?.prefs.birthdayMessage || prefs.birthdayMessage}
            isOwner={isOwner && !isReadOnly}
            isRegenerating={regeneratingIndex === index}
            onRegenerate={onRegenerateEntry ? handleRegenerateEntry : undefined}
          />
        );
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
             {/* Privacy Toggle - Owner Only */}
             {isOwner && currentBook && onTogglePrivacy && (
                <button
                    onClick={handleTogglePrivacy}
                    disabled={isTogglingPrivacy}
                    className={`flex items-center gap-2 border px-4 py-2 rounded-full transition-all shadow-sm ${localIsPublic ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}
                    title={localIsPublic ? 'Book is public - click to make private' : 'Book is private - click to make public'}
                >
                    {isTogglingPrivacy ? (
                        <span className="animate-spin h-4 w-4 border-b-2 border-current rounded-full"></span>
                    ) : localIsPublic ? (
                        <Globe className="w-4 h-4" />
                    ) : (
                        <Lock className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">{localIsPublic ? 'Public' : 'Private'}</span>
                </button>
             )}

             {/* Add Entry Button - Owner Only */}
             {isOwner && currentBook && onAddEntry && (
                <button
                    onClick={() => setIsAddEntryModalOpen(true)}
                    className="flex items-center gap-2 border border-amber-200 bg-amber-50 text-amber-700 px-4 py-2 rounded-full hover:bg-amber-100 transition-colors shadow-sm"
                    title={`Add entry (${10 - localAdditionalCount} remaining)`}
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Entry</span>
                </button>
             )}

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

            {/* EPUB Download Button */}
            {currentBook && (
              <button
                onClick={handleDownloadEpub}
                disabled={isDownloadingEpub}
                className="flex items-center gap-2 border border-slate-200 bg-white text-slate-700 px-4 py-2 rounded-full hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                title="Download for Kindle/Apple Books"
              >
                {isDownloadingEpub ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BookOpen className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isDownloadingEpub ? 'Creating...' : 'EPUB'}</span>
              </button>
            )}

            {/* PDF Download Button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-full hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{isDownloading ? 'Generating...' : 'PDF'}</span>
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

      {/* Add Entry Modal */}
      <AddEntryModal
        isOpen={isAddEntryModalOpen}
        onClose={() => setIsAddEntryModalOpen(false)}
        onAdd={handleAddEntry}
        additionalCount={localAdditionalCount}
        maxAdditional={10}
      />
    </div>
  );
};
