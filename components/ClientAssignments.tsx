
import React, { useState, useMemo } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { User, THERAPY_SESSIONS, SchedulePreference } from '../types';
import { notificationService } from '../services/notificationService';

interface TherapySessionTask {
  id: string;
  number: number;
  title: string;
  week: number;
  status: 'Completed' | 'Current' | 'Locked';
  description: string;
}

const THERAPY_PROGRAM: TherapySessionTask[] = [
  { id: 's1', number: 1, week: 1, title: 'Creative Hopelessness', status: 'Completed', description: 'Exploring the agenda of control and identifying what is truly workable in your life.' },
  { id: 's2', number: 2, week: 1, title: 'Acceptance', status: 'Current', description: 'Learning to drop the struggle and make room for difficult emotions.' },
  { id: 's3', number: 3, week: 2, title: 'Diffusion 1', status: 'Locked', description: 'Step back and observe your thoughts as words and images, not facts.' },
  { id: 's4', number: 4, week: 2, title: 'Diffusion 2', status: 'Locked', description: 'Advanced techniques for unhooking from deeply held negative beliefs.' },
  { id: 's5', number: 5, week: 3, title: 'Present Moment', status: 'Locked', description: 'Grounding yourself in the here and now through mindfulness and awareness.' },
  { id: 's6', number: 6, week: 3, title: 'Values & Clarification 1', status: 'Locked', description: 'Identifying what truly matters to you across different life domains.' },
  { id: 's7', number: 7, week: 4, title: 'Values & Clarification 2', description: 'Refining your life direction and identifying specific value-led goals.', status: 'Locked' },
  { id: 's8', number: 8, week: 4, title: 'Exposure Through Values', status: 'Locked', description: 'Facing difficult situations while staying anchored to your meaningful path.' },
  { id: 's9', number: 9, week: 5, title: 'Trauma Narrative', status: 'Locked', description: 'Processing your history through a values-based lens of resilience.' },
  { id: 's10', number: 10, week: 5, title: 'Grief & Forgiveness', status: 'Locked', description: 'Working through loss and practicing self-compassion for healing.' },
  { id: 's11', number: 11, week: 6, title: 'Moral Injury', status: 'Locked', description: 'Addressing wounds to the conscience and complex guilt with ACT flexibility.' },
  { id: 's12', number: 12, week: 6, title: 'Relapse Prevention', status: 'Locked', description: 'Building a sustainable toolkit for maintaining flexibility in the future.' },
];

interface ClientAssignmentsProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

const ClientAssignments: React.FC<ClientAssignmentsProps> = ({ user, onUpdateUser }) => {
  const navigate = useNavigate();
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());

  // Access control check: Sessions are only visible if assessments have been attempted/completed
  const hasAttemptedAssessments = !!(user.assessmentScores && user.assessmentScores.timestamp);

  const currentPreference = user.schedulePreference || 'MonThu';

  const handleScheduleChange = (pref: SchedulePreference) => {
    onUpdateUser({ ...user, schedulePreference: pref });
  };

  // Helper to generate dates based on chosen cadence
  const scheduledDates = useMemo(() => {
    const dates: Record<string, string> = {};
    const today = new Date();
    
    // Find current Monday
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));

    // Define offsets for each pair
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
      
      const weekday = sessionDate.toLocaleDateString('en-US', { weekday: 'short' });
      const month = sessionDate.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = sessionDate.getDate();
      
      dates[session.id] = `${weekday}, ${month} ${dayNum}`;
    });
    return dates;
  }, [currentPreference]);

  const scheduleReminder = async (session: TherapySessionTask) => {
    setRemindingId(session.id);
    
    if (!notificationService.hasPermission()) {
      const granted = await notificationService.requestPermission();
      if (!granted) {
        setRemindingId(null);
        alert("Please enable notification permissions to set reminders.");
        return;
      }
    }

    notificationService.scheduleNotification(
      `Upcoming: ${session.title}`,
      5000,
      {
        body: `Your scheduled session for ${scheduledDates[session.id]} is coming up. Are you ready to dive in?`,
        tag: `session-${session.number}`,
      }
    );

    setTimeout(() => {
      setRemindingId(null);
      setRemindedIds(prev => new Set(prev).add(session.id));
    }, 1500);
  };

  if (!hasAttemptedAssessments) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-6 animate-in fade-in duration-700">
        <div className="bg-white rounded-[3rem] p-12 md:p-20 border border-slate-200 shadow-2xl text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5">
            <i className="fa-solid fa-clipboard-list text-[15rem]"></i>
          </div>
          <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-4xl mx-auto shadow-inner relative z-10">
            <i className="fa-solid fa-lock-open"></i>
          </div>
          <div className="space-y-4 relative z-10">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">Unlock Your Journey</h2>
            <p className="text-slate-500 max-w-md mx-auto leading-relaxed text-lg font-medium">
              To begin your personalized 12-session recovery program, please complete the clinical intake assessments first.
            </p>
          </div>
          <div className="pt-6 relative z-10">
            <NavLink to="/assessments" className="inline-flex items-center gap-3 px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] transition-all group">
              Start My Assessments
              <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-24">
      {/* Treatment Plan Header */}
      <section className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <i className="fa-solid fa-calendar-check text-[8rem]"></i>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight mb-2">My Treatment Roadmap</h2>
            <p className="text-indigo-100 font-medium">Self-paced 12-session ACT program</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Schedule Cadence</p>
            <div className="flex gap-2">
              {(['MonThu', 'TueFri', 'WedSat'] as SchedulePreference[]).map(p => (
                <button
                  key={p}
                  onClick={() => handleScheduleChange(p)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                    currentPreference === p ? 'bg-white text-indigo-600 shadow-lg' : 'bg-white/10 text-indigo-100 hover:bg-white/20'
                  }`}
                >
                  {p === 'MonThu' ? 'Mon/Thu' : p === 'TueFri' ? 'Tue/Fri' : 'Wed/Sat'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Week-by-Week Breakdown */}
      <div className="space-y-12">
        {[1, 2, 3, 4, 5, 6].map(week => (
          <div key={week} className="space-y-6">
            <div className="flex items-center gap-4 px-2">
              <div className="flex flex-col items-center justify-center w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-lg">
                <span className="text-[8px] font-black uppercase tracking-tighter opacity-50">Week</span>
                <span className="text-xl font-black leading-none">{week}</span>
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Stage {week} Recovery</h3>
              <div className="flex-1 h-px bg-slate-100"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {THERAPY_PROGRAM.filter(s => s.week === week).map(session => (
                <div 
                  key={session.id}
                  className={`group p-8 rounded-[2.5rem] border-2 transition-all relative overflow-hidden ${
                    session.status === 'Current' 
                      ? 'bg-white border-indigo-500 shadow-2xl shadow-indigo-100' 
                      : session.status === 'Completed'
                        ? 'bg-slate-50 border-slate-100 opacity-60'
                        : 'bg-white border-slate-100'
                  }`}
                >
                  <div className="flex flex-col h-full space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit ${
                          session.status === 'Current' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          Session {session.number}
                        </span>
                        <div className={`flex items-center gap-2 ${session.status === 'Current' ? 'text-indigo-600' : 'text-slate-400'}`}>
                          <i className="fa-solid fa-calendar-day text-xs"></i>
                          <span className="text-sm font-black tracking-tight">{scheduledDates[session.id]}</span>
                        </div>
                      </div>
                      {session.status === 'Locked' && <i className="fa-solid fa-lock text-slate-200 mt-1"></i>}
                      {session.status === 'Completed' && <i className="fa-solid fa-circle-check text-emerald-500 mt-1"></i>}
                    </div>

                    <div className="flex-1">
                      <button 
                        onClick={() => navigate(`/session/${session.number}/details`)}
                        className={`text-xl font-bold mb-2 text-left hover:text-indigo-600 transition-colors ${session.status === 'Current' ? 'text-slate-800' : 'text-slate-500'}`}
                      >
                        {session.title}
                      </button>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium">
                        {session.description}
                      </p>
                    </div>

                    <div className="pt-4 flex items-center justify-between gap-3">
                      {session.status === 'Current' ? (
                        <>
                          <button 
                            onClick={() => navigate(`/session/${session.number}`)}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                          >
                            Enter Session
                          </button>
                          <button 
                            onClick={() => scheduleReminder(session)}
                            disabled={remindingId === session.id || remindedIds.has(session.id)}
                            className="w-14 h-14 flex items-center justify-center bg-slate-50 text-slate-400 rounded-2xl hover:text-indigo-600 transition-all border border-slate-100"
                            title="Remind Me"
                          >
                            {remindingId === session.id ? (
                              <img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-5 h-5 brain-loading-img" />
                            ) : remindedIds.has(session.id) ? (
                              <i className="fa-solid fa-bell-slash text-emerald-500"></i>
                            ) : (
                              <i className="fa-solid fa-bell"></i>
                            )}
                          </button>
                        </>
                      ) : session.status === 'Locked' ? (
                        <div className="w-full py-4 bg-slate-50 text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center border border-slate-100">
                          Waiting for unlocking
                        </div>
                      ) : (
                        <button 
                          onClick={() => navigate(`/session/${session.number}`)}
                          className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-emerald-100"
                        >
                          Recap Session
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientAssignments;
