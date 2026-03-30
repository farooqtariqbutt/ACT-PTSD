import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { type User, type SchedulePreference } from "../../types";
import { notificationService } from "../services/notificationService";
import { getSessionShortDescription } from "../services/sessionDetailContentMap";
import { userService } from "../services/userService";
import { useApp } from "../context/AppContext";

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
  status: "Completed" | "Current" | "Ready" | "Locked";
  description: string;
  moduleKey: string;
  lockReason?: string;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const ClientAssignments: React.FC = () => {
  const { currentUser: user, updateUser: onUpdateUser } = useApp();
  const navigate = useNavigate();

  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());

  // ── Remote state ─────────────────────────────────────────────────────────
  const [userProfile, setUserProfile] = useState<ExtendedUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [sessionTemplates, setSessionTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // ── Fetch user profile ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        const profile = await userService.getProfile();
        setUserProfile(profile);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setUserProfile(user as ExtendedUser);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const fetchSessionTemplates = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const sessionIds = Array.from({ length: 12 }, (_, i) => i + 1);

        const results = await Promise.allSettled(
          sessionIds.map((id) =>
            fetch(`${BASE_URL}/sessions/${id}`).then((res) => {
              if (!res.ok) throw new Error(`Session ${id} not found`);
              return res.json();
            })
          )
        );

        // Filter out failed requests and keep successful data
        const templates = results
          .filter(
            (result): result is PromiseFulfilledResult<any> =>
              result.status === "fulfilled"
          )
          .map((result) => result.value);

        setSessionTemplates(templates);
      } catch (err) {
        console.error("Error fetching session templates:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load sessions."
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchSessionTemplates();
  }, []);

  // ── Assessment gate ───────────────────────────────────────────────────────
  const hasCompletedAssessments = useMemo(() => {
    if (user?.role !== "CLIENT") return true; // Non-client roles always pass gate
    if (!userProfile) return false;
    if (
      userProfile.currentClinicalSnapshot?.pcl5Total &&
      userProfile.currentClinicalSnapshot.pcl5Total > 0
    )
      return true;
    const hasPcl5Score = !!(
      userProfile.assessmentScores?.pcl5 &&
      userProfile.assessmentScores.pcl5 > 0
    );
    const hasAssessmentHistory = !!(
      userProfile.assessmentHistory && userProfile.assessmentHistory.length > 0
    );
    const hasTimestamp = !!userProfile.assessmentScores?.timestamp;
    return hasPcl5Score || hasAssessmentHistory || hasTimestamp;
  }, [userProfile, user?.role]);

  // ── Schedule preference ───────────────────────────────────────────────────
  const currentPreference = (userProfile?.schedulePreference ||
    user?.schedulePreference ||
    (user?.sessionFrequency === "thrice"
      ? "MonWedFri"
      : user?.sessionFrequency === "once"
      ? "Mon"
      : "MonThu")) as SchedulePreference;

  // Once a preference is saved to the DB it is locked for CLIENT accounts
  const hasSetPreference =
    user?.role === "CLIENT"
      ? !!(userProfile?.schedulePreference || user.schedulePreference)
      : false;

  // ── Therapist approval gate ───────────────────────────────────────────────
  // Mirrors session prescription logic: a client is considered approved once
  // the therapist has prescribed at least one session.
  const isTherapistApproved =
    user?.role !== "CLIENT" ||
    (userProfile?.prescribedSessions &&
      userProfile.prescribedSessions.length > 0);

  const frequency = user?.sessionFrequency || "twice";
  const currentSessionNumber =
    userProfile?.currentSession || user?.currentSession || 1;
    const prescribedSessions = userProfile?.prescribedSessions || []; 

  const handleScheduleChange = async (pref: SchedulePreference) => {
    if (hasSetPreference || isSavingSchedule) return;
    setIsSavingSchedule(true);

    // 1. Sanitize the user object to prevent QuotaExceededError in localStorage
    // We strip out the heavy arrays before saving to local browser storage.
    // The full data is still safely preserved in your MongoDB and 'userProfile' state!
    const sanitizedUser = { ...user! };
    delete (sanitizedUser as any).sessionHistory;
    delete (sanitizedUser as any).assessmentHistory;
    delete (sanitizedUser as any).sessionData;
    delete (sanitizedUser as any).intakeResponses;

    try {
      // Optimistic update
      if (userProfile)
        setUserProfile({ ...userProfile, schedulePreference: pref });

      // Save ONLY the lightweight data to localStorage
      onUpdateUser({ ...sanitizedUser, schedulePreference: pref });

      await userService.updateProfile({ schedulePreference: pref });
      
    } catch (err) {
      console.error("Failed to save schedule preference:", err);
      alert("Failed to save schedule. Please check your connection.");
      // Revert
      if (userProfile)
        setUserProfile({
          ...userProfile,
          schedulePreference: currentPreference,
        });
      onUpdateUser({ ...sanitizedUser, schedulePreference: currentPreference });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // ── Build therapy program with dynamic status ────────────────────────────
  const therapyProgram = useMemo((): TherapySessionTask[] => {
    if (sessionTemplates.length === 0 || !userProfile) return [];

    const assignedSessions = userProfile.prescribedSessions || [];
//const isTestAccount = (userProfile as any).id === "test-c" || user?.id === "test-c";
// OVERRIDE FOR TESTING: Unlocks all sessions
const isTestAccount = true;
const isNonClient = user?.role !== "CLIENT";
const sessionHistory = userProfile.sessionHistory || [];

// ← completedSessionNumbers MUST be declared before the snap logic
const completedSessionNumbers: number[] = sessionHistory
  .filter((s: any) => s.status === "COMPLETED")
  .map((s: any) => s.sessionNumber as number);

// Now safe to reference completedSessionNumbers
const rawCurrentSession = userProfile.currentSession || 1;
const userCurrentSession =
  assignedSessions
    .filter(n => !completedSessionNumbers.includes(n))
    .sort((a, b) => a - b)[0] ?? rawCurrentSession;

    // Day-of-week validation (CLIENT only)
    const validDaysMap: Record<string, number[]> = {
      MonThu: [1, 4],
      TueFri: [2, 5],
      WedSat: [3, 6],
      MonWedFri: [1, 3, 5],
      TueThuSat: [2, 4, 6],
      Mon: [1],
      Tue: [2],
      Wed: [3],
      Thu: [4],
      Fri: [5],
      Sat: [6],
      Sun: [0],
    };
    const hasScheduleSet = !!(userProfile?.schedulePreference || user?.schedulePreference);
    const allowedDays = validDaysMap[currentPreference] || [1, 4];
    const isTodayValid = !hasScheduleSet ||allowedDays.includes(new Date().getDay());

    const todayStr = new Date().toDateString();
    const completedToday = sessionHistory.some(
      (s: any) =>
        s.status === "COMPLETED" &&
        new Date(s.timestamp).toDateString() === todayStr
    );

    return sessionTemplates
      .filter(
        (template) =>
          assignedSessions.includes(template.sessionNumber) ||
          isNonClient ||
          isTestAccount
      )
      .map((template): TherapySessionTask => {
        const sessionNumber: number = template.sessionNumber;
        const week = Math.ceil(sessionNumber / 2);
        let status: TherapySessionTask["status"];
        let lockReason = "";

        if (isNonClient || isTestAccount) {
          // Non-client roles and test accounts see everything as Ready (curriculum preview)
          status = completedSessionNumbers.includes(sessionNumber)
            ? "Completed"
            : "Ready";
        } else if (completedSessionNumbers.includes(sessionNumber)) {
          status = "Completed";
        } else if (sessionNumber === userCurrentSession) {
          if (!isTodayValid) {
            status = "Locked";
            lockReason = "Available on your next scheduled day";
          } else if (completedToday) {
            status = "Locked";
            lockReason = "Daily limit reached. See you next time!";
          } else {
            status = "Current";
          }
        } else {
          status = "Locked";
          lockReason = `Module Unlocks in Stage ${week}`;
        }

        return {
          id: `s${sessionNumber}`,
          number: sessionNumber,
          title: template.title,
          week,
          status,
          description: getSessionShortDescription(sessionNumber),
          moduleKey: template.moduleKey,
          lockReason,
        };
      });
  }, [sessionTemplates, userProfile, user?.id, user?.role, currentPreference]);

  // ── Scheduled dates ───────────────────────────────────────────────────────
  // ── Scheduled dates (Dynamic Progression Logic) ───────────────────────────
  const scheduledDates = useMemo(() => {
    const dates: Record<string, string> = {};

    const validDaysMap: Record<string, number[]> = {
      Mon: [1],
      Tue: [2],
      Wed: [3],
      Thu: [4],
      Fri: [5],
      Sat: [6],
      Sun: [0],
      MonThu: [1, 4],
      TueFri: [2, 5],
      WedSat: [3, 6],
      MonWedFri: [1, 3, 5],
      TueThuSat: [2, 4, 6],
    };

    const allowedDays = validDaysMap[currentPreference] || [1, 4];

    // Helper to find the next allowed day in the schedule
    const getNextValidDate = (startDate: Date): Date => {
      const date = new Date(startDate);
      for (let i = 0; i < 7; i++) {
        if (allowedDays.includes(date.getDay())) {
          return date;
        }
        date.setDate(date.getDate() + 1);
      }
      return date;
    };

    // Start projecting from today
const today = new Date();
today.setHours(0, 0, 0, 0);

// If already completed a session today, pending sessions start from tomorrow
const todayStr = new Date().toDateString();
const sessionHistory = userProfile?.sessionHistory || [];
const completedToday = sessionHistory.some(
  (s: any) => s.status === 'COMPLETED' && new Date(s.timestamp).toDateString() === todayStr
);
if (completedToday) {
  today.setDate(today.getDate() + 1);
}

let nextAvailableDate = getNextValidDate(today);

    therapyProgram.forEach((session) => {
      // 1. Check if this specific session is already completed
      const completedRecord = sessionHistory.find(
        (s: any) =>
          s.sessionNumber === session.number && s.status === "COMPLETED"
      );

      if (completedRecord && completedRecord.timestamp) {
        // If completed, lock in the actual date it was finished
        const compDate = new Date(completedRecord.timestamp);
        const weekday = compDate.toLocaleDateString("en-US", {
          weekday: "short",
        });
        const month = compDate.toLocaleDateString("en-US", { month: "short" });
        const dayNum = compDate.getDate();
        dates[session.id] = `${weekday}, ${month} ${dayNum}`;
      } else {
        // 2. If pending/current, project it forward to the next valid schedule day
        const weekday = nextAvailableDate.toLocaleDateString("en-US", {
          weekday: "short",
        });
        const month = nextAvailableDate.toLocaleDateString("en-US", {
          month: "short",
        });
        const dayNum = nextAvailableDate.getDate();
        dates[session.id] = `${weekday}, ${month} ${dayNum}`;

        // Advance the calendar cursor by 1 day, then snap to the next allowed day
        nextAvailableDate.setDate(nextAvailableDate.getDate() + 1);
        nextAvailableDate = getNextValidDate(nextAvailableDate);
      }
    });

    return dates;
  }, [currentPreference, therapyProgram, userProfile?.sessionHistory]);

  // ── Reminder helper ───────────────────────────────────────────────────────
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
        body: `Your scheduled session for ${
          scheduledDates[session.id]
        } is coming up. Are you ready to dive in?`,
        tag: `session-${session.number}`,
      }
    );
    setTimeout(() => {
      setRemindingId(null);
      setRemindedIds((prev) => new Set(prev).add(session.id));
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
          <p className="text-slate-500 font-medium">
            Loading your treatment roadmap...
          </p>
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
          <h2 className="text-2xl font-bold text-slate-800">
            Failed to Load Sessions
          </h2>
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
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">
              Unlock Your Journey
            </h2>
            <p className="text-slate-500 max-w-md mx-auto leading-relaxed text-lg font-medium">
              To begin your personalized 12-session recovery program, please
              complete the clinical intake assessments first.
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
// Therapist approval gate
// ─────────────────────────────────────────────────────────────────────────

if (!isTherapistApproved) {
  return (
    <div className="max-w-4xl mx-auto py-20 px-6 animate-in fade-in duration-700">
      <div className="bg-white rounded-[3rem] p-12 md:p-20 border border-slate-200 shadow-2xl text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <i className="fa-solid fa-calendar-check text-[15rem]" />
        </div>
        <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-4xl mx-auto shadow-inner relative z-10">
          <i className="fa-solid fa-clock animate-pulse" />
        </div>
        <div className="space-y-4 relative z-10">
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">
            Awaiting Therapist Approval
          </h2>
          <p className="text-slate-500 max-w-md mx-auto leading-relaxed text-lg font-medium">
            Your assessments are complete. Your therapist is reviewing your clinical profile and will assign your sessions shortly.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4 pt-4 relative z-10">
          <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// ── Completion check ──────────────────────────────────────────────────────
const currentSessionHistory = userProfile?.sessionHistory || [];
const completedNumbers = currentSessionHistory
  .filter((s: any) => s.status === "COMPLETED")
  .map((s: any) => s.sessionNumber as number);

const hasCompletedAllPrescribed = 
  user?.role === "CLIENT" &&
  prescribedSessions.length > 0 && 
  prescribedSessions.every(num => completedNumbers.includes(num));

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
          {/* Title + progress */}
          <div>
            <h2 className="text-3xl font-black tracking-tight mb-2">
              My Treatment Roadmap
            </h2>
            <p className="text-indigo-100 font-medium">
              Self-paced 12-session ACT program
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-chart-line text-white text-sm" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">
                  Progress
                </p>
                <p className="text-white font-bold">
                  Session{" "}
                  {currentSessionNumber > 12 ? 12 : currentSessionNumber} of {prescribedSessions.length}
                </p>
              </div>
            </div>
          </div>

          {/* Schedule cadence picker */}
          {/* Schedule cadence picker */}
          <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/20">
            {!isTherapistApproved ? (
              /* ── Pending therapist approval ── */
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-clock text-indigo-200 text-sm animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">
                    Schedule Locked
                  </p>
                  <p className="text-white/70 text-xs font-semibold mt-0.5">
                    Awaiting therapist approval
                  </p>
                </div>
              </div>
            ) : (
              /* ── Active schedule picker ── */
              <>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">
                  {isSavingSchedule
                    ? "Saving..."
                    : hasSetPreference
                    ? "Locked Schedule"
                    : `Set Your Schedule — ${frequency}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {/* Once-a-week options */}
                  {frequency === "once" &&
                    (
                      [
                        "Mon",
                        "Tue",
                        "Wed",
                        "Thu",
                        "Fri",
                        "Sat",
                        "Sun",
                      ] as SchedulePreference[]
                    ).map((p) => (
                      <button
                        key={p}
                        onClick={() => handleScheduleChange(p)}
                        disabled={
                          (hasSetPreference && currentPreference !== p) ||
                          isSavingSchedule
                        }
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                          currentPreference === p
                            ? "bg-white text-indigo-600 shadow-lg"
                            : hasSetPreference
                            ? "bg-white/5 text-white/20 cursor-not-allowed"
                            : "bg-white/10 text-indigo-100 hover:bg-white/20"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                  {/* Twice-a-week options */}
                  {frequency === "twice" &&
                    (
                      ["MonThu", "TueFri", "WedSat"] as SchedulePreference[]
                    ).map((p) => (
                      <button
                        key={p}
                        onClick={() => handleScheduleChange(p)}
                        disabled={
                          (hasSetPreference && currentPreference !== p) ||
                          isSavingSchedule
                        }
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                          currentPreference === p
                            ? "bg-white text-indigo-600 shadow-lg"
                            : hasSetPreference
                            ? "bg-white/5 text-white/20 cursor-not-allowed"
                            : "bg-white/10 text-indigo-100 hover:bg-white/20"
                        }`}
                      >
                        {p === "MonThu"
                          ? "Mon/Thu"
                          : p === "TueFri"
                          ? "Tue/Fri"
                          : "Wed/Sat"}
                      </button>
                    ))}

                  {/* Thrice-a-week options */}
                  {frequency === "thrice" &&
                    (["MonWedFri", "TueThuSat"] as SchedulePreference[]).map(
                      (p) => (
                        <button
                          key={p}
                          onClick={() => handleScheduleChange(p)}
                          disabled={
                            (hasSetPreference && currentPreference !== p) ||
                            isSavingSchedule
                          }
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                            currentPreference === p
                              ? "bg-white text-indigo-600 shadow-lg"
                              : hasSetPreference
                              ? "bg-white/5 text-white/20 cursor-not-allowed"
                              : "bg-white/10 text-indigo-100 hover:bg-white/20"
                          }`}
                        >
                          {p === "MonWedFri" ? "Mon/Wed/Fri" : "Tue/Thu/Sat"}
                        </button>
                      )
                    )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Week-by-week breakdown ────────────────────────────────────────── */}
      <div className="space-y-12">
        {therapyProgram.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
            <i className="fa-solid fa- couch text-4xl text-slate-300 mb-4 block"></i>
            <h3 className="text-xl font-bold text-slate-800">
              No Sessions Assigned
            </h3>
            <p className="text-slate-500">
              Your therapist hasn't set up your session path yet. Check back
              soon!
            </p>
          </div>
        ) : (
          [1, 2, 3, 4, 5, 6].map((week) => {
            const statusOrder = { Completed: 0, Current: 1, Ready: 2, Locked: 3 };

const weekSessions = therapyProgram
  .filter((s) => s.week === week)
  .sort((a, b) => {
    // Primary: sort by status priority
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    // Secondary: within same status, sort by session number
    return a.number - b.number;
  });
            if (weekSessions.length === 0) return null;

            return (
              <div key={week} className="space-y-6">
                {/* Week header */}
                <div className="flex items-center gap-4 px-2">
                  <div className="flex flex-col items-center justify-center w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-lg">
                    <span className="text-[8px] font-black uppercase tracking-tighter opacity-50">
                      Week
                    </span>
                    <span className="text-xl font-black leading-none">
                      {week}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                    Stage {week} Recovery
                  </h3>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* Session cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {weekSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`group p-8 rounded-[2.5rem] border-2 transition-all relative overflow-hidden ${
                        session.status === "Current"
                          ? "bg-white border-indigo-500 shadow-2xl shadow-indigo-100 scale-[1.02] z-10"
                          : session.status === "Ready"
                          ? "bg-white border-emerald-400 border-dashed"
                          : session.status === "Completed"
                          ? "bg-slate-50 border-slate-100 opacity-60"
                          : "bg-white border-slate-100 opacity-40 grayscale"
                      }`}
                    >
                      <div className="flex flex-col h-full space-y-4">
                        {/* Card header */}
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit ${
                                  session.status === "Current"
                                    ? "bg-indigo-100 text-indigo-600"
                                    : session.status === "Ready"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                Session {session.number}
                              </span>
                              {session.status === "Ready" && (
                                <span className="text-[8px] font-black text-emerald-600 uppercase border border-emerald-200 px-2 py-0.5 rounded">
                                  Ready for Test
                                </span>
                              )}
                            </div>
                            <div
                              className={`flex items-center gap-2 ${
                                session.status === "Current"
                                  ? "text-indigo-600"
                                  : "text-slate-400"
                              }`}
                            >
                              <i className="fa-solid fa-calendar-day text-xs" />
                              <span className="text-sm font-black tracking-tight">
                                {scheduledDates[session.id]}
                              </span>
                            </div>
                          </div>

                          {/* Status icon */}
                          {session.status === "Locked" && (
                            <i className="fa-solid fa-lock text-slate-200 mt-1" />
                          )}
                          {session.status === "Completed" && (
                            <i className="fa-solid fa-circle-check text-emerald-500 mt-1" />
                          )}
                        </div>

                        {/* Card body */}
                        <div className="flex-1">
                          <button
                            onClick={() =>
                              navigate(`/session/${session.number}`)
                            }
                            disabled={session.status === "Locked"}
                            className={`text-xl font-bold mb-2 text-left transition-colors ${
                              session.status === "Current" ||
                              session.status === "Ready"
                                ? "text-slate-800 hover:text-indigo-600"
                                : "text-slate-500 cursor-not-allowed"
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
                          {session.status === "Locked" ? (
                            <div className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center border border-slate-100">
                              {session.lockReason}
                            </div>
                          ) : session.status === "Completed" ? (
                            <>
                              <button
                                onClick={() =>
                                  navigate(`/session/${session.number}`)
                                }
                                className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all"
                              >
                                Recap Session
                              </button>
                              <button
                                onClick={() => scheduleReminder(session)}
                                disabled={
                                  remindingId === session.id ||
                                  remindedIds.has(session.id)
                                }
                                className="w-14 h-14 flex items-center justify-center bg-slate-50 text-slate-400 rounded-2xl hover:text-indigo-600 transition-all border border-slate-100"
                                title="Remind Me"
                              >
                                {remindingId === session.id ? (
                                  <img
                                    src="https://i.ibb.co/FkV0M73k/brain.png"
                                    alt="loading"
                                    className="w-5 h-5 brain-loading-img"
                                  />
                                ) : remindedIds.has(session.id) ? (
                                  <i className="fa-solid fa-bell-slash text-emerald-500" />
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
                                  sessionStorage.removeItem(
                                    `session-${session.number}-step`
                                  );
                                  sessionStorage.removeItem(
                                    `session-${session.number}-idx`
                                  );
                                  navigate(`/session/${session.number}`);
                                }}
                                className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${
                                  session.status === "Current"
                                    ? "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
                                    : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100"
                                }`}
                              >
                                {session.status === "Current"
                                  ? "Continue Session"
                                  : "Enter Session"}
                              </button>
                              <button
                                onClick={() => scheduleReminder(session)}
                                disabled={
                                  remindingId === session.id ||
                                  remindedIds.has(session.id)
                                }
                                className="w-14 h-14 flex items-center justify-center bg-slate-50 text-slate-400 rounded-2xl hover:text-indigo-600 transition-all border border-slate-100"
                                title="Remind Me"
                              >
                                {remindingId === session.id ? (
                                  <img
                                    src="https://i.ibb.co/FkV0M73k/brain.png"
                                    alt="loading"
                                    className="w-5 h-5 brain-loading-img"
                                  />
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
          })
        )}
      </div>

      {/* ── Post-Program Completion Banner ───────────────────────────────── */}
      {(currentSessionNumber > 12 || hasCompletedAllPrescribed) && (
        <section className="mt-12 p-10 bg-emerald-50 rounded-[2.5rem] border-2 border-emerald-200 shadow-xl animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-sm text-emerald-500">
              <i className="fa-solid fa-graduation-cap"></i>
            </div>
            <div className="flex-1 text-center md:text-left space-y-2">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                Congratulations on Completing the Path!
              </h3>
              <p className="text-slate-600 font-medium">
                You've successfully completed all sessions of your Recovery
                Path. The final step is to complete your Post-Assessments to
                measure your growth and finalize your program.
              </p>
            </div>
            <button
              onClick={() => navigate("/assessments?type=post")}
              className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all whitespace-nowrap"
            >
              Start Post-Assessments
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default ClientAssignments;
