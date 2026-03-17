import React, { useState, useMemo, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

 // ── Chart Tooltip Component ───────────────────────────────────────────────
 const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl text-xs">
        <p className="font-black text-slate-800 mb-1">Session {label.replace('S', '')}</p>
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-rose-500 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Before: {payload[0].value}
          </p>
          <p className="flex items-center gap-2 text-emerald-500 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            After: {payload[1].value}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const DistressMeter: React.FC = () => {
  const { themeClasses, currentUser: user, updateUser } = useApp();
  
  // ── State for View Toggle & Interactive Meter ─────────────────────────────
  const [activeView, setActiveView] = useState<'check-in' | 'history'>('check-in');
  const [level, setLevel] = useState<number | null>(null);
  const [showGrounding, setShowGrounding] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false); // NEW: Track if already logged today

  // ── NEW: Fetch Today's Value on Load ──────────────────────────────────────
  useEffect(() => {
    if (user?.currentClinicalSnapshot?.lastUpdate && user?.currentClinicalSnapshot?.lastDistress) {
      const lastUpdateDate = new Date(user.currentClinicalSnapshot.lastUpdate);
      const today = new Date();
      
      // If the last update was today, pre-select the level
      if (lastUpdateDate.toDateString() === today.toDateString()) {
        setLevel(user.currentClinicalSnapshot.lastDistress);
        setHasCheckedInToday(true);
      }
    }
  }, [user?.currentClinicalSnapshot]);

  // ── The Backend API Call ──────────────────────────────────────────────────
  const handleCheckIn = async () => {
    if (!level) return;
    setIsLogging(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/distress/distress-log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ level }),
      });

      if (!response.ok) throw new Error("Failed to save check-in");
      
      const data = await response.json();

      // Update global app state so the UI stays perfectly synced
      if (user) {
         updateUser({
           ...user,
           currentClinicalSnapshot: data.currentClinicalSnapshot
         });
      }

      setHasCheckedInToday(true);

      // Trigger the UI flow based on the score
      if (level > 5) {
        setShowGrounding(true);
      } else {
        alert("Distress level logged successfully. Try to stay present.");
      }
    } catch (error) {
      console.error("Error saving distress log:", error);
      alert("Could not save your check-in. Please try again.");
    } finally {
      setIsLogging(false);
    }
  };

  // ── Static Data ───────────────────────────────────────────────────────────
  const groundingExercises = [
    { title: '5-4-3-2-1 Technique', desc: 'Identify 5 things you see, 4 you can touch, 3 you hear, 2 you can smell, and 1 you can taste.' },
    { title: 'Square Breathing', desc: 'Inhale for 4, hold for 4, exhale for 4, hold for 4. Repeat 4 times.' },
    { title: 'Body Scan', desc: 'Notice the weight of your body on the chair. Start from your toes and move up to your head.' }
  ];

  // ── Chart Data Calculation ────────────────────────────────────────────────
  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const sessionNum = i + 1;
      const history = user?.sessionHistory?.find((h: any) => h.sessionNumber === sessionNum);
      return {
        name: `S${sessionNum}`,
        before: history?.distressBefore || 0,
        after: history?.distressAfter || 0,
        completed: !!history
      };
    });
  }, [user?.sessionHistory]);

  return (
    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-slate-200 shadow-sm animate-in fade-in duration-500 flex flex-col h-full">
      
      {/* ── Header & View Toggle ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0">
            <i className="fa-solid fa-bolt-lightning"></i>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Distress Meter</h3>
            <p className="text-sm text-slate-500 font-medium">
              {activeView === 'history' ? 'Your progress across 12 sessions' : 'How intense are your symptoms right now?'}
            </p>
          </div>
        </div>

        {/* Segmented Control */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveView('check-in')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeView === 'check-in' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Check In
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeView === 'history' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* ── Content Body ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-[300px]">
        
        {/* VIEW 1: History Chart */}
        {activeView === 'history' && (
          <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-300">
            <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis 
                    domain={[0, 10]} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    ticks={[0, 2, 4, 6, 8, 10]}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '20px' }}
                  />
                  <Bar name="Before" dataKey="before" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={8} />
                  <Bar name="After" dataKey="after" fill="#10b981" radius={[4, 4, 0, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">
                <i className="fa-solid fa-circle-info mr-2 text-rose-400"></i>
                Tracking helps you see patterns in your recovery
              </p>
            </div>
          </div>
        )}

        {/* VIEW 2: Interactive Check-in */}
        {activeView === 'check-in' && (
          <div className="flex-1 flex flex-col justify-center animate-in fade-in zoom-in-95 duration-300">
            {!showGrounding ? (
              <div className="space-y-8 mt-auto mb-auto">
                
                {hasCheckedInToday && (
                  <div className="text-center text-xs font-bold text-emerald-500 uppercase tracking-widest bg-emerald-50 py-2 rounded-lg border border-emerald-100">
                    <i className="fa-solid fa-circle-check mr-1"></i> Today's Check-In Logged
                  </div>
                )}

                <div className="flex justify-between items-end gap-1 h-32 md:h-40">
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
                  disabled={level === null || isLogging || (hasCheckedInToday && level === user?.currentClinicalSnapshot?.lastDistress)}
                  onClick={handleCheckIn} 
                  className={`w-full py-4 bg-rose-500 text-white rounded-2xl font-bold shadow-xl transition-all disabled:opacity-50 hover:bg-rose-600`}
                >
                  {isLogging ? (
                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                  ) : level && level > 5 ? (
                    hasCheckedInToday ? 'Update & Get Grounding Support' : 'Get Grounding Support'
                  ) : hasCheckedInToday ? (
                    level === user?.currentClinicalSnapshot?.lastDistress ? 'Up to Date' : 'Update Check-In'
                  ) : (
                    'Check In'
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
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
                    className="flex-1 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-800 bg-slate-50 rounded-xl"
                  >
                    I feel better
                  </button>
                  <NavLink to="/mindfulness" className={`flex-1 py-3 ${themeClasses.primary} text-white rounded-xl text-xs font-bold text-center shadow-lg ${themeClasses.shadow}`}>
                    Guided Audio
                  </NavLink>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DistressMeter;