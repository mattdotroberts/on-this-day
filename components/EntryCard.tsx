import React from 'react';
import { BookEntry } from '../types';
import { ExternalLink, Library } from 'lucide-react';

interface EntryCardProps {
  entry: BookEntry;
  index: number;
}

export const EntryCard: React.FC<EntryCardProps> = ({ entry, index }) => {
  return (
    <div className="book-page">
      <div className="book-shadow-spine"></div>
      
      {/* Header with Date */}
      <div className="flex flex-col items-center mb-6 border-b border-amber-100 pb-4 mt-2 shrink-0">
        <span className="font-serif-display italic text-slate-500 text-sm mb-1">
            entry no. {index + 1}
        </span>
        <h3 className="font-cinzel text-2xl text-slate-900 uppercase tracking-widest flex items-baseline gap-3">
            <span>{entry.day}</span>
            <span className="text-amber-700 font-bold text-lg decoration-2 underline decoration-amber-200 decoration-wavy underline-offset-4">{entry.year}</span>
        </h3>
      </div>

      {/* Main Content Content - Flex grow to fill space */}
      <div className="flex-grow flex flex-col justify-start px-8">
        <h4 className="font-serif-display text-2xl font-bold text-slate-800 mb-6 leading-tight text-center shrink-0">
            {entry.headline}
        </h4>
        
        {/* Main Text Body - No scroll, standard print layout */}
        <div className="prose prose-slate text-justify font-serif-display text-base leading-loose text-slate-700 mb-6 w-full">
            <p className="first-letter:text-5xl first-letter:font-cinzel first-letter:text-amber-800 first-letter:mr-3 first-letter:float-left first-letter:leading-[0.8]">
                {entry.historyEvent}
            </p>
        </div>

        {/* Connections Section - Name Link Only if exists */}
        {entry.nameLink && (
            <div className="mt-auto mb-4 relative pl-4 border-l-2 border-slate-200 py-1">
                <h5 className="font-cinzel text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                    Name Sake
                </h5>
                <p className="text-sm text-slate-600 italic leading-snug">
                    {entry.nameLink}
                </p>
            </div>
        )}
      </div>

      {/* Footer / Sources */}
      <div className="mt-auto pt-4 pb-2 border-t border-slate-100 shrink-0 px-8">
        {entry.sources && entry.sources.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-3">
            <span className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider font-cinzel">
              <Library className="w-3 h-3" /> Sources:
            </span>
            {entry.sources.map((source, i) => (
               <a 
                 key={i} 
                 href={source.url} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-amber-700 hover:underline decoration-amber-300 transition-colors font-serif-display italic"
               >
                 {source.title} <ExternalLink className="w-2 h-2 opacity-50" />
               </a>
            ))}
          </div>
        )}
        
        <div className="flex justify-center items-center text-[10px] text-slate-300 font-cinzel tracking-[0.2em]">
            <span className="opacity-50 mx-2">~</span>
            <span>{entry.whyIncluded}</span>
            <span className="opacity-50 mx-2">~</span>
        </div>
      </div>
    </div>
  );
};
