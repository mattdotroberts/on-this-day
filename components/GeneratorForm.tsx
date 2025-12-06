import React, { useState, KeyboardEvent } from 'react';
import { UserPreferences, MONTHS, BlendLevel, CoverStyle } from '../types';
import { ArrowRight, X, Plus, Calendar, Settings2, Palette, Book, Camera, Sparkles, Box, Focus, GitMerge } from 'lucide-react';

interface GeneratorFormProps {
  onSubmit: (prefs: UserPreferences) => void;
  isGenerating: boolean;
}

export const GeneratorForm: React.FC<GeneratorFormProps> = ({ onSubmit, isGenerating }) => {
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthDay, setBirthDay] = useState('1');
  const [birthMonth, setBirthMonth] = useState('January');
  const [currentInterest, setCurrentInterest] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [blendLevel, setBlendLevel] = useState<BlendLevel>('focused');
  const [coverStyle, setCoverStyle] = useState<CoverStyle>('classic');

  const addInterest = () => {
    if (currentInterest.trim() && !interests.includes(currentInterest.trim())) {
      setInterests([...interests, currentInterest.trim()]);
      setCurrentInterest('');
    }
  };

  const removeInterest = (tag: string) => {
    setInterests(interests.filter(i => i !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addInterest();
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      if (val > 31) setBirthDay('31');
      else if (val < 1) setBirthDay('1');
      else setBirthDay(val.toString());
    } else {
      setBirthDay('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && interests.length > 0 && birthYear) {
      onSubmit({ 
        name, 
        birthYear, 
        birthDay,
        birthMonth,
        interests, 
        blendLevel,
        coverStyle
      });
    }
  };

  const coverStyles: { id: CoverStyle; label: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'classic', label: 'Antique', desc: 'Leather-bound, gold leaf, timeless.', icon: <Book className="w-5 h-5"/> },
    { id: 'minimalist', label: 'Modern', desc: 'Clean, abstract, geometric.', icon: <Box className="w-5 h-5"/> },
    { id: 'whimsical', label: 'Whimsical', desc: 'Hand-drawn, watercolor, magical.', icon: <Sparkles className="w-5 h-5"/> },
    { id: 'cinematic', label: 'Cinematic', desc: 'Dramatic lighting, realistic.', icon: <Camera className="w-5 h-5"/> },
    { id: 'retro', label: 'Retro', desc: 'Vintage poster, bold colors.', icon: <Palette className="w-5 h-5"/> },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] p-4 py-12">
      <div className="w-full max-w-2xl bg-white p-8 md:p-12 rounded-2xl shadow-2xl border border-amber-100">
        <h2 className="font-cinzel text-3xl text-slate-900 mb-2">Craft Your Chronicle</h2>
        <p className="text-slate-500 mb-8 font-serif-display italic">Tell us who this story belongs to.</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Name Input */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 uppercase tracking-wider">
              Recipient's First Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border-b-2 border-slate-200 p-3 text-xl font-serif-display text-slate-900 focus:outline-none focus:border-amber-600 transition-colors"
              placeholder="e.g. Eleanor"
              required
            />
          </div>

          {/* Date of Birth Section */}
          <div>
            <label className="block text-sm font-medium text-slate-700 uppercase tracking-wider mb-3">
               Date of Birth <span className="text-slate-400 font-normal normal-case ml-2">(Used for Reading Level & Starting Date)</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
               <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold uppercase">Month</label>
                  <select 
                    value={birthMonth} 
                    onChange={(e) => setBirthMonth(e.target.value)}
                    className="w-full bg-transparent border-b border-slate-300 p-2 text-lg font-serif-display text-slate-900 focus:outline-none focus:border-amber-600"
                  >
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
               </div>
               <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold uppercase">Day</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={birthDay}
                    onChange={handleDayChange}
                    className="w-full bg-transparent border-b border-slate-300 p-2 text-lg font-serif-display text-slate-900 focus:outline-none focus:border-amber-600"
                    placeholder="1"
                    required
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold uppercase">Year</label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    placeholder="2000"
                    required
                    className="w-full bg-transparent border-b border-slate-300 p-2 text-lg font-serif-display text-slate-900 focus:outline-none focus:border-amber-600"
                  />
               </div>
            </div>
          </div>

          {/* Interests Input */}
          <div className="space-y-2">
            <label htmlFor="interests" className="block text-sm font-medium text-slate-700 uppercase tracking-wider">
              Passions & Interests
            </label>
            <div className="flex gap-2">
              <input
                id="interests"
                type="text"
                value={currentInterest}
                onChange={(e) => setCurrentInterest(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-slate-50 border-b-2 border-slate-200 p-3 text-lg font-serif-display text-slate-900 focus:outline-none focus:border-amber-600"
                placeholder="e.g. Jazz, Victorian History, Gardening"
              />
              <button
                type="button"
                onClick={addInterest}
                className="p-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4 min-h-[40px]">
              {interests.length === 0 && (
                <span className="text-slate-400 italic text-sm py-2">Add at least one interest...</span>
              )}
              {interests.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-sm">
                  {tag}
                  <button type="button" onClick={() => removeInterest(tag)} className="hover:text-amber-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Cover Style Selection */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
             <label className="flex items-center gap-2 text-sm font-medium text-slate-700 uppercase tracking-wider">
               <Book className="w-4 h-4" /> Cover Art Style
             </label>
             <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {coverStyles.map(style => (
                    <button
                        key={style.id}
                        type="button"
                        onClick={() => setCoverStyle(style.id)}
                        className={`p-3 rounded-lg border-2 text-center flex flex-col items-center justify-center transition-all h-full ${coverStyle === style.id ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                    >
                        <div className={`mb-2 ${coverStyle === style.id ? 'text-amber-600' : 'text-slate-400'}`}>
                            {style.icon}
                        </div>
                        <div className="font-semibold text-xs uppercase tracking-wide mb-1">{style.label}</div>
                        <div className="text-[10px] opacity-70 leading-tight hidden md:block">{style.desc}</div>
                    </button>
                ))}
             </div>
          </div>

          {/* Blending Level */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
             <label className="flex items-center gap-2 text-sm font-medium text-slate-700 uppercase tracking-wider">
               <Settings2 className="w-4 h-4" /> Content Strategy
             </label>
             <p className="text-xs text-slate-500 italic mb-2">Every chapter will be strictly related to your chosen interests.</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                   type="button"
                   onClick={() => setBlendLevel('focused')}
                   className={`p-5 rounded-lg border-2 text-left transition-all flex gap-4 items-start ${blendLevel === 'focused' ? 'border-amber-600 bg-amber-50' : 'border-slate-100 hover:border-slate-200'}`}
                >
                   <div className={`mt-1 p-2 rounded-full ${blendLevel === 'focused' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                     <Focus className="w-5 h-5" />
                   </div>
                   <div>
                       <div className="font-semibold text-slate-900 mb-1">Singular Focus</div>
                       <div className="text-sm text-slate-500 leading-snug">
                           Each chapter dives deep into <strong>one specific interest</strong> at a time. Perfect for clear, distinct stories.
                       </div>
                   </div>
                </button>
                <button
                   type="button"
                   onClick={() => setBlendLevel('diverse')}
                   className={`p-5 rounded-lg border-2 text-left transition-all flex gap-4 items-start ${blendLevel === 'diverse' ? 'border-amber-600 bg-amber-50' : 'border-slate-100 hover:border-slate-200'}`}
                >
                   <div className={`mt-1 p-2 rounded-full ${blendLevel === 'diverse' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                     <GitMerge className="w-5 h-5" />
                   </div>
                   <div>
                       <div className="font-semibold text-slate-900 mb-1">Interwoven (Diverse)</div>
                       <div className="text-sm text-slate-500 leading-snug">
                           Each chapter attempts to <strong>bridge multiple interests</strong> together. Perfect for finding surprising connections.
                       </div>
                   </div>
                </button>
             </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <button
              type="submit"
              disabled={isGenerating || !name || interests.length === 0 || !birthYear}
              className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white font-medium text-lg tracking-wide hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Researching History...
                </span>
              ) : (
                <>
                  Generate Book <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
