import type { ClientBookEntry } from '@/lib/types';
import { ExternalLink, Library, Gift, RefreshCw, Volume2, Loader2 } from 'lucide-react';

interface EntryCardProps {
  entry: ClientBookEntry;
  index: number;
  isBirthday?: boolean;
  birthdayMessage?: string;
  isOwner?: boolean;
  isRegenerating?: boolean;
  onRegenerate?: (index: number) => void;
  onNarrate?: (index: number) => void;
  isNarrating?: boolean;
  isLoadingAudio?: boolean;
}

export const EntryCard = ({ entry, index, isBirthday, birthdayMessage, isOwner, isRegenerating, onRegenerate, onNarrate, isNarrating, isLoadingAudio }: EntryCardProps) => {
  return (
    <div className="book-page">
      <div className="book-shadow-spine"></div>
      
      {/* Header with Date */}
      <div className="flex flex-col items-center mb-4 border-b border-amber-100 pb-3 mt-1 shrink-0 relative">
        <span className="font-serif-display italic text-slate-500 text-xs mb-1">
            entry no. {index + 1}
        </span>
        <h3 className="font-cinzel text-lg text-slate-900 uppercase tracking-widest flex items-baseline gap-2">
            <span>{entry.day}</span>
            <span className="text-amber-700 font-bold text-base decoration-2 underline decoration-amber-200 decoration-wavy underline-offset-4">{entry.year}</span>
        </h3>

        {/* Action buttons - top right corner */}
        <div className="absolute top-0 right-0 flex items-center gap-1 print:hidden">
          {/* Play button for narration */}
          {onNarrate && (
            <button
              onClick={() => onNarrate(index)}
              disabled={isLoadingAudio}
              className={`p-1.5 rounded-full transition-colors ${
                isNarrating
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
              } disabled:opacity-50`}
              title={isNarrating ? 'Playing...' : 'Listen to this entry'}
            >
              {isLoadingAudio ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Volume2 className={`w-3.5 h-3.5 ${isNarrating ? 'animate-pulse' : ''}`} />
              )}
            </button>
          )}

          {/* Regenerate button - owner only */}
          {isOwner && onRegenerate && (
            <button
              onClick={() => onRegenerate(index)}
              disabled={isRegenerating}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors disabled:opacity-50"
              title="Regenerate this entry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content - Flex grow to fill space */}
      <div className="entry-content flex flex-col justify-start px-4">
        <h4 className="font-serif-display text-xl font-bold text-slate-800 mb-4 leading-tight text-center shrink-0">
            {entry.headline}
        </h4>

        {/* Main Text Body - Smaller text for better fit */}
        <div className="text-justify font-serif-display text-sm leading-relaxed text-slate-700 mb-4 w-full">
            <p className="drop-cap">
                {entry.historyEvent}
            </p>
        </div>

        {/* Birthday Message - Show only on birthday entry */}
        {isBirthday && birthdayMessage && (
            <div className="mt-auto mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-3 h-3 text-amber-600" />
                    <span className="font-cinzel text-[9px] text-amber-700 uppercase tracking-widest">Personal Note</span>
                </div>
                <p className="text-xs text-amber-900 italic leading-relaxed font-serif-display">
                    "{birthdayMessage}"
                </p>
            </div>
        )}

        {/* Connections Section - Name Link Only if exists */}
        {entry.nameLink && (
            <div className="mt-auto mb-2 relative pl-3 border-l-2 border-slate-200 py-1">
                <h5 className="font-cinzel text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">
                    Name Sake
                </h5>
                <p className="text-xs text-slate-600 italic leading-snug">
                    {entry.nameLink}
                </p>
            </div>
        )}
      </div>

      {/* Footer / Sources */}
      <div className="mt-auto pt-3 pb-1 border-t border-slate-100 shrink-0 px-4">
        {entry.sources && entry.sources.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mb-2">
            <span className="flex items-center gap-1 text-[9px] text-slate-400 uppercase tracking-wider font-cinzel">
              <Library className="w-2.5 h-2.5" /> Sources:
            </span>
            {entry.sources.map((source, i) => (
               <a
                 key={i}
                 href={source.url}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-center gap-0.5 text-[9px] text-slate-500 hover:text-amber-700 hover:underline decoration-amber-300 transition-colors font-serif-display italic"
               >
                 [{i + 1}] {source.title.length > 25 ? source.title.slice(0, 25) + '...' : source.title}
                 <ExternalLink className="w-2 h-2 opacity-50" />
               </a>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
