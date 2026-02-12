
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const DistressMeter: React.FC = () => {
  const [level, setLevel] = useState<number | null>(null);
  const [showGrounding, setShowGrounding] = useState(false);

  const groundingExercises = [
    { title: '5-4-3-2-1 Technique', desc: 'Identify 5 things you see, 4 you can touch, 3 you hear, 2 you can smell, and 1 you can taste.' },
    { title: 'Square Breathing', desc: 'Inhale for 4, hold for 4, exhale for 4, hold for 4. Repeat 4 times.' },
    { title: 'Body Scan', desc: 'Notice the weight of your body on the chair. Start from your toes and move up to your head.' }
  ];

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-xl shadow-inner">
          <i className="fa-solid fa-bolt-lightning"></i>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Distress Meter</h3>
          <p className="text-sm text-slate-500 font-medium">How intense are your symptoms right now?</p>
        </div>
      </div>

      {!showGrounding ? (
        <div className="space-y-8">
          <div className="flex justify-between items-end gap-1 h-32">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => setLevel(num)}
                className={`flex-1 rounded-xl transition-all flex flex-col items-center justify-end pb-3 gap-2 ${
                  level === num 
                    ? 'bg-rose-500 text-white shadow-lg scale-110 h-full' 
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100 h-[80%]'
                }`}
              >
                <span className="text-xs font-black">{num}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
            <span>Relaxed</span>
            <span>Intense</span>
          </div>

          <button
            disabled={level === null}
            onClick={() => level && level > 5 ? setShowGrounding(true) : alert("Recorded. Try to stay present.")}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {level && level > 5 ? 'Get Grounding Support' : 'Check In'}
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl">
            <h4 className="font-bold text-rose-900 mb-2 flex items-center gap-2">
              <i className="fa-solid fa-wind"></i>
              Grounding Suggestion
            </h4>
            <p className="text-sm text-rose-700 leading-relaxed font-medium">
              Your distress level is high ({level}). Let's try to anchor yourself in the present moment.
            </p>
          </div>

          <div className="space-y-3">
            {groundingExercises.map((ex, i) => (
              <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-rose-200 transition-all cursor-pointer group">
                <div className="flex justify-between items-center mb-1">
                  <h5 className="font-bold text-slate-800 text-sm">{ex.title}</h5>
                  <i className="fa-solid fa-play text-[10px] text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{ex.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => setShowGrounding(false)}
              className="flex-1 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-800"
            >
              I feel better
            </button>
            <NavLink to="/mindfulness" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold text-center shadow-lg shadow-indigo-100">
              Guided Audio
            </NavLink>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistressMeter;
