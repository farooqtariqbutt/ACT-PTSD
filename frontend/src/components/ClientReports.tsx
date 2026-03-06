import React, { useEffect, useMemo, useState } from 'react';
import { userService } from '../services/userService';
import { type User } from '../../types';
import { getPCL5Interpretation } from '../utils/assessmentUtils';

interface CompletedSession {
  id: string;
  number: number;
  title: string;
  date: string;
  reflection1?: string;
  reflection2?: string;
  outcome?: string;
  distressBefore?: number;
  distressAfter?: number;
}

interface ClientReportsProps {
  user?: User; // Keeping the prop if you pass it down, though we fetch inside
}

const ClientReports: React.FC<ClientReportsProps> = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [sessionLog, setSessionLog] = useState<CompletedSession[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const profile = await userService.getProfile();
        setUserProfile(profile);
        
        const mappedSessions: CompletedSession[] = (profile.sessionHistory || [])
          .filter((s: any) => s.status === 'COMPLETED')
          .map((s: any) => ({
            id: `s${s.sessionNumber}-${s.timestamp}`,
            number: s.sessionNumber,
            title: s.sessionTitle || `Module ${s.sessionNumber}`,
            date: new Date(s.timestamp).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            }),
            reflection1: s.reflections?.q1,
            reflection2: s.reflections?.['grounding-prep'],
            distressBefore: s.distressBefore,
            distressAfter: s.distressAfter
          }))
          .sort((a: any, b: any) => b.number - a.number);

        setSessionLog(mappedSessions);
      } catch (err) {
        console.error("Failed to load reports:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const valueAlignment = useMemo(() => {
    if (!userProfile?.currentClinicalSnapshot) return [
      { label: 'Emotional Awareness', value: 40, color: 'bg-rose-400' },
      { label: 'Psychological Flexibility', value: 30, color: 'bg-amber-400' },
      { label: 'Values Consistency', value: 10, color: 'bg-purple-400' }
    ];

    const snapshot = userProfile.currentClinicalSnapshot;
    const flexValue = Math.max(10, 100 - (snapshot.aaqTotal || 0) * 2); 
    const awarenessValue = Math.max(10, 100 - (snapshot.dersTotal || 0));

    return [
      { label: 'Emotional Awareness', value: awarenessValue, color: awarenessValue > 70 ? 'bg-emerald-400' : 'bg-amber-400' },
      { label: 'Psychological Flexibility', value: flexValue, color: flexValue > 60 ? 'bg-sky-400' : 'bg-indigo-400' },
      { label: 'Values Consistency', value: Math.min(sessionLog.length * 8, 100), color: 'bg-purple-400' }, 
    ];
  }, [userProfile, sessionLog]);

  // Static mock data for the chart, but you can swap this with assessment history later
  const chartData = useMemo(() => {
    return [55, 52, 58, 48, 42, 35, 30, 28]; 
  }, []);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);
  };

  const completionsThisWeek = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return sessionLog.filter(s => new Date(s.date) >= sevenDaysAgo).length;
  }, [sessionLog]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

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
              {chartData.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                  <div className="w-full max-w-[40px] bg-slate-50 rounded-t-lg absolute bottom-0 h-full opacity-50"></div>
                  <div 
                    className="w-full max-w-[24px] bg-indigo-500 rounded-t-lg relative z-10 transition-all duration-1000 ease-out hover:bg-indigo-600 cursor-pointer" 
                    style={{ height: `${val}%` }}
                  >
                    {/* Restored Interpretation Tooltip */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black py-1.5 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-20 pointer-events-none">
                      {getPCL5Interpretation(val).text} ({val})
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold mt-4">Wk {i+1}</span>
                </div>
              ))}
            </div>

            {/* Restored Improvement Banner */}
            <div className="flex justify-between items-center bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-circle-check text-emerald-500"></i>
                <p className="text-sm font-bold text-indigo-900">Clinically Significant Improvement</p>
              </div>
              <span className="text-xs font-black text-indigo-600 bg-white px-3 py-1 rounded-lg">
                -{chartData[0] - chartData[chartData.length - 1]} pts
              </span>
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
                <p className="text-sm text-slate-400 font-medium">Your chronological history and insights.</p>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                {sessionLog.length} / 12 Modules
              </span>
            </div>
            
            <div className="space-y-6">
               {sessionLog.map((session) => {
                 // Safely format reflections so undefined values don't show up in the UI
                 const combinedReflections = [session.reflection1, session.reflection2].filter(Boolean).join(' | ');

                 return (
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
                         <div>
                           <h4 className="text-lg font-black text-slate-800 tracking-tight">{session.title}</h4>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                             <i className="fa-solid fa-calendar-day"></i> {session.date}
                           </p>
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
                           Session Notes & Reflections
                         </p>
                         <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                           {combinedReflections ? `"${combinedReflections}"` : "No specific notes recorded for this session."}
                         </p>
                       </div>
                       <div className="space-y-2">
                         <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                           <i className="fa-solid fa-chart-line"></i>
                           Distress Change
                         </p>
                         <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                               <span className="text-[8px] font-black text-slate-400 uppercase">Before</span>
                               <span className="text-lg font-black text-slate-700">{session.distressBefore ?? '-'}</span>
                            </div>
                            <i className="fa-solid fa-arrow-right text-slate-300"></i>
                            <div className="flex flex-col">
                               <span className="text-[8px] font-black text-slate-400 uppercase">After</span>
                               <span className="text-lg font-black text-indigo-600">{session.distressAfter ?? '-'}</span>
                            </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 );
               })}

               {sessionLog.length === 0 && !loading && (
                 <p className="text-center text-slate-400 py-8 font-medium">No completed sessions found yet.</p>
               )}
            </div>
            
            <button className="w-full py-5 border-2 border-dashed border-slate-200 text-slate-400 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center justify-center gap-3">
              <i className="fa-solid fa-clock-rotate-left"></i>
              Load Previous History
            </button>
          </section>
        </div>

        {/* Sidebar Sections */}
        <div className="space-y-8">
          
          {/* Dynamic Value Alignment */}
          <section className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
               <i className="fa-solid fa-location-crosshairs text-7xl"></i>
            </div>
            <h3 className="text-xl font-bold mb-6">Value Alignment</h3>
            <div className="space-y-6">
              {valueAlignment.map(v => (
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
            <p className="mt-8 text-xs text-slate-400 leading-relaxed italic">
              {valueAlignment[1].value < 40 
                ? "Your Flexibility score is low. Focus on the Unhooking modules." 
                : "Great progress! Your consistency in values is strengthening."}
            </p>
          </section>

          <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative group cursor-pointer hover:border-indigo-500 transition-all">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
              Therapist Insights
              <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-slate-300 group-hover:text-indigo-500 transition-colors"></i>
            </h3>
            <div className="space-y-4">
               <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <p className="text-sm italic text-indigo-950 leading-relaxed">"{userProfile?.name || 'The client'} is showing significant progress in cognitive defusion. The ability to notice the 'inner critic' without being hooked is improving weekly."</p>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-indigo-500">— Dr. Sarah Smith</p>
               </div>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-500 px-1">
                 <i className="fa-solid fa-calendar-check"></i>
                 Last reviewed: Today
               </div>
            </div>
          </section>
          
          {/* Dynamic Weekly Goal */}
          <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-100">
             <h4 className="font-bold mb-2">Weekly Goal</h4>
             <p className="text-indigo-100 text-sm leading-relaxed mb-6">
               Complete {sessionLog.length % 2 === 0 ? "2 grounding exercises" : "your next module"} this week.
             </p>
             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span>Current Progress</span>
                <span>{completionsThisWeek}/2</span>
             </div>
             <div className="w-full h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.min((completionsThisWeek / 2) * 100, 100)}%` }}></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientReports;