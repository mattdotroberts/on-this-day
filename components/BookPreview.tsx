'use client';

import { useRef, useState } from 'react';
import type { ClientBookEntry, UserPreferences, ClientBook, CoverStyle } from '@/lib/types';
import { MONTHS } from '@/lib/types';
import { EntryCard } from './EntryCard';
import { IntroductionPage, ChapterPage, getDefaultPrefaceText } from './BookPages';
import { ArrowLeft, Share2, Check, Image as ImageIcon, X, Loader2, Book as BookIcon, Box, Sparkles, Camera, Palette, Download, Globe, Lock, BookOpen, Plus, Zap, CreditCard, Package, Type, MoreVertical, Volume2, VolumeX, Play, Pause, SkipForward } from 'lucide-react';
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

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<'digital' | 'printedDigital'>('digital');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Edit Book State (cover + preface)
  const [isEditingBook, setIsEditingBook] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<CoverStyle>(prefs.coverStyle);
  const [isRegeneratingCover, setIsRegeneratingCover] = useState(false);
  const [coverTitle, setCoverTitle] = useState(prefs.coverTitle || 'On This Day');
  const [coverSubtitle, setCoverSubtitle] = useState(prefs.coverSubtitle || `Curated for ${prefs.name}`);
  const [includeCoverText, setIncludeCoverText] = useState(prefs.includeCoverText !== false);
  const [prefaceText, setPrefaceText] = useState(currentBook?.prefaceText || '');
  const [isSavingPreface, setIsSavingPreface] = useState(false);

  // Dropdown menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Narration state
  const [isNarrating, setIsNarrating] = useState(false);
  const [narratingEntryIndex, setNarratingEntryIndex] = useState<number | null>(null);
  const [continuousPlay, setContinuousPlay] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('Puck');
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

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
        const isCoverPage = i === 0;

        // Capture page as canvas
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: isCoverPage ? '#2A2A2A' : '#ffffff',
          logging: false
        });

        // Convert to image
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        // Add new page for all pages after the first
        if (i > 0) {
          pdf.addPage();
        }

        if (isCoverPage) {
          // Cover page: fit to A5 while preserving aspect ratio, centered
          const canvasAspect = canvas.width / canvas.height;
          const pageAspect = a5Width / a5Height;

          let imgWidth: number, imgHeight: number, xOffset: number, yOffset: number;

          if (canvasAspect > pageAspect) {
            // Canvas is wider than page - fit to width
            imgWidth = a5Width;
            imgHeight = a5Width / canvasAspect;
            xOffset = 0;
            yOffset = (a5Height - imgHeight) / 2;
          } else {
            // Canvas is taller than page - fit to height
            imgHeight = a5Height;
            imgWidth = a5Height * canvasAspect;
            xOffset = (a5Width - imgWidth) / 2;
            yOffset = 0;
          }

          // Fill background first (in case of letterboxing)
          pdf.setFillColor(42, 42, 42); // #2A2A2A
          pdf.rect(0, 0, a5Width, a5Height, 'F');

          pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
        } else {
          // Regular pages: maintain aspect ratio and center
          let imgWidth = a5Width;
          let imgHeight = (canvas.height * a5Width) / canvas.width;

          // If image is taller than A5 page, scale down to fit
          if (imgHeight > a5Height) {
            imgHeight = a5Height;
            imgWidth = (canvas.width * a5Height) / canvas.height;
          }

          // Center horizontally if image is narrower than page
          const xOffset = imgWidth < a5Width ? (a5Width - imgWidth) / 2 : 0;
          // Center vertically if image is shorter than page
          const yOffset = imgHeight < a5Height ? (a5Height - imgHeight) / 2 : 0;

          pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
        }
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
      const tempPrefs = {
        ...prefs,
        coverStyle: selectedStyle,
        coverTitle,
        coverSubtitle,
        includeCoverText,
      };
      const res = await fetch('/api/generate?coverOnly=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempPrefs),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to regenerate cover');
      }

      if (data.coverImage) {
        onUpdateCover(currentBook.id, data.coverImage, selectedStyle);
        setIsEditingBook(false);
      } else {
        throw new Error('No cover image was generated');
      }
    } catch (error) {
      console.error('Failed to update cover', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Could not generate new cover: ${message}`);
    } finally {
      setIsRegeneratingCover(false);
    }
  };

  const handleSavePreface = async () => {
    if (!currentBook) return;

    setIsSavingPreface(true);
    try {
      const res = await fetch(`/api/books/${currentBook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefaceText: prefaceText || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save preface');
      }

      // Update succeeded - the parent component will get the update via revalidation
    } catch (error) {
      console.error('Failed to save preface', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Could not save preface: ${message}`);
    } finally {
      setIsSavingPreface(false);
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

  // Handle upgrade to full book checkout
  const handleUpgradeCheckout = async () => {
    if (!currentBook) return;

    setIsCheckingOut(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType: selectedProduct,
          bookPrefs: {
            name: prefs.name,
            birthYear: prefs.birthYear,
            birthDay: prefs.birthDay,
            birthMonth: prefs.birthMonth,
            interests: prefs.interests,
            blendLevel: prefs.blendLevel,
            coverStyle: prefs.coverStyle,
            birthdayMessage: prefs.birthdayMessage,
          },
          existingBookId: currentBook.id, // Reference to existing sample book
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Check if book can be upgraded (sample with less than 365 entries)
  const canUpgrade = currentBook &&
    (currentBook.bookType === 'sample' || !currentBook.bookType) &&
    entries.length < 365 &&
    isOwner;

  // Narration handlers
  const GEMINI_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'];

  const handleNarrateEntry = async (entryIndex: number) => {
    // Stop current playback if any
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
      setAudioElement(null);
    }

    if (narratingEntryIndex === entryIndex && isNarrating) {
      // Stop narration
      setIsNarrating(false);
      setNarratingEntryIndex(null);
      return;
    }

    setIsLoadingAudio(true);
    setNarratingEntryIndex(entryIndex);

    try {
      const entry = entries[entryIndex];
      const textToSpeak = `${entry.headline}. ${entry.day}, ${entry.year}. ${entry.historyEvent}`;

      const response = await fetch('/api/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak, voice: selectedVoice }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate narration');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsNarrating(false);
        URL.revokeObjectURL(audioUrl);

        // If continuous play enabled, play next entry
        if (continuousPlay && entryIndex < entries.length - 1) {
          handleNarrateEntry(entryIndex + 1);
        } else {
          setNarratingEntryIndex(null);
        }
      };

      audio.onerror = () => {
        setIsNarrating(false);
        setNarratingEntryIndex(null);
        alert('Failed to play audio');
      };

      setAudioElement(audio);
      await audio.play();
      setIsNarrating(true);
    } catch (error) {
      console.error('Narration error:', error);
      alert('Failed to generate narration. Please try again.');
      setNarratingEntryIndex(null);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleStopNarration = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
      setAudioElement(null);
    }
    setIsNarrating(false);
    setNarratingEntryIndex(null);
  };

  const handleSkipToNext = () => {
    if (narratingEntryIndex !== null && narratingEntryIndex < entries.length - 1) {
      handleNarrateEntry(narratingEntryIndex + 1);
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
    
    // 1. Cover - Show AI-generated image full screen (override book-page padding)
    pages.push(
      <div key="cover" className="book-page cover-page overflow-hidden relative print:block">
        {coverImage ? (
          <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          // Fallback when no cover image - show text
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-white">
            <p className="font-serif-display italic text-amber-500 mb-6 text-lg">A Year's History Of</p>
            <h1 className="font-cinzel text-5xl text-amber-50 mb-8 tracking-wider leading-tight">
              {prefs.name}
            </h1>
            <div className="w-12 h-0.5 bg-amber-500/50 mb-8"></div>
            <p className="font-cinzel text-xs text-slate-300 tracking-[0.3em] uppercase">
              Est. {prefs.birthYear}
            </p>
          </div>
        )}
      </div>
    );

    // 2. Introduction Page
    pages.push(<IntroductionPage key="intro" prefs={prefs} prefaceText={currentBook?.prefaceText || prefaceText || undefined} />);

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
            onNarrate={handleNarrateEntry}
            isNarrating={narratingEntryIndex === index && isNarrating}
            isLoadingAudio={narratingEntryIndex === index && isLoadingAudio}
          />
        );
    });

    return pages;
  };

  return (
    <div className="min-h-screen bg-[#EAE8E3] pb-20 print:bg-white print:pb-0 relative">
      {/* Header / Controls - Clean Design */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm no-print">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Back Button */}
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Library</span>
            </button>

            {/* Center: Title + Privacy Badge */}
            <div className="flex items-center gap-2">
              <h2 className="font-cinzel text-lg text-slate-900">
                {prefs.name}
              </h2>
              {isOwner && currentBook && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${localIsPublic ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {localIsPublic ? 'Public' : 'Private'}
                </span>
              )}
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Narration Button */}
              <button
                onClick={() => setShowVoiceSelector(true)}
                className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
                title="Listen to entries"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                disabled={isSharing || !currentBook}
                className={`p-2 rounded-full transition-all ${copied ? 'text-green-600 bg-green-50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                title={copied ? 'Link copied!' : 'Share'}
              >
                {copied ? <Check className="w-4 h-4" /> : isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              </button>

              {/* Download PDF - Primary Action */}
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">PDF</span>
              </button>

              {/* More Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                      {/* Upgrade Option */}
                      {canUpgrade && (
                        <button
                          onClick={() => { setShowUpgradeModal(true); setIsMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
                        >
                          <Zap className="w-4 h-4" /> Upgrade to Full Book
                        </button>
                      )}

                      {/* Owner-only options */}
                      {isOwner && currentBook && (
                        <>
                          {onAddEntry && (
                            <button
                              onClick={() => { setIsAddEntryModalOpen(true); setIsMenuOpen(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Plus className="w-4 h-4" /> Add Entry
                              <span className="ml-auto text-xs text-slate-400">{10 - localAdditionalCount} left</span>
                            </button>
                          )}

                          {onUpdateCover && (
                            <button
                              onClick={() => { setIsEditingBook(true); setIsMenuOpen(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <BookOpen className="w-4 h-4" /> Edit Book
                            </button>
                          )}

                          {onTogglePrivacy && (
                            <button
                              onClick={() => { handleTogglePrivacy(); setIsMenuOpen(false); }}
                              disabled={isTogglingPrivacy}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                              {localIsPublic ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                              {localIsPublic ? 'Make Private' : 'Make Public'}
                            </button>
                          )}

                          <div className="border-t border-slate-100 my-1" />
                        </>
                      )}

                      {/* Download options */}
                      {currentBook && (
                        <button
                          onClick={() => { handleDownloadEpub(); setIsMenuOpen(false); }}
                          disabled={isDownloadingEpub}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          <BookOpen className="w-4 h-4" />
                          {isDownloadingEpub ? 'Creating...' : 'Download EPUB'}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Narration Player Bar - Shows when playing */}
        {(isNarrating || isLoadingAudio) && narratingEntryIndex !== null && (
          <div className="border-t border-slate-200 bg-amber-50 px-4 py-2">
            <div className="max-w-6xl mx-auto flex items-center gap-3">
              <button
                onClick={handleStopNarration}
                className="p-1.5 bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors"
              >
                {isLoadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {entries[narratingEntryIndex]?.headline}
                </p>
                <p className="text-xs text-slate-500">
                  {entries[narratingEntryIndex]?.day}, {entries[narratingEntryIndex]?.year}
                </p>
              </div>

              <button
                onClick={handleSkipToNext}
                disabled={narratingEntryIndex >= entries.length - 1}
                className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 transition-colors"
                title="Next entry"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={continuousPlay}
                  onChange={(e) => setContinuousPlay(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                Auto-play
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Book Content Container */}
      <div ref={componentRef} className="max-w-[210mm] mx-auto mt-10 print:mt-0 print:w-full">
        {renderBookContent()}
        
        {/* End of Book Message */}
        <div className="text-center py-10 no-print">
            <p className="font-serif-display italic text-slate-400">End of Preview</p>
        </div>
      </div>

      {/* Edit Book Modal */}
      {isEditingBook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="font-cinzel text-xl text-slate-900">Edit Book</h3>
                    <button
                        onClick={() => setIsEditingBook(false)}
                        className="text-slate-400 hover:text-slate-600"
                        disabled={isRegeneratingCover || isSavingPreface}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                    {/* Preface Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-700">Preface</label>
                            <button
                                onClick={() => setPrefaceText('')}
                                disabled={isSavingPreface || !prefaceText}
                                className="text-xs text-amber-600 hover:text-amber-700 disabled:opacity-50"
                            >
                                Reset to default
                            </button>
                        </div>
                        <textarea
                            value={prefaceText}
                            onChange={(e) => setPrefaceText(e.target.value)}
                            disabled={isSavingPreface}
                            rows={6}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 resize-none"
                            placeholder={getDefaultPrefaceText(prefs)}
                        />
                        <p className="mt-1 text-xs text-slate-400">
                            Leave empty to use the default preface. Separate paragraphs with blank lines.
                        </p>
                        <button
                            onClick={handleSavePreface}
                            disabled={isSavingPreface}
                            className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all text-sm"
                        >
                            {isSavingPreface ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" /> Save Preface
                                </>
                            )}
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100" />

                    {/* Cover Section */}
                    <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-4">Cover Design</h4>

                        {/* Cover Text Toggle */}
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Type className="w-4 h-4 text-slate-500" />
                                <span className="text-sm font-medium text-slate-700">Include text on cover</span>
                            </div>
                            <button
                                onClick={() => setIncludeCoverText(!includeCoverText)}
                                disabled={isRegeneratingCover}
                                className={`relative w-11 h-6 rounded-full transition-colors ${includeCoverText ? 'bg-amber-500' : 'bg-slate-200'} ${isRegeneratingCover ? 'opacity-50' : ''}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${includeCoverText ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* Cover Text Fields */}
                        {includeCoverText && (
                            <div className="space-y-3 mb-6">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={coverTitle}
                                        onChange={(e) => setCoverTitle(e.target.value)}
                                        disabled={isRegeneratingCover}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
                                        placeholder="On This Day"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Subtitle</label>
                                    <input
                                        type="text"
                                        value={coverSubtitle}
                                        onChange={(e) => setCoverSubtitle(e.target.value)}
                                        disabled={isRegeneratingCover}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
                                        placeholder={`Curated for ${prefs.name}`}
                                    />
                                </div>
                            </div>
                        )}

                        <p className="text-sm text-slate-500 mb-4 font-serif-display italic">
                            Choose an artistic style for the cover.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
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

      {/* Upgrade to Full Book Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-cinzel text-2xl mb-2">Unlock Full Book</h3>
                  <p className="text-amber-100 text-sm">
                    Get all 365 personalized history entries for {prefs.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-white/70 hover:text-white"
                  disabled={isCheckingOut}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-6">
                Your preview has {entries.length} entries. Upgrade to receive a personalized historical entry for every day of the year!
              </p>

              {/* Product Options */}
              <div className="space-y-3 mb-6">
                {/* Digital Only */}
                <button
                  onClick={() => setSelectedProduct('digital')}
                  disabled={isCheckingOut}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedProduct === 'digital'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${selectedProduct === 'digital' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">Digital Only</span>
                        <span className="font-bold text-lg text-slate-900">$4.99</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        365 personalized entries delivered digitally
                      </p>
                    </div>
                  </div>
                </button>

                {/* Printed + Digital */}
                <button
                  onClick={() => setSelectedProduct('printedDigital')}
                  disabled={isCheckingOut}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedProduct === 'printedDigital'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${selectedProduct === 'printedDigital' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">Printed + Digital</span>
                        <span className="font-bold text-lg text-slate-900">$69.99</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        Beautiful hardcover book + digital access
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                        Most Popular
                      </span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleUpgradeCheckout}
                disabled={isCheckingOut}
                className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Redirecting to checkout...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Continue to Checkout
                  </>
                )}
              </button>

              <p className="text-xs text-slate-400 text-center mt-4">
                Secure payment powered by Stripe
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Voice Selector Modal */}
      {showVoiceSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-amber-600" />
                <h3 className="font-cinzel text-lg text-slate-900">Listen to Entries</h3>
              </div>
              <button
                onClick={() => setShowVoiceSelector(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-slate-600 mb-4">
                Choose a voice for narration:
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {GEMINI_VOICES.map((voice) => (
                  <button
                    key={voice}
                    onClick={() => setSelectedVoice(voice)}
                    className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                      selectedVoice === voice
                        ? 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    {voice}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mb-4 p-2 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Auto-play all entries</span>
                <button
                  onClick={() => setContinuousPlay(!continuousPlay)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${continuousPlay ? 'bg-amber-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${continuousPlay ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <button
                onClick={() => {
                  setShowVoiceSelector(false);
                  handleNarrateEntry(0);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
              >
                <Play className="w-4 h-4" /> Start from Beginning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
