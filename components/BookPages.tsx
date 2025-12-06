import React from 'react';
import { UserPreferences } from '../types';
import { 
  Music, Globe, Anchor, Camera, Palette, Cpu, Plane, Dna, Trophy, Zap, 
  Heart, Star, Sun, Moon, Cloud, Flower, Coffee, BookOpen, Smile, Gamepad2,
  Feather, Compass
} from 'lucide-react';

// --- Icon Selection Logic ---
const ICONS = [
  Music, Globe, Anchor, Camera, Palette, Cpu, Plane, Dna, Trophy, Zap, 
  Heart, Star, Sun, Moon, Cloud, Flower, Coffee, BookOpen, Smile, Gamepad2, 
  Feather, Compass
];

const getIconForInterest = (interest: string) => {
  // Simple deterministic hash to pick an icon based on the string
  let hash = 0;
  for (let i = 0; i < interest.length; i++) {
    hash = interest.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ICONS.length;
  return ICONS[index];
};

// --- Components ---

interface IntroductionPageProps {
  prefs: UserPreferences;
}

export const IntroductionPage: React.FC<IntroductionPageProps> = ({ prefs }) => {
  return (
    <div className="book-page">
      <div className="book-shadow-spine"></div>
      
      <div className="h-full flex flex-col justify-center items-center text-center px-6">
        <div className="mb-8 text-amber-600">
           <Compass className="w-12 h-12 stroke-[1]" />
        </div>

        <h2 className="font-cinzel text-2xl text-slate-900 mb-6 tracking-wide">
          Preface
        </h2>

        <div className="font-serif-display text-slate-700 leading-loose space-y-6 text-justify">
          <p>
            History is often told through the movements of armies and the declarations of kings. 
            But there is another kind of history—the quiet, personal alignment of the stars on the day a new journey begins.
          </p>
          <p>
            This book is a chronicle of the year <strong>{prefs.birthYear}</strong>. 
            It was a year of invention, culture, and change. But most importantly, it was the year 
            that welcomed <strong>{prefs.name}</strong> to the world.
          </p>
          <p>
            We have woven together the threads of world events with the personal passions of 
            {prefs.interests.join(", ")} to create a tapestry of time, dedicated specifically to you.
          </p>
        </div>

        <div className="mt-12 w-16 h-px bg-slate-300"></div>
        <p className="mt-4 font-cinzel text-xs text-slate-400 uppercase tracking-widest">
            Prepared by Chronos
        </p>
      </div>
    </div>
  );
};

interface ChapterPageProps {
  month: string;
  interest: string;
}

export const ChapterPage: React.FC<ChapterPageProps> = ({ month, interest }) => {
  const Icon = getIconForInterest(interest);

  return (
    <div className="book-page">
      <div className="book-shadow-spine"></div>
      
      <div className="h-full flex flex-col justify-center items-center relative border-4 border-double border-slate-100 m-4">
        
        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-200"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-200"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-200"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-200"></div>

        <div className="text-amber-700/80 mb-8 opacity-80">
          <Icon className="w-16 h-16 stroke-[1]" />
        </div>

        <h2 className="font-cinzel text-4xl text-slate-900 tracking-[0.2em] uppercase mb-4">
          {month}
        </h2>
        
        <p className="font-serif-display italic text-slate-400 text-sm">
           The Chronicle Continues
        </p>
      </div>
    </div>
  );
};
