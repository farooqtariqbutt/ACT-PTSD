
import React, { useState } from 'react';
import { generateDefusionTechniques } from '../services/geminiService';
import { DefusionTechnique } from '../types';

const DefusionLab: React.FC = () => {
  const [thought, setThought] = useState('');
  const [loading, setLoading] = useState(false);
  const [techniques, setTechniques] = useState<DefusionTechnique[]>([]);

  const handleDefuse = async () => {
    if (!thought.trim()) return;
    setLoading(true);
    try {
      const result = await generateDefusionTechniques(thought);
      setTechniques(result);
    } catch (err) {
      alert("Failed to defuse thought. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <section className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Defusion Lab</h2>
            <p className="text-slate-400 text-sm italic">"Don't believe everything you think."</p>
          </div>
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center">
            <i className="fa-solid fa-cloud-bolt text-2xl"></i>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">Type a thought that has you "hooked":</label>
            <textarea 
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              placeholder="e.g., I'll never get better... I'm a failure... People think I'm weak..."
              className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
            />
          </div>

          <button 
            onClick={handleDefuse}
            disabled={loading || !thought.trim()}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <><img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-5 h-5 brain-loading-img" /> Analyzing thought patterns...</> : <><i className="fa-solid fa-scissors"></i> Defuse This Thought</>}
          </button>
        </div>
      </section>

      {techniques.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {techniques.map((t, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 flex flex-col">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Technique #{idx+1}</span>
              <h3 className="text-lg font-bold text-slate-800 mb-3">{t.name}</h3>
              <p className="text-xs text-slate-500 mb-4 flex-1">{t.description}</p>
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-xs font-bold text-indigo-700 mb-2 uppercase tracking-tighter">Try this now:</p>
                <p className="text-sm text-slate-700 leading-relaxed italic">{t.exercise}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DefusionLab;