import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { type User, type SchedulePreference } from '../../types';
import { notificationService } from '../services/notificationService';
import { getSessionShortDescription } from '../services/sessionDetailContentMap';
import { userService } from '../services/userService';

// Extend User type to include currentClinicalSnapshot if not already defined
interface ExtendedUser extends User {
  currentClinicalSnapshot?: {
    lastMood?: number;
    pcl5Total?: number;
    lastUpdate?: Date;
  };
  // Use the existing User['assessmentScores'] type to stay compatible
  // while adding your specific clinical history arrays
  assessmentHistory?: any[]; 
  sessionHistory?: any[];
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface TherapySessionTask {
  id: string;
  number: number;
  title: string;
  week: number;
  status: 'Completed' | 'Current' | 'Locked';
  description: string;
  moduleKey: string;
}

interface ClientAssignmentsProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

const ClientAssignments: React.FC<ClientAssignmentsProps> = ({ user, onUpdateUser }) => {
  const navigate = useNavigate();
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());
  
  // State for user profile (fetched from API)
  const [userProfile, setUserProfile] = useState<ExtendedUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  
  // State for fetched templates
  const [sessionTemplates, setSessionTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile and check assessment completion
  useEffect(() => {
    const fetchProfileAndCheckAssessments = async () => {
      try {
        setProfileLoading(true);
        const profile = await userService.getProfile();
        setUserProfile(profile);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        // Fallback to prop user if API fails
        setUserProfile(user);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfileAndCheckAssessments();
  }, [user]);

  // Fetch session templates on mount
  useEffect(() => {
    const fetchSessionTemplates = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all 12 sessions
        const promises = Array.from({ length: 12 }, (_, i) => 
          fetch(`${BASE_URL}/sessions/${i + 1}`)
        );

        const responses = await Promise.all(promises);
        
        // Check if all requests succeeded
        const failedRequests = responses.filter(res => !res.ok);
        if (failedRequests.length > 0) {
          throw new Error('Failed to fetch some session templates');
        }

        const templates = await Promise.all(responses.map(res => res.json()));
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

  // Access control check: Sessions are only visible if assessments have been completed
  // Check using the fetched profile data (similar to assessment component pattern)
  const hasCompletedAssessments = useMemo(() => {
    if (!userProfile) return false;

    // Primary check: currentClinicalSnapshot (like your assessment example)
    if (userProfile.currentClinicalSnapshot?.pcl5Total && userProfile.currentClinicalSnapshot.pcl5Total > 0) {
      return true;
    }

    // Fallback checks for backward compatibility
    const hasPcl5Score = !!(userProfile.assessmentScores?.pcl5 && userProfile.assessmentScores.pcl5 > 0);
    const hasAssessmentHistory = !!(userProfile.assessmentHistory && userProfile.assessmentHistory.length > 0);
    const hasTimestamp = !!(userProfile.assessmentScores?.timestamp);
    
    return hasPcl5Score || hasAssessmentHistory || hasTimestamp;
  }, [userProfile]);

  const currentPreference = (userProfile?.schedulePreference || user.schedulePreference) || 'MonThu';

  const handleScheduleChange = (pref: SchedulePreference) => {
    // Update both local profile and parent user
    if (userProfile) {
      setUserProfile({ ...userProfile, schedulePreference: pref });
    }
    onUpdateUser({ ...user, schedulePreference: pref });
  };

 // Transform templates into therapy program format with dynamic status
 const therapyProgram = useMemo(() => {
  if (sessionTemplates.length === 0 || !userProfile) return [];

  const userCurrentSession = userProfile.currentSession || 1;
  const sessionHistory = userProfile.sessionHistory || [];
  
  // 1. Get all unique session numbers that are COMPLETED in the database
  const completedSessionNumbers = sessionHistory
    .filter(s => s.status === 'COMPLETED')
    .map(s => s.sessionNumber);

  // 2. Calculate how many sessions were completed THIS calendar week
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
  startOfWeek.setHours(0,0,0,0);

  const completedThisWeek = sessionHistory.filter(s => {
    if (s.status !== 'COMPLETED') return false;
    const completionDate = new Date(s.timestamp);
    return completionDate >= startOfWeek;
  }).length;

  const isWeekLimitReached = completedThisWeek >= 2;

  return sessionTemplates.map((template) => {
    const sessionNumber = template.sessionNumber;
    const week = Math.ceil(sessionNumber / 2);
    
    let status: 'Completed' | 'Current' | 'Locked';

    // PRIORITY 1: If it's in the completed list, it's always "Completed"
    if (completedSessionNumbers.includes(sessionNumber)) {
      status = 'Completed';
    } 
    // PRIORITY 2: If it's the next session to do...
    else if (sessionNumber === userCurrentSession) {
      // Lock it ONLY if they already finished 2 others this week
      status = isWeekLimitReached ? 'Locked' : 'Current';
    } 
    // PRIORITY 3: Everything else is locked
    else {
      status = 'Locked';
    }

    return {
      id: `s${sessionNumber}`,
      number: sessionNumber,
      title: template.title,
      week,
      status,
      description: getSessionShortDescription(sessionNumber),
      moduleKey: template.moduleKey
    };
  });
}, [sessionTemplates, userProfile]);

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

  // Loading state
  if (isLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-medium">Loading your treatment roadmap...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-6">
        <div className="bg-rose-50 rounded-[3rem] p-12 border border-rose-200 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center text-2xl mx-auto">
            <i className="fa-solid fa-exclamation-triangle"></i>
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

  // Assessment gate: Show unlock screen if assessments not completed
  if (!hasCompletedAssessments) {
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
            <NavLink 
              to="/assessments" 
              className="inline-flex items-center gap-3 px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] transition-all group"
            >
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
            <div className="mt-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-chart-line text-white text-sm"></i>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Progress</p>
                <p className="text-white font-bold">
                  Session {userProfile?.currentSession || 1} of 12
                </p>
              </div>
            </div>
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
        {[1, 2, 3, 4, 5, 6].map(week => {
          const weekSessions = therapyProgram.filter(s => s.week === week);
          
          if (weekSessions.length === 0) return null;

          return (
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
                {weekSessions.map(session => (
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
          );
        })}
      </div>
    </div>
  );
};

export default ClientAssignments;