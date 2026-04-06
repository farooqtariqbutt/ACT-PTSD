import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const ValuesTool: React.FC = () => {
  const { currentUser: user, themeClasses } = useApp();
  
  const [s7FocusValue, setS7FocusValue] = useState<string>('');
  const [s7Goal, setS7Goal] = useState<any>(null);
  const [s7Barriers, setS7Barriers] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<any[]>([]); // NEW STATE

  const isSession7Completed = 
    (user?.currentSession && user.currentSession > 7) || 
    user?.sessionHistory?.some((s: any) => s.sessionNumber === 7 && (s.status === 'COMPLETED' || s.completed === true));

  useEffect(() => {
    if (!isSession7Completed) return;

    const fetchCompassData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/value/session7-values`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        
        if (json.unlocked && json.data) {
          setS7FocusValue(json.data.s7SelectedValue);
          setS7Goal(json.data.s7SmartGoal);
          setS7Barriers(json.data.s7Barriers);
          setSelectedDomains(json.data.selectedDomains || []); // SET DOMAINS
        }
      } catch (err) {
        console.error("Failed to fetch compass data", err);
      }
    };

    fetchCompassData();
  }, [isSession7Completed]);

  if (!isSession7Completed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-slate-50 text-slate-400 rounded-[2rem] flex items-center justify-center text-4xl shadow-sm border border-slate-200">
          <i className="fa-solid fa-lock"></i>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-3">Feature Locked</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            The <strong className={themeClasses.text}>Values Compass</strong> unlocks automatically after you complete <strong className={themeClasses.text}>Session 7</strong>. Keep progressing through your clinical <strong className={themeClasses.text}>Recovery Path!</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      <header className={`${themeClasses.primary} rounded-2xl p-8 text-white shadow-lg`}>
        <h2 className="text-3xl font-bold mb-2">My Values & Compass</h2>
        <p className="text-white/80">"Values are like a lighthouse; they guide our direction but we never actually arrive at them."</p>
      </header>

      {s7Goal ? (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Header Area */}
          <div className="bg-indigo-600 p-8 text-white">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-200 mb-2">My Focus Value</h3>
                <h2 className="text-3xl font-black">{s7FocusValue}</h2>
              </div>
              
              {/* DOMAINS BADGES DISPLAYED HERE */}
              {selectedDomains.length > 0 && (
                <div className="flex gap-2">
                  {selectedDomains.map(d => (
                    <span key={d.id} className="px-3 py-1.5 bg-indigo-500/50 text-white rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-400/50 flex items-center gap-2">
                      <i className={`fa-solid ${d.icon}`}></i> {d.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <p className="text-sm font-medium text-indigo-100 mt-6 pt-6 border-t border-indigo-500/50">
              <i className="fa-solid fa-bullseye mr-2"></i>
              Below is the SMART Action Plan you committed to in Session 7.
            </p>
          </div>

          {/* SMART Breakdown Area */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">S - Specific</p>
                <p className="text-sm font-bold text-slate-800">{s7Goal.specific}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">M - Measurable</p>
                <p className="text-sm font-bold text-slate-800">{s7Goal.measurable}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">A - Achievable</p>
                <p className="text-sm font-bold text-slate-800">{s7Goal.achievable === true || s7Goal.achievable === 'true' ? 'Yes, I can do this.' : s7Goal.achievable}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">R - Relevant</p>
                <p className="text-sm font-bold text-slate-800">{s7Goal.relevant}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-2">T - Timebound</p>
                <p className="text-sm font-bold text-slate-800">{s7Goal.timebound}</p>
              </div>
            </div>

            {/* Barriers Area */}
            {s7Barriers && s7Barriers.length > 0 && (
              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <i className="fa-solid fa-shield-halved text-rose-400"></i>
                  Anticipated Barriers
                </h3>
                <div className="flex flex-wrap gap-2">
                  {s7Barriers.map((barrier, idx) => (
                    <span key={idx} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-full text-xs font-bold border border-rose-100">
                      {barrier}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 bg-white rounded-[2rem] border border-slate-200 text-center shadow-sm">
          <i className="fa-solid fa-compass text-4xl text-slate-200 mb-4"></i>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No SMART Goal Found</h3>
          <p className="text-sm text-slate-500">It looks like you didn't save a SMART goal during Session 7.</p>
        </div>
      )}
    </div>
  );
};

export default ValuesTool;