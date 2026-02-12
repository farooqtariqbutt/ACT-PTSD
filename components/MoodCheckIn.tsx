
import React, { useState } from 'react';

interface MoodCheckInProps {
  onComplete: (score: number) => void;
  sessionNumber: number;
}

const MoodCheckIn: React.FC<MoodCheckInProps> = ({ onComplete, sessionNumber }) => {
  const [mood, setMood] = useState<number | null>(null);

  const moodOptions = [
    { value: 1, label: 'Very Low', emoji: '😞' },
    { value: 2, label: 'Low', emoji: '😕' },
    { value: 3, label: 'Stable', emoji: '😐' },
    { value: 4, label: 'Good', emoji: '🙂' },
    { value: 5, label: 'Excellent', emoji: '✨' },
  ];

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-12">
        <span className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
          Session {sessionNumber} • Step 1
        </span>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">How are you feeling right now?</h2>
        <p className="text-slate-500 mt-2">Checking in with your mood helps us tailor this session to your needs.</p>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-12">
        {moodOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setMood(opt.value)}
            className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 group ${
              mood === opt.value
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100'
                : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-4xl group-hover:scale-110 transition-transform">{opt.emoji}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${mood === opt.value ? 'text-indigo-100' : 'text-slate-400'}`}>
              {opt.label}
            </span>
          </button>
        ))}
      </div>

      <button
        disabled={mood === null}
        onClick={() => mood !== null && onComplete(mood)}
        className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        Continue to Session Content
        <i className="fa-solid fa-arrow-right text-sm"></i>
      </button>

      <p className="text-center text-xs text-slate-400 mt-8 italic">
        "Your feelings are valid indicators, not absolute commands."
      </p>
    </div>
  );
};

export default MoodCheckIn;
