'use client';

import { useEffect, useState } from 'react';
import { Hourglass, Search, PenTool, Book, CheckCircle2 } from 'lucide-react';

interface ProcessingScreenProps {
  isGenerating: boolean;
}

const LOG_MESSAGES = [
  "Opening the Archives...",
  "Consulting Ancient Maps...",
  "Reviewing the 19th Century...",
  "Scanning for Birth Records...",
  "Connecting Stars to Stories...",
  "Found an event in 1842...",
  "Drafting Chapter: January...",
  "Drafting Chapter: March...",
  "Drafting Chapter: July...",
  "Adding Personal Touches...",
  "Binding the Pages...",
  "Polishing the Cover...",
];

export const ProcessingScreen = ({ isGenerating }: ProcessingScreenProps) => {
  const [currentLog, setCurrentLog] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      setCurrentLog((prev) => {
        if (prev < LOG_MESSAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1500); // Change log every 1.5 seconds

    return () => clearInterval(interval);
  }, [isGenerating]);

  // Keep a running list of visible logs (last 3)
  useEffect(() => {
    setLogs(prev => {
      const newLogs = [...prev, LOG_MESSAGES[currentLog]];
      if (newLogs.length > 4) return newLogs.slice(newLogs.length - 4);
      return newLogs;
    });
  }, [currentLog]);

  return (
    <div className="fixed inset-0 z-50 bg-[#FDFBF7] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        
        {/* Animated Icon Container */}
        <div className="relative w-24 h-24 mx-auto mb-10">
          <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-20"></div>
          <div className="absolute inset-0 border-2 border-amber-200 rounded-full animate-[spin_10s_linear_infinite]"></div>
          <div className="absolute inset-2 border border-slate-200 rounded-full animate-[spin_8s_linear_infinite_reverse]"></div>
          
          <div className="absolute inset-0 flex items-center justify-center text-amber-700">
             {currentLog < 3 && <Search className="w-8 h-8 animate-bounce" />}
             {currentLog >= 3 && currentLog < 7 && <Hourglass className="w-8 h-8 animate-pulse" />}
             {currentLog >= 7 && currentLog < 10 && <PenTool className="w-8 h-8 animate-bounce" />}
             {currentLog >= 10 && <Book className="w-8 h-8 animate-pulse" />}
          </div>
        </div>

        <h2 className="font-cinzel text-3xl text-slate-900 mb-2">Creating Your Book</h2>
        <p className="font-serif-display italic text-slate-500 mb-12">Please wait while we curate history...</p>

        {/* Dynamic Log Output */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xl min-h-[160px] flex flex-col justify-end items-start overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-white to-transparent z-10"></div>
          
          {logs.map((log, idx) => (
            <div 
              key={`${log}-${idx}`} 
              className={`flex items-center gap-3 w-full transition-all duration-500 ${idx === logs.length - 1 ? 'opacity-100 translate-y-0' : 'opacity-40 -translate-y-1'}`}
            >
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${idx === logs.length - 1 ? 'bg-amber-100' : 'bg-slate-50'}`}>
                {idx === logs.length - 1 ? (
                   <span className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></span>
                ) : (
                   <CheckCircle2 className="w-3 h-3 text-slate-300" />
                )}
              </div>
              <span className={`font-mono text-sm ${idx === logs.length - 1 ? 'text-amber-900 font-medium' : 'text-slate-400'}`}>
                {log}
              </span>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mt-8 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-slate-900 transition-all duration-1000 ease-out"
            style={{ width: `${Math.min((currentLog / (LOG_MESSAGES.length - 1)) * 100, 95)}%` }}
          ></div>
        </div>

      </div>
    </div>
  );
};
