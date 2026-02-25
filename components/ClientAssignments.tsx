
import React, { useState, useMemo } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { THERAPY_SESSIONS, SchedulePreference } from '../types';
import { notificationService } from '../services/notificationService';
import { useApp } from '../contexts/AppContext';

interface TherapySessionTask {
  id: string;
  number: number;
  title: string;
  week: number;
  description: string;
  isImplemented: boolean;
}

const THERAPY_PROGRAM: TherapySessionTask[] = [
  { id: 's1', number: 1, week: 1, title: 'Creative Hopelessness', isImplemented: true, description: 'Examining the agenda of control and identifying what is truly workable.' },
  { id: 's2', number: 2, week: 1, title: 'Acceptance', isImplemented: true, description: 'Learning to drop the struggle with difficult emotions and sensations.' },
  { id: 's3', number: 3, week: 2, title: 'Diffusion 1', isImplemented: true, description: 'Learn basic techniques to unhook from your bothering thoughts.' },
  { id: 's4', number: 4, week: 2, title: 'Diffusion 2', isImplemented: true, description: 'Advanced auditory and perspective-shifting defusion techniques.' },
  { id: 's5', number: 5, week: 3, title: 'Present Moment', isImplemented: true, description: 'Grounding yourself in the here and now through mindfulness.' },
  { id: 's6', number: 6, week: 3, title: 'Values & Clarification 1', isImplemented: true, description: 'Exploring what truly matters in different domains of your life.' },
  { id: 's7', number: 7, week: 4, title: 'Values & Clarification 2', isImplemented: true, description: 'Refining your life direction and identifying value-led goals.' },
  { id: 's8', number: 8, week: 4, title: 'Exposure Through Values', isImplemented: true, description: 'Moving toward difficulty while staying connected to values.' },
  { id: 's9', number: 9, week: 5, title: 'Trauma Narrative', isImplemented: true, description: 'Integrating the past into a coherent story of growth.' },
  { id: 's10', number: 10, week: 5, title: 'Grief & Forgiveness', isImplemented: true, description: 'Processing loss and practicing self-compassion.' },
  { id: 's11', number: 11, week: 6, title: 'Moral Injury', isImplemented: true, description: 'Addressing wounds to the soul and complex feelings of guilt.' },
  { id: 's12', number: 12, week: 6, title: 'Relapse Prevention', isImplemented: true, description: 'Building a sustainable plan for long-term flexibility.' },
];

