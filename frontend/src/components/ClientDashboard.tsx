import React, { useState, useEffect, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import DistressMeter from "./DistressMeter";
import { type User, type SchedulePreference } from "../../types";
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
  sessionData?: any[];
  values?: { name: string; icon: string; color: string }[];
  assessmentScores?: any;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const ClientDashboard: React.FC = () => {
  const { currentUser: user, themeClasses } = useApp();
  const navigate = useNavigate();

  // ── State ────────────────────────────────────────────────────────────────
  const [userProfile, setUserProfile] = useState<ExtendedUser | null>(null);
  const [currentSessionData, setCurrentSessionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Fetch dashboard data ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // 1. Latest user profile
        const profile = await userService.getProfile();
        setUserProfile(profile);

        const prescribed = profile?.prescribedSessions || [];
        const completed = (profile?.sessionHistory || [])
          .filter((s: any) => s.status === "COMPLETED")
          .map((s: any) => s.sessionNumber as number);
        const rawNum = profile?.currentSession || user!.currentSession || 1;

        const sessionNum =
          prescribed.length === 0 || prescribed.includes(rawNum)
            ? rawNum
            : prescribed
                .filter((n: number) => !completed.includes(n))
                .sort((a: number, b: number) => a - b)[0] ?? rawNum;

        if (sessionNum <= 12) {
          const sessionRes = await fetch(`${BASE_URL}/sessions/${sessionNum}`);
          if (sessionRes.ok) {
            setCurrentSessionData(await sessionRes.json());
          } else {
            console.error("Failed to fetch session details");
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  // ── Assessment Gate ───────────────────────────────────────────────────────
  const hasCompletedAssessments = useMemo(() => {
    if (user?.role !== "CLIENT") return true;
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
    return hasPcl5Score || hasAssessmentHistory;
  }, [userProfile, user?.role]);

  // ── Derived values ────────────────────────────────────────────────────────
  const rawSessionNumber =
    userProfile?.currentSession || user!.currentSession || 1;
  const prescribedSessions = userProfile?.prescribedSessions || [];
  const completedSessionNumbers = (userProfile?.sessionHistory || [])
    .filter((s: any) => s.status === "COMPLETED")
    .map((s: any) => s.sessionNumber as number);

  // Snap to first prescribed incomplete session if currentSession isn't prescribed
  const currentSessionNumber =
    prescribedSessions.length === 0
      ? rawSessionNumber
      : prescribedSessions.includes(rawSessionNumber)
      ? rawSessionNumber
      : prescribedSessions
          .filter((n: number) => !completedSessionNumbers.includes(n))
          .sort((a: number, b: number) => a - b)[0] ?? rawSessionNumber;
  const sessionTitle =
    currentSessionData?.title || `Session ${currentSessionNumber}`;
  const totalPrescribed = prescribedSessions.length || 12;
  const completedCount = completedSessionNumbers.filter((n: number) =>
    prescribedSessions.includes(n)
  ).length;
  const progressPercent =
    totalPrescribed === 0
      ? 0
      : Math.min(100, Math.round((completedCount / totalPrescribed) * 100));

  // Value steps taken (falls back to local user data while remote profile loads)
  const valueStepsCount = (
    userProfile?.sessionData ||
    user!.sessionData ||
    []
  ).filter((d: any) => d.stepId === "value-action-step").length;

  // ── Schedule lock logic ───────────────────────────────────────────────────
  const preference = (userProfile?.schedulePreference ||
    user!.schedulePreference ||
    "MonThu") as SchedulePreference;

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

  const allowedDays = validDaysMap[preference] || [1, 4];
  const isTodayValid = allowedDays.includes(new Date().getDay());
  const todayStr = new Date().toDateString();

  const completedToday =
    userProfile?.sessionHistory?.some(
      (s: any) =>
        s.status === "COMPLETED" &&
        new Date(s.timestamp).toDateString() === todayStr
    ) ?? false;

  // Locks the button if assessments aren't done OR if the schedule dictates it (unless they are done with the program)
  // --- NEW: Check if therapist has assigned sessions ---
  const isTherapistApproved = prescribedSessions.length > 0;
  const hasScheduleSet = !!(userProfile?.schedulePreference || user?.schedulePreference);

  // Locks the button if assessments aren't done, therapist hasn't approved, OR if the schedule dictates it
  const isSessionLocked = !hasCompletedAssessments || 
  (currentSessionNumber <= 12 && (!isTherapistApproved || !hasScheduleSet || !isTodayValid || completedToday));

  let launchButtonText = '';
  if (!hasCompletedAssessments) {
    launchButtonText = 'Launch Pre-Assessments';
  } else if (currentSessionNumber > 12) {
    launchButtonText = 'Launch Post-Assessments';
  } else if (!isTherapistApproved) {
    launchButtonText = 'Pending Therapist Review';
  } else if (!hasScheduleSet) {
    launchButtonText = 'Action Required: Set Schedule'; // <-- NEW STATE
  } else if (completedToday) {
    launchButtonText = 'Daily Limit Reached';
  } else if (!isTodayValid) {
    launchButtonText = 'Available Next Scheduled Day';
  } else {
    launchButtonText = `Launch Session ${currentSessionNumber}`;
  }
  // Friendly schedule label (handles all frequency options)
  const scheduleLabel = preference
    .replace("MonThu", "Mon/Thu")
    .replace("TueFri", "Tue/Fri")
    .replace("WedSat", "Wed/Sat")
    .replace("MonWedFri", "Mon/Wed/Fri")
    .replace("TueThuSat", "Tue/Thu/Sat");

  // ── Today's Tasks (dynamic) ───────────────────────────────────────────────
  const todaysTasks = useMemo(() => {
    const tasks: {
      id: string;
      icon: string;
      color: string;
      hoverColor: string;
      title: string;
      desc: string;
      action: () => void;
    }[] = [];

    // Always present Grounding task
    tasks.push({
      id: "grounding",
      icon: "fa-spa",
      color: "bg-emerald-50 text-emerald-600",
      hoverColor: "group-hover:bg-emerald-500 group-hover:text-white",
      title: "Morning Grounding",
      desc: "5-4-3-2-1 exercise (10 mins)",
      action: () => navigate("/assignments"),
    });

    if (!hasCompletedAssessments) {
      tasks.push({
        id: "assessment",
        icon: "fa-clipboard-list",
        color: "bg-rose-50 text-rose-600",
        hoverColor: "group-hover:bg-rose-500 group-hover:text-white",
        title: "Complete Clinical Intake",
        desc: "Required to unlock your roadmap",
        action: () => navigate("/assessments"),
      });
    } else if (currentSessionNumber > 12) {
      tasks.push({
        id: "post-assessment",
        icon: "fa-clipboard-check",
        color: "bg-indigo-50 text-indigo-600",
        hoverColor: "group-hover:bg-indigo-500 group-hover:text-white",
        title: "Post-Program Evaluation",
        desc: "Finalize your recovery journey",
        action: () => navigate("/assessments?type=post"),
      });
    } else if (!isTherapistApproved) {
      // --- NEW: Pending Review Task ---
      tasks.push({
        id: "pending-review",
        icon: "fa-hourglass-half",
        color: "bg-amber-50 text-amber-600",
        hoverColor: "group-hover:bg-amber-500 group-hover:text-white",
        title: "Pending Review",
        desc: "Your profile is under clinical review.",
        action: () => {}, // Do nothing on click
      });
    }else if (!hasScheduleSet) {
      // --- NEW: Pending Schedule Task ---
      tasks.push({
        id: 'pending-schedule',
        icon: 'fa-calendar-days',
        color: 'bg-amber-50 text-amber-600',
        hoverColor: 'group-hover:bg-amber-500 group-hover:text-white',
        title: 'Set Your Schedule',
        desc: 'Visit your roadmap to unlock sessions.',
        action: () => navigate('/assignments'),
      });}
       else if (isTodayValid && !completedToday) {
      tasks.push({
        id: "session",
        icon: "fa-graduation-cap",
        color: "bg-indigo-50 text-indigo-600",
        hoverColor: "group-hover:bg-indigo-500 group-hover:text-white",
        title: `Session ${currentSessionNumber} Focus`,
        desc: sessionTitle,
        action: () => navigate(`/session/${currentSessionNumber}`),
      });
    } else if (completedToday) {
      tasks.push({
        id: "recap",
        icon: "fa-check-double",
        color: "bg-sky-50 text-sky-600",
        hoverColor: "group-hover:bg-sky-500 group-hover:text-white",
        title: `Session ${currentSessionNumber - 1} Complete!`,
        desc: "Great job today. Review your insights.",
        action: () => navigate("/assignments"),
      });
    } else {
      tasks.push({
        id: "integration",
        icon: "fa-book-open",
        color: "bg-amber-50 text-amber-600",
        hoverColor: "group-hover:bg-amber-500 group-hover:text-white",
        title: "Integration Day",
        desc: "Rest and apply what you learned.",
        action: () => navigate("/assignments"),
      });
    }

    return tasks;
  }, [
    hasCompletedAssessments,
    isTherapistApproved,
    hasScheduleSet,
    isTodayValid,
    completedToday,
    currentSessionNumber,
    sessionTitle,
    navigate,
  ]);
  // ── Skills progress (session-driven until backend supports real data) ─────
  const skillsProgress = useMemo(() => {
    const base = Math.min((currentSessionNumber / 12) * 100, 100);
    return [
      {
        label: "Defusion",
        value: Math.floor(base * 0.8) + 12,
        color: "bg-indigo-500",
      },
      {
        label: "Values Alignment",
        value: Math.floor(base * 0.9) + 8,
        color: "bg-emerald-500",
      },
      {
        label: "Present Moment",
        value: Math.floor(base * 0.7) + 15,
        color: "bg-sky-500",
      },
    ];
  }, [currentSessionNumber]);

  // ── Daily content (rotates by day of year) ────────────────────────────────
  const { dailyInsight, dailyMindset } = useMemo(() => {
    const insights = [
      "When the 'I'm not good enough' story shows up, notice it as a story. You don't have to fight it, just make room for it like a passenger on a bus.",
      "Your thoughts are like leaves on a stream. You can watch them float by without jumping into the water to catch them.",
      "Pain is inevitable, but suffering is a choice. Today, choose to make room for your feelings without fighting them.",
      "Focus on what you can control: your actions right now. Let the rest simply be.",
    ];
    const mindsets = [
      "I am willing to experience this moment exactly as it is, without needing to change it or run away from it.",
      "I breathe in courage, I exhale doubt. I am ready for whatever today brings.",
      "My values guide my steps, even when the path is difficult.",
      "I hold my thoughts lightly, leaving my hands free to do what matters.",
    ];
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        86_400_000
    );
    return {
      dailyInsight: insights[dayOfYear % insights.length],
      dailyMindset: mindsets[dayOfYear % mindsets.length],
    };
  }, []);

  // ── User values (falls back to defaults) ─────────────────────────────────
  const userValues = useMemo(() => {
    if (userProfile?.values && userProfile.values.length > 0)
      return userProfile.values;
    return [
      { name: "Health", icon: "fa-heart-pulse", color: "text-rose-400" },
      { name: "Family", icon: "fa-people-group", color: "text-sky-400" },
    ];
  }, [userProfile?.values]);

  // ─────────────────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div
          className={`w-12 h-12 border-4 ${themeClasses.border} border-t-transparent rounded-full animate-spin`}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* ── 12-Session Program Tracker ─────────────────────────────────────── */}
      <section
        className={`${themeClasses.secondary} rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 text-slate-800 shadow-2xl relative overflow-hidden transition-colors duration-500`}
      >
        <div
          className={`absolute top-0 right-0 w-96 h-96 ${themeClasses.primary} opacity-10 rounded-full -mr-48 -mt-48 blur-3xl`}
        />
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 md:gap-8 relative z-10">
          {/* Progress info */}
          <div className="flex-1 w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-sm">
                🏆
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight">
                  Your 12-Session Journey
                </h2>
                <p className={`${themeClasses.text} text-xs md:text-sm font-medium`}>
  {!hasCompletedAssessments
    ? "Start your journey with initial assessments."
    : currentSessionNumber > 12
    ? "Program Completed! Time for Post-Assessments."
    : !isTherapistApproved
    ? "Assessments complete. Awaiting therapist assignment."
    : !hasScheduleSet
    ? "Action Required: Set your schedule to unlock sessions." // <-- NEW
    : `Session ${currentSessionNumber} : ${sessionTitle}`}
</p>
                {hasCompletedAssessments && currentSessionNumber <= 12 && (
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Next Session:{" "}
                    {isTodayValid
                      ? "Available Today"
                      : `Schedule (${scheduleLabel})`}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div
                className={`flex justify-between text-[10px] font-black uppercase tracking-widest ${themeClasses.text} opacity-60`}
              >
                <span>Program Progress</span>
                <span>{progressPercent}% Complete</span>
              </div>
              <div
                className={`w-full h-3 ${themeClasses.secondary} rounded-full overflow-hidden shadow-inner`}
              >
                <div
                  className={`h-full ${themeClasses.primary} rounded-full transition-all duration-1000 shadow-lg`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {/* Per-session pip track */}
              <div
                className={`grid gap-1.5`}
                style={{
                  gridTemplateColumns: `repeat(${totalPrescribed}, minmax(0, 1fr))`,
                }}
              >
                {prescribedSessions
                  .sort((a: number, b: number) => a - b)
                  .map((n: number) => (
                    <div
                      key={n}
                      className={`h-1.5 rounded-full transition-colors ${
                        completedSessionNumbers.includes(n)
                          ? themeClasses.primary
                          : n === currentSessionNumber &&
                            currentSessionNumber <= 12
                          ? `${themeClasses.primary} animate-pulse`
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
              </div>
            </div>
          </div>

          {/* Launch CTA */}
          <div className="flex flex-col gap-3 w-full lg:w-auto mt-4 lg:mt-0">
            <button
              onClick={() => {
                if (!hasCompletedAssessments) navigate("/assessments");
                else if (currentSessionNumber > 12)
                  navigate("/assessments?type=post");
                else if (!isSessionLocked)
                  navigate(`/session/${currentSessionNumber}`);
              }}
              disabled={isSessionLocked && currentSessionNumber <= 12}
              className={`px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all text-center w-full whitespace-nowrap ${
                isSessionLocked && currentSessionNumber <= 12
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : `${themeClasses.primary} text-white hover:opacity-90 shadow-xl ${themeClasses.shadow}`
              }`}
            >
              {isSessionLocked && currentSessionNumber <= 12 && (
                <i className="fa-solid fa-lock mr-2 text-slate-400" />
              )}
              {launchButtonText}
            </button>
          </div>
        </div>
      </section>

      {/* ── Main Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Distress Meter */}
        <DistressMeter />

        {/* Right two-thirds column */}
        <section className="lg:col-span-2 space-y-8">
          {/* Today's Tasks */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className={`fa-solid fa-list-check ${themeClasses.text}`} />
                Today's Tasks
              </h3>
              <NavLink
                to="/assignments"
                className={`text-xs font-bold ${themeClasses.text} hover:underline uppercase tracking-widest`}
              >
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
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${task.color} ${task.hoverColor}`}
                  >
                    <i className={`fa-solid ${task.icon}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-sm">
                      {task.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {task.desc}
                    </p>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-200 text-xs mt-2 group-hover:text-indigo-300 transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Committed Actions */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i
                  className={`fa-solid fa-person-running ${themeClasses.text}`}
                />
                Committed Actions
              </h3>
              <NavLink
                to="/values-log"
                className={`text-xs font-bold ${themeClasses.text} hover:underline uppercase tracking-widest`}
              >
                View Log
              </NavLink>
            </div>
            <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6 md:gap-8 flex-1">
              <div
                className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 md:border-8 ${themeClasses.secondary} flex flex-col items-center justify-center bg-white shadow-inner shrink-0`}
              >
                <span
                  className={`text-2xl md:text-3xl font-black ${themeClasses.text}`}
                >
                  {valueStepsCount}
                </span>
                <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase text-center mt-1 leading-tight">
                  Steps
                  <br />
                  Taken
                </span>
              </div>
              <div className="flex-1 space-y-3 md:space-y-4 text-center md:text-left">
                <h4 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">
                  Values Persistence
                </h4>
                <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
                  You've taken {valueStepsCount} committed actions toward your
                  values. Every small step strengthens your psychological
                  flexibility.
                </p>
                <NavLink
                  to="/values-log"
                  className={`inline-block px-6 py-2.5 ${themeClasses.primary} text-white rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-lg ${themeClasses.shadow}`}
                >
                  Record Today's Step
                </NavLink>
              </div>
            </div>
          </div>

          {/* Skill Growth */}
          <div className="bg-white rounded-3xl md:rounded-[2rem] p-6 md:p-8 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6 flex justify-between items-center">
              Skill Growth
              <NavLink
                to="/reports"
                className={`text-[10px] font-bold ${themeClasses.text} uppercase hover:underline`}
              >
                Full Report
              </NavLink>
            </h3>
            <div className="space-y-6">
              {skillsProgress.map((skill) => (
                <div key={skill.label}>
                  <div className="flex justify-between text-[10px] mb-1.5">
                    <span className="text-slate-500 font-bold uppercase tracking-widest">
                      {skill.label}
                    </span>
                    <span className="text-slate-800 font-bold">
                      {skill.value}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${skill.color} rounded-full transition-all duration-1000`}
                      style={{ width: `${skill.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── Bottom Row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Daily Insight */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <i className={`fa-solid fa-message ${themeClasses.text}`} />
              Daily Insight
            </h3>
            <div
              className={`text-sm text-slate-600 italic leading-relaxed ${themeClasses.secondary} p-4 rounded-2xl border ${themeClasses.border} min-h-[100px] flex items-center`}
            >
              "{dailyInsight}"
            </div>
          </div>
          <div className="mt-4">
            <NavLink
              to="/chat"
              className={`text-xs font-bold ${themeClasses.text} flex items-center gap-2 hover:underline uppercase tracking-widest`}
            >
              Discuss with Companion <i className="fa-solid fa-arrow-right" />
            </NavLink>
          </div>
        </section>

        {/* My Compass / Values */}
        <section
          className={`${themeClasses.secondary} rounded-3xl p-8 text-slate-800 relative overflow-hidden flex flex-col justify-between transition-colors duration-500 shadow-sm border ${themeClasses.border}`}
        >
          <div
            className={`absolute top-0 right-0 w-64 h-64 ${themeClasses.primary} opacity-10 rounded-full -mr-24 -mt-24 blur-3xl`}
          />
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-1">My Compass</h3>
            <p className="text-slate-500 text-sm">Life domains in focus.</p>
          </div>
          <div className="flex flex-wrap gap-3 mt-6 relative z-10">
            {userValues.map((val, idx) => (
              <div
                key={idx}
                className="px-3 py-1.5 bg-white/60 border border-white/80 rounded-xl flex items-center gap-2 shadow-sm"
              >
                <i
                  className={`fa-solid ${val.icon} ${val.color} text-[10px]`}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  {val.name}
                </span>
              </div>
            ))}
          </div>
          <NavLink
            to="/values"
            className={`mt-6 w-full py-2.5 ${themeClasses.primary} hover:opacity-90 transition-all rounded-xl text-xs font-bold shadow-xl text-center relative z-10 text-white`}
          >
            Explore All Values
          </NavLink>
        </section>

        {/* Morning Mindset */}
        <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-2xl mb-4">
            <i className="fa-solid fa-sun" />
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
