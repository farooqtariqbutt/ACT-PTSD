import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import DistressMeter from './DistressMeter';
import { type User, type SchedulePreference } from '../../types';
import { userService } from '../services/userService';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ExtendedUser extends User {
  currentClinicalSnapshot?: {
    lastMood?: number;
    pcl5Total?: number;
    lastUpdate?: Date;
  };
  assessmentHistory?: any[];
  sessionHistory?: any[];
  sessionData?: any[]; // Added to support value steps tracking
  values?: { name: string; icon: string; color: string }[];
}

interface ClientDashboardProps {
  user: User;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const ClientDashboard: React.FC<ClientDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  
  // ── State ────────────────────────────────────────────────────────────────
  const [userProfile, setUserProfile] = useState<ExtendedUser | null>(null);
  const [currentSessionData, setCurrentSessionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Fetching Data ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        // 1. Fetch latest user profile
        const profile = await userService.getProfile();
        setUserProfile(profile);

        // 2. Fetch current session details from backend
        const sessionNum = profile?.currentSession || user.currentSession || 1;
        const sessionRes = await fetch(`${BASE_URL}/sessions/${sessionNum}`);
        
        if (sessionRes.ok) {
          const sessionDetails = await sessionRes.json();
          setCurrentSessionData(sessionDetails);
        } else {
          console.error('Failed to fetch session details');
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // ── Derived Variables & Schedule Logic ───────────────────────────────────
  const currentSessionNumber = userProfile?.currentSession || user.currentSession || 1;
  const sessionTitle = currentSessionData?.title || `Session ${currentSessionNumber}`;
  const progressPercent = Math.round(((currentSessionNumber - 1) / 12) * 100);

  // Restored: Calculate value steps from session data
  const valueStepsCount = (userProfile?.sessionData || user.sessionData || []).filter((d: any) => d.stepId === 'value-action-step').length;

  // Check schedule validity
  const preference = (userProfile?.schedulePreference || user.schedulePreference || 'MonThu') as SchedulePreference;
  const currentDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const validDaysMap: Record<SchedulePreference, number[]> = {
    'MonThu': [1, 4],
    'TueFri': [2, 5],
    'WedSat': [3, 6],
  };
  
  const allowedDays = validDaysMap[preference] || [1, 4];
  const isTodayValidDay = allowedDays.includes(currentDay);

  const todayStr = new Date().toDateString();
  const completedToday = userProfile?.sessionHistory?.some((s: any) => 
    s.status === 'COMPLETED' && new Date(s.timestamp).toDateString() === todayStr
  ) ?? false;

  const isSessionLocked = !isTodayValidDay || completedToday;

  // Determine button text based on lock reason
  let launchButtonText = `Launch Session ${currentSessionNumber}`;
  if (completedToday) launchButtonText = "Daily Limit Reached";
  else if (!isTodayValidDay) launchButtonText = "Available Next Scheduled Day";

  // ── Dynamic "Today's Tasks" Logic ────────────────────────────────────────
  const todaysTasks = useMemo(() => {
    const tasks = [];

    // Standard daily task (always present)
    tasks.push({
      id: 'grounding',
      icon: 'fa-spa',
      color: 'bg-emerald-50 text-emerald-600',
      hoverColor: 'group-hover:bg-emerald-500 group-hover:text-white',
      title: 'Morning Grounding',
      desc: '5-4-3-2-1 exercise (10 mins)',
      action: () => navigate('/assignments'),
    });

    // Dynamic Session Task based on schedule and completion
    if (isTodayValidDay && !completedToday) {
      tasks.push({
        id: 'session',
        icon: 'fa-graduation-cap',
        color: 'bg-indigo-50 text-indigo-600',
        hoverColor: 'group-hover:bg-indigo-500 group-hover:text-white',
        title: `Session ${currentSessionNumber} Focus`,
        desc: sessionTitle,
        action: () => navigate(`/session/${currentSessionNumber}`),
      });
    } else if (completedToday) {
      tasks.push({
        id: 'recap',
        icon: 'fa-check-double',
        color: 'bg-sky-50 text-sky-600',
        hoverColor: 'group-hover:bg-sky-500 group-hover:text-white',
        title: `Session ${currentSessionNumber-1} Complete!`,
        desc: 'Great job today. Review your insights.',
        action: () => navigate('/assignments'),
      });
    } else {
      tasks.push({
        id: 'integration',
        icon: 'fa-book-open',
        color: 'bg-amber-50 text-amber-600',
        hoverColor: 'group-hover:bg-amber-500 group-hover:text-white',
        title: 'Integration Day',
        desc: 'Rest and apply what you learned.',
        action: () => navigate('/assignments'),
      });
    }

    return tasks;
  }, [isTodayValidDay, completedToday, currentSessionNumber, sessionTitle, navigate]);

  // ── Simulated Dynamic Data (Until backend supports these) ────────────────
  const skillsProgress = useMemo(() => {
    const baseProgress = Math.min((currentSessionNumber / 12) * 100, 100);
    return [
      { label: 'Defusion', value: Math.floor(baseProgress * 0.8) + 12, color: 'bg-indigo-500' },
      { label: 'Values Alignment', value: Math.floor(baseProgress * 0.9) + 8, color: 'bg-emerald-500' },
      { label: 'Present Moment', value: Math.floor(baseProgress * 0.7) + 15, color: 'bg-sky-500' },
    ];
  }, [currentSessionNumber]);

  const { dailyInsight, dailyMindset } = useMemo(() => {
    const insights = [
      "When the 'I'm not good enough' story shows up, notice it as a story. You don't have to fight it, just make room for it like a passenger on a bus.",
      "Your thoughts are like leaves on a stream. You can watch them float by without jumping into the water to catch them.",
      "Pain is inevitable, but suffering is a choice. Today, choose to make room for your feelings without fighting them.",
      "Focus on what you can control: your actions right now. Let the rest simply be."
    ];
    const mindsets = [
      "I am willing to experience this moment exactly as it is, without needing to change it or run away from it.",
      "I breathe in courage, I exhale doubt. I am ready for whatever today brings.",
      "My values guide my steps, even when the path is difficult.",
      "I hold my thoughts lightly, leaving my hands free to do what matters."
    ];
    
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    
    return {
      dailyInsight: insights[dayOfYear % insights.length],
      dailyMindset: mindsets[dayOfYear % mindsets.length]
    };
  }, []);

  const userValues = useMemo(() => {
    if (userProfile?.values && userProfile.values.length > 0) return userProfile.values;
    return [
      { name: 'Health', icon: 'fa-heart-pulse', color: 'text-rose-400' },
      { name: 'Family', icon: 'fa-people-group', color: 'text-sky-400' }
    ];
  }, [userProfile?.values]);

  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* 12 Session Program Tracker */}
      <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div className="flex-1 w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">
                 🏆
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Your 12-Session Journey</h2>
                <p className="text-indigo-300 text-sm font-medium">Session {currentSessionNumber} of 12: {sessionTitle}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-indigo-300">
                <span>Program Progress</span>
                <span>{progressPercent}% Complete</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(99,102,241,0.5)]" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-12 gap-1.5">
                 {Array.from({ length: 12 }).map((_, i) => (
                   <div key={i} className={`h-1.5 rounded-full ${i + 1 < currentSessionNumber ? 'bg-indigo-400' : i + 1 === currentSessionNumber ? 'bg-indigo-600 animate-pulse' : 'bg-white/5'}`}></div>
                 ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
            <button 
              onClick={() => !isSessionLocked && navigate(`/session/${currentSessionNumber}`)}
              disabled={isSessionLocked}
              className={`px-8 py-4 rounded-2xl font-black text-sm transition-all text-center w-full whitespace-nowrap ${
                isSessionLocked 
                  ? 'bg-white/10 text-slate-400 cursor-not-allowed border border-white/10' 
                  : 'bg-white text-slate-900 hover:bg-slate-100 shadow-xl'
              }`}
            >
              {isSessionLocked && <i className="fa-solid fa-lock mr-2 text-slate-500"></i>}
              {launchButtonText}
            </button>
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
              Schedule: {preference === 'MonThu' ? 'Mon/Thu' : preference === 'TueFri' ? 'Tue/Fri' : 'Wed/Sat'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Distress Meter */}
        <DistressMeter />

        {/* Middle Column Content (Tasks, Committed Actions, Skills) */}
        
{/* Assignments Quick View */}
<section className="lg:col-span-2 space-y-4">
<div className="flex justify-between items-center px-2">
  <h3 className="font-bold text-slate-800 flex items-center gap-2">
    <i className="fa-solid fa-list-check text-indigo-500"></i>
    Today's Tasks
  </h3>
  <NavLink to="/assignments" className="text-xs font-bold text-indigo-600 hover:underline uppercase tracking-widest">
    View All
  </NavLink>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {todaysTasks.map((task) => (
    <div 
      key={task.id}
      onClick={task.action}
      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-indigo-100 transition-all cursor-pointer group"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${task.color} ${task.hoverColor}`}>
        <i className={`fa-solid ${task.icon}`}></i>
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-slate-800 text-sm">{task.title}</h4>
        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{task.desc}</p>
      </div>
      <i className="fa-solid fa-chevron-right text-slate-200 text-xs mt-2 group-hover:text-indigo-300 transition-colors"></i>
    </div>
  ))}
</div>

          {/* RESTORED: Committed Actions View */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="fa-solid fa-person-walking-arrow-right text-indigo-500"></i>
                Committed Actions
              </h3>
              <NavLink to="/values-log" className="text-xs font-bold text-indigo-600 hover:underline uppercase tracking-widest">
                View Log
              </NavLink>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
              <div className="w-32 h-32 rounded-full border-8 border-indigo-50 flex flex-col items-center justify-center bg-indigo-50/20 shadow-inner shrink-0">
                  <span className="text-3xl font-black text-indigo-600">{valueStepsCount}</span>
                  <span className="text-[8px] font-black text-slate-400 uppercase text-center mt-1 leading-tight">Steps<br/>Taken</span>
              </div>
              <div className="flex-1 space-y-4 text-center md:text-left">
                  <h4 className="text-xl font-bold text-slate-800 tracking-tight">Values Persistence</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">
                     You've taken {valueStepsCount} committed actions toward your values. Every small step strengthens your psychological flexibility.
                  </p>
                  <NavLink to="/values-log" className="inline-block px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-100">Record Today's Step</NavLink>
              </div>
            </div>
          </div>

           {/* Skills Snapshot */}
           <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6 flex justify-between items-center">
              Skill Growth
              <NavLink to="/reports" className="text-[10px] font-bold text-indigo-600 uppercase hover:underline">Full Report</NavLink>
            </h3>
            <div className="space-y-6">
              {skillsProgress.map(skill => (
                <div key={skill.label}>
                  <div className="flex justify-between text-[10px] mb-1.5">
                    <span className="text-slate-500 font-bold uppercase tracking-widest">{skill.label}</span>
                    <span className="text-slate-800 font-bold">{skill.value}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${skill.color} rounded-full transition-all duration-1000`} style={{ width: `${skill.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Recovery Insight */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-lightbulb text-indigo-500"></i>
                Daily Insight
              </h3>
              <div className="text-sm text-slate-600 italic leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 min-h-[100px] flex items-center">
                 "{dailyInsight}"
              </div>
            </div>
            <div className="mt-4">
              <NavLink to="/chat" className="text-xs font-bold text-indigo-600 flex items-center gap-2 hover:underline uppercase tracking-widest">
                Discuss with Companion <i className="fa-solid fa-arrow-right"></i>
              </NavLink>
            </div>
        </section>

         {/* Values Quick View */}
        <section className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-1">My Compass</h3>
            <p className="text-slate-400 text-sm">Life domains in focus.</p>
          </div>
          <div className="flex flex-wrap gap-3 mt-6 relative z-10">
             {userValues.map((val, idx) => (
               <div key={idx} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
                  <i className={`fa-solid ${val.icon} ${val.color} text-[10px]`}></i>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{val.name}</span>
               </div>
             ))}
          </div>
          <NavLink to="/values" className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-xl text-xs font-bold shadow-xl shadow-indigo-900/40 text-center relative z-10">
                Explore All Values
          </NavLink>
        </section>

        {/* Personalized Affirmation */}
        <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-2xl mb-4">
             <i className="fa-solid fa-sun"></i>
           </div>
           <h3 className="font-bold text-slate-800 mb-2">Morning Mindset</h3>
           <p className="text-xs text-slate-500 leading-relaxed font-medium italic">
             "{dailyMindset}"
           </p>
        </section>
      </div>
    </div>
  );
};

export default ClientDashboard;