const ClientAssignments: React.FC = () => {
  const { currentUser: user, updateUser: onUpdateUser } = useApp();
  const navigate = useNavigate();
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());

  const hasAttemptedAssessments = !!(user.assessmentScores && user.assessmentScores.timestamp);
  const currentPreference = user.schedulePreference || 'MonThu';
  const currentSessionNumber = user.currentSession || 1;
  const history = user.sessionHistory || [];

  const handleScheduleChange = (pref: SchedulePreference) => {
    onUpdateUser({ ...user, schedulePreference: pref });
  };

  const getStatus = (session: TherapySessionTask): 'Completed' | 'Current' | 'Locked' | 'Ready' => {
    // UNLOCK ALL SESSIONS FOR TEST ACCOUNT
    if (user.id === 'test-c') return 'Ready';
    
    const isCompleted = history.find(h => h.sessionNumber === session.number && h.completed);
    if (isCompleted) return 'Completed';
    if (session.number === currentSessionNumber && session.isImplemented) return 'Current';
    if (session.isImplemented) return 'Ready'; 
    return 'Locked';
  };

  const scheduledDates = useMemo(() => {
    const dates: Record<string, string> = {};
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    const pairs: Record<SchedulePreference, number[]> = {
      'MonThu': [0, 3],
      'TueFri': [1, 4],
      'WedSat': [2, 5],
    };
    const offsets = pairs[currentPreference];

    THERAPY_PROGRAM.forEach((session, index) => {
      const sessionDate = new Date(monday);
      const weekOffset = Math.floor(index / 2);
      const dayOffsetIdx = index % 2;
      sessionDate.setDate(monday.getDate() + (weekOffset * 7) + offsets[dayOffsetIdx]);
      dates[session.id] = sessionDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    });
    return dates;
  }, [currentPreference]);

  const scheduleReminder = async (session: TherapySessionTask) => {
    setRemindingId(session.id);
    if (!notificationService.hasPermission()) {
      const granted = await notificationService.requestPermission();
      if (!granted) { setRemindingId(null); return; }
    }
    notificationService.scheduleNotification(`Upcoming: ${session.title}`, 3000, { body: `Scheduled for ${scheduledDates[session.id]}` });
    setTimeout(() => { setRemindingId(null); setRemindedIds(prev => new Set(prev).add(session.id)); }, 1000);
  };

  if (!hasAttemptedAssessments) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-6">
        <div className="bg-white rounded-[3rem] p-12 border border-slate-200 shadow-2xl text-center space-y-8">
          <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-4xl mx-auto"><i className="fa-solid fa-lock"></i></div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Assessments Required</h2>
          <p className="text-slate-500 max-w-md mx-auto text-lg">Complete clinical intake to unlock your 12-session roadmap.</p>
          <NavLink to="/assessments" className="inline-block px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg">Start Assessments</NavLink>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-24">
      <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><i className="fa-solid fa-map-location-dot text-[10rem]"></i></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div>
            <h2 className="text-3xl font-black tracking-tight mb-2">My Recovery Path</h2>
            <p className="text-indigo-300 font-medium">12-Session ACT Foundation for Trauma Recovery</p>
          </div>
          <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-200 mb-2">Schedule</p>
            <div className="flex gap-2">
              {(['MonThu', 'TueFri', 'WedSat'] as SchedulePreference[]).map(p => (
                <button key={p} onClick={() => handleScheduleChange(p)} className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${currentPreference === p ? 'bg-white text-indigo-600 shadow-lg' : 'bg-white/10 text-indigo-100 hover:bg-white/20'}`}>
                  {p.replace(/([A-Z])/g, '/$1').slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {THERAPY_PROGRAM.map((session) => {
          const status = getStatus(session);
          return (
            <div key={session.id} className={`p-8 rounded-[2.5rem] border-2 transition-all relative overflow-hidden flex flex-col justify-between ${
              status === 'Current' ? 'bg-white border-indigo-500 shadow-2xl scale-[1.02] z-10' : 
              status === 'Ready' ? 'bg-white border-emerald-400 border-dashed' :
              status === 'Completed' ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-100 opacity-40 grayscale'
            }`}>
              <div>
                <div className="flex justify-between items-start mb-4">
                   <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                     status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 
                     status === 'Current' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                   }`}>Session {session.number}</span>
                   {status === 'Completed' && <i className="fa-solid fa-circle-check text-emerald-500"></i>}
                   {status === 'Locked' && <i className="fa-solid fa-lock text-slate-300"></i>}
                   {status === 'Ready' && <span className="text-[8px] font-black text-emerald-600 uppercase border border-emerald-100 px-2 py-0.5 rounded">Ready for Test</span>}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{session.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{session.description}</p>
                <div className="mt-4 flex items-center gap-2 text-slate-400">
                  <i className="fa-solid fa-calendar-day text-[10px]"></i>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{scheduledDates[session.id]}</span>
                </div>
              </div>
              
              <div className="mt-8 flex gap-2">
                {status === 'Locked' ? (
                  <div className="w-full py-3 bg-slate-50 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center">Module Unlocks in Stage {session.week}</div>
                ) : (
                  <>
                    <button 
                      onClick={() => navigate(`/session/${session.number}`)}
                      className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                        status === 'Current' ? 'bg-indigo-600 text-white shadow-lg hover:bg-indigo-700' :
                        status === 'Ready' ? 'bg-emerald-500 text-white shadow-md hover:bg-emerald-600' :
                        'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {status === 'Completed' ? 'Recap Session' : status === 'Current' ? 'Continue Session' : 'Enter Session'}
                    </button>
                    <button onClick={() => scheduleReminder(session)} className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 border border-slate-100 transition-colors">
                      {remindingId === session.id ? <img src="https://i.ibb.co/FkV0M73k/brain.png" className="w-5 h-5 brain-loading-img" /> : <i className={`fa-solid ${remindedIds.has(session.id) ? 'fa-bell-slash text-indigo-500' : 'fa-bell'}`}></i>}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClientAssignments;
