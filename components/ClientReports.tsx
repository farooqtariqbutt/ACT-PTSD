
import React, { useState } from 'react';

interface CompletedSession {
  id: string;
  number: number;
  title: string;
  date: string;
  reflection: string;
  outcome: string;
}

const COMPLETED_SESSIONS: CompletedSession[] = [
  { 
    id: 's3', 
    number: 3, 
    title: 'Unhooking from Thoughts (Diffusion 1)', 
    date: 'Oct 24, 2023', 
    reflection: 'I realized that the thought "I am a burden" is just words. Using the "Milk, Milk, Milk" exercise helped take the power out of it.',
    outcome: 'Improved cognitive distance; reduced fusion with negative self-labels.'
  },
  { 
    id: 's2', 
    number: 2, 
    title: 'Willingness & Acceptance', 
    date: 'Oct 17, 2023', 
    reflection: 'Practiced sitting with the tightness in my chest. It didn\'t disappear, but it didn\'t stop me from going to the grocery store.',
    outcome: 'Increased behavioral persistence despite physical anxiety symptoms.'
  },
  { 
    id: 's1', 
    number: 1, 
    title: 'Creative Hopelessness', 
    date: 'Oct 10, 2023', 
    reflection: 'Started to see how my "fighting" against the memories was actually making them stick around longer. Hard pill to swallow.',
    outcome: 'Identified avoidance patterns; established baseline for therapy readiness.'
  },
];

const ClientReports: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Recovery Journey</h2>
          <p className="text-sm text-slate-500 font-medium">Visualizing your psychological flexibility and symptom trends.</p>
        </div>
        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
        >
          {isExporting ? (
            <><img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-5 h-5 brain-loading-img" /> Generating PDF...</>
          ) : (
            <><i className="fa-solid fa-file-pdf text-rose-500"></i> Export Recovery Report</>
          )}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Chart */}
          <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">PCL-5 Symptom Trend</h3>
                <p className="text-xs text-slate-400 font-medium">Last 8 weeks of clinical assessments</p>
              </div>
              <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span> My Score</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-slate-100 rounded-full"></span> Clinic Baseline</span>
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between px-2 relative border-b border-slate-100 mb-4">
              {[55, 52, 58, 48, 42, 35, 30, 28].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                  <div className="w-full max-w-[40px] bg-slate-50 rounded-t-lg absolute bottom-0 h-full opacity-50"></div>
                  <div 
                    className="w-full max-w-[24px] bg-indigo-500 rounded-t-lg relative z-10 transition-all duration-1000 ease-out hover:bg-indigo-600 cursor-pointer" 
                    style={{ height: `${val}%` }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black py-1.5 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                      Score: {val}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold mt-4">Oct {i+1}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-circle-check text-emerald-500"></i>
                <p className="text-sm font-bold text-indigo-900">Clinically Significant Improvement</p>
              </div>
              <span className="text-xs font-black text-indigo-600 bg-white px-3 py-1 rounded-lg">-27 pts</span>
            </div>
          </section>

          {/* Session Log Section */}
          <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800 text-xl flex items-center gap-3">
                  <i className="fa-solid fa-book-medical text-indigo-500"></i>
                  Session Completion Log
                </h3>
                <p className="text-sm text-slate-400 font-medium">A chronological history of your therapy modules and insights.</p>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                {COMPLETED_SESSIONS.length} / 12 Modules
              </span>
            </div>
            
            <div className="space-y-6">
              {COMPLETED_SESSIONS.map((session) => (
                <div key={session.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] hover:border-indigo-200 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                    <i className="fa-solid fa-check-double text-8xl"></i>
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center border border-slate-100 shrink-0 group-hover:scale-105 transition-transform">
                        <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Mod</span>
                        <span className="text-xl font-black text-indigo-600 leading-none">{session.number}</span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg font-black text-slate-800 tracking-tight">{session.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <i className="fa-solid fa-calendar-day"></i>
                          {session.date}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 w-fit">
                      <i className="fa-solid fa-circle-check"></i>
                      Verified Completion
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200/50 relative z-10">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                        <i className="fa-solid fa-comment-dots"></i>
                        Personal Reflection
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                        "{session.reflection}"
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                        <i className="fa-solid fa-bullseye"></i>
                        Clinical Outcome
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        {session.outcome}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full py-5 border-2 border-dashed border-slate-200 text-slate-400 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center justify-center gap-3">
              <i className="fa-solid fa-clock-rotate-left"></i>
              Load Previous History
            </button>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
               <i className="fa-solid fa-location-crosshairs text-7xl"></i>
            </div>
            <h3 className="text-xl font-bold mb-6">Value Alignment</h3>
            <div className="space-y-6">
              {[
                { label: 'Health', value: 92, color: 'bg-emerald-400' },
                { label: 'Growth', value: 65, color: 'bg-sky-400' },
                { label: 'Family', value: 40, color: 'bg-rose-400' },
              ].map(v => (
                <div key={v.label} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                    <span>{v.label}</span>
                    <span>{v.value}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${v.color} rounded-full transition-all duration-1000`} style={{ width: `${v.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-8 text-xs text-slate-400 leading-relaxed italic">Values aren't goals; they are the direction you're heading in. You're doing great in the health domain.</p>
          </section>

          <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative group cursor-pointer hover:border-indigo-500 transition-all">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
              Therapist Insights
              <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-slate-300 group-hover:text-indigo-500 transition-colors"></i>
            </h3>
            <div className="space-y-4">
               <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <p className="text-sm italic text-indigo-950 leading-relaxed">"Alex is showing significant progress in cognitive defusion. The ability to notice the 'inner critic' without being hooked is improving weekly."</p>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-indigo-500">— Dr. Sarah Smith</p>
               </div>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-500 px-1">
                 <i className="fa-solid fa-calendar-check"></i>
                 Last reviewed: Oct 24, 2023
               </div>
            </div>
          </section>
          
          <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-100">
             <h4 className="font-bold mb-2">Weekly Goal</h4>
             <p className="text-indigo-100 text-sm leading-relaxed mb-6">Focus on "The Observing Self" exercise 3 times this week.</p>
             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span>Progress</span>
                <span>2/3 Sessions</span>
             </div>
             <div className="w-full h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-white rounded-full w-[66%]"></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientReports;
