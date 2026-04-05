import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { UserRole } from '../../types';

// Services & Utilities
import { saveAssessment } from '../services/assessmentService';
import { userService } from '../services/userService';
import {
  getPDEQInterpretation,
  getPCL5Interpretation,
  getDERSInterpretation,
  getAAQInterpretation,
} from '../utils/assessmentUtils';

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/assessments`;

// ─── Types ────────────────────────────────────────────────────────────────────

type AssessmentStep =
  | 'intro' | 'mood' | 'demographics' | 'traumaHistory'
  | 'pdeq' | 'pcl5' | 'ders' | 'aaq' | 'redFlags'
  | 'summary1' | 'summary2' | 'education';

interface Option {
  label: string;
  value: number;
}

interface Question {
  id: string;
  text: string;
  type: string;
  options: Option[];
  cluster?: string;
}

interface AssessmentTemplate {
  _id: string;
  code: string;
  title: string;
  description: string;
  questions: Question[];
  reverseScoreIndices?: number[];
}



// ─── Component ────────────────────────────────────────────────────────────────

const Assessments: React.FC = () => {
  // ── Context ──────────────────────────────────────────────────────────────
  const {
    currentUser: user,
    setIsAssessmentInProgress,
    showAssessmentQuitDialog,
    setShowAssessmentQuitDialog,
    themeClasses,
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();

  
  
  // ── Assessment Type Flags ─────────────────────────────────────────────────
  const queryParams = new URLSearchParams(location.search);
  const isPostAssessment = queryParams.get('type') === 'post';
  const assessmentPrefix = isPostAssessment ? 'Post' : 'Pre';

  // ── Core Flow State ───────────────────────────────────────────────────────
  const [step, setStep] = useState<AssessmentStep>('intro');
  const [activeAssessment, setActiveAssessment] = useState<1 | 2>(1);
  const [mood, setMood] = useState<number | null>(null);

  // ── API / Loading State ───────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // ── Session Lock State ────────────────────────────────────────────────────
  const [nextSessionTemplate, setNextSessionTemplate] = useState<{
    sessionNumber: number;
    title: string;
  } | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState(''); // <--- ADD THIS LINE

  // ── Assessment Templates (API-driven) ─────────────────────────────────────
  const [pdeqTemplate, setPdeqTemplate] = useState<AssessmentTemplate | null>(null);
  const [pcl5Template, setPcl5Template] = useState<AssessmentTemplate | null>(null);
  const [dersTemplate, setDersTemplate] = useState<AssessmentTemplate | null>(null);
  const [aaqTemplate, setAaqTemplate] = useState<AssessmentTemplate | null>(null);
  const [redFlagTemplate, setRedFlagTemplate] = useState<AssessmentTemplate | null>(null);

  // ── Form Data ─────────────────────────────────────────────────────────────
  const [demoData, setDemoData] = useState({
    name: user?.name || '',
    age: '', gender: '', maritalStatus: '', education: '', city: '', occupation: '',
    siblings: '', birthOrder: '', familySystem: 'Nuclear', medicalDiseases: '',
    psychIllness: '', medication: '', incomeRange: '', earningMembers: '',
    familyMedical: '', familyPsych: '', parentsRelation: 'Living Together',
  });

  const [traumaData, setTraumaData] = useState({
    deathOfLovedOne:     { experienced: false, age: '' },
    nearDeath:           { experienced: false, age: '' },
    seriousInjury:       { experienced: false, age: '' },
    witnessedTrauma:     { experienced: false, age: '' },
    abuseEmotional:      { experienced: false, age: '' },
    abusePhysical:       { experienced: false, age: '' },
    abuseSexual:         { experienced: false, age: '' },
    naturalDisaster:     { experienced: false, age: '' },
    warPoliticalViolence:{ experienced: false, age: '' },
    domesticViolence:    { experienced: false, age: '' },
    witnessedViolence:   { experienced: false, age: '' },
    separationDivorce:   { experienced: false, age: '' },
    cSection:            { experienced: false, age: '' },
  });

  
  const [profile,setProfile] = useState<any>(null); // Store user profile for dynamic logic
  

  // ── Score Tracking ────────────────────────────────────────────────────────
  const [pdeqScores, setPdeqScores] = useState<number[]>([]);
  const [pcl5Scores, setPcl5Scores] = useState<number[]>([]);
  const [dersScores, setDersScores] = useState<number[]>([]);
  const [aaqScores,  setAaqScores]  = useState<number[]>([]);
  const [redFlagData, setRedFlagData] = useState<
    Record<number, { hasFlag: boolean | null; rightNow: boolean; pastMonth: boolean; ever: boolean }>
  >({});

  // ── 1. Mount: Fetch Templates & Check Profile ─────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch user profile to check weekly lock & existing assessment
        const fetchedProfile = await userService.getProfile();
        setProfile(fetchedProfile); 
        if (fetchedProfile?.name) {
          setDemoData(prev => ({ ...prev, name: fetchedProfile.name }));
        }

       // --- DYNAMIC SCHEDULE & LIMIT LOCK LOGIC ---
       const sessionHistory = fetchedProfile?.sessionHistory || [];
       const prescribed = fetchedProfile?.prescribedSessions || [];
        
       // 1. Calculate Weekly Limit (Map string to number)
       const freqMap: Record<string, number> = { once: 1, twice: 2, thrice: 3 };
       const weeklyLimit = freqMap[fetchedProfile?.sessionFrequency || user?.sessionFrequency || 'twice'] || 2;
       
       const startOfWeek = new Date();
       startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
       startOfWeek.setHours(0, 0, 0, 0);
       
       const completedThisWeek = sessionHistory.filter((s: any) => {
         return s.status === 'COMPLETED' && new Date(s.timestamp) >= startOfWeek;
       }).length;

       // 2. Check Daily Limit
       const todayStr = new Date().toDateString();
       const completedToday = sessionHistory.some((s: any) =>
         s.status === 'COMPLETED' && new Date(s.timestamp).toDateString() === todayStr
       );

       // 3. Check Scheduled Days
       const currentPref = fetchedProfile?.schedulePreference || user?.schedulePreference || 'MonThu';
       const validDaysMap: Record<string, number[]> = {
         MonThu: [1, 4], TueFri: [2, 5], WedSat: [3, 6],
         MonWedFri: [1, 3, 5], TueThuSat: [2, 4, 6],
         Mon: [1], Tue: [2], Wed: [3], Thu: [4], Fri: [5], Sat: [6], Sun: [0],
       };
       const allowedDays = validDaysMap[currentPref] || [1, 4];
       const isTodayValid = allowedDays.includes(new Date().getDay());

       // 4. Apply Locks
       if (completedThisWeek >= weeklyLimit) {
         setIsLocked(true);
         setLockReason('Weekly Limit Reached');
       } else if (completedToday) {
         setIsLocked(true);
         setLockReason('Daily Limit Reached');
       } else if (!isTodayValid) {
         setIsLocked(true);
         setLockReason('Available Next Scheduled Day');
       } else {
         setIsLocked(false);
         setLockReason('');
       }

        // --- NEW FIXED CODE ---
// 1. Get currentSession from profile
let currentNum = fetchedProfile?.currentSession;


// If currentSession isn't allowed or doesn't exist, pick the first allowed session
if (!currentNum || !prescribed.includes(currentNum)) {
    // If there are prescribed sessions, pick the first one (e.g., 3)
    currentNum = prescribed.length > 0 ? Math.min(...prescribed) : 1;
}

try {
  const sessionData = await userService.getSessionTemplate(currentNum);
  setNextSessionTemplate(sessionData);
} catch (err) {
  // If still failing, it's likely the 403 we saw
  console.error("Session fetch failed:", err);
  setNextSessionTemplate({ sessionNumber: currentNum, title: 'Next ACT Module' });
}

        // Auto-skip if Assessment 1 already completed (Bypassed if doing Post Assessment)
        if (fetchedProfile?.currentClinicalSnapshot?.pcl5Total > 0 && !isPostAssessment) {
          setStep('education');
          setLoading(false);
          return;
        }

        // Fetch all five assessment templates in parallel
        const [pdeqRes, pcl5Res, dersRes, aaqRes, redFlagRes] = await Promise.all([
          fetch(`${BASE_URL}/template/PDEQ-V1`),
          fetch(`${BASE_URL}/template/PCL5-V1`),
          fetch(`${BASE_URL}/template/DERS18-V1`),
          fetch(`${BASE_URL}/template/AAQ-V1`),
          fetch(`${BASE_URL}/template/REDFLAG-V1`),
        ]);

        if (!pdeqRes.ok || !pcl5Res.ok || !dersRes.ok || !aaqRes.ok || !redFlagRes.ok) {
          throw new Error('Failed to fetch one or more assessment templates from the server.');
        }

        const [pdeq, pcl5, ders, aaq, redFlag]: AssessmentTemplate[] = await Promise.all([
          pdeqRes.json(), pcl5Res.json(), dersRes.json(), aaqRes.json(), redFlagRes.json(),
        ]);

        setPdeqTemplate(pdeq);
        setPcl5Template(pcl5);
        setDersTemplate(ders);
        setAaqTemplate(aaq);
        setRedFlagTemplate(redFlag);

        // Initialise score arrays
        setPdeqScores(new Array(pdeq.questions.length).fill(-1));
        setPcl5Scores(new Array(pcl5.questions.length).fill(-1));
        setDersScores(new Array(ders.questions.length).fill(-1));
        setAaqScores(new Array(aaq.questions.length).fill(-1));

        // Dynamically initialise red-flag state from template
        const initialRedFlags = redFlag.questions.reduce(
          (acc: any, _: any, idx: number) => ({
            ...acc,
            [idx]: { hasFlag: null, rightNow: false, pastMonth: false, ever: false },
          }),
          {}
        );
        setRedFlagData(initialRedFlags);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assessments.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [isPostAssessment]);

 

  // ── 2. Scroll to top on step change ──────────────────────────────────────
  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // ── 3. Derived values ─────────────────────────────────────────────────────
  const pcl5Score  = pcl5Scores.reduce((a, b) => a + (b === -1 ? 0 : b), 0);
  const isPcl5High = pcl5Score >= 33;

  // ── 4. Assessment-in-progress guard (context + beforeunload) ──────────────
  useEffect(() => {
    if (isPcl5High && activeAssessment === 1 && step === 'summary1') {
      setIsAssessmentInProgress(true);
    } else {
      setIsAssessmentInProgress(false);
    }
    return () => setIsAssessmentInProgress(false);
  }, [isPcl5High, activeAssessment, step, setIsAssessmentInProgress]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isPcl5High && activeAssessment === 1 && step === 'summary1') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isPcl5High, activeAssessment, step]);

  // ── 5. Calculation Utilities ──────────────────────────────────────────────
  const calculateTotal = (scores: number[]) =>
    scores.reduce((a, b) => a + (b === -1 ? 0 : b), 0);

  const calculatePCL5Cluster = (cluster: 'B' | 'C' | 'D' | 'E') => {
    if (!pcl5Template) return 0;
    return pcl5Template.questions.reduce((total, q, idx) => {
      if (q.cluster === cluster && pcl5Scores[idx] !== -1) return total + pcl5Scores[idx];
      return total;
    }, 0);
  };

  const calculateDERSSubscale = (indices: number[]) => {
    if (!dersTemplate) return 0;
    // Fallback to indices 0, 3, and 5 (Questions 1, 4, and 6) if the backend array is missing/empty
    const reverseIndices = dersTemplate.reverseScoreIndices?.length 
      ? dersTemplate.reverseScoreIndices 
      : [0, 3, 5]; 
      
    return indices.reduce((total, i) => {
      const score = dersScores[i - 1];
      if (score === -1) return total;
      return total + (reverseIndices.includes(i - 1) ? 6 - score : score);
    }, 0);
  };

  const getDERSGrandTotal = () => {
    if (!dersTemplate) return 0;
    const reverseIndices = dersTemplate.reverseScoreIndices?.length 
      ? dersTemplate.reverseScoreIndices 
      : [0, 3, 5];
      
    return dersScores.reduce((total, score, idx) => {
      if (score === -1) return total;
      return total + (reverseIndices.includes(idx) ? 6 - score : score);
    }, 0);
  };

  // ── 6. Action Handlers ────────────────────────────────────────────────────
  const handleScore = (
    setter: React.Dispatch<React.SetStateAction<number[]>>,
    scores: number[],
    idx: number,
    val: number
  ) => {
    const next = [...scores];
    next[idx] = val;
    setter(next);
  };

  const nextStep = () => {
    if (activeAssessment === 1) {
      const order: AssessmentStep[] = ['intro', 'mood', 'demographics', 'traumaHistory', 'pcl5', 'summary1'];
      const i = order.indexOf(step);
      if (i < order.length - 1) setStep(order[i + 1]);
    } else {
      const order: AssessmentStep[] = ['mood', 'traumaHistory', 'pdeq', 'ders', 'aaq', 'redFlags', 'summary2'];
      const i = order.indexOf(step);
      if (i < order.length - 1) setStep(order[i + 1]);
    }
  };

  const startAssessment2 = () => {
    setActiveAssessment(2);
    setMood(null);
    setStep('mood');
  };

  const handleQuit = () => {
    setShowAssessmentQuitDialog(false);
    setIsAssessmentInProgress(false);
    navigate('/');
  };

  // ── 7. Final Submission (API) ─────────────────────────────────────────────
  const handleFinalSubmit = async (isEarlyExit: boolean) => {
    setIsAssigning(true);
    try {
      // Build list of assessments to persist
      const assessmentsToSave: Array<{
        template: AssessmentTemplate;
        scores: number[];
        code: string;
        total: number;
        interpretation: string;
      }> = [];

      if (pcl5Template) {
        assessmentsToSave.push({
          template: pcl5Template,
          scores: pcl5Scores,
          code: 'PCL5-V1',
          total: pcl5Score,
          interpretation: getPCL5Interpretation(pcl5Score).text,
        });
      }

      if (!isEarlyExit) {
        if (pdeqTemplate) assessmentsToSave.push({
          template: pdeqTemplate, scores: pdeqScores, code: 'PDEQ-V1',
          total: calculateTotal(pdeqScores),
          interpretation: getPDEQInterpretation(calculateTotal(pdeqScores)).text,
        });
        if (dersTemplate) assessmentsToSave.push({
          template: dersTemplate, scores: dersScores, code: 'DERS18-V1',
          total: getDERSGrandTotal(),
          interpretation: getDERSInterpretation(getDERSGrandTotal()).text,
        });
        if (aaqTemplate) assessmentsToSave.push({
          template: aaqTemplate, scores: aaqScores, code: 'AAQ-V1',
          total: calculateTotal(aaqScores),
          interpretation: getAAQInterpretation(calculateTotal(aaqScores)).text,
        });
      }

      // Save Likert assessments
      await Promise.all(
        assessmentsToSave.map(item =>
          saveAssessment({
            templateId: item.template._id,
            testType: item.code,
            totalScore: item.total,
            interpretation: item.interpretation,
            phase: isPostAssessment ? 'POST' : 'PRE',
            items: item.template.questions.map((q, i) => ({
              questionId: q.id,
              questionText: q.text,
              value: item.scores[i],
              label: q.options.find(opt => opt.value === item.scores[i])?.label || '',
            })),
          })
        )
      );

      // Save Red Flags as their own assessment record
      if (!isEarlyExit && redFlagTemplate) {
        const redFlagItems = redFlagTemplate.questions.map((q, i) => {
          const data = redFlagData[i];
          let label = 'No';
          if (data?.hasFlag) {
            const timeframes: string[] = [];
            if (data.rightNow)  timeframes.push('Right Now');
            if (data.pastMonth) timeframes.push('Past 1 Month');
            if (data.ever)      timeframes.push('Ever');
            label = `Yes (${timeframes.length > 0 ? timeframes.join(', ') : 'Timeframe unspecified'})`;
          }
          return {
            questionId: q.id,
            questionText: q.text,
            value: data?.hasFlag ? 1 : 0,
            label,
          };
        });

        const totalRiskScore = redFlagItems.reduce((sum, item) => sum + item.value, 0);

        await saveAssessment({
          templateId: redFlagTemplate._id,
          testType: 'REDFLAG-V1',
          totalScore: totalRiskScore,
          interpretation: totalRiskScore > 0 ? 'Safety Risk Indicated' : 'No Safety Risk Reported',
          phase: isPostAssessment ? 'POST' : 'PRE',
          items: redFlagItems,
        });
      }

      const transformedTraumaData = Object.fromEntries(
        Object.entries(traumaData).map(([key, value]) => [key, 
          {experienced:value.experienced,
            age: value.experienced ? value.age:null
          }])
      );

      // Persist demographics, trauma history, and unlock first session
      const profileUpdate: any = {
        name: demoData.name,
        demographics: demoData,
        traumaHistory: transformedTraumaData,
      };

      // --- ADDED: Subscale Data Storage ---
      const scoresPayload = {
        pdeqTotal: calculateTotal(pdeqScores),
        pcl5Total: pcl5Score,
        pcl5Subscales: {
          B: calculatePCL5Cluster('B'),
          C: calculatePCL5Cluster('C'),
          D: calculatePCL5Cluster('D'),
          E: calculatePCL5Cluster('E'),
        },
        dersTotal: getDERSGrandTotal(),
        dersSubscales: {
          awareness: calculateDERSSubscale([1, 4, 6]),
          clarity: calculateDERSSubscale([2, 3, 5]),
          goals: calculateDERSSubscale([8, 12, 15]),
          impulse: calculateDERSSubscale([9, 16, 18]),
          nonAcceptance: calculateDERSSubscale([7, 13, 14]),
          strategies: calculateDERSSubscale([10, 11, 17]),
        },
        aaqTotal: calculateTotal(aaqScores),
        redFlags: redFlagData,
        timestamp: new Date().toISOString()
      };

      if (isPostAssessment) {
        profileUpdate.postClinicalSnapshot = scoresPayload; 
      } else {
        profileUpdate.currentClinicalSnapshot = scoresPayload;

        const firstAllowed = (profile?.prescribedSessions && profile.prescribedSessions.length > 0) 
          ? Math.min(...profile.prescribedSessions) 
          : 1;
          
        profileUpdate.currentSession = profile?.currentSession || firstAllowed;
      }

      await userService.updateProfile(profileUpdate);

      if (isEarlyExit) {
        navigate('/');
      } else {
        setStep('education');
      }

    } catch (err) {
      console.error('Critical submission failure:', err);
      alert('Could not link with clinic. Please check your connection.');
    } finally {
      setIsAssigning(false);
    }
  };

  // ── 8. Render Helpers ─────────────────────────────────────────────────────
  const stepOrder1: AssessmentStep[] = ['intro', 'mood', 'demographics', 'traumaHistory', 'pcl5', 'summary1'];
  const stepOrder2: AssessmentStep[] = ['mood', 'traumaHistory', 'pdeq', 'ders', 'aaq', 'redFlags', 'summary2'];
  const currentStepOrder = activeAssessment === 1 ? stepOrder1 : stepOrder2;
  // Determine if therapist has approved/assigned sessions
// Determine if therapist has approved/assigned sessions
const isTherapistApproved = profile?.prescribedSessions && profile.prescribedSessions.length > 0;
const hasScheduleSet = !!(profile?.schedulePreference || user?.schedulePreference); // <-- NEW

  const getDynamicButtonLabel = () => {
    switch (step) {
      case 'pdeq':     return 'Continue to Next Section';
      case 'pcl5':     return `Next: ${assessmentPrefix}-Assessment 1 Summary`;
      case 'ders':     return 'Continue to Next Section';
      case 'aaq':      return 'Continue to Next Section';
      case 'redFlags': return 'Next: Final Clinical Summary';
      default:         return 'Continue to Next Section';
    }
  };

  const prevStep = () => {
    const order = activeAssessment === 1 ? stepOrder1 : stepOrder2;
    const currentIdx = order.indexOf(step);
    if (currentIdx > 0) setStep(order[currentIdx - 1]);
  };

  // Dynamic Likert renderer — consumes API template
  const renderLikert = (
    template: AssessmentTemplate | null,
    currentScores: number[],
    setter: React.Dispatch<React.SetStateAction<number[]>>,
    phaseLabel: string,
    instructions?: string
  ) => {
    if (!template) return null;
    return (
      <div className="space-y-12">
        <div className="text-center">
          <span className={`text-xs font-black uppercase tracking-widest ${themeClasses.text} ${themeClasses.secondary} px-3 py-1 rounded-full`}>
            {phaseLabel.split(' - ').slice(0, 2).join(' - ')}
          </span>
          {instructions && (
            <p className="text-slate-600 mt-6 font-medium max-w-2xl mx-auto leading-relaxed text-lg">
              {instructions.split('*').map((part, i) =>
                i % 2 === 1
                  ? <em key={i} className={`font-bold ${themeClasses.text} not-italic`}>{part}</em>
                  : part
              )}
            </p>
          )}
        </div>
        <div className="space-y-10">
          {template.questions.map((q, qIdx) => (
            <div key={q.id || qIdx} className="space-y-4">
              <p className="text-slate-800 font-bold text-lg leading-snug">
                {qIdx + 1}. {q.text}
              </p>
              <div className="flex flex-wrap md:flex-nowrap justify-between gap-2">
                {q.options.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleScore(setter, currentScores, qIdx, opt.value)}
                    className={`flex-1 py-4 px-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                      currentScores[qIdx] === opt.value
                        ? `${themeClasses.primary} ${themeClasses.border} text-white shadow-xl ${themeClasses.shadow}`
                        : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-xl mb-1">{opt.value}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Loading / Error Guards ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-24 animate-in fade-in duration-500">
        <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-slate-200 shadow-2xl">
          <div className="text-center space-y-6 py-20">
            <div className={`w-16 h-16 border-4 ${themeClasses.border} border-t-transparent rounded-full animate-spin mx-auto`}></div>
            <p className="text-slate-500 font-medium">Loading clinical assessments...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto pb-24 animate-in fade-in duration-500">
        <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-slate-200 shadow-2xl">
          <div className="text-center space-y-6 py-20">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center text-3xl mx-auto">
              <i className="fa-solid fa-exclamation-triangle"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-800">Failed to Load Assessments</h3>
            <p className="text-slate-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className={`px-8 py-3 ${themeClasses.primary} text-white rounded-xl font-bold transition-all`}
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto pb-24 animate-in fade-in duration-500">

      {/* ── Quit Dialog (via context) ── */}
      {showAssessmentQuitDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-2xl mb-6">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-4">Wait! Don't leave yet.</h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">
              Are you sure you want to quit the Assessments this time? You cannot {isPostAssessment ? 'finalize your program' : 'start your Recovery Path'} before completing your {assessmentPrefix}-Assessment 2.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowAssessmentQuitDialog(false)}
                className={`w-full py-4 ${themeClasses.primary} text-white rounded-2xl font-black shadow-lg hover:opacity-90 transition-all`}
              >
                Continue Assessment
              </button>
              <button
                onClick={handleQuit}
                className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                Quit Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-slate-200 shadow-2xl relative overflow-hidden">

        {/* Progress Bar */}
        {step !== 'education' && (
          <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
            <div
              className={`h-full ${themeClasses.primary} transition-all duration-700`}
              style={{ width: `${(currentStepOrder.indexOf(step) / (currentStepOrder.length - 1)) * 100}%` }}
            />
          </div>
        )}

        {/* ── INTRO ── */}
        {step === 'intro' && (
          <div className="text-center space-y-8 py-10">
            <div className={`w-24 h-24 ${themeClasses.secondary} ${themeClasses.text} rounded-[2rem] flex items-center justify-center text-4xl mx-auto shadow-inner`}>
              <i className="fa-solid fa-file-medical"></i>
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">{isPostAssessment ? 'Post-Program Evaluation' : 'Clinical Intake'}</h2>
              <p className="text-slate-500 max-w-lg mx-auto leading-relaxed">
                Complete the two-part assessment process to {isPostAssessment ? 'evaluate your progress and recovery' : 'receive a clinical evaluation and matching with a specialized therapist'}.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
              {[
                { label: `${assessmentPrefix}-Assessment 1`, desc: 'Demographics, Trauma History & PCL-5.' },
                { label: `${assessmentPrefix}-Assessment 2`, desc: 'Dissociation, Emotion Regulation & Safety.' },
                { label: 'Clinical Profile', desc: 'Detailed diagnostic mapping.' },
                { label: isPostAssessment ? 'Progress Report' : 'Therapist Match', desc: isPostAssessment ? 'Compare pre and post scores.' : 'Specialized clinical pairing.' },
              ].map(item => (
                <div key={item.label} className="p-4 bg-slate-50 rounded-2xl flex items-start gap-3">
                  <i className={`fa-solid fa-check-double ${themeClasses.text} mt-1`}></i>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.label}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={nextStep}
              className={`w-full max-w-sm py-5 ${themeClasses.button} rounded-2xl font-black text-lg shadow-xl transition-all`}
            >
              Begin {assessmentPrefix}-Assessment 1
            </button>
          </div>
        )}

        {/* ── MOOD ── */}
        {step === 'mood' && (
          <div className="space-y-12">
            <div className="text-center">
              <span className={`text-xs font-black uppercase tracking-widest ${themeClasses.text} ${themeClasses.secondary} px-3 py-1 rounded-full`}>
                {assessmentPrefix}-Assessment {activeAssessment} - Phase 1 of {currentStepOrder.length - 1}
              </span>
              <h3 className="text-3xl font-black text-slate-800 mt-4">Current Mood</h3>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map(v => (
                <button
                  key={v}
                  onClick={() => setMood(v)}
                  className={`p-8 rounded-3xl border-2 transition-all text-4xl flex flex-col items-center gap-4 ${
                    mood === v
                      ? `${themeClasses.primary} ${themeClasses.border} text-white shadow-xl ${themeClasses.shadow}`
                      : 'bg-slate-50 border-transparent hover:border-indigo-200 shadow-sm'
                  }`}
                >
                  {v === 1 ? '😞' : v === 2 ? '😕' : v === 3 ? '😐' : v === 4 ? '🙂' : '✨'}
                  <span className={`text-[10px] font-black uppercase ${mood === v ? 'text-white opacity-80' : 'opacity-60'}`}>
                    Level {v}
                  </span>
                </button>
              ))}
            </div>
            <button
              disabled={mood === null}
              onClick={nextStep}
              className={`w-full py-5 ${themeClasses.button} rounded-2xl font-black shadow-xl disabled:opacity-50 transition-all`}
            >
              {activeAssessment === 1 ? `Next: ${assessmentPrefix}-Assessment 1 Summary` : `Next: ${assessmentPrefix}-Assessment 2 Summary`}
            </button>
          </div>
        )}

        {/* ── DEMOGRAPHICS ── */}
        {step === 'demographics' && (
          <div className="space-y-10">
            <div className="text-center">
              <span className={`text-xs font-black uppercase tracking-widest ${themeClasses.text} ${themeClasses.secondary} px-3 py-1 rounded-full`}>
                {assessmentPrefix}-Assessment 1 - Phase 2 of 5
              </span>
              <h3 className="text-3xl font-black text-slate-800 mt-4">Section 1: Demographic Sheet</h3>
              <p className="text-slate-500 mt-2 font-medium">Personal Profile & Family Structure</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Name',                  key: 'name',          type: 'text'   },
                { label: 'Age',                   key: 'age',           type: 'number' },
                { label: 'Gender',                key: 'gender',        type: 'text'   },
                { label: 'Marital Status',        key: 'maritalStatus', type: 'text'   },
                { label: 'Education',             key: 'education',     type: 'text'   },
                { label: 'City',                  key: 'city',          type: 'text'   },
                { label: 'Occupation',            key: 'occupation',    type: 'text'   },
                { label: 'No of Siblings',        key: 'siblings',      type: 'number' },
                { label: 'Birth Order',           key: 'birthOrder',    type: 'text'   },
                { label: 'Monthly Income Range',  key: 'incomeRange',   type: 'text'   },
                { label: 'Earning Members',       key: 'earningMembers',type: 'text'   },
              ].map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={(demoData as any)[field.key]}
                    onChange={e => setDemoData({ ...demoData, [field.key]: e.target.value })}
                    className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ${themeClasses.ring} outline-none transition-all`}
                  />
                </div>
              ))}

              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Family System</label>
                <div className="flex gap-4">
                  {['Nuclear', 'Joint Family'].map(sys => (
                    <button
                      key={sys}
                      onClick={() => setDemoData({ ...demoData, familySystem: sys })}
                      className={`flex-1 py-4 px-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                        demoData.familySystem === sys
                          ? `${themeClasses.primary} ${themeClasses.border} text-white shadow-md`
                          : 'bg-white border-slate-100 text-slate-400'
                      }`}
                    >
                      {sys}
                    </button>
                  ))}
                </div>
              </div>

              {[
                { label: 'Medical Diseases',      key: 'medicalDiseases' },
                { label: 'Psychological Illness', key: 'psychIllness'    },
                { label: 'Medication in use',     key: 'medication'      },
              ].map(field => (
                <div key={field.key} className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                  <input
                    type="text"
                    value={(demoData as any)[field.key]}
                    onChange={e => setDemoData({ ...demoData, [field.key]: e.target.value })}
                    className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ${themeClasses.ring} outline-none transition-all`}
                  />
                </div>
              ))}
            </div>

            <div className="pt-10 border-t border-slate-100 space-y-8">
              <h4 className="text-xl font-black text-slate-800">Family Medical and Psychological History</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Medical Diseases (Family)</label>
                  <input type="text" value={demoData.familyMedical} onChange={e => setDemoData({ ...demoData, familyMedical: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Psychological Illness (Family)</label>
                  <input type="text" value={demoData.familyPsych} onChange={e => setDemoData({ ...demoData, familyPsych: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Parent's Relation Status</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['Living Together', 'Separated', 'Divorced', 'Died'].map(status => (
                      <button
                        key={status}
                        onClick={() => setDemoData({ ...demoData, parentsRelation: status })}
                        className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                          demoData.parentsRelation === status
                            ? `${themeClasses.primary} ${themeClasses.border} text-white shadow-md`
                            : 'bg-white border-slate-100 text-slate-400'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={nextStep} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl transition-all">
              Next: Section 2 : Trauma History
            </button>
          </div>
        )}

        {/* ── TRAUMA HISTORY ── */}
        {step === 'traumaHistory' && (
          <div className="space-y-10">
            <div className="text-center">
              <span className={`text-xs font-black uppercase tracking-widest ${themeClasses.text} ${themeClasses.secondary} px-3 py-1 rounded-full`}>
                {assessmentPrefix}-Assessment {activeAssessment} - Phase {activeAssessment === 1 ? '3 of 5' : '2 of 6'}
              </span>
              <h3 className="text-3xl font-black text-slate-800 mt-4 leading-tight">Section 2: Trauma History</h3>
              <p className="text-slate-500 mt-2 font-medium">
                {activeAssessment === 2
                  ? 'Review your reported traumatic events.'
                  : 'Please mark traumatic events you have personally experienced.'}
              </p>
            </div>

            <div className="space-y-6">
              {[
                { label: 'Threatening Death of Loved One',                          key: 'deathOfLovedOne'      },
                { label: 'Near Death Experience',                                   key: 'nearDeath'            },
                { label: 'Serious Injury',                                          key: 'seriousInjury'        },
                { label: 'Witness of the Traumatic Incident Occurred to others',    key: 'witnessedTrauma'      },
                { label: 'Abuse (Emotional)',                                       key: 'abuseEmotional'       },
                { label: 'Abuse (Physical)',                                        key: 'abusePhysical'        },
                { label: 'Abuse (Sexual)',                                          key: 'abuseSexual'          },
                { label: 'Natural Disaster (Flood / Earthquake)',                   key: 'naturalDisaster'      },
                { label: 'War / Political Violence',                                key: 'warPoliticalViolence' },
                { label: 'Domestic / Intimate Partner Violence',                    key: 'domesticViolence'     },
                { label: 'Witnessing Violence at home / in the community',          key: 'witnessedViolence'    },
                { label: 'Separation / Divorce',                                    key: 'separationDivorce'    },
                { label: 'C-Section during Child Birth',                            key: 'cSection'             },
              ].map(item => (
                <div
                  key={item.key}
                  className={`p-6 rounded-3xl border-2 transition-all ${
                    (traumaData as any)[item.key].experienced
                      ? `${themeClasses.secondary} ${themeClasses.border} shadow-sm`
                      : 'bg-white border-slate-100'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        disabled={activeAssessment === 2}
                        onClick={() => setTraumaData({
                          ...traumaData,
                          [item.key]: {
                            ...(traumaData as any)[item.key],
                            experienced: !(traumaData as any)[item.key].experienced,
                          },
                        })}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                          (traumaData as any)[item.key].experienced
                            ? `${themeClasses.primary} text-white shadow-lg`
                            : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <i className={`fa-solid ${(traumaData as any)[item.key].experienced ? 'fa-check' : 'fa-plus'}`}></i>
                      </button>
                      <span className={`font-bold text-sm ${(traumaData as any)[item.key].experienced ? themeClasses.text : 'text-slate-600'}`}>
                        {item.label}
                      </span>
                    </div>

                    {(traumaData as any)[item.key].experienced && (
                      <div className="w-full md:w-64 animate-in zoom-in-95">
                        <label className={`text-[8px] font-black ${themeClasses.accent} uppercase tracking-widest ml-1`}>
                          Age at time of experience
                        </label>
                        <input
                          type="text"
                          placeholder="Age..."
                          disabled={activeAssessment === 2}
                          value={(traumaData as any)[item.key].age}
                          onChange={e => setTraumaData({
                            ...traumaData,
                            [item.key]: { ...(traumaData as any)[item.key], age: e.target.value },
                          })}
                          className={`w-full p-3 bg-white border ${themeClasses.border} rounded-xl text-xs font-bold outline-none focus:ring-2 ${themeClasses.ring} disabled:bg-slate-50`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={nextStep} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl">
              {activeAssessment === 2 ? 'Save & Continue' : 'Continue to Next Section'}
            </button>
          </div>
        )}

        {/* ── PDEQ (API template) ── */}
        {step === 'pdeq' && renderLikert(
          pdeqTemplate, pdeqScores, setPdeqScores,
          'Assessment 2 - Phase 3 of 6 - Peritraumatic Dissociation (PDEQ)',
          'Some statements may describe how you felt *during the traumatic event* you just mentioned in the last Phase. And I\'d like you to tell me how true each statement was for you.'
        )}

        {/* ── PCL-5 (API template) ── */}
        {step === 'pcl5' && renderLikert(
          pcl5Template, pcl5Scores, setPcl5Scores,
          'Assessment 1 - Phase 4 of 5 - PTSD Symptoms (PCL-5)',
          'Below is a list of problems that people sometimes have in response to a very stressful experience. Keeping your worst event in mind, please read each problem carefully and then select one of the numbers to the right to indicate how much you have been bothered by that problem in the past month.'
        )}

        {/* ── DERS (API template) ── */}
        {step === 'ders' && renderLikert(
          dersTemplate, dersScores, setDersScores,
          'Assessment 2 - Phase 4 of 6 - Emotion Regulation (DERS-18)',
          'Please indicate how often the following apply to you.'
        )}

        {/* ── AAQ (API template) ── */}
        {step === 'aaq' && renderLikert(
          aaqTemplate, aaqScores, setAaqScores,
          'Assessment 2 - Phase 5 of 6 - Psychological Inflexibility (AAQ-II)',
          'Below you will find a list of statements. Please rate how true each statement is for you by circling a number next to it. Use the scale below to make your choice. 1 = Never True - to - 7 = Always True.'
        )}

        {/* ── RED FLAGS (dynamic from API template) ── */}
        {step === 'redFlags' && redFlagTemplate && (
          <div className="space-y-10">
            <div className="text-center">
              <span className={`text-xs font-black uppercase tracking-widest ${themeClasses.text} ${themeClasses.secondary} px-3 py-1 rounded-full`}>
                Assessment 2 - Phase 6 of 6
              </span>
              <h3 className="text-3xl font-black text-slate-800 mt-4 leading-tight">Safety Assessment</h3>
              <p className="text-slate-500 mt-4 font-medium max-w-2xl mx-auto leading-relaxed">
                Please read each question carefully. You may select more than one option per question.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-6 pr-4 text-xs font-black text-slate-400 uppercase tracking-widest">Question</th>
                    <th className="py-6 px-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Yes</th>
                    <th className="py-6 px-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">No</th>
                    <th className="py-6 px-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Right Now</th>
                    <th className="py-6 px-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Past 1 Month</th>
                    <th className="py-6 pl-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Ever in Your Life</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {redFlagTemplate.questions.map((q, qIdx) => (
                    <tr key={q.id || qIdx} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-6 pr-4">
                        <p className="text-sm font-bold text-slate-800 leading-snug">{qIdx + 1}. {q.text}</p>
                      </td>

                      {/* Yes */}
                      <td className="py-6 px-2 text-center">
                        <button
                          onClick={() => setRedFlagData(prev => ({ ...prev, [qIdx]: { ...(prev[qIdx] || {}), hasFlag: true } }))}
                          className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center mx-auto ${
                            redFlagData[qIdx]?.hasFlag === true ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 hover:border-rose-300'
                          }`}
                        >
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </button>
                      </td>

                      {/* No */}
                      <td className="py-6 px-2 text-center">
                        <button
                          onClick={() => setRedFlagData(prev => ({
                            ...prev,
                            [qIdx]: { ...(prev[qIdx] || {}), hasFlag: false, rightNow: false, pastMonth: false, ever: false },
                          }))}
                          className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center mx-auto ${
                            redFlagData[qIdx]?.hasFlag === false ? 'bg-slate-400 border-slate-400 text-white' : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </button>
                      </td>

                      {/* Right Now */}
                      <td className="py-6 px-2 text-center">
                        <button
                          disabled={redFlagData[qIdx]?.hasFlag !== true}
                          onClick={() => setRedFlagData(prev => ({
                            ...prev,
                            [qIdx]: { ...(prev[qIdx] || {}), rightNow: !prev[qIdx].rightNow },
                          }))}
                          className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center mx-auto disabled:opacity-20 ${
                            redFlagData[qIdx]?.rightNow ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white border-slate-200 hover:border-rose-300'
                          }`}
                        >
                          <i className="fa-solid text-xs"></i>
                        </button>
                      </td>

                      {/* Past 1 Month */}
                      <td className="py-6 px-2 text-center">
                        <button
                          disabled={redFlagData[qIdx]?.hasFlag !== true}
                          onClick={() => setRedFlagData(prev => ({
                            ...prev,
                            [qIdx]: { ...(prev[qIdx] || {}), pastMonth: !prev[qIdx].pastMonth },
                          }))}
                          className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center mx-auto disabled:opacity-20 ${
                            redFlagData[qIdx]?.pastMonth ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white border-slate-200 hover:border-rose-300'
                          }`}
                        >
                          <i className="fa-solid  text-xs"></i>
                        </button>
                      </td>

                      {/* Ever */}
                      <td className="py-6 pl-2 text-center">
                        <button
                          disabled={redFlagData[qIdx]?.hasFlag !== true}
                          onClick={() => setRedFlagData(prev => ({
                            ...prev,
                            [qIdx]: { ...(prev[qIdx] || {}), ever: !prev[qIdx].ever },
                          }))}
                          className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center mx-auto disabled:opacity-20 ${
                            redFlagData[qIdx]?.ever ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white border-slate-200 hover:border-rose-300'
                          }`}
                        >
                          <i className="fa-solid  text-xs"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 flex gap-4 items-start">
              <i className="fa-solid fa-circle-info text-rose-500 mt-1"></i>
              <p className="text-xs text-rose-700 font-medium leading-relaxed">
                Your safety is our priority. If you select any of these flags, your clinician will be notified immediately for a follow-up discussion.
              </p>
            </div>
          </div>
        )}

       {/* ── Shared Navigation (Back & Continue) for Likert Steps ── */}
{['pdeq', 'pcl5', 'ders', 'aaq', 'redFlags'].includes(step) && (
  <div className="flex gap-4 mt-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
    <button
      type="button"
      onClick={prevStep}
      className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all uppercase tracking-widest text-xs"
    >
      Back
    </button>
    
    <button
      disabled={Boolean(
        (step === 'pdeq'     && pdeqScores.includes(-1)) ||
        (step === 'pcl5'     && pcl5Scores.includes(-1)) ||
        (step === 'ders'     && dersScores.includes(-1)) ||
        (step === 'aaq'      && aaqScores.includes(-1))  ||
        (step === 'redFlags' && redFlagTemplate &&
          Object.keys(redFlagData).length === redFlagTemplate.questions.length &&
          Object.values(redFlagData).some((d: any) => d.hasFlag === null))
      )}
      onClick={nextStep}
      className={`flex-[2] py-5 ${themeClasses.button} rounded-2xl font-black shadow-xl disabled:opacity-50 transition-all`}
    >
      {getDynamicButtonLabel()}
    </button>
  </div>
)}
        {/* ── SUMMARY 1 ── */}
        {step === 'summary1' && (
          <div className="text-center space-y-10 py-10">
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">{assessmentPrefix}-Assessment 1 Complete</h2>
              <p className="text-slate-500">{isPostAssessment ? 'Post-program' : 'Initial'} evaluation for {demoData.name || 'Alex'}.</p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 shadow-sm text-left">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex justify-between items-center">
                  
                  {user?.role !== UserRole.CLIENT && (
                    <span className={`${themeClasses.text} font-black`}>{pcl5Score} / 80</span>
                  )}
                </h4>

                <div className="mb-8">
                  <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl border-2 font-black text-sm uppercase tracking-widest ${getPCL5Interpretation(pcl5Score).bg} ${getPCL5Interpretation(pcl5Score).color} ${getPCL5Interpretation(pcl5Score).border}`}>
                    <i className="fa-solid fa-circle-info"></i>
                    {getPCL5Interpretation(pcl5Score).text}
                  </div>
                </div>

                {!isPcl5High ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl">
                      <p className="text-emerald-800 font-medium leading-relaxed">
                        Thank you for completing Assessment 1! Based on your responses, your results are in a normal, healthy range. To continue taking great care of your mental well-being, we recommend:
                      </p>
                      <ul className="mt-4 space-y-3 text-emerald-700 font-bold">
                        <li className="flex items-center gap-3"><span>💤</span> Prioritising proper sleep</li>
                        <li className="flex items-center gap-3"><span>🚶‍♂️</span> Going for morning walks</li>
                        <li className="flex items-center gap-3"><span>😮‍💨</span> Practising deep breathing when you feel tense</li>
                      </ul>
                    </div>
                    <button
                      onClick={() => handleFinalSubmit(true)}
                      className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl"
                    >
                      {isAssigning
                        ? <><img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-5 h-5 brain-loading-img inline mr-2" />Saving Results...</>
                        : 'Return to Dashboard'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <p className="text-slate-600 font-medium leading-relaxed">
                      Your score indicates symptoms in the {pcl5Score > 51 ? 'Severe' : 'Mild'} range. To provide you with the best specialized care and match you with the right therapist, please complete Assessment 2.
                    </p>
                    <button
                      onClick={startAssessment2}
                      className={`w-full py-5 ${themeClasses.button} rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3`}
                    >
                      Begin {assessmentPrefix}-Assessment 2 <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SUMMARY 2 ── */}
        {step === 'summary2' && (
          <div className="text-center space-y-10 py-10">
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">Clinical Profile Generated</h2>
              <p className="text-slate-500">Full Evaluation for {demoData.name || 'Alex'}.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">

              {/* PCL-5 Card */}
              <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex justify-between items-center">
                 
                  {user?.role !== UserRole.CLIENT && (
                    <span className={`${themeClasses.text} font-black`}>{pcl5Score} / 80</span>
                  )}
                </h4>
                <div className="mb-8">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black text-xs uppercase tracking-widest ${getPCL5Interpretation(pcl5Score).bg} ${getPCL5Interpretation(pcl5Score).color} ${getPCL5Interpretation(pcl5Score).border}`}>
                    <i className="fa-solid fa-circle-info"></i>
                    {getPCL5Interpretation(pcl5Score).text}
                  </div>
                </div>
                
                {/* --- ADDED: Hide Entire Subscale Block from Clients --- */}
                {user?.role !== UserRole.CLIENT && (
                  <div className="space-y-4">
                    {[
                      { label: 'Re-experiencing (B)', val: calculatePCL5Cluster('B'), max: 20 },
                      { label: 'Avoidance (C)',        val: calculatePCL5Cluster('C'), max: 8  },
                      { label: 'Cognition/Mood (D)',   val: calculatePCL5Cluster('D'), max: 28 },
                      { label: 'Hyper-arousal (E)',    val: calculatePCL5Cluster('E'), max: 24 },
                    ].map(c => (
                      <div key={c.label} className="space-y-1">
                        <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                          <span>{c.label}</span>
                          <span>{c.val} / {c.max}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500" style={{ width: `${(c.val / c.max) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DERS Card */}
              <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex justify-between items-center">
                  
                  {user?.role !== UserRole.CLIENT && (
                    <span className={`${themeClasses.text} font-black`}>{getDERSGrandTotal()} / 90</span>
                  )}
                </h4>
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-emerald-100 bg-emerald-50 text-emerald-600 font-black text-xs uppercase tracking-widest">
                    <i className="fa-solid fa-circle-info"></i>
                    {getDERSInterpretation(getDERSGrandTotal()).text}
                  </div>
                </div>
                
                {/* --- ADDED: Hide Entire Subscale Block from Clients --- */}
                {user?.role !== UserRole.CLIENT && (
                  <div className="space-y-4">
                    {[
                      { label: 'Awareness',  val: calculateDERSSubscale([1, 4, 6]),    max: 15 },
                      { label: 'Clarity',    val: calculateDERSSubscale([2, 3, 5]),    max: 15 },
                      { label: 'Strategies', val: calculateDERSSubscale([10, 11, 17]), max: 15 },
                    ].map(c => (
                      <div key={c.label} className="space-y-1">
                        <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                          <span>{c.label}</span>
                          <span>{c.val} / {c.max}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${(c.val / c.max) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PDEQ + AAQ Panel */}
              <div className="p-8 bg-purple-50 rounded-[2.5rem] border border-purple-100 col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  
                  <div className="flex flex-col gap-2">
                    {user?.role !== UserRole.CLIENT && pdeqTemplate && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-purple-700">
                          {(calculateTotal(pdeqScores) / pdeqTemplate.questions.length).toFixed(2)}
                        </span>
                        <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest">Mean Item Score</span>
                      </div>
                    )}
                    <p className="text-sm font-black text-purple-700 uppercase tracking-tight">
                      {getPDEQInterpretation(calculateTotal(pdeqScores)).text}
                    </p>
                  </div>
                </div>

                <div>
                  
                  <div className="flex flex-col gap-2">
                    {user?.role !== UserRole.CLIENT && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-sky-700">{calculateTotal(aaqScores)}</span>
                        <span className="text-[9px] text-sky-400 font-bold uppercase tracking-widest">Total Score</span>
                      </div>
                    )}
                    <p className="text-sm font-black text-sky-700 uppercase tracking-tight">
                      {getAAQInterpretation(calculateTotal(aaqScores)).text}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Red Flags Summary (dynamic from template) */}
            {redFlagTemplate && (
              <div className="max-w-4xl mx-auto mt-8 bg-rose-50 rounded-[2.5rem] p-8 border border-rose-100 text-left">
                <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  Safety Assessment (Red Flags)
                </h4>
                <div className="space-y-4">
                  {redFlagTemplate.questions.map((q, idx) => {
                    const data = redFlagData[idx];
                    if (data?.hasFlag !== true) return null;

                    const timeframes = [
                      data.rightNow  && 'Right Now',
                      data.pastMonth && 'Past 1 Month',
                      data.ever      && 'Ever',
                    ].filter(Boolean) as string[];

                    let severity = { label: 'Mild',     color: 'text-emerald-600 bg-emerald-100' };
                    if (data.rightNow)  severity = { label: 'Severe',   color: 'text-rose-600 bg-rose-100'    };
                    else if (data.pastMonth) severity = { label: 'Moderate', color: 'text-amber-600 bg-amber-100' };

                    return (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-rose-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800">{q.text}</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${severity.color}`}>
                            {severity.label} Red Flag
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {timeframes.map(tf => (
                            <span key={tf} className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                              {tf}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {Object.values(redFlagData).every((d: any) => d.hasFlag !== true) && (
                    <p className="text-sm font-medium text-slate-500 italic">No safety red flags reported.</p>
                  )}
                </div>
              </div>
            )}

            {/* Specialist Match */}
            {/* Specialist Match */}
            <div className={`max-w-xl mx-auto p-8 ${themeClasses.primary} rounded-[2.5rem] text-white text-left shadow-xl ${themeClasses.shadow} mb-8`}>
              <h4 className="font-bold text-xl mb-2">Specialist Match Found</h4>
              <p className="text-sm text-white/80 leading-relaxed mb-4">
                Based on your {calculateTotal(aaqScores) >= 25 ? 'High Inflexibility' : 'Profile'}, we have matched you with Dr. Lubna Dar, a trauma-informed ACT specialist focused on values-based recovery.
              </p>
              <p className="text-base font-black text-white bg-white/20 p-3 rounded-xl inline-block">
                <i className="fa-solid fa-arrow-down mr-2 animate-bounce"></i>
                Please click the "Connect with Dr. Lubna Dar" button below to finalize your assessment.
              </p>
            </div>

            <button
              onClick={() => handleFinalSubmit(false)}
              disabled={isAssigning}
              className="w-full max-w-sm py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 mx-auto"
            >
              {isAssigning
                ? <><img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-5 h-5 brain-loading-img inline mr-2" />Finalizing Clinical Link...</>
                : <>Connect with Dr. Lubna Dar</>}
            </button>
          </div>
        )}

        {/* ── EDUCATION (post-assessment) ── */}
        {step === 'education' && (
          <div className="space-y-12 animate-in slide-in-from-bottom-8">

            <div className="bg-slate-900 rounded-[2.5rem] p-12 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <i className="fa-solid fa-graduation-cap text-[10rem]"></i>
              </div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">🤝</div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Practice Link Established</h3>
                    <p className="text-white/60 font-medium">Your clinician has reviewed your diagnostic data.</p>
                  </div>
                </div>
                <div className="p-6 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-md">
                  <p className="text-sm italic leading-relaxed">
                    "Hello {demoData.name.split(' ')[0] || 'Alex'}. I've received your data. Based on your profile, we are starting the specialized 12-session ACT program. We'll meet twice per week."
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Your Therapy Path</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* --- START OF REPLACEMENT --- */}
        {!isTherapistApproved ? (
          <div className="p-8 bg-amber-50 border border-amber-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-14 h-14 bg-amber-100 text-amber-500 rounded-2xl flex items-center justify-center text-xl mb-4">
              <i className="fa-solid fa-hourglass-half"></i>
            </div>
            <h4 className="font-black text-lg mb-2 text-amber-800 tracking-tight">Pending Therapist Review</h4>
            <p className="text-xs text-amber-700/80 leading-relaxed font-medium">
              Your profile is currently under review. You can launch your first session as soon as your clinician approves your program.
            </p>
          </div>
        ) : !hasScheduleSet ? (
          // --- NEW: Go to Roadmap to set schedule ---
          <button
            onClick={() => navigate('/assignments')}
            className="p-8 bg-amber-50 border border-amber-200 rounded-[2.5rem] transition-all group text-left relative overflow-hidden hover:bg-amber-100 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-6 transition-transform group-hover:scale-110 bg-amber-200 text-amber-600">
              <i className="fa-solid fa-calendar-days"></i>
            </div>
            <h4 className="font-black text-xl mb-2 uppercase tracking-tight text-amber-800">
              Set Your Schedule
            </h4>
            <p className="text-xs leading-relaxed font-medium uppercase tracking-widest text-amber-700">
              Visit your roadmap to unlock sessions
            </p>
          </button>
        ) :(
          <button
            disabled={isLocked}
            onClick={() => !isLocked && navigate(`/session/${nextSessionTemplate?.sessionNumber || 1}`)}
            className={`p-8 border-none rounded-[2.5rem] transition-all group text-left relative overflow-hidden ${
              isLocked
                ? 'bg-slate-100 cursor-not-allowed'
                : `${themeClasses.primary} text-white hover:opacity-90 hover:shadow-2xl`
            }`}
          >
            {isLocked && (
              <div className="absolute top-6 right-6 text-slate-300">
                <i className="fa-solid fa-lock text-2xl"></i>
              </div>
            )}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-6 transition-transform group-hover:scale-110 ${
              isLocked ? 'bg-slate-200 text-slate-400' : 'bg-white/20 text-white'
            }`}>
              <i className={`fa-solid ${isLocked ? 'fa-calendar-day' : 'fa-play'}`}></i>
            </div>
            <h4 className={`font-black text-xl mb-2 uppercase tracking-tight ${isLocked ? 'text-slate-400' : 'text-white'}`}>
              {isLocked ? lockReason : `Start Session ${nextSessionTemplate?.sessionNumber || 1}`}
            </h4>
            <p className={`text-xs leading-relaxed font-medium uppercase tracking-widest ${isLocked ? 'text-slate-400' : 'text-white/80'}`}>
              {isLocked ? 'Check your dashboard for exact availability' : (nextSessionTemplate?.title || 'Loading session details...')}
            </p>
          </button>
        )}
                

                <button
                  onClick={() => navigate('/')}
                  className="p-8 bg-white border border-slate-200 rounded-[2.5rem] hover:border-indigo-500 hover:shadow-xl transition-all group text-left"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl mb-6 text-emerald-500 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-chart-line"></i>
                  </div>
                  <h4 className="font-bold text-slate-800 mb-2">View My Dashboard</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">Track your progress and assignments.</p>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Assessments;