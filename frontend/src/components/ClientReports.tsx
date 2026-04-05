import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { userService } from '../services/userService';
import { getPCL5Interpretation } from '../utils/assessmentUtils';
import { FileText, CircleCheck, BookOpen, MessageSquare, Calendar, TrendingUp, ArrowRight, History, Target, ExternalLink, CalendarCheck } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CompletedSession {
  id: string;
  number: number;
  title: string;
  date: string;
  reflection1?: string;
  reflection2?: string;
  distressBefore?: number;
  distressAfter?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const ClientReports: React.FC = () => {
  const { currentUser: user, themeClasses } = useApp();

  // ── State ────────────────────────────────────────────────────────────────
  const [isExporting,  setIsExporting]  = useState(false);
  const [sessionLog,   setSessionLog]   = useState<CompletedSession[]>([]);
  const [userProfile,  setUserProfile]  = useState<any>(null);
  const [loading,      setLoading]      = useState(true);

  // ── Fetch data ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const profile = await userService.getProfile();
        setUserProfile(profile);

        const mapped: CompletedSession[] = (profile.sessionHistory || [])
          .filter((s: any) => s.status === 'COMPLETED')
          .map((s: any) => {
            // Extract a meaningful reflection or note from the reflections object
            // Similar to the non-integrated logic: finding long string answers
            const reflectionsObj = s.reflections || {};
            const extractedNotes = Object.entries(reflectionsObj)
              .filter(([key, val]) => typeof val === 'string' && val.length > 5 && !key.includes('selected'))
              .map(([key, val]) => val)
              .join(' | ');

            return {
              id:             `s${s.sessionNumber}-${s.timestamp}`,
              number:         s.sessionNumber,
              title:          s.sessionTitle || `Module ${s.sessionNumber}`,
              date:           new Date(s.timestamp).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric',
                              }),
              // We pass the dynamically extracted string into reflection1
              reflection1:    extractedNotes, 
              reflection2:    '', // Left blank as reflection1 handles the joined string
              distressBefore: s.distressBefore,
              distressAfter:  s.distressAfter,
            };
          })
          .sort((a: any, b: any) => b.number - a.number);

        setSessionLog(mapped);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────

  // Dynamic value-alignment bars derived from clinical snapshot
  const valueAlignment = useMemo(() => {
    if (!userProfile?.currentClinicalSnapshot) {
      return [
        { label: 'Emotional Awareness',       value: 40, color: 'bg-rose-400'   },
        { label: 'Psychological Flexibility',  value: 30, color: 'bg-amber-400'  },
        { label: 'Values Consistency',         value: 10, color: 'bg-purple-400' },
      ];
    }
    
    // Check if they have a post-assessment score, use that instead of the baseline if they do
    const snapshotToUse = userProfile.postClinicalSnapshot?.aaqTotal 
      ? userProfile.postClinicalSnapshot 
      : userProfile.currentClinicalSnapshot;

    const { aaqTotal, dersTotal } = snapshotToUse;
    const flexValue      = Math.max(10, 100 - (aaqTotal  || 0) * 2);
    const awarenessValue = Math.max(10, 100 - (dersTotal  || 0));
    return [
      { label: 'Emotional Awareness',       value: awarenessValue,                        color: awarenessValue > 70 ? 'bg-emerald-400' : 'bg-amber-400' },
      { label: 'Psychological Flexibility',  value: flexValue,                             color: flexValue      > 60 ? 'bg-sky-400'     : 'bg-indigo-400' },
      { label: 'Values Consistency',         value: Math.min(sessionLog.length * 8, 100), color: 'bg-purple-400' },
    ];
  }, [userProfile, sessionLog]);

  // PCL-5 chart data 
  const chartData = useMemo(() => {
    // If no profile or history, return default visual
    if (!userProfile?.assessmentHistory || userProfile.assessmentHistory.length === 0) {
      return [55, 52, 58, 48, 42, 35, 30, 28];
    }

    // Extract all PCL5 scores
    const pcl5Scores = userProfile.assessmentHistory
      .filter((a: any) => a.testType.includes('PCL5'))
      .sort((a: any, b: any) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
      .map((a: any) => a.totalScore);

    // If they only have 1 score (just the intake), pad it with defaults for visual sake, or just show the 1.
    if (pcl5Scores.length === 1) {
       return [pcl5Scores[0]]; // Or pad it if you want the chart to always look "full"
    }

    return pcl5Scores;
  }, [userProfile]);

  const pointDrop = chartData.length > 1 
    ? chartData[0] - chartData[chartData.length - 1] 
    : 0;

  // Sessions completed within the last 7 days
  // Sessions completed within the last 7 days
  const completionsThisWeek = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return sessionLog.filter(s => new Date(s.date) >= cutoff).length;
  }, [sessionLog]);

  // NEW: Dynamically map the string frequency to a numeric limit
  const weeklyLimit = useMemo(() => {
    const freq = userProfile?.sessionFrequency || user?.sessionFrequency || 'twice';
    const frequencyMap: Record<string, number> = { once: 1, twice: 2, thrice: 3 };
    return frequencyMap[freq] || 2; // Defaults to 2 if something goes wrong
  }, [userProfile?.sessionFrequency, user?.sessionFrequency]);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className={`w-16 h-16 border-4 ${themeClasses.border} border-t-transparent rounded-full animate-spin`} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Recovery Journey</h2>
          <p className="text-sm text-slate-500 font-medium">
            Visualizing your psychological flexibility and symptom trends.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-5 h-5 brain-loading-img" />
              Generating PDF...
            </>
          ) : (
            <>
              <FileText size={16} className="text-rose-500" />
              Export Recovery Report
            </>
          )}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left / Main Column ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">

          {/* PCL-5 Chart */}
          <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">PCL-5 Symptom Trend</h3>
                <p className="text-xs text-slate-400 font-medium">
                  {userProfile?.postClinicalSnapshot?.pcl5Total ? 'Pre vs Post Program Evaluation' : 'Clinical Assessment History'}
                </p>
              </div>
              <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 ${themeClasses.primary} rounded-full`} />
                  My Score
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-slate-100 rounded-full" />
                  Clinic Baseline
                </span>
              </div>
            </div>

            <div className="h-64 flex items-end justify-between px-2 relative border-b border-slate-100 mb-4">
              {chartData.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                  <div className="w-full max-w-[40px] bg-slate-50 rounded-t-lg absolute bottom-0 h-full opacity-50" />
                  <div
                    className={`w-full max-w-[24px] ${themeClasses.primary} rounded-t-lg relative z-10 transition-all duration-1000 ease-out hover:opacity-80 cursor-pointer`}
                    style={{ height: `${(val / 80) * 100}%` }} // Scale based on max PCL5 score of 80
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black py-1.5 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-20 pointer-events-none">
                      {getPCL5Interpretation(val).text} ({val})
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold mt-4">
                    {chartData.length === 2 ? (i === 0 ? 'Intake' : 'Final') : `Wk ${i + 1}`}
                  </span>
                </div>
              ))}
            </div>

            {/* Improvement banner */}
            {chartData.length > 1 && (
              <div className={`flex justify-between items-center ${pointDrop > 0 ? themeClasses.secondary : 'bg-slate-50'} p-4 rounded-2xl border ${pointDrop > 0 ? themeClasses.border : 'border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <CircleCheck size={18} className={pointDrop > 0 ? "text-emerald-500" : "text-slate-400"} />
                  <p className={`text-sm font-bold ${pointDrop > 0 ? themeClasses.text : 'text-slate-600'}`}>
                    {pointDrop >= 10 ? 'Clinically Significant Improvement' : pointDrop > 0 ? 'Slight Improvement Noted' : 'Symptoms Persisting / Elevated'}
                  </p>
                </div>
                <span className={`text-xs font-black ${pointDrop > 0 ? themeClasses.text : 'text-slate-500'} bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100`}>
                  {pointDrop > 0 ? '-' : '+'}{Math.abs(pointDrop)} pts
                </span>
              </div>
            )}
          </section>

          {/* Session Completion Log */}
          <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800 text-xl flex items-center gap-3">
                  <BookOpen size={24} className={themeClasses.text} />
                  Session Completion Log
                </h3>
                <p className="text-sm text-slate-400 font-medium">
                  A chronological history of your therapy modules and insights.
                </p>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                {sessionLog.length} / 12 Modules
              </span>
            </div>

            <div className="space-y-6">
              {sessionLog.map(session => {
                const combinedReflections = [session.reflection1, session.reflection2]
                  .filter(Boolean)
                  .join(' | ');

                return (
                  <div
                    key={session.id}
                    className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] hover:border-indigo-200 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                      <CircleCheck size={96} />
                    </div>

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
                      <div className="flex items-start gap-5">
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center border border-slate-100 shrink-0 group-hover:scale-105 transition-transform">
                          <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Mod</span>
                          <span className={`text-xl font-black ${themeClasses.text} leading-none`}>{session.number}</span>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-lg font-black text-slate-800 tracking-tight">{session.title}</h4>
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <Calendar size={10} />
                            {session.date}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 w-fit">
                        <CircleCheck size={12} />
                        Verified Completion
                      </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200/50 relative z-10">
                      <div className="space-y-2">
                        <p className={`text-[10px] font-black ${themeClasses.text} uppercase tracking-widest flex items-center gap-2`}>
                          <MessageSquare size={12} />
                          Session Notes & Reflections
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                          {combinedReflections
                            ? `"${combinedReflections}"`
                            : 'No specific notes recorded for this session.'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                          <TrendingUp size={12} />
                          Distress Change
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Before</span>
                            <span className="text-lg font-black text-slate-700">{session.distressBefore ?? '-'}</span>
                          </div>
                          <ArrowRight size={14} className="text-slate-300" />
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase">After</span>
                            <span className={`text-lg font-black ${themeClasses.text}`}>{session.distressAfter ?? '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {sessionLog.length === 0 && (
                <p className="text-center text-slate-400 py-8 font-medium">
                  No completed sessions found yet.
                </p>
              )}
            </div>

            {sessionLog.length > 0 && (
              <button className="w-full py-5 border-2 border-dashed border-slate-200 text-slate-400 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center justify-center gap-3">
                <History size={16} />
                Load Previous History
              </button>
            )}
          </section>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="space-y-8">

          {/* Dynamic Value Alignment */}
          <section className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
              <Target size={72} />
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
                    <div
                      className={`h-full ${v.color} rounded-full transition-all duration-1000`}
                      style={{ width: `${v.value}%` }}
                    />
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

         
          {/* Therapist Insights */}
          <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative group cursor-pointer hover:border-indigo-500 transition-all">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
              Therapist Insights
              <ExternalLink size={12} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </h3>
            <div className="space-y-4">
              <div className={`p-5 ${themeClasses.secondary} rounded-2xl border ${themeClasses.border}`}>
                <p className={`text-sm italic ${themeClasses.text.replace('text-', 'text-').replace('600', '950')} leading-relaxed whitespace-pre-wrap`}>
                  {userProfile?.clinicalDirectives 
                    ? `"${userProfile.clinicalDirectives}"` 
                    : "Your therapist hasn't left any new notes for you yet. Keep up the good work!"}
                </p>
                <p className={`mt-3 text-[10px] font-black uppercase tracking-widest ${themeClasses.text}`}>
                  — Dr. Lubna Dar
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500 px-1">
                <CalendarCheck size={14} />
                Last updated: {userProfile?.clinicalDirectives ? 'Recently' : 'N/A'}
              </div>
            </div>
          </section>

          {/* Dynamic Weekly Goal */}
          {/* Dynamic Weekly Goal */}
          <div className={`${themeClasses.primary} p-8 rounded-[2rem] text-white shadow-xl ${themeClasses.shadow}`}>
            <h4 className="font-bold mb-2">Weekly Goal</h4>
            <p className="text-white/80 text-sm leading-relaxed mb-6">
              Complete your target of {weeklyLimit} session{weeklyLimit > 1 ? 's' : ''} this week.
            </p>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
              <span>Current Progress</span>
              <span>{completionsThisWeek}/{weeklyLimit}</span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((completionsThisWeek / weeklyLimit) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientReports;