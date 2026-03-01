import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { type User, type SchedulePreference } from '../../types';
import { notificationService } from '../services/notificationService';
import { getSessionShortDescription } from '../services/sessionDetailContentMap';
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
}

interface TherapySessionTask {
  id: string;
  number: number;
  title: string;
  week: number;
  /** 'Ready' = implemented & accessible but not the current active session (e.g. test account) */
  status: 'Completed' | 'Current' | 'Ready' | 'Locked';
  description: string;
  moduleKey: string;
}

interface ClientAssignmentsProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const ClientAssignments: React.FC<ClientAssignmentsProps> = ({ user, onUpdateUser }) => {
  const navigate = useNavigate();
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());

  // ── Remote state ─────────────────────────────────────────────────────────
  const [userProfile, setUserProfile] = useState<ExtendedUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [sessionTemplates, setSessionTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch user profile ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        const profile = await userService.getProfile();
        setUserProfile(profile);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setUserProfile(user as ExtendedUser);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  // ── Fetch all session templates ──────────────────────────────────────────
  useEffect(() => {
    const fetchSessionTemplates = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const responses = await Promise.all(
          Array.from({ length: 12 }, (_, i) => fetch(`${BASE_URL}/sessions/${i + 1}`))
        );

        if (responses.some(r => !r.ok)) {
          throw new Error('Failed to fetch some session templates');
        }

        const templates = await Promise.all(responses.map(r => r.json()));
        setSessionTemplates(templates);
      } catch (err) {
        console.error('Error fetching session templates:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSessionTemplates();
  }, []);

  // ── Assessment gate check ────────────────────────────────────────────────
  const hasCompletedAssessments = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.currentClinicalSnapshot?.pcl5Total && userProfile.currentClinicalSnapshot.pcl5Total > 0) return true;
    const hasPcl5Score = !!(userProfile.assessmentScores?.pcl5 && userProfile.assessmentScores.pcl5 > 0);
    const hasAssessmentHistory = !!(userProfile.assessmentHistory && userProfile.assessmentHistory.length > 0);
    const hasTimestamp = !!(userProfile.assessmentScores?.timestamp);
    return hasPcl5Score || hasAssessmentHistory || hasTimestamp;
  }, [userProfile]);

  // ── Schedule preference ──────────────────────────────────────────────────
  const currentPreference = (userProfile?.schedulePreference || user.schedulePreference) || 'MonThu' as SchedulePreference;

  const handleScheduleChange = (pref: SchedulePreference) => {
    if (userProfile) setUserProfile({ ...userProfile, schedulePreference: pref });
    onUpdateUser({ ...user, schedulePreference: pref });
  };

  // ── Build therapy program with dynamic status ────────────────────────────
  const therapyProgram = useMemo((): TherapySessionTask[] => {
    if (sessionTemplates.length === 0 || !userProfile) return [];

    const isTestAccount = (userProfile as any).id === 'test-c' || user.id === 'test-c';
    const userCurrentSession = userProfile.currentSession || 1;
    const sessionHistory = userProfile.sessionHistory || [];

    // Sessions marked COMPLETED in the database
    const completedSessionNumbers = sessionHistory
      .filter((s: any) => s.status === 'COMPLETED')
      .map((s: any) => s.sessionNumber as number);

    // Week-limit logic: max 2 completed sessions in the current calendar week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const completedThisWeek = sessionHistory.filter((s: any) => {
      if (s.status !== 'COMPLETED') return false;
      return new Date(s.timestamp) >= startOfWeek;
    }).length;

    const isWeekLimitReached = completedThisWeek >= 2;

    return sessionTemplates.map((template): TherapySessionTask => {
      const sessionNumber: number = template.sessionNumber;
      const week = Math.ceil(sessionNumber / 2);

      let status: TherapySessionTask['status'];

      if (isTestAccount) {
        // Test account: unlock everything — completed ones stay completed, rest are Ready
        status = completedSessionNumbers.includes(sessionNumber) ? 'Completed' : 'Ready';
      } else if (completedSessionNumbers.includes(sessionNumber)) {
        status = 'Completed';
      } else if (sessionNumber === userCurrentSession) {
        status = isWeekLimitReached ? 'Locked' : 'Current';
      } else {
        status = 'Locked';
      }

      return {
        id: `s${sessionNumber}`,
        number: sessionNumber,
        title: template.title,
        week,
        status,
        description: getSessionShortDescription(sessionNumber),
        moduleKey: template.moduleKey,
      };
    });
  }, [sessionTemplates, userProfile, user.id]);

  // ── Scheduled dates ──────────────────────────────────────────────────────
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

    therapyProgram.forEach((session, index) => {
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
  }, [currentPreference, therapyProgram]);

  // ── Reminder helper ──────────────────────────────────────────────────────
  const scheduleReminder = async (session: TherapySessionTask) => {
    setRemindingId(session.id);
    if (!notificationService.hasPermission()) {
      const granted = await notificationService.requestPermission();
      if (!granted) {
        setRemindingId(null);
        alert('Please enable notification permissions to set reminders.');
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

  // ─────────────────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">Loading your treatment roadmap...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error state
  // ─────────────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-6">
        <div className="bg-rose-50 rounded-[3rem] p-12 border border-rose-200 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center text-2xl mx-auto">
            <i className="fa-solid fa-exclamation-triangle" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Failed to Load Sessions</h2>
          <p className="text-slate-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Assessment gate
  // ─────────────────────────────────────────────────────────────────────────

  if (!hasCompletedAssessments) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-6 animate-in fade-in duration-700">
        <div className="bg-white rounded-[3rem] p-12 md:p-20 border border-slate-200 shadow-2xl text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5">
            <i className="fa-solid fa-clipboard-list text-[15rem]" />
          </div>
          <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-4xl mx-auto shadow-inner relative z-10">
            <i className="fa-solid fa-lock-open" />
          </div>
          <div className="space-y-4 relative z-10">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">Unlock Your Journey</h2>
            <p className="text-slate-500 max-w-md mx-auto leading-relaxed text-lg font-medium">
              To begin your personalized 12-session recovery program, please complete the clinical intake assessments first.
            </p>
          </div>
          <div className="pt-6 relative z-10">
            <NavLink
              to="/assessments"
              className="inline-flex items-center gap-3 px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] transition-all group"
            >
              Start My Assessments
              <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform" />
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-24">

      {/* ── Treatment Plan Header ─────────────────────────────────────────── */}
      <section className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <i className="fa-solid fa-calendar-check text-[8rem]" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight mb-2">My Treatment Roadmap</h2>
            <p className="text-indigo-100 font-medium">Self-paced 12-session ACT program</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-chart-line text-white text-sm" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Progress</p>
                <p className="text-white font-bold">Session {userProfile?.currentSession || 1} of 12</p>
              </div>
            </div>
          </div>
          {/* Schedule cadence picker */}
          <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Schedule Cadence</p>
            <div className="flex gap-2">
              {(['MonThu', 'TueFri', 'WedSat'] as SchedulePreference[]).map(p => (
                <button
                  key={p}
                  onClick={() => handleScheduleChange(p)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                    currentPreference === p
                      ? 'bg-white text-indigo-600 shadow-lg'
                      : 'bg-white/10 text-indigo-100 hover:bg-white/20'
                  }`}
                >
                  {p === 'MonThu' ? 'Mon/Thu' : p === 'TueFri' ? 'Tue/Fri' : 'Wed/Sat'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Week-by-week breakdown ────────────────────────────────────────── */}
      <div className="space-y-12">
        {[1, 2, 3, 4, 5, 6].map(week => {
          const weekSessions = therapyProgram.filter(s => s.week === week);
          if (weekSessions.length === 0) return null;

          return (
            <div key={week} className="space-y-6">
              {/* Week header */}
              <div className="flex items-center gap-4 px-2">
                <div className="flex flex-col items-center justify-center w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-lg">
                  <span className="text-[8px] font-black uppercase tracking-tighter opacity-50">Week</span>
                  <span className="text-xl font-black leading-none">{week}</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Stage {week} Recovery</h3>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Session cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {weekSessions.map(session => (
                  <div
                    key={session.id}
                    className={`group p-8 rounded-[2.5rem] border-2 transition-all relative overflow-hidden ${
                      session.status === 'Current'
                        ? 'bg-white border-indigo-500 shadow-2xl shadow-indigo-100 scale-[1.02] z-10'
                        : session.status === 'Ready'
                          ? 'bg-white border-emerald-400 border-dashed'
                          : session.status === 'Completed'
                            ? 'bg-slate-50 border-slate-100 opacity-60'
                            : 'bg-white border-slate-100 opacity-40 grayscale'
                    }`}
                  >
                    <div className="flex flex-col h-full space-y-4">

                      {/* Card header */}
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit ${
                              session.status === 'Current'
                                ? 'bg-indigo-100 text-indigo-600'
                                : session.status === 'Ready'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-slate-100 text-slate-400'
                            }`}>
                              Session {session.number}
                            </span>
                            {/* "Ready for Test" badge (test account only) */}
                            {session.status === 'Ready' && (
                              <span className="text-[8px] font-black text-emerald-600 uppercase border border-emerald-200 px-2 py-0.5 rounded">
                                Ready for Test
                              </span>
                            )}
                          </div>
                          <div className={`flex items-center gap-2 ${session.status === 'Current' ? 'text-indigo-600' : 'text-slate-400'}`}>
                            <i className="fa-solid fa-calendar-day text-xs" />
                            <span className="text-sm font-black tracking-tight">{scheduledDates[session.id]}</span>
                          </div>
                        </div>
                        {/* Status icon */}
                        {session.status === 'Locked' && <i className="fa-solid fa-lock text-slate-200 mt-1" />}
                        {session.status === 'Completed' && <i className="fa-solid fa-circle-check text-emerald-500 mt-1" />}
                      </div>

                      {/* Card body */}
                      <div className="flex-1">
                        <button
                          onClick={() => navigate(`/session/${session.number}`)}
                          className={`text-xl font-bold mb-2 text-left hover:text-indigo-600 transition-colors ${
                            session.status === 'Current' || session.status === 'Ready'
                              ? 'text-slate-800'
                              : 'text-slate-500'
                          }`}
                        >
                          {session.title}
                        </button>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium line-clamp-2">
                          {session.description}
                        </p>
                      </div>

                      {/* Card footer / CTA */}
                      <div className="pt-4 flex items-center justify-between gap-3">
                        {session.status === 'Locked' ? (
                          <div className="w-full py-4 bg-slate-50 text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center border border-slate-100">
                            Module Unlocks in Stage {session.week}
                          </div>
                        ) : session.status === 'Completed' ? (
                          <>
                            <button
                              onClick={() => navigate(`/session/${session.number}`)}
                              className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all"
                            >
                              Recap Session
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
                                <i className="fa-solid fa-bell-slash text-indigo-500" />
                              ) : (
                                <i className="fa-solid fa-bell" />
                              )}
                            </button>
                          </>
                        ) : (
                          // Current or Ready
                          <>
                            <button
                              onClick={() => {
                                sessionStorage.removeItem(`session-${session.number}-step`);
                                sessionStorage.removeItem(`session-${session.number}-idx`);
                                navigate(`/session/${session.number}`);
                              }}
                              className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${
                                session.status === 'Current'
                                  ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                                  : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100'
                              }`}
                            >
                              {session.status === 'Current' ? 'Continue Session' : 'Enter Session'}
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
                                <i className="fa-solid fa-bell-slash text-emerald-500" />
                              ) : (
                                <i className="fa-solid fa-bell" />
                              )}
                            </button>
                          </>
                        )}
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClientAssignments;