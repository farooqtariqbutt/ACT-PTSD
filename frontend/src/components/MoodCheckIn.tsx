import React, { useState } from 'react';
import { DISTRESS_SCALE } from '../../types'; // Adjust path if needed
import { useApp } from '../context/AppContext';

interface MoodCheckInProps {
  onComplete: (distress: number) => void;
  sessionNumber: number;
}

const MoodCheckIn: React.FC<MoodCheckInProps> = ({ onComplete, sessionNumber }) => {
  const { themeClasses } = useApp();
  const [distress, setDistress] = useState<number | null>(null);

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-12">
        <span className={`inline-block px-4 py-1.5 ${themeClasses.secondary} ${themeClasses.text} rounded-full text-[10px] font-black uppercase tracking-widest mb-4`}>
          Session {sessionNumber} • Step 1
        </span>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Current Distress Level</h2>
        <p className="text-slate-500 mt-2">Checking in with your distress level helps us tailor this session to your needs.</p>
      </div>

      {/* ── Distress Scale Grid ── */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm mb-12 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {DISTRESS_SCALE.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDistress(opt.value)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${
                distress === opt.value
                  ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-100'
                  : 'bg-slate-50 border-transparent hover:border-rose-200 hover:bg-white'
              }`}
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{opt.emoji}</span>
              <div className="text-center">
                <span className={`block text-[8px] font-black uppercase tracking-tighter ${distress === opt.value ? 'text-rose-100' : 'text-slate-400'}`}>
                  Level {opt.value}
                </span>
                <span className={`block text-[7px] font-bold leading-tight mt-0.5 ${distress === opt.value ? 'text-white' : 'text-slate-500'}`}>
                  {opt.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Submission Button ── */}
      <button
        disabled={distress === null}
        onClick={() => distress !== null && onComplete(distress)}
        className={`w-full py-5 ${themeClasses.button} rounded-2xl font-black text-lg shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3`}
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