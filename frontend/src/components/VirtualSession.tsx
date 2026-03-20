import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MoodCheckIn from "./MoodCheckIn";
import { DISTRESS_SCALE } from "../../types";
import {
  generateGuidedMeditation,
  decodeBase64,
  decodeAudioData,
} from "../services/geminiService";
import { storageService } from "../services/storageService";
import { userService } from "../services/userService";
import { useApp } from "../context/AppContext";

type SessionStep = "distress-before" | "reflection" | string;

const VALUES_LIST = [
  { id: "v1", name: "Acceptance & Mindfulness", desc: "Being open to yourself, others, and the present moment." },
  { id: "v2", name: "Adventure & Curiosity", desc: "Seeking new experiences, exploring, and staying open-minded." },
  { id: "v3", name: "Assertiveness & Courage", desc: "Standing up for yourself respectfully and facing challenges bravely." },
  { id: "v4", name: "Authenticity & Honesty", desc: "Being true, genuine, and sincere in thoughts, words, and actions." },
  { id: "v5", name: "Respect", desc: "Treating yourself and others with consideration and positive regard." },
  { id: "v6", name: "Beauty & Creativity", desc: "Appreciating, creating, and nurturing beauty in life and self-expression." },
  { id: "v7", name: "Caring & Kindness", desc: "Acting with compassion and consideration toward yourself and others." },
  { id: "v8", name: "Connection & Intimacy", desc: "Building meaningful relationships and being fully present with others." },
  { id: "v9", name: "Contribution & Supportiveness", desc: "Helping, giving, and making a positive difference." },
  { id: "v10", name: "Fairness & Justice", desc: "Treating self and others with equality, fairness, and integrity." },
  { id: "v11", name: "Fitness & Self-care", desc: "Maintaining physical and mental health and wellbeing." },
  { id: "v12", name: "Flexibility & Adaptability", desc: "Adjusting and responding well to change." },
  { id: "v13", name: "Freedom & Independence", desc: "Living freely, making choices, and being self-directed." },
  { id: "v14", name: "Fun & Excitement", desc: "Seeking enjoyment, thrill, and joy in life." },
  { id: "v15", name: "Gratitude & Humility", desc: "Appreciating life, others, and staying humble." },
  { id: "v16", name: "Patience & Persistence", desc: "Staying steady, waiting calmly, and continuing despite obstacles." },
  { id: "v17", name: "Power & Responsibility", desc: "Taking charge, influencing, and being accountable for your actions." },
  { id: "v18", name: "Romance & Love", desc: "Expressing love, affection, and emotional closeness." },
  { id: "v19", name: "Self-Development", desc: "Growing, learning, and improving your skills, knowledge, and character." },
  { id: "v20", name: "Spirituality & Meaning", desc: "Connecting to something larger than yourself, purpose, or deeper values." },
];

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const VirtualSession: React.FC = () => {
  const { currentUser: user, themeClasses } = useApp();
  const navigate = useNavigate();
  const { sessionNumber } = useParams();
  const startTimeRef = useRef<Date>(new Date());
  const clientName = user!.name.split(" ")[0] || "Client";

  // ── Template & Navigation ──────────────────────────────────────────────────
  const [sessionTemplate, setSessionTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── UI State ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState<SessionStep>(() => {
    const saved = sessionStorage.getItem(`session-${sessionNumber}-step`);
    return saved && saved !== "undefined" ? saved : "distress-before";
  });

  const [currentStepIdx, setCurrentStepIdx] = useState<number>(() => {
    const saved = sessionStorage.getItem(`session-${sessionNumber}-idx`);
    const parsed = parseInt(saved || "", 10);
    return isNaN(parsed) ? -1 : parsed;
  });

  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // ── Persistent Input States ────────────────────────────────────────────────
  const [distressBefore, setDistressBefore] = useState<number>(5);
  const [distressAfter, setDistressAfter] = useState<number | null>(null);
  const [stepInputs, setStepInputs] = useState<Record<string, any>>({});

  // ── Session Specific States ────────────────────────────────────────────────
  const [s2InnerWorldStep, setS2InnerWorldStep] = useState(0);
  const [s5SelectedDomains, setS5SelectedDomains] = useState<string[]>([]);
  const [s5Ratings, setS5Ratings] = useState<Record<string, string>>({});
  const [s5SortedValues, setS5SortedValues] = useState<string[]>([]);
  const [s7SelectedValue, setS7SelectedValue] = useState("");
  const [s7SmartGoal, setS7SmartGoal] = useState({ specific: "", measurable: "", achievable: false, relevant: "", timebound: "" });
  const [s7Barriers, setS7Barriers] = useState<string[]>([]);
  const [s8SelectedValues, setS8SelectedValues] = useState<string[]>([]);
  const [s9SelectedValue, setS9SelectedValue] = useState("");
  const [s9Letter, setS9Letter] = useState("");
  const [s11StruggleSwitch, setS11StruggleSwitch] = useState(true);
  const [s11DefusionThoughts, setS11DefusionThoughts] = useState<string[]>([]);
  const [s11CurrentThought, setS11CurrentThought] = useState("");
  const [s12SelectedTriggers, setS12SelectedTriggers] = useState<string[]>([]);
  const [s12CustomTrigger, setS12CustomTrigger] = useState("");
  const [s12SelectedWarningSigns, setS12SelectedWarningSigns] = useState<string[]>([]);
  const [s12SkillMapping, setS12SkillMapping] = useState<Record<string, string>>({});
  const [s12ValueSteps, setS12ValueSteps] = useState("");
  const [s12Resources, setS12Resources] = useState("");
  const [s12SelectedSigns, setS12SelectedSigns] = useState<string[]>([]);
  const [s12SkillsMap, setS12SkillsMap] = useState<Record<string, string[]>>({});

  // ── Visual/Grounding States ────────────────────────────────────────────────
  const [activeVisualIdx, setActiveVisualIdx] = useState(0);
  const [groundingStep, setGroundingStep] = useState(0);
  const [groundingClicks, setGroundingClicks] = useState(0);
  const [showExerciseText, setShowExerciseText] = useState(false);
  const [groundingText, setGroundingText] = useState("");

  // ── Audio State ────────────────────────────────────────────────────────────
  const [audioLoading, setAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [hasNarrationFinished, setHasNarrationFinished] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [isMuted, setIsMuted] = useState(localStorage.getItem("session_muted") === "true");

  const narrationAudioContextRef = useRef<AudioContext | null>(null);
  const narrationSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const staticAudioRef = useRef<HTMLAudioElement | null>(null);
  const narrationIdRef = useRef<number>(0);

  // ── Fetch session template ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${BASE_URL}/sessions/${sessionNumber}`);
        if (!res.ok) throw new Error("Failed to fetch session template");
        const data = await res.json();

        // Filter out self-acceptance module if no abuse history is present
        if (data.steps) {
          data.steps = data.steps.filter((step: any) => {
            if (step.id === "self-acceptance" || step.stepId === "self-acceptance") {
              const history: any = user?.traumaHistory;
              return !!(
                history?.abuseEmotional || history?.abusePhysical ||
                history?.abuseSexual || history?.domesticViolence
              );
            }
            return true;
          });
        }
        setSessionTemplate(data);
      } catch (error) {
        console.error("Error fetching template:", error);
        alert("Error loading session. Please try again.");
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplate();
  }, [sessionNumber, navigate, user?.traumaHistory]);

  // ── Auto-save session position ─────────────────────────────────────────────
  useEffect(() => {
    if (step === "reflection") {
      sessionStorage.removeItem(`session-${sessionNumber}-step`);
      sessionStorage.removeItem(`session-${sessionNumber}-idx`);
      return;
    }
    sessionStorage.setItem(`session-${sessionNumber}-step`, step || "distress-before");
    sessionStorage.setItem(`session-${sessionNumber}-idx`, currentStepIdx.toString());
  }, [step, currentStepIdx, sessionNumber]);

  // ── Auto-narration per step ────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionTemplate) return;
    if (step === "distress-before" || step === "reflection" || step === "distress-after") {
      setHasNarrationFinished(true);
      return;
    }

    const currentStep = sessionTemplate.steps?.[currentStepIdx];
    if (!currentStep) return;

    let activeScript = "";
    let targetAudioUrl = "";
    const stepType = String(currentStep.type).toLowerCase();

    if (stepType === "intro") {
      activeScript = `Welcome to Session ${sessionTemplate.sessionNumber}, ${clientName}. Today we are focusing on ${sessionTemplate.title}. ${currentStep.content || ""}`;
      targetAudioUrl = sessionTemplate.audioUrl;
    } else if (stepType === "closing") {
      activeScript = `You've done great work today. ${currentStep.content || ""}`;
    } else {
      activeScript = currentStep.content || `Let's focus on ${currentStep.title}.`;
    }

    if (activeScript) {
      playStepNarration(currentStep.stepId || currentStep._id || currentStep.id, activeScript, targetAudioUrl);
    } else {
      setHasNarrationFinished(true);
    }
    return () => stopNarration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIdx, sessionTemplate]);

  const scrollToTop = () => {
    window.scrollTo(0, 0);
    document.body.scrollTo(0, 0);
    const mainElement = document.querySelector("main");
    if (mainElement) mainElement.scrollTo(0, 0);
  };

  useEffect(() => {
    scrollToTop();
  }, [step, currentStepIdx]);

  // ── Narration Helpers ──────────────────────────────────────────────────────
  const stopNarration = () => {
    narrationIdRef.current += 1;
    if (staticAudioRef.current) {
      staticAudioRef.current.pause();
      staticAudioRef.current.src = "";
      staticAudioRef.current = null;
    }
    if (narrationSourceRef.current) {
      try { narrationSourceRef.current.stop(); } catch (_) {}
      narrationSourceRef.current = null;
    }
    if (narrationAudioContextRef.current && narrationAudioContextRef.current.state === "suspended") {
      narrationAudioContextRef.current.resume();
    }
    setIsAudioPlaying(false);
    setIsAudioPaused(false);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem("session_muted", String(newMuted));
    if (newMuted) stopNarration();
  };

  const playTTS = async (text: string) => {
    if (isMuted) return;
    stopNarration();
    const currentRequestId = narrationIdRef.current;
    setAudioLoading(true);

    try {
      const audioRes = await generateGuidedMeditation(text);
      if (narrationIdRef.current !== currentRequestId) return;

      if (!narrationAudioContextRef.current) {
        narrationAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = narrationAudioContextRef.current;
      const audioBuffer = await decodeAudioData(decodeBase64(audioRes.audioBase64), ctx, 24000, 1);

      if (narrationIdRef.current !== currentRequestId) return;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        if (narrationIdRef.current === currentRequestId) {
          setIsAudioPlaying(false);
        }
      };
      source.start();
      narrationSourceRef.current = source;
      setIsAudioPlaying(true);
    } catch (err) {
      console.error("TTS Playback Failed", err);
    } finally {
      setAudioLoading(false);
    }
  };

  const playStepNarration = async (stepId: string, fallbackPrompt?: string, providedAudioUrl?: string) => {
    stopNarration();
    const requestId = narrationIdRef.current;

    setHasNarrationFinished(false);
    setAudioLoading(true);
    setIsAudioPlaying(false);
    setQuotaExceeded(false);

    const staticUrl = providedAudioUrl || `/audio/s${sessionTemplate.sessionNumber}_${stepId}.mp3`;

    try {
      const audio = new Audio(staticUrl);
      staticAudioRef.current = audio;
      await new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => reject(new Error("Static audio missing"));
        setTimeout(() => reject(new Error("Timeout")), 1000);
      });

      if (narrationIdRef.current !== requestId) return;
      setAudioLoading(false);
      setIsAudioPlaying(true);

      audio.onended = () => {
        if (narrationIdRef.current === requestId) {
          setIsAudioPlaying(false);
          setHasNarrationFinished(true);
        }
      };
      await audio.play();
      return;
    } catch (_) {
      // Fall through to AI generation
    }

    if (fallbackPrompt && narrationIdRef.current === requestId && !isMuted) {
      try {
        const audioBase64 = await generateGuidedMeditation(fallbackPrompt).then((res) => res.audioBase64);
        if (narrationIdRef.current !== requestId) return;

        if (!narrationAudioContextRef.current) {
          narrationAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = narrationAudioContextRef.current;
        const audioBuffer = await decodeAudioData(decodeBase64(audioBase64), ctx, 24000, 1);

        if (narrationIdRef.current !== requestId) return;
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          if (narrationIdRef.current === requestId) {
            setIsAudioPlaying(false);
            setHasNarrationFinished(true);
          }
        };
        source.start();
        narrationSourceRef.current = source;
        setIsAudioPlaying(true);
      } catch (err: any) {
        const errStr = JSON.stringify(err);
        if (errStr.includes("429") || errStr.includes("exhausted") || errStr.includes("quota")) {
          setQuotaExceeded(true);
        }
        setHasNarrationFinished(true);
      } finally {
        setAudioLoading(false);
      }
    } else {
      setAudioLoading(false);
      setHasNarrationFinished(true);
    }
  };

  // ── Navigation Helpers ─────────────────────────────────────────────────────
  const handleDistressBeforeComplete = (distressScore: number) => {
    setDistressBefore(distressScore);
    if (!sessionTemplate.steps || sessionTemplate.steps.length === 0) {
      setStep("distress-after");
      return;
    }
    setCurrentStepIdx(0);
    const firstStep = sessionTemplate.steps[0];
    setStep(firstStep.stepId || firstStep._id || firstStep.id || "intro");
  };

  const nextStep = () => {
    setActiveVisualIdx(0);
    setGroundingStep(0);
    setGroundingClicks(0);
    setS2InnerWorldStep(0);

    if (sessionTemplate.steps && currentStepIdx < sessionTemplate.steps.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      const nextStepObj = sessionTemplate.steps[nextIdx];
      setStep(nextStepObj.stepId || nextStepObj._id || nextStepObj.id || "next");
    } else {
      setStep("distress-after");
    }
  };

  const prevStep = () => {
    setActiveVisualIdx(0);
    setGroundingStep(0);
    setGroundingClicks(0);
    setS2InnerWorldStep(0);

    if (sessionTemplate.steps && currentStepIdx > 0) {
      const nextIdx = currentStepIdx - 1;
      setCurrentStepIdx(nextIdx);
      const prevStepObj = sessionTemplate.steps[nextIdx];
      setStep(prevStepObj.stepId || prevStepObj._id || prevStepObj.id || "prev");
    }
  };

  const commitToDB = async (isComplete = false) => {
    if (!sessionTemplate) return;

    const isAlreadyCompleted = user!.sessionHistory?.some(
      (s: any) => s.sessionNumber === sessionTemplate.sessionNumber && s.status === "COMPLETED"
    );
    if (isAlreadyCompleted && !isComplete) return;

    const reflections = {
      ...stepInputs,
      s5SelectedDomains,
      s5Ratings,
      s5SortedValues,
      s7SelectedValue,
      s7SmartGoal,
      s7Barriers,
      s8SelectedValues,
      s9SelectedValue,
      s9Letter,
      s11DefusionThoughts,
      s12SelectedTriggers,
      s12CustomTrigger,
      s12SelectedWarningSigns,
      s12SkillMapping,
      s12ValueSteps,
      s12Resources,
      s12SelectedSigns,
      s12SkillsMap,
    };

    const generatedStepProgress = sessionTemplate.steps
      .slice(0, currentStepIdx >= 0 ? currentStepIdx + 1 : 0)
      .map((s: any) => {
        const stepAnswers = s.questions
          ? s.questions
              .map((q: any) => {
                const qId = q.questionId || q.id || q._id;
                return { questionId: qId, questionText: q.text, value: stepInputs[qId] || null };
              })
              .filter((ans: any) => ans.value !== null)
          : [];

        return {
          stepId: s.stepId || s.id || s._id,
          stepTitle: s.title,
          status: "COMPLETED",
          startTime: startTimeRef.current,
          endTime: new Date(),
          inputs: stepAnswers,
        };
      });

    const payload = {
      sessionNumber: sessionTemplate.sessionNumber,
      sessionTitle: sessionTemplate.title,
      distressBefore,
      distressAfter,
      reflections,
      stepProgress: generatedStepProgress,
      status: isComplete ? "COMPLETED" : "IN_PROGRESS",
      startTime: startTimeRef.current,
      endTime: new Date(),
      metadata: { browser: navigator.userAgent, version: "1" },
    };

    try {
      await userService.completeSession(payload);
      storageService.commitSessionResult(user!.id, { ...payload, completed: isComplete } as any);
    } catch (error) {
      console.error("Database sync failed, saved locally:", error);
    }
  };

  const finishSession = async () => {
    await commitToDB(true);
    stopNarration();
    setStep("reflection");
  };

  const handleExitSession = () => {
    commitToDB(false);
    stopNarration();
    if (narrationAudioContextRef.current) narrationAudioContextRef.current.close();
    navigate("/");
  };

  const getProgressCount = (): number => {
    if (!sessionTemplate || !sessionTemplate.steps) return 0;
    if (step === "distress-before") return 0;
    if (step === "reflection") return 6;
    return Math.floor(((currentStepIdx + 1) / sessionTemplate.steps.length) * 6);
  };

  // ── Loading & Error States ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">Loading session template…</p>
        </div>
      </div>
    );
  }

  if (!sessionTemplate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-2xl mx-auto">
            <i className="fa-solid fa-exclamation-triangle" />
          </div>
          <p className="text-slate-700 font-medium">Session template not found</p>
          <button onClick={() => navigate("/")} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Dynamic Step Renderer ──────────────────────────────────────────────────
  const renderDynamicStep = (currentStep: any) => {
    const stepId = currentStep.stepId || currentStep._id || currentStep.id;
    const stepType = String(currentStep.type || "exercise").toLowerCase();
    const sessionNum = sessionTemplate.sessionNumber;

    switch (stepType) {
      // ── INTRO ──────────────────────────────────────────────────────────────
      case "intro":
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className={`${themeClasses.secondary} rounded-[3rem] p-10 md:p-16 text-slate-800 shadow-2xl relative overflow-hidden transition-colors duration-500`}>
              <div className={`absolute top-0 right-0 p-12 opacity-10 ${themeClasses.text}`}>
                <i className="fa-solid fa-graduation-cap text-[12rem]"></i>
              </div>
              <div className="relative z-10 space-y-6 text-center md:text-left">
                <h3 className="text-3xl md:text-4xl font-black tracking-tight">
                  Session {sessionTemplate.sessionNumber}: {sessionTemplate.title}
                </h3>
                <div className="prose prose-slate text-slate-600 text-lg leading-relaxed max-w-2xl font-medium">
                  <p>{currentStep.content || sessionTemplate.description}</p>
                  <div className={`mt-6 flex items-center gap-3 ${themeClasses.text}`}>
                    <i className="fa-solid fa-bullseye"></i>
                    <span className="text-sm font-black uppercase tracking-widest">
                      Objective: {sessionTemplate.objective}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={nextStep} className={`w-full py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl transition-all`}>
              Begin Session
            </button>
          </div>
        );

      // ── REFLECTION / QUESTIONNAIRE ─────────────────────────────────────────
      case "reflection":
      case "questionnaire": {
        const isS2Defusion = sessionNum === 2 && stepId === "defusion-practice";
        const isS2InnerWorld = sessionNum === 2 && stepId === "inner-world";

        return (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
            <div className="text-center">
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{currentStep.title}</h3>
              {!isS2InnerWorld && (
                <p className="text-slate-500 mt-2 font-medium italic whitespace-pre-wrap">{currentStep.content}</p>
              )}
              {isS2InnerWorld && (
                <p className="text-slate-500 mt-2 font-medium italic">
                  {s2InnerWorldStep % 2 === 0 ? "Acknowledge what is present." : "Now, practice defusion by noticing."}
                </p>
              )}
            </div>

            {/* S2 Defusion Step */}
            {isS2Defusion && (
              <div className={`${themeClasses.secondary} rounded-[2.5rem] p-8 border ${themeClasses.border} shadow-inner space-y-6 max-w-2xl mx-auto`}>
                <h4 className={`text-xs font-black ${themeClasses.accent} uppercase tracking-widest text-center mb-4`}>
                  Read these aloud:
                </h4>
                <div className="space-y-4">
                  <div className="p-6 bg-white rounded-2xl border border-indigo-200 shadow-sm flex items-center justify-between gap-4 transform hover:scale-[1.02] transition-transform">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Thought Defusion</p>
                      <p className="text-xl font-black text-indigo-900 leading-tight">
                        "I am having the thought that {stepInputs["thoughts_now"] || "..."}"
                      </p>
                    </div>
                    <button
                      onClick={() => playTTS(`I am having the thought that ${stepInputs["thoughts_now"] || "..."}`)}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-colors bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                    >
                      <i className="fa-solid fa-volume-high"></i>
                    </button>
                  </div>
                  <div className="p-6 bg-white rounded-2xl border border-indigo-200 shadow-sm flex items-center justify-between gap-4 transform hover:scale-[1.02] transition-transform">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Feeling Acknowledgment</p>
                      <p className="text-xl font-black text-indigo-900 leading-tight">
                        "I am noticing {stepInputs["feelings_now"] || "..."}"
                      </p>
                    </div>
                    <button
                      onClick={() => playTTS(`I am noticing ${stepInputs["feelings_now"] || "..."}`)}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-colors bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                    >
                      <i className="fa-solid fa-volume-high"></i>
                    </button>
                  </div>
                  <div className="p-6 bg-white rounded-2xl border border-indigo-200 shadow-sm flex items-center justify-between gap-4 transform hover:scale-[1.02] transition-transform">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sensation Awareness</p>
                      <p className="text-xl font-black text-indigo-900 leading-tight">
                        "I am having {stepInputs["sensations_now"] || "..."}"
                      </p>
                    </div>
                    <button
                      onClick={() => playTTS(`I am having ${stepInputs["sensations_now"] || "..."}`)}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-colors bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                    >
                      <i className="fa-solid fa-volume-high"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}

           
            {/* S2 Inner World Multi-Step */}
            {isS2InnerWorld && (
              <div className="space-y-8 max-w-2xl mx-auto">
                {(() => {
                  const currentQIndex = Math.floor(s2InnerWorldStep / 2);
                  const currentQ = currentStep.questions?.[currentQIndex];
                  // Dynamically get the ID from the database
                  const qId = currentQ?.id || currentQ?._id || currentQ?.questionId || "";
                  // Fallback to "..." if they didn't type anything
                  const userAnswer = stepInputs[qId] || "...";

                  if (s2InnerWorldStep % 2 === 0) {
                    return (
                      <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-6">
                        <label className="text-xl text-slate-700 font-bold block text-center">
                          {currentQ?.text}
                        </label>
                        <textarea
                          value={stepInputs[qId] || ""}
                          onChange={(e) =>
                            setStepInputs({
                              ...stepInputs,
                              [qId]: e.target.value,
                            })
                          }
                          placeholder="Type your answer here..."
                          className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm font-medium"
                        />
                      </div>
                    );
                  } else {
                    return (
                      <div className={`${themeClasses.secondary} rounded-[2.5rem] p-10 border ${themeClasses.border} shadow-inner space-y-8 text-center`}>
                        <h4 className={`text-xs font-black ${themeClasses.accent} uppercase tracking-widest mb-4`}>
                          Read this Aloud:
                        </h4>
                        <div className="p-8 bg-white rounded-3xl border border-indigo-200 shadow-sm transform scale-105 transition-transform flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-2xl font-black text-indigo-900 leading-tight">
                              {s2InnerWorldStep === 1 && `"I am having the thought that ${userAnswer}"`}
                              {s2InnerWorldStep === 3 && `"I am noticing ${userAnswer}"`}
                              {s2InnerWorldStep === 5 && `"I am having ${userAnswer}"`}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              let text = "";
                              if (s2InnerWorldStep === 1) text = `I am having the thought that ${userAnswer}`;
                              if (s2InnerWorldStep === 3) text = `I am noticing ${userAnswer}`;
                              if (s2InnerWorldStep === 5) text = `I am having ${userAnswer}`;
                              playTTS(text);
                            }}
                            className="w-12 h-12 rounded-full flex items-center justify-center transition-colors shrink-0 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                          >
                            <i className="fa-solid fa-volume-high"></i>
                          </button>
                        </div>
                        <p className="text-slate-500 text-sm font-bold animate-pulse">
                          Speak clearly and notice the space it creates.
                        </p>
                      </div>
                    );
                  }
                })()}

                <div className="flex gap-4">
                  <button
                    onClick={() => (s2InnerWorldStep === 0 ? prevStep() : setS2InnerWorldStep(s2InnerWorldStep - 1))}
                    className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (s2InnerWorldStep < 5) setS2InnerWorldStep(s2InnerWorldStep + 1);
                      else nextStep();
                    }}
                    // Dynamically disable the button if the current question is empty
                    disabled={
                      s2InnerWorldStep % 2 === 0 &&
                      !stepInputs[
                        currentStep.questions?.[Math.floor(s2InnerWorldStep / 2)]?.id ||
                        currentStep.questions?.[Math.floor(s2InnerWorldStep / 2)]?._id ||
                        currentStep.questions?.[Math.floor(s2InnerWorldStep / 2)]?.questionId || ""
                      ]
                    }
                    className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 disabled:opacity-50"
                  >
                    {s2InnerWorldStep % 2 === 0 ? "Convert to Notice" : s2InnerWorldStep === 5 ? "Continue to Exercise" : "Next Question"}
                  </button>
                </div>
              </div>
            )}

            {/* Standard Generic Questionnaire */}
            {!isS2Defusion && !isS2InnerWorld && (
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-8">
                {currentStep.questions && currentStep.questions.length > 0 ? (
                  currentStep.questions.map((q: any, index: number) => {
                    const qKey = q.questionId || q.id || q._id || `question_${index}`;
                    const qType = String(q.type).toLowerCase();
                    return (
                      <div key={qKey} className="space-y-4">
                        <label className="text-lg text-slate-700 font-bold">{q.text}</label>
                        {qType === "text" && (
                          <textarea
                            value={stepInputs[qKey] || ""}
                            onChange={(e) => setStepInputs({ ...stepInputs, [qKey]: e.target.value })}
                            placeholder="Type your answer here..."
                            className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm font-medium"
                          />
                        )}
                        {qType === "likert" && (
                          <div className="flex justify-between gap-2 flex-wrap">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <button
                                key={num}
                                onClick={() => setStepInputs({ ...stepInputs, [qKey]: num })}
                                className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${
                                  stepInputs[qKey] === num ? "bg-indigo-600 text-white shadow-lg scale-110" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        )}
                        {qType === "choice" && q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {q.options.map((opt: any) => {
                              const label = typeof opt === "string" ? opt : opt.label;
                              const value = typeof opt === "string" ? opt : opt.value;
                              return (
                                <button
                                  key={value}
                                  onClick={() => setStepInputs({ ...stepInputs, [qKey]: value })}
                                  className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all text-left ${
                                    stepInputs[qKey] === value ? "bg-indigo-50 border-indigo-600 text-indigo-600 shadow-sm" : "bg-white border-slate-100 text-slate-400 hover:border-indigo-200"
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {qType === "multiselect" && q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {q.options.map((opt: any) => {
                              const label = typeof opt === "string" ? opt : opt.label;
                              const value = typeof opt === "string" ? opt : opt.value;
                              const currentSelections = Array.isArray(stepInputs[qKey]) ? stepInputs[qKey] : [];
                              const isSelected = currentSelections.includes(value);

                              return (
                                <button
                                  key={value}
                                  onClick={() => {
                                    let nextSelections;
                                    if (isSelected) {
                                      nextSelections = currentSelections.filter((v: string) => v !== value);
                                    } else {
                                      nextSelections = [...currentSelections, value];
                                    }
                                    setStepInputs({ ...stepInputs, [qKey]: nextSelections });
                                  }}
                                  className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all text-left flex justify-between items-center ${
                                    isSelected ? "bg-indigo-50 border-indigo-600 text-indigo-600 shadow-sm" : "bg-white border-slate-100 text-slate-400 hover:border-indigo-200"
                                  }`}
                                >
                                  {label}
                                  {isSelected && <i className="fa-solid fa-check"></i>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <textarea
                    value={stepInputs[stepId] || ""}
                    onChange={(e) => setStepInputs({ ...stepInputs, [stepId]: e.target.value })}
                    placeholder="Share your thoughts..."
                    className="w-full h-48 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm font-medium"
                  />
                )}
              </div>
            )}

            {!isS2InnerWorld && (
              <div className="flex gap-4">
                <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">
                  Back
                </button>
                <button onClick={nextStep} className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800">
                  Continue
                </button>
              </div>
            )}
          </div>
        );
      }

      // ── EXERCISE / MEDITATION ──────────────────────────────────────────────
      case "exercise":
      case "meditation": {

        // ── SESSION 3: Visual Defusion ────────────────────────────────────────
        if (sessionNum === 3 && stepId === "visual-defusion") {
          const thought = stepInputs["bothering_thought"] || "I am broken";
          const visuals = [
            { 
              name: "Children's Book", 
              icon: "fa-book-open",
              render: (text: string) => (
                <div className="relative w-full max-w-4xl h-[600px] flex items-center justify-center overflow-hidden rounded-[4rem] shadow-2xl bg-[url('https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
                  
                  {/* Realistic Book on Desk */}
                  <div className="relative w-[750px] h-[500px] perspective-[3000px]">
                    <div className="relative w-full h-full transition-all duration-1000 preserve-3d rotate-x-[15deg] rotate-y-[-2deg]">
                      
                      {/* Shadow on Desk */}
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[110%] h-20 bg-black/40 blur-3xl rounded-full -z-50"></div>
                      
                      {/* Book Cover (Back) */}
                      <div className="absolute inset-0 bg-[#3d1e08] rounded-lg shadow-2xl translate-z-[-15px]"></div>
                      
                      {/* Book Thickness (Stacked Pages) */}
                      <div className="absolute left-[2%] right-[2%] top-[2%] bottom-[2%] bg-white/90 shadow-inner rounded-sm translate-z-[-10px] border-y border-stone-200"></div>
                      <div className="absolute left-[3%] right-[3%] top-[3%] bottom-[3%] bg-white/80 shadow-inner rounded-sm translate-z-[-5px] border-y border-stone-200"></div>
                      
                      {/* Left Page */}
                      <div className="absolute left-0 top-0 bottom-0 right-1/2 bg-[#fffdfa] rounded-l-md shadow-[-10px_10px_30px_rgba(0,0,0,0.3)] origin-right rotate-y-[-4deg] p-16 flex flex-col items-center justify-center text-center overflow-hidden border-r border-black/5">
                        <div className="absolute inset-0 opacity-60 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent"></div>
                        <div className="absolute top-12 left-12 opacity-20 grayscale scale-150">
                          <i className="fa-solid fa-feather-pointed text-5xl text-amber-900"></i>
                        </div>
                        <p className="font-['Playfair_Display'] text-amber-950 text-4xl font-bold leading-tight drop-shadow-sm z-10">
                          {text}
                        </p>
                        <div className="mt-16 flex gap-3 opacity-30">
                          <div className="w-3 h-3 rounded-full bg-amber-900"></div>
                          <div className="w-3 h-3 rounded-full bg-amber-900"></div>
                          <div className="w-3 h-3 rounded-full bg-amber-900"></div>
                        </div>
                      </div>
                      
                      {/* Book Spine (Center) */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-10 -translate-x-1/2 bg-[#2d1606] shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] z-30 rounded-sm"></div>
                      
                      {/* Right Page */}
                      <div className="absolute right-0 top-0 bottom-0 left-1/2 bg-[#fffdfa] rounded-r-md shadow-[10px_10px_30px_rgba(0,0,0,0.3)] origin-left rotate-y-[4deg] p-16 flex flex-col items-center justify-center text-center overflow-hidden border-l border-black/5">
                        <div className="absolute inset-0 opacity-60 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
                        <div className="absolute inset-0 bg-gradient-to-l from-black/20 via-transparent to-transparent"></div>
                        <div className="space-y-8 opacity-10 w-full">
                          <div className="w-full h-4 bg-stone-300 rounded-full"></div>
                          <div className="w-5/6 h-4 bg-stone-300 rounded-full"></div>
                          <div className="w-full h-4 bg-stone-300 rounded-full"></div>
                          <div className="w-4/5 h-4 bg-stone-300 rounded-full"></div>
                          <div className="w-full h-4 bg-stone-300 rounded-full"></div>
                        </div>
                        <div className="mt-20 relative">
                          <div className="absolute -inset-4 bg-amber-100/30 blur-xl rounded-full"></div>
                          <p className="font-['Playfair_Display'] text-stone-400 text-sm italic uppercase tracking-[0.8em] font-bold relative z-10">Finis</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            },
            { 
              name: "Restaurant Menu", 
              icon: "fa-utensils",
              render: (text: string) => (
                <div className="relative w-full max-w-4xl h-[650px] flex items-center justify-center overflow-hidden rounded-[4rem] shadow-2xl bg-[url('https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"></div>
                  
                  {/* Tablecloth suggestion */}
                  <div className="absolute bottom-0 inset-x-0 h-1/3 bg-white/5 skew-y-[-2deg] origin-bottom-left"></div>
                  
                  {/* Realistic Menu Holder */}
                  <div className="relative w-[480px] h-[580px] perspective-[2500px]">
                    <div className="relative w-full h-full bg-[#1a0f08] rounded-2xl shadow-[0_50px_100px_rgba(0,0,0,0.9)] p-12 transition-transform duration-1000 rotate-x-[12deg]">
                      {/* Leather Texture & Embossing */}
                      <div className="absolute inset-0 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] rounded-2xl"></div>
                      <div className="absolute inset-6 border-4 border-[#3d2516] rounded-xl pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"></div>
                      
                      {/* Menu Card */}
                      <div className="w-full h-full bg-[#fdfaf6] shadow-2xl p-14 flex flex-col items-center text-center font-['Playfair_Display'] relative overflow-hidden rounded-sm border border-stone-200">
                        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>
                        <div className="absolute inset-10 border-2 border-stone-100 pointer-events-none"></div>
                        
                        <div className="w-24 h-px bg-stone-800 mb-16 opacity-40"></div>
                        <span className="text-[11px] uppercase tracking-[1em] text-stone-400 mb-24 font-bold">Chef's Selection</span>
                        
                        <div className="flex-1 flex flex-col items-center justify-center">
                          <div className="relative">
                            <span className="absolute -top-16 -left-10 text-stone-200 text-9xl opacity-30 font-serif">“</span>
                            <h4 className="text-4xl text-stone-900 font-medium italic leading-tight relative z-10 px-4">
                              {text}
                            </h4>
                            <span className="absolute -bottom-24 -right-10 text-stone-200 text-9xl opacity-30 font-serif">”</span>
                          </div>
                          <div className="w-20 h-px bg-stone-200 my-12"></div>
                          <p className="text-[11px] text-stone-400 uppercase tracking-[0.6em] leading-relaxed font-bold max-w-[200px]">
                            A seasoned thought <br/> for the present moment
                          </p>
                        </div>
                        
                        <div className="mt-auto pt-8 border-t border-stone-100 w-full">
                          <div className="text-stone-900 text-3xl font-bold tracking-tighter italic">Gratis</div>
                        </div>
                      </div>
                      
                      {/* Corner Protectors (Gold) */}
                      <div className="absolute top-0 left-0 w-12 h-12 border-t-8 border-l-8 border-amber-600/30 rounded-tl-2xl"></div>
                      <div className="absolute top-0 right-0 w-12 h-12 border-t-8 border-r-8 border-amber-600/30 rounded-tr-2xl"></div>
                      <div className="absolute bottom-0 left-0 w-12 h-12 border-b-8 border-l-8 border-amber-600/30 rounded-bl-2xl"></div>
                      <div className="absolute bottom-0 right-0 w-12 h-12 border-b-8 border-r-8 border-amber-600/30 rounded-br-2xl"></div>
                    </div>
                  </div>
                </div>
              )
            },
            { 
              name: "Floating Clouds", 
              icon: "fa-cloud",
              render: (text: string) => (
                <div className="relative w-full max-w-4xl h-[500px] rounded-[5rem] overflow-hidden shadow-2xl group bg-gradient-to-b from-sky-400 to-sky-200">
                  {/* Animated Sky Background */}
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
                  
                  {/* Parallax Clouds */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Far Clouds */}
                    <div className="absolute top-20 -left-40 w-[800px] h-[400px] opacity-30 animate-drift" style={{ animationDuration: '40s' }}>
                      <svg viewBox="0 0 200 100" className="w-full h-full fill-white blur-[80px]">
                        <circle cx="50" cy="50" r="40" />
                        <circle cx="100" cy="40" r="60" />
                        <circle cx="150" cy="50" r="40" />
                      </svg>
                    </div>
                    
                    {/* Mid Clouds */}
                    <div className="absolute bottom-10 -right-40 w-[900px] h-[500px] opacity-50 animate-drift" style={{ animationDuration: '30s', animationDelay: '-10s' }}>
                      <svg viewBox="0 0 200 100" className="w-full h-full fill-white blur-[60px]">
                        <circle cx="40" cy="60" r="50" />
                        <circle cx="100" cy="50" r="70" />
                        <circle cx="160" cy="60" r="50" />
                      </svg>
                    </div>
                    
                    {/* Near Clouds */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] opacity-20 animate-drift" style={{ animationDuration: '20s', animationDelay: '-5s' }}>
                      <svg viewBox="0 0 200 100" className="w-full h-full fill-white blur-[40px]">
                        <circle cx="30" cy="50" r="60" />
                        <circle cx="100" cy="50" r="80" />
                        <circle cx="170" cy="50" r="60" />
                      </svg>
                    </div>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center p-20">
                    <div className="relative animate-float" style={{ animationDuration: '8s' }}>
                      <p className="text-8xl font-black text-white/60 tracking-tighter leading-none select-none mix-blend-screen text-center px-16 uppercase drop-shadow-[0_20px_60px_rgba(0,0,0,0.2)] filter blur-[0.8px]">
                        {text}
                      </p>
                      <p className="absolute inset-0 text-8xl font-black text-white/20 blur-3xl tracking-tighter leading-none select-none text-center px-16 uppercase">
                        {text}
                      </p>
                    </div>
                  </div>
                  
                  {/* Dynamic Sun Rays */}
                  <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-amber-100/30 blur-[150px] rounded-full animate-pulse"></div>
                  <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_70%)]"></div>
                </div>
              )
            },
            { 
              name: "Leaves on Stream", 
              icon: "fa-leaf",
              render: (text: string) => (
                <div className="relative w-full max-w-4xl h-[500px] rounded-[5rem] overflow-hidden shadow-2xl group bg-[url('https://images.unsplash.com/photo-1437482012994-69037aa35839?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center">
                  <div className="absolute inset-0 bg-emerald-900/20 backdrop-blur-[1px]"></div>
                  
                  {/* Water Surface with Caustics & Ripples */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/water.png')] opacity-30 mix-blend-overlay animate-drift" style={{ animationDuration: '20s' }}></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-stream-line opacity-30 mix-blend-screen"></div>
                  
                  {/* Realistic Ripples */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-1/4 w-40 h-40 border border-white/20 rounded-full animate-ripple"></div>
                    <div className="absolute bottom-1/4 right-1/3 w-60 h-60 border border-white/10 rounded-full animate-ripple" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute top-1/2 right-1/4 w-32 h-32 border border-white/15 rounded-full animate-ripple" style={{ animationDelay: '2s' }}></div>
                  </div>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative animate-leaf-float" style={{ animationDuration: '10s' }}>
                      {/* Realistic Leaf with Subsurface Scattering Feel */}
                      <div className="relative w-[500px] h-[350px] flex items-center justify-center">
                        <img 
                          src="https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80" 
                          className="absolute inset-0 w-full h-full object-contain opacity-95 drop-shadow-[0_30px_50px_rgba(0,0,0,0.7)] filter saturate-[1.2] contrast-[1.1]"
                          alt="Leaf"
                          referrerPolicy="no-referrer"
                        />
                        {/* Leaf Vein Glow */}
                        <div className="absolute inset-0 bg-emerald-400/10 blur-2xl rounded-full mix-blend-screen animate-pulse"></div>
                        
                        <div className="relative z-10 px-20 text-center">
                          <p className="text-5xl font-['Playfair_Display'] italic font-bold text-emerald-50 leading-tight mix-blend-screen drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                            {text}
                          </p>
                        </div>
                      </div>
                      
                      {/* Leaf Wake */}
                      <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-40 h-1 bg-white/20 blur-md rounded-full animate-stream-line"></div>
                    </div>
                  </div>
                </div>
              )
            },
            { 
              name: "Weather Animation", 
              icon: "fa-cloud-showers-heavy",
              render: (text: string) => (
                <div className="relative w-full max-w-4xl h-[500px] rounded-[3rem] overflow-hidden shadow-2xl group border-[24px] border-slate-900 bg-black">
                  <img 
                    src="https://images.unsplash.com/photo-1428901730303-42ad5344bb58?auto=format&fit=crop&w=1600&q=80" 
                    className="absolute inset-0 w-full h-full object-cover opacity-70" 
                    alt="Stormy Sky"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Lightning Flash */}
                  <div className="absolute inset-0 bg-white animate-lightning pointer-events-none z-10"></div>
                  
                  {/* Realistic Rain Overlay */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-rain opacity-40 pointer-events-none scale-150"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/70"></div>
                  
                  {/* News Broadcast UI - More Realistic */}
                  <div className="absolute top-12 left-12 right-12 flex justify-between items-start z-20">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-600 text-white px-5 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.6)] rounded-sm">Breaking</div>
                        <div className="bg-slate-800/80 backdrop-blur-md text-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-sm">Weather Alert</div>
                      </div>
                      <div className="text-white/70 font-mono text-[10px] tracking-widest bg-black/40 backdrop-blur-sm px-3 py-1 rounded-sm inline-block w-fit">
                        <i className="fa-solid fa-circle text-red-500 animate-pulse mr-2"></i>
                        LIVE | {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-[9px] text-white/40 uppercase font-bold mb-1">Wind</div>
                        <div className="text-xl font-black text-white">45<span className="text-xs ml-1">mph</span></div>
                      </div>
                      <div className="w-px h-8 bg-white/10"></div>
                      <div className="text-center">
                        <div className="text-[9px] text-white/40 uppercase font-bold mb-1">Temp</div>
                        <div className="text-xl font-black text-white">62°</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute inset-x-0 bottom-0 p-12 z-20">
                    <div className="bg-slate-900/60 backdrop-blur-xl border-l-[12px] border-red-600 p-10 space-y-6 shadow-2xl rounded-r-2xl">
                      <div className="flex items-center gap-4 text-red-500 font-black text-xs uppercase tracking-[0.4em]">
                        <i className="fa-solid fa-triangle-exclamation animate-bounce"></i>
                        Severe Thought Warning
                      </div>
                      <h4 className="text-6xl font-black text-white uppercase tracking-tighter leading-[0.9] drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                        {text}
                      </h4>
                      <div className="h-2 w-full bg-white/10 rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-amber-500 w-full animate-radar-sweep origin-left" style={{ animationDuration: '3s' }}></div>
                      </div>
                      <div className="flex justify-between items-center text-[11px] font-mono text-white/40 tracking-[0.3em] font-bold">
                        <span>REGION: PRE-FRONTAL_CORTEX</span>
                        <span className="text-amber-500">INTENSITY: CRITICAL</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* CRT Distortion & Scanlines */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_6px] pointer-events-none opacity-50"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none"></div>
                </div>
              )
            },
            { 
              name: "Birthday Cake", 
              icon: "fa-cake-candles",
              render: (text: string) => (
                <div className="relative w-full max-w-4xl h-[600px] rounded-[4rem] overflow-hidden shadow-2xl group bg-[url('https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center">
                  {/* Subtle Vignette for Depth */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center p-20 z-10">
                    <div className="relative animate-float" style={{ animationDuration: '7s' }}>
                      {/* Realistic Icing Text Effect - Thick, Glossy, and Volumetric */}
                      <p className="text-8xl font-['Dancing_Script'] text-white text-center px-16 leading-tight select-none
                        drop-shadow-[0_2px_0_#f43f5e] 
                        [text-shadow:0_1px_0_#ccc,0_2px_0_#c9c9c9,0_3px_0_#bbb,0_4px_0_#b9b9b9,0_5px_0_#aaa,0_6px_1px_rgba(0,0,0,.1),0_0_5px_rgba(0,0,0,.1),0_1px_3px_rgba(0,0,0,.3),0_3px_5px_rgba(0,0,0,.2),0_5px_10px_rgba(0,0,0,.25),0_10px_10px_rgba(0,0,0,.2),0_20px_20px_rgba(0,0,0,.15)]">
                        {text}
                      </p>
                    </div>
                  </div>
                  
                  {/* High-Fidelity Sparkles / Bokeh */}
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                      <div 
                        key={i}
                        className="absolute w-2 h-2 bg-white/40 rounded-full blur-[1px] animate-pulse"
                        style={{ 
                          top: `${Math.random() * 100}%`, 
                          left: `${Math.random() * 100}%`,
                          animationDelay: `${Math.random() * 5}s`,
                          animationDuration: `${2 + Math.random() * 3}s`
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
              )
            },
            { 
              name: "Blackboard", 
              icon: "fa-chalkboard",
              render: (text: string) => (
                <div className="relative w-full max-w-4xl h-[500px] rounded-2xl overflow-hidden shadow-[0_60px_120px_rgba(0,0,0,0.9)] group border-[35px] border-[#2d1a0e] bg-[#1a1c1e] bg-[url('https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center">
                  <div className="absolute inset-0 bg-black/50"></div>
                  
                  {/* Realistic Chalk Smudges */}
                  <div className="absolute inset-0 opacity-40 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dust.png')]"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_80%)]"></div>
                  <div className="absolute top-1/4 left-1/3 w-64 h-32 bg-white/5 blur-3xl rounded-full rotate-12"></div>
                  <div className="absolute bottom-1/3 right-1/4 w-80 h-40 bg-white/5 blur-3xl rounded-full -rotate-12"></div>

                  <div className="absolute inset-0 flex items-center justify-center p-24">
                    <p className="text-7xl font-['Permanent_Marker'] text-white/85 text-center leading-relaxed tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] filter blur-[0.3px]">
                      {text}
                    </p>
                  </div>
                  
                  {/* Realistic Chalk Pieces & Eraser */}
                  <div className="absolute bottom-4 right-10 flex items-end gap-8 opacity-80">
                    <div className="relative">
                      <div className="w-24 h-12 bg-[#5d4037] rounded-md shadow-2xl border-b-4 border-black/20"></div>
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-[#8d6e63] rounded-t-md"></div>
                    </div>
                    <div className="flex gap-4 mb-2">
                      <div className="w-14 h-3 bg-white rounded-full shadow-lg rotate-[-20deg] border-b-2 border-stone-300"></div>
                      <div className="w-10 h-3 bg-white/90 rounded-full shadow-lg rotate-[15deg] border-b-2 border-stone-300"></div>
                    </div>
                  </div>
                </div>
              )
            },
            { 
              name: "T-Shirt Slogan", 
              icon: "fa-shirt",
              render: (text: string) => (
                <div className="relative w-full max-w-4xl h-[650px] rounded-[6rem] overflow-hidden shadow-2xl group bg-[url('https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center">
                  {/* Subtle Lighting Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center p-24">
                    <div className="text-center max-w-[450px] perspective-[1000px]">
                      <div className="rotate-x-[15deg] rotate-y-[-10deg] skew-x-[-5deg] transition-transform duration-1000 group-hover:rotate-y-[-5deg]">
                        {/* Realistic Screen Print Effect - Blended into Fabric */}
                        <div className="relative">
                          <p className="text-7xl font-black text-slate-900 uppercase tracking-tighter leading-[0.85] mix-blend-multiply opacity-90 filter blur-[0.4px]">
                            {text}
                          </p>
                          {/* Fabric Texture Overlay - Makes the text look printed ON the shirt */}
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] opacity-40 mix-blend-overlay pointer-events-none"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtle Shadow for Depth */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.1)_100%)] pointer-events-none"></div>
                </div>
              )
            },
            { 
              name: "Computer Screen", 
              icon: "fa-terminal",
              render: (text: string) => (
                <div className="relative w-full max-w-4xl h-[500px] rounded-[3rem] overflow-hidden shadow-[0_60px_120px_rgba(0,0,0,1)] group border-[28px] border-slate-900 bg-black">
                  {/* Screen Background with Depth */}
                  <div className="absolute inset-0 bg-[#0a0c0f] bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-40"></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/10 to-transparent"></div>
                  
                  {/* Terminal UI - High Fidelity */}
                  <div className="absolute inset-0 p-16 font-['Space_Mono'] text-emerald-400 flex flex-col z-10">
                    <div className="flex justify-between items-center mb-16">
                      <div className="flex gap-3">
                        <div className="w-4 h-4 rounded-full bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.6)] border border-red-400/30"></div>
                        <div className="w-4 h-4 rounded-full bg-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.6)] border border-amber-400/30"></div>
                        <div className="w-4 h-4 rounded-full bg-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.6)] border border-emerald-400/30"></div>
                      </div>
                      <div className="text-[10px] font-bold tracking-[0.4em] opacity-40 bg-emerald-950/50 px-4 py-1.5 rounded-full border border-emerald-500/10">
                        SESSION_ID: {Math.random().toString(36).substring(7).toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center justify-center gap-16">
                      <div className="flex flex-col items-center gap-4">
                        <div className="text-[11px] opacity-30 tracking-[1em] uppercase font-black animate-pulse">Initializing Thought Deconstruction...</div>
                        <div className="w-64 h-1 bg-emerald-900/30 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-2/3 animate-radar-sweep origin-left" style={{ animationDuration: '2s' }}></div>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute -inset-10 bg-emerald-500/5 blur-3xl rounded-full animate-pulse"></div>
                        <p className="text-7xl tracking-tighter text-center drop-shadow-[0_0_30px_rgba(16,185,129,0.4)] font-bold relative z-10">
                          <span className="opacity-30 mr-8 font-light">root@mind:~$</span>
                          {text}
                          <span className="w-8 h-16 bg-emerald-500 inline-block ml-6 align-middle animate-blink shadow-[0_0_25px_rgba(16,185,129,0.9)]"></span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-auto flex justify-between items-end">
                      <div className="space-y-1">
                        <div className="text-[9px] opacity-20 font-bold tracking-widest">ENCRYPTION: AES-256-GCM</div>
                        <div className="text-[9px] opacity-20 font-bold tracking-widest">STATUS: ISOLATED_CORE_ACTIVE</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] opacity-40 font-black tracking-[0.6em] text-emerald-300">ACT_OS_V9.0</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Realistic Screen Effects */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_8px] pointer-events-none opacity-60 z-20"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)] pointer-events-none z-20"></div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none z-20"></div>
                  
                  {/* Screen Flicker */}
                  <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none z-20"></div>
                </div>
              )
            }
          ];

          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-5xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Visualizing the Thought</h3>
                <p className="text-slate-500 mt-2 font-medium">Notice how the thought changes when you see it in different ways.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
                {/* Main Display Area */}
                <div className="lg:col-span-2 bg-slate-100 rounded-[4rem] p-12 min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                  <div className="animate-in zoom-in-95 duration-500 w-full flex justify-center">
                    {visuals[activeVisualIdx].render(thought)}
                  </div>
                  
                  <div className="mt-12 text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Current Style</span>
                    <h4 className="text-2xl font-black text-slate-800">{visuals[activeVisualIdx].name}</h4>
                  </div>
                </div>

                {/* Grid Selection Area */}
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Choose a perspective:</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {visuals.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveVisualIdx(i)}
                        className={`aspect-square rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-2 group ${
                          activeVisualIdx === i 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:bg-slate-50'
                        }`}
                      >
                        <i className={`fa-solid ${v.icon} text-xl group-hover:scale-110 transition-transform`}></i>
                        <span className="text-[8px] font-black uppercase tracking-tighter text-center px-1 leading-tight">{v.name}</span>
                      </button>
                    ))}
                  </div>
                  
                  <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                    <p className="text-xs text-indigo-700 font-medium italic leading-relaxed">
                      <i className="fa-solid fa-lightbulb mr-2"></i>
                      Notice how the thought feels less "solid" or "true" when it's just words on a cake or a t-shirt.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                <button onClick={nextStep} className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700">Continue to Reflection</button>
              </div>
            </div>
          );
        }

        // ── SESSION 5: Choose Domains ─────────────────────────────────────────
        if (sessionNum === 5 && stepId === "choose-domains") {
          const domains = [
            { id: "family", name: "Family", icon: "fa-house-user" },
            { id: "work", name: "Work", icon: "fa-briefcase" },
            { id: "hobbies", name: "Hobbies", icon: "fa-palette" },
            { id: "yourself", name: "Yourself", icon: "fa-user" },
          ];
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Choose Life Domains
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  {currentStep.content}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {domains.map((d) => (
                  <button
                    key={d.id}
                    onClick={() =>
                      setS5SelectedDomains((prev) =>
                        prev.includes(d.id)
                          ? prev.filter((id) => id !== d.id)
                          : [...prev, d.id]
                      )
                    }
                    className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 ${
                      s5SelectedDomains.includes(d.id)
                        ? `${themeClasses.primary} border-transparent text-white shadow-xl scale-105`
                        : "bg-white border-slate-100 text-slate-400 hover:border-indigo-200"
                    }`}
                  >
                    <i className={`fa-solid ${d.icon} text-3xl`}></i>
                    <span className="font-black uppercase tracking-widest text-xs">
                      {d.name}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={s5SelectedDomains.length === 0}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl disabled:opacity-50`}
                >
                  Continue to Values
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 5: Rate Values ────────────────────────────────────────────
        if (sessionNum === 5 && stepId === "rate-values") {
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-5xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Rate Your Values
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  {currentStep.content}
                </p>
              </div>
              <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto p-8 space-y-4 custom-scrollbar">
                  {VALUES_LIST.map((v) => (
                    <div
                      key={v.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50 rounded-2xl gap-4 border border-slate-100"
                    >
                      <div className="flex-1">
                        <h4 className="font-black text-slate-800">{v.name}</h4>
                        <p className="text-xs text-slate-500 font-medium">
                          {v.desc}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {["V", "Q", "N"].map((rating) => (
                          <button
                            key={rating}
                            onClick={() =>
                              setS5Ratings((prev) => ({
                                ...prev,
                                [v.id]: rating,
                              }))
                            }
                            className={`w-12 h-12 rounded-xl font-black text-sm transition-all ${
                              s5Ratings[v.id] === rating
                                ? "bg-indigo-600 text-white shadow-lg"
                                : "bg-white text-slate-400 border border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    const veryImportant = VALUES_LIST.filter(
                      (v) => s5Ratings[v.id] === "V"
                    ).map((v) => v.id);
                    setS5SortedValues(veryImportant);
                    nextStep();
                  }}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}
                >
                  Continue to Card Sort
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 5: Card Sort ──────────────────────────────────────────────
        if (sessionNum === 5 && stepId === "card-sort") {
          const moveValue = (idx: number, dir: "up" | "down") => {
            const newList = [...s5SortedValues];
            const targetIdx = dir === "up" ? idx - 1 : idx + 1;
            if (targetIdx < 0 || targetIdx >= newList.length) return;
            [newList[idx], newList[targetIdx]] = [
              newList[targetIdx],
              newList[idx],
            ];
            setS5SortedValues(newList);
          };
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Values Card Sort
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  {currentStep.content}
                </p>
              </div>
              <div className="space-y-4">
                {s5SortedValues.length === 0 ? (
                  <div className="p-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center text-slate-400 font-bold">
                    No "Very Important" values selected. Go back to rate some as
                    'V'.
                  </div>
                ) : (
                  s5SortedValues.map((vId, idx) => {
                    const v = VALUES_LIST.find((val) => val.id === vId);
                    return (
                      <div
                        key={vId}
                        className="flex items-center gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-md group"
                      >
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveValue(idx, "up")}
                            disabled={idx === 0}
                            className="text-slate-300 hover:text-indigo-600 disabled:opacity-0"
                          >
                            <i className="fa-solid fa-chevron-up"></i>
                          </button>
                          <button
                            onClick={() => moveValue(idx, "down")}
                            disabled={idx === s5SortedValues.length - 1}
                            className="text-slate-300 hover:text-indigo-600 disabled:opacity-0"
                          >
                            <i className="fa-solid fa-chevron-down"></i>
                          </button>
                        </div>
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-black text-xs">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-black text-slate-800">
                            {v?.name}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium">
                            {v?.desc}
                          </p>
                        </div>
                        <i className="fa-solid fa-grip-vertical text-slate-200 group-hover:text-slate-400 transition-colors"></i>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}
                >
                  Continue to Reflection
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 5: Grounding 54321 ────────────────────────────────────────
        if (sessionNum === 5 && stepId === "grounding-54321") {
          const groundingSteps = [
            {
              count: 5,
              sense: "See",
              icon: "fa-eye",
              color: "bg-blue-50 text-blue-600",
              prompt: "Look around you. Slowly notice 5 things you can see.",
              sub: "It can be anything — colors, shapes, light, objects. Take your time.",
            },
            {
              count: 4,
              sense: "Touch",
              icon: "fa-hand",
              color: "bg-emerald-50 text-emerald-600",
              prompt: "Now, notice 4 things you can feel or touch.",
              sub: "Maybe your clothes on your skin, the chair under you, the floor under your feet, or the air on your face.",
            },
            {
              count: 3,
              sense: "Hear",
              icon: "fa-ear-listen",
              color: "bg-amber-50 text-amber-600",
              prompt: "Now listen carefully. Notice 3 things you can hear.",
              sub: "It might be nearby sounds or distant sounds. There is no right or wrong answer.",
            },
            {
              count: 2,
              sense: "Smell",
              icon: "fa-wind",
              color: "bg-rose-50 text-rose-600",
              prompt:
                "Now bring attention to your sense of smell. Notice 2 things you can smell.",
              sub: "If you don't notice a smell, that's okay — simply notice the neutral air around you.",
            },
            {
              count: 1,
              sense: "Taste",
              icon: "fa-utensils",
              color: "bg-indigo-50 text-indigo-600",
              prompt: "Finally, notice 1 thing you can taste.",
              sub: "It may be a recent drink, food, or just the natural taste in your mouth.",
            },
          ];
          const curr = groundingSteps[groundingStep];
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  5-4-3-2-1 Grounding
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  Grounding yourself in the here and now.
                </p>
              </div>
              <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-2xl min-h-[450px] flex flex-col items-center justify-center relative overflow-hidden text-center">
                <div className="absolute top-8 flex gap-2">
                  {groundingSteps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-full transition-all ${
                        i === groundingStep
                          ? "w-12 bg-indigo-600"
                          : i < groundingStep
                          ? "w-4 bg-emerald-400"
                          : "w-4 bg-slate-200"
                      }`}
                    ></div>
                  ))}
                </div>
                <div
                  className={`w-24 h-24 ${curr.color} rounded-full flex items-center justify-center text-4xl mb-8 shadow-inner animate-in zoom-in duration-500`}
                >
                  <i className={`fa-solid ${curr.icon}`}></i>
                </div>
                <div className="space-y-6 max-w-lg">
                  <h4 className="text-4xl font-black text-slate-800 tracking-tight">
                    Step {groundingStep + 1}: {curr.sense} {curr.count} Things
                  </h4>
                  <p className="text-xl font-medium text-slate-600 leading-relaxed">
                    {curr.prompt}
                  </p>
                  <p className="text-sm text-slate-400 font-medium italic">
                    {curr.sub}
                  </p>
                </div>
                <div className="mt-10 space-y-6 w-full max-w-md mx-auto">
                  <div className="flex flex-wrap justify-center gap-3">
                    {Array.from({ length: curr.count }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (i === groundingClicks) {
                            const senseKey = `grounding_${curr.sense.toLowerCase()}`;
                            
                            // 👇 Use functional update to prevent React from overwriting past array items
                            setStepInputs((prev) => {
                              const currentList = prev[senseKey] || [];
                              return {
                                ...prev,
                                [senseKey]: [...currentList, groundingText.trim() || "(Skipped)"],
                              };
                            });

                            setGroundingClicks((prev) => prev + 1);
                            setGroundingText(""); // 👇 Clear text via React state
                          }
                        }}
                        disabled={i > groundingClicks}
                        className={`w-14 h-14 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center ${
                          i < groundingClicks
                            ? curr.color
                                .replace("text-", "bg-")
                                .replace("50", "600") +
                              " text-white border-transparent shadow-lg"
                            : i === groundingClicks
                            ? "border-indigo-400 border-dashed bg-indigo-50/50 animate-pulse cursor-pointer"
                            : "border-slate-200 border-dashed text-slate-200 cursor-not-allowed"
                        }`}
                      >
                        <i
                          className={`fa-solid ${curr.icon} ${
                            i < groundingClicks ? "opacity-100" : "opacity-20"
                          }`}
                        ></i>
                      </button>
                    ))}
                  </div>
                  <div className="relative group">
                  <input 
                      type="text" 
                      value={groundingText} // 👈 Bound directly to React state
                      onChange={(e) => setGroundingText(e.target.value)}
                      className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const senseKey = `grounding_${curr.sense.toLowerCase()}`;
                          
                          setStepInputs((prev) => {
                            const currentList = prev[senseKey] || [];
                            return {
                              ...prev,
                              [senseKey]: [...currentList, groundingText.trim() || "(Skipped)"],
                            };
                          });
                          
                          setGroundingClicks(prev => Math.min(curr.count, prev + 1));
                          setGroundingText(""); // 👈 Clear text via React state
                        }
                      }} />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">Press Enter</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    if (groundingStep > 0) {
                      setGroundingStep((prev) => prev - 1);
                      setGroundingClicks(0);
                    } else prevStep();
                  }}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (groundingStep < groundingSteps.length - 1) {
                      setGroundingStep((prev) => prev + 1);
                      setGroundingClicks(0);
                    } else nextStep();
                  }}
                  disabled={groundingClicks < curr.count}
                  className={`flex-1 py-5 rounded-3xl font-black text-lg shadow-xl transition-all ${
                    groundingClicks < curr.count
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {groundingStep < groundingSteps.length - 1
                    ? "Next Sense"
                    : "Complete Grounding"}
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 5: Action Log ─────────────────────────────────────────────
        if (sessionNum === 5 && stepId === "action-log") {
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-6xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Values Action Log
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  {currentStep.content}
                </p>
              </div>
              <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Date
                      </th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Value
                      </th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Action Taken
                      </th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Size
                      </th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Rating
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map((i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="p-6">
                          <input
                            type="text"
                            placeholder="Date"
                            value={stepInputs[`action_log_${i}_date`] || ""}
                            onChange={(e) => setStepInputs({ ...stepInputs, [`action_log_${i}_date`]: e.target.value })}
                            className="bg-transparent outline-none text-sm font-medium w-full"
                          />
                        </td>
                        <td className="p-6">
                          <input
                            type="text"
                            placeholder="Value"
                            value={stepInputs[`action_log_${i}_value`] || ""}
                            onChange={(e) => setStepInputs({ ...stepInputs, [`action_log_${i}_value`]: e.target.value })}
                            className="bg-transparent outline-none text-sm font-medium w-full"
                          />
                        </td>
                        <td className="p-6">
                          <input
                            type="text"
                            placeholder="What did you do?"
                            value={stepInputs[`action_log_${i}_action`] || ""}
                            onChange={(e) => setStepInputs({ ...stepInputs, [`action_log_${i}_action`]: e.target.value })}
                            className="bg-transparent outline-none text-sm font-medium w-full"
                          />
                        </td>
                        <td className="p-6">
                          <select 
                            value={stepInputs[`action_log_${i}_size`] || ""}
                            onChange={(e) => setStepInputs({ ...stepInputs, [`action_log_${i}_size`]: e.target.value })}
                            className="bg-transparent outline-none text-sm font-medium"
                          >
                            <option value="">- Select -</option>
                            <option value="Small">Small</option>
                            <option value="Medium">Medium</option>
                            <option value="Big">Big</option>
                          </select>
                        </td>
                        <td className="p-6">
                          <select 
                            value={stepInputs[`action_log_${i}_rating`] || ""}
                            onChange={(e) => setStepInputs({ ...stepInputs, [`action_log_${i}_rating`]: e.target.value })}
                            className="bg-transparent outline-none text-sm font-medium"
                          >
                            <option value="">- Rate -</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n.toString()}>{n}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}
                >
                  Finish Session
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 7: Value Selection ────────────────────────────────────────
        if (sessionNum === 7 && stepId === "value-selection-s7") {
          const selectedValues = VALUES_LIST.filter(
            (v) => s5Ratings[v.id] === "V"
          );
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Focus Value
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  {currentStep.content}
                </p>
              </div>
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-6">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Select your value for today:
                </label>
                <select
                  value={s7SelectedValue}
                  onChange={(e) => setS7SelectedValue(e.target.value)}
                  className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                >
                  <option value="">-- Choose a Value --</option>
                  {(selectedValues.length > 0
                    ? selectedValues
                    : VALUES_LIST
                  ).map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={!s7SelectedValue}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl disabled:opacity-50`}
                >
                  Build SMART Goal
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 7: SMART Goal Builder ─────────────────────────────────────
        if (sessionNum === 7 && stepId === "smart-goal-builder") {
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  SMART Goal Builder
                </h3>
                <div
                  className={`mt-2 inline-flex items-center gap-2 px-4 py-2 ${themeClasses.secondary} ${themeClasses.text} rounded-full text-xs font-black uppercase tracking-widest`}
                >
                  <i className="fa-solid fa-star"></i> Value: {s7SelectedValue}
                </div>
              </div>
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[
                    {
                      key: "specific",
                      letter: "S",
                      label: "Specific",
                      placeholder: "What exactly will you do?",
                    },
                    {
                      key: "measurable",
                      letter: "M",
                      label: "Measurable",
                      placeholder: "How will you track it?",
                    },
                    {
                      key: "relevant",
                      letter: "R",
                      label: "Relevant",
                      placeholder: "How does this connect to your value?",
                    },
                    {
                      key: "timebound",
                      letter: "T",
                      label: "Time-bound",
                      placeholder: "When will you do it?",
                    },
                  ].map(({ key, letter, label, placeholder }) => (
                    <div key={key} className="space-y-3">
                      <label className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <span
                          className={`w-6 h-6 ${themeClasses.primary} text-white rounded-full flex items-center justify-center text-[10px]`}
                        >
                          {letter}
                        </span>
                        {label}
                      </label>
                      <input
                        type="text"
                        value={(s7SmartGoal as any)[key] || ""}
                        onChange={(e) =>
                          setS7SmartGoal({
                            ...s7SmartGoal,
                            [key]: e.target.value,
                          })
                        }
                        placeholder={placeholder}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  ))}
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                      <span
                        className={`w-6 h-6 ${themeClasses.primary} text-white rounded-full flex items-center justify-center text-[10px]`}
                      >
                        A
                      </span>
                      Achievable
                    </label>
                    <button
                      onClick={() =>
                        setS7SmartGoal({
                          ...s7SmartGoal,
                          achievable: !s7SmartGoal.achievable,
                        })
                      }
                      className={`w-full p-4 rounded-xl border-2 font-bold transition-all flex items-center justify-between ${
                        s7SmartGoal.achievable
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                          : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}
                    >
                      Is this small enough to do?
                      <i
                        className={`fa-solid ${
                          s7SmartGoal.achievable
                            ? "fa-circle-check"
                            : "fa-circle"
                        }`}
                      ></i>
                    </button>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Pro-Tip for PTSD:
                  </p>
                  <p className="text-sm text-slate-600 italic">
                    "Keep it tiny. Instead of 'I will go to the gym', try 'I
                    will put on my sneakers and walk for 5 minutes at 10 AM'."
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}
                >
                  Anticipate Barriers
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 7: Barriers ───────────────────────────────────────────────
        if (sessionNum === 7 && stepId === "barriers-s7") {
          const commonTriggers = [
            "Loud noises",
            "Crowded spaces",
            "Feeling trapped",
            "Nightmares",
            "Flashbacks",
            "Self-criticism",
          ];
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Anticipate Barriers
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  {currentStep.content}
                </p>
              </div>
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {commonTriggers.map((t) => (
                    <button
                      key={t}
                      onClick={() =>
                        setS7Barriers((prev) =>
                          prev.includes(t)
                            ? prev.filter((i) => i !== t)
                            : [...prev, t]
                        )
                      }
                      className={`p-4 rounded-2xl border-2 font-bold text-xs transition-all ${
                        s7Barriers.includes(t)
                          ? "bg-rose-50 border-rose-500 text-rose-700 shadow-sm"
                          : "bg-white border-slate-100 text-slate-400 hover:border-rose-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {s7Barriers.length > 0 && (
                  <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100 space-y-4">
                    <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest">
                      Suggested ACT Skills:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { icon: "fa-anchor", label: "Grounding" },
                        { icon: "fa-scissors", label: "Defusion" },
                        { icon: "fa-heart", label: "Acceptance" },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="p-4 bg-white rounded-xl text-center shadow-sm"
                        >
                          <i
                            className={`fa-solid ${s.icon} text-emerald-500 mb-2 block`}
                          ></i>
                          <span className="text-xs font-bold text-slate-700">
                            {s.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}
                >
                  The Choice Point
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 7: Choice Point ───────────────────────────────────────────
        if (sessionNum === 7 && stepId === "choice-point-s7") {
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-6xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  The Choice Point
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  {currentStep.content}
                </p>
              </div>
              <div className="relative bg-white rounded-[4rem] p-12 border border-slate-200 shadow-2xl overflow-hidden min-h-[600px]">
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <svg
                    className="w-full h-full absolute top-0 left-0 pointer-events-none"
                    viewBox="0 0 800 600"
                  >
                    <path
                      d="M400 600 L400 350 L150 100"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="8"
                      strokeDasharray="12 12"
                    />
                    <path
                      d="M400 350 L650 100"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="8"
                      strokeDasharray="12 12"
                    />
                    <circle
                      cx="400"
                      cy="350"
                      r="40"
                      fill="white"
                      stroke="#6366f1"
                      strokeWidth="4"
                    />
                  </svg>
                  <div className="relative z-10 w-full h-full flex flex-col justify-between p-8">
                    <div className="flex justify-between items-start">
                      <div className="w-64 p-6 bg-rose-50 rounded-3xl border-2 border-rose-200 shadow-lg transform -rotate-3">
                        <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest mb-3">
                          "AWAY" MOVES
                        </h4>
                        <p className="text-[10px] text-rose-400 mb-4 leading-tight">
                          Moving away from the outcome you want. Behaving unlike
                          the person you want to be.
                        </p>
                        <div className="p-2 bg-white rounded-lg text-[10px] font-bold text-slate-400 border border-rose-100">
                          Avoidance, Suppression...
                        </div>
                      </div>
                      <div className="w-64 p-6 bg-emerald-50 rounded-3xl border-2 border-emerald-200 shadow-lg transform rotate-3">
                        <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3">
                          "TOWARDS" MOVES
                        </h4>
                        <p className="text-[10px] text-emerald-400 mb-4 leading-tight">
                          Moving towards the outcome you want. Behaving like the
                          person you want to be.
                        </p>
                        <div className="p-2 bg-white rounded-lg text-[10px] font-bold text-slate-600 border border-emerald-100 italic">
                          "{s7SmartGoal.specific || "Your SMART Goal"}"
                        </div>
                        <div className="p-2 bg-white rounded-lg text-[10px] font-bold text-slate-600 border border-emerald-100 italic mt-2">
                          "{s7SelectedValue || "Your Value"}"
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-4">
                      <div className="px-8 py-4 bg-indigo-600 text-white rounded-full font-black text-sm shadow-xl z-20">
                        CHOICE POINT
                      </div>
                      <div className="w-64 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Challenging Situation
                        </p>
                        <p className="text-xs font-bold text-slate-700 italic">
                          "When {s7Barriers[0] || "a trigger"} shows up..."
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}
                >
                  Continue to Closing
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 8: Choose Values ──────────────────────────────────────────
        if (sessionNum === 8 && stepId === "choose-values-s8") {
          const selectedValues = VALUES_LIST.filter(
            (v) => s5Ratings[v.id] === "V"
          );
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Choose Your Values
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  {currentStep.content}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(selectedValues.length > 0
                  ? selectedValues
                  : VALUES_LIST.slice(0, 6)
                ).map((v) => (
                  <button
                    key={v.id}
                    onClick={() =>
                      setS8SelectedValues((prev) =>
                        prev.includes(v.name)
                          ? prev.filter((i) => i !== v.name)
                          : [...prev, v.name]
                      )
                    }
                    className={`p-6 rounded-3xl border-2 transition-all text-left flex items-center gap-4 ${
                      s8SelectedValues.includes(v.name)
                        ? `${themeClasses.primary} border-transparent text-white shadow-xl`
                        : "bg-white border-slate-100 text-slate-400 hover:border-indigo-200"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        s8SelectedValues.includes(v.name)
                          ? "bg-white/20"
                          : "bg-slate-50"
                      }`}
                    >
                      <i
                        className={`fa-solid ${
                          s8SelectedValues.includes(v.name)
                            ? "fa-check"
                            : "fa-star"
                        }`}
                      ></i>
                    </div>
                    <span className="font-bold">{v.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={s8SelectedValues.length === 0}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl disabled:opacity-50`}
                >
                  Continue to Situation
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 8: Prepare ACT Skills ─────────────────────────────────────
        if (sessionNum === 8 && stepId === "prepare-act-skills") {
          const skills = [
            {
              id: "grounding",
              title: "Grounding",
              icon: "fa-anchor",
              desc: "Feel your feet on the floor and notice your surroundings.",
            },
            {
              id: "defusion",
              title: "Defusion",
              icon: "fa-scissors",
              desc: 'Say: "I notice I am having the thought that..."',
            },
            {
              id: "acceptance",
              title: "Acceptance",
              icon: "fa-heart",
              desc: 'Say: "I allow this anxiety to be here. It is just a feeling."',
            },
          ];
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Prepare Your Toolkit
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  {currentStep.content}
                </p>
              </div>
              <div className="space-y-6">
                {skills.map((s) => (
                  <div
                    key={s.id}
                    className="p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-lg flex items-start gap-6 group hover:border-indigo-200 transition-colors"
                  >
                    <div
                      className={`w-16 h-16 ${themeClasses.secondary} ${themeClasses.text} rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}
                    >
                      <i className={`fa-solid ${s.icon}`}></i>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-black text-slate-800 mb-2">
                        {s.title}
                      </h4>
                      <p className="text-slate-500 font-medium leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}
                >
                  Ready for Exposure
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 9: Two Mountains ──────────────────────────────────────────
        if (sessionNum === 9 && stepId === "two-mountains-s9") {
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Two Mountains Visualization
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  {currentStep.content}
                </p>
              </div>
              <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-2xl relative overflow-hidden">
                <div className="flex justify-around items-end h-64 mb-8 relative">
                  <div className="flex flex-col items-center group">
                    <div className="w-48 h-48 bg-slate-200 rounded-t-full relative flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-300 to-transparent"></div>
                      <i className="fa-solid fa-cloud-bolt text-slate-400 text-4xl relative z-10"></i>
                    </div>
                    <span className="mt-4 font-black text-slate-400 uppercase tracking-widest text-xs">
                      Mountain of Pain
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full h-1 bg-slate-100">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-indigo-600 rounded-full -mt-1.5 shadow-lg shadow-indigo-200 animate-pulse"></div>
                  </div>
                  <div className="flex flex-col items-center group">
                    <div className="w-48 h-48 bg-emerald-100 rounded-t-full relative flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-emerald-200 to-transparent"></div>
                      <i className="fa-solid fa-sun text-emerald-500 text-4xl relative z-10"></i>
                    </div>
                    <span className="mt-4 font-black text-emerald-600 uppercase tracking-widest text-xs">
                      Mountain of Values
                    </span>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto pr-4 space-y-6 text-slate-600 font-medium leading-relaxed custom-scrollbar">
                  <p className="italic text-indigo-600 font-bold">
                    Introduction:
                  </p>
                  <p>
                    "Let's take a moment to settle in. Find a comfortable
                    position... Gently close your eyes if that feels safe...
                    Take a few slow breaths… in… and out…"
                  </p>
                  <p className="italic text-indigo-600 font-bold">
                    Step 1: Visualize the Mountains:
                  </p>
                  <p>
                    "Imagine two mountains in front of you. The first represents
                    difficult thoughts, feelings, or memories. The second
                    represents your strengths, values, and what matters most."
                  </p>
                  <p className="italic text-indigo-600 font-bold">
                    Step 2: Observing Your Position:
                  </p>
                  <p>
                    "Notice that you are standing between the two mountains. You
                    can see both clearly. Just observe."
                  </p>
                  <p className="italic text-indigo-600 font-bold">
                    Step 3: Noticing and Naming:
                  </p>
                  <p>
                    "Gently acknowledge what you notice. You might say silently:
                    'This is fear, this is sadness' for the first mountain, and
                    'This is my courage, this is what matters' for the second."
                  </p>
                  <p className="italic text-indigo-600 font-bold">
                    Step 4: Moving Toward Values:
                  </p>
                  <p>
                    "Notice the path between the mountains. You can choose to
                    take small steps toward the second mountain, your values and
                    strengths, even if the first mountain still feels present."
                  </p>
                  <p className="italic text-indigo-600 font-bold">
                    Step 5: Closing:
                  </p>
                  <p>
                    "Remember: The first mountain may always be there, but you
                    can choose your path and take steps toward your values."
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}
                >
                  Continue to Letter
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 9: Compassion Letter ──────────────────────────────────────
        if (sessionNum === 9 && stepId === "compassion-letter-s9") {
          const selectedValues = VALUES_LIST.filter(
            (v) => s5Ratings[v.id] === "V"
          );
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Self-Compassion Letter
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  {currentStep.content?.substring(0, 100)}...
                </p>
              </div>
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-8">
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Mark today's focus value:
                  </label>
                  <select
                    value={s9SelectedValue}
                    onChange={(e) => setS9SelectedValue(e.target.value)}
                    className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                  >
                    <option value="">-- Choose a Value --</option>
                    {(selectedValues.length > 0
                      ? selectedValues
                      : VALUES_LIST
                    ).map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Your Letter:
                  </label>
                  <textarea
                    value={s9Letter}
                    onChange={(e) => setS9Letter(e.target.value)}
                    placeholder="Acknowledge your courage, validate your experience, and encourage your next value-based step..."
                    className="w-full h-64 p-8 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 leading-relaxed resize-none"
                  />
                </div>
                <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <p className="text-sm text-indigo-700 font-medium italic">
                    <i className="fa-solid fa-lightbulb mr-2"></i>
                    Tip: What would you say to a dear friend who had been
                    through this?
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={!s9Letter || !s9SelectedValue}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl disabled:opacity-50`}
                >
                  Complete Session
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 11: Struggle Switch ───────────────────────────────────────
        if (sessionNum === 11 && stepId === "struggle-switch-s11") {
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  The Struggle Switch
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  Exploring the difference between fighting pain and allowing
                  it.
                </p>
              </div>
              <div className="bg-white rounded-[3rem] p-12 border border-slate-200 shadow-2xl flex flex-col items-center gap-12">
                <div className="text-center max-w-2xl space-y-6 text-slate-600 font-medium leading-relaxed">
                  <p>
                    "Imagine there is a switch inside you. When painful thoughts
                    or memories show up, the switch turns ON. When it is ON, you
                    fight the feelings. You argue with them. You try to push
                    them away."
                  </p>
                  <p className="text-sm italic text-slate-400">
                    "Notice what happens when you struggle with these feelings.
                    Does the guilt grow stronger? Does the shame become
                    heavier?"
                  </p>
                </div>
                <div
                  className="relative group cursor-pointer"
                  onClick={() => setS11StruggleSwitch(!s11StruggleSwitch)}
                >
                  <div
                    className={`w-24 h-48 rounded-full border-4 transition-all duration-500 flex flex-col items-center justify-between py-4 ${
                      s11StruggleSwitch
                        ? "bg-rose-50 border-rose-200 shadow-lg shadow-rose-100"
                        : "bg-emerald-50 border-emerald-200 shadow-lg shadow-emerald-100"
                    }`}
                  >
                    <div
                      className={`w-16 h-16 rounded-full transition-all duration-500 flex items-center justify-center text-2xl ${
                        s11StruggleSwitch
                          ? "bg-rose-500 text-white translate-y-0"
                          : "bg-slate-200 text-slate-400 translate-y-24"
                      }`}
                    >
                      <i
                        className={`fa-solid ${
                          s11StruggleSwitch ? "fa-bolt" : "fa-power-off"
                        }`}
                      ></i>
                    </div>
                    <div
                      className={`w-16 h-16 rounded-full transition-all duration-500 flex items-center justify-center text-2xl ${
                        !s11StruggleSwitch
                          ? "bg-emerald-500 text-white -translate-y-0"
                          : "bg-slate-200 text-slate-400 -translate-y-24"
                      }`}
                    >
                      <i
                        className={`fa-solid ${
                          !s11StruggleSwitch ? "fa-leaf" : "fa-power-off"
                        }`}
                      ></i>
                    </div>
                  </div>
                  <div className="absolute -right-32 top-1/2 -translate-y-1/2 space-y-2">
                    <span
                      className={`block text-xs font-black uppercase tracking-widest transition-colors ${
                        s11StruggleSwitch ? "text-rose-600" : "text-slate-300"
                      }`}
                    >
                      Struggle ON
                    </span>
                    <span
                      className={`block text-xs font-black uppercase tracking-widest transition-colors ${
                        !s11StruggleSwitch
                          ? "text-emerald-600"
                          : "text-slate-300"
                      }`}
                    >
                      Struggle OFF
                    </span>
                  </div>
                </div>
                <div className="text-center max-w-2xl space-y-6 text-slate-600 font-medium leading-relaxed">
                  {!s11StruggleSwitch ? (
                    <p className="animate-in fade-in slide-in-from-bottom-2">
                      "Turning it off does not mean you approve of what
                      happened. It simply means you stop fighting the feeling.
                      Let the guilt or shame be there, just as a feeling in the
                      body. Breathe into that space."
                    </p>
                  ) : (
                    <p className="text-rose-500 font-bold">
                      "The struggle switch does not remove pain. It often adds a
                      second layer of suffering — self-attack, avoidance, or
                      isolation."
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}
                >
                  Continue to Defusion
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 11: Cognitive Defusion ────────────────────────────────────
        if (sessionNum === 11 && stepId === "cognitive-defusion-s11") {
          const addThought = () => {
            if (s11CurrentThought.trim()) {
              setS11DefusionThoughts([
                ...s11DefusionThoughts,
                s11CurrentThought.trim(),
              ]);
              setS11CurrentThought("");
            }
          };
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Cognitive Defusion
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  Creating space from harsh self-judgments.
                </p>
              </div>
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-8">
                <div className="space-y-4">
                  <p className="text-slate-600 font-medium leading-relaxed">
                    "Notice the thought: 'I am a terrible person.' Instead of
                    saying it as a fact, say: 'I am noticing the thought that I
                    am a terrible person.' Notice how that creates a little
                    space."
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={s11CurrentThought}
                      onChange={(e) => setS11CurrentThought(e.target.value)}
                      placeholder="Enter a harsh thought (e.g., 'I failed')..."
                      className="flex-1 p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                      onKeyPress={(e) => e.key === "Enter" && addThought()}
                    />
                    <button
                      onClick={addThought}
                      disabled={!s11CurrentThought.trim()}
                      className={`px-8 ${themeClasses.primary} text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg disabled:opacity-50`}
                    >
                      Defuse
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Your Defused Thoughts:
                  </label>
                  <div className="space-y-3">
                    {s11DefusionThoughts.map((t, i) => (
                      <div
                        key={i}
                        className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl animate-in zoom-in-95"
                      >
                        <p className="text-indigo-900 font-bold italic">
                          "I am noticing the thought that {t}"
                        </p>
                      </div>
                    ))}
                    {s11DefusionThoughts.length === 0 && (
                      <div className="p-10 border-2 border-dashed border-slate-100 rounded-3xl text-center text-slate-300 font-medium italic">
                        Type a thought above to practice defusion...
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}
                >
                  Continue to Values
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 12: Identify Triggers ─────────────────────────────────────
        if (sessionNum === 12 && stepId === "identify-triggers-s12") {
          const commonTriggers = [
            "Crowded places",
            "Loud noises",
            "Anniversaries of the event",
            "Conflict with others",
            "Feeling trapped",
            "Specific smells or sounds",
            "News reports",
            "Physical pain",
            "Stress at work/home",
          ];
          const toggleTrigger = (t: string) =>
            setS12SelectedTriggers((prev) =>
              prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
            );
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Identify Your Triggers
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  Recognizing what sets off your distress is the first step in
                  managing it.
                </p>
              </div>
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {commonTriggers.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleTrigger(t)}
                      className={`p-5 rounded-2xl text-left font-bold transition-all border-2 ${
                        s12SelectedTriggers.includes(t)
                          ? `${themeClasses.primary} border-transparent text-white shadow-lg`
                          : "bg-slate-50 border-transparent text-slate-600 hover:border-indigo-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Add Custom Trigger:
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={s12CustomTrigger}
                      onChange={(e) => setS12CustomTrigger(e.target.value)}
                      placeholder="Type another trigger..."
                      className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                    <button
                      onClick={() => {
                        if (s12CustomTrigger.trim()) {
                          setS12SelectedTriggers([
                            ...s12SelectedTriggers,
                            s12CustomTrigger.trim(),
                          ]);
                          setS12CustomTrigger("");
                        }
                      }}
                      className="px-6 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px]"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={s12SelectedTriggers.length === 0}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl disabled:opacity-50`}
                >
                  Continue to Warning Signs
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 12: Warning Signs ─────────────────────────────────────────
        if (sessionNum === 12 && stepId === "warning-signs-s12") {
          const warningSigns = [
            "Repeated unwanted memories or nightmares",
            "Flashbacks or strong reactions to reminders",
            "Avoiding places, people, or thoughts related to the event",
            "Feeling numb, detached, guilty, or ashamed",
            "Irritability, anger, or being easily startled",
            "Trouble sleeping or concentrating",
            "Feeling constantly on guard or unsafe",
          ];
          const toggleSign = (s: string) =>
            setS12SelectedWarningSigns((prev) =>
              prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
            );
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Early Warning Signs
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  Notice when symptoms start to return.
                </p>
              </div>
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-6">
                {warningSigns.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleSign(s)}
                    className={`w-full p-6 rounded-2xl text-left font-bold transition-all border-2 flex items-center gap-4 ${
                      s12SelectedWarningSigns.includes(s)
                        ? `${themeClasses.secondary} ${themeClasses.border} ${themeClasses.text} shadow-sm`
                        : "bg-slate-50 border-transparent text-slate-600 hover:border-indigo-100"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        s12SelectedWarningSigns.includes(s)
                          ? `${themeClasses.primary} text-white`
                          : "bg-slate-200 text-transparent"
                      }`}
                    >
                      <i className="fa-solid fa-check text-[10px]"></i>
                    </div>
                    {s}
                  </button>
                ))}
                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 text-xs font-medium leading-relaxed">
                  <i className="fa-solid fa-circle-info mr-2"></i>
                  Note: If these symptoms continue for more than a month and
                  affect daily life, professional support may be needed.
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={s12SelectedWarningSigns.length === 0}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl disabled:opacity-50`}
                >
                  Continue to Skills Review
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 12: ACT Skills Review ─────────────────────────────────────
        if (sessionNum === 12 && stepId === "act-skills-review-s12") {
          const skills = [
            {
              id: "grounding",
              name: "Grounding",
              icon: "fa-shoe-prints",
              desc: "Connecting to the present through your senses.",
            },
            {
              id: "defusion",
              name: "Defusion",
              icon: "fa-cloud",
              desc: "Creating space from difficult thoughts.",
            },
            {
              id: "acceptance",
              name: "Acceptance",
              icon: "fa-heart",
              desc: "Allowing feelings to be as they are.",
            },
            {
              id: "action",
              name: "Committed Action",
              icon: "fa-person-walking",
              desc: "Taking steps toward your values.",
            },
            {
              id: "crisis",
              name: "Crisis Button",
              icon: "fa-circle-exclamation",
              desc: "Immediate emergency grounding tools.",
            },
          ];
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  ACT Skills Toolkit
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  Review your toolkit and match skills to your triggers.
                </p>
              </div>
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {skills.map((s) => (
                    <div
                      key={s.id}
                      className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4"
                    >
                      <div
                        className={`w-12 h-12 ${themeClasses.secondary} ${themeClasses.text} rounded-2xl flex items-center justify-center text-xl shrink-0`}
                      >
                        <i className={`fa-solid ${s.icon}`}></i>
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">
                          {s.name}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Match Skills to Triggers:
                  </h4>
                  {s12SelectedTriggers.map((trigger) => (
                    <div
                      key={trigger}
                      className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100"
                    >
                      <span className="font-bold text-slate-700 flex-1">
                        {trigger}
                      </span>
                      <select
                        value={s12SkillMapping[trigger] || ""}
                        onChange={(e) =>
                          setS12SkillMapping({
                            ...s12SkillMapping,
                            [trigger]: e.target.value,
                          })
                        }
                        className="p-3 bg-white border border-indigo-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Select Skill --</option>
                        {skills.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}
                >
                  Continue to Visualization
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 12: Passengers on the Bus ────────────────────────────────
        if (sessionNum === 12 && stepId === "passengers-on-bus-s12") {
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Passengers on the Bus
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  "Notice passengers, keep driving toward your values."
                </p>
              </div>
              <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-2xl relative overflow-hidden">
                <div className="h-48 bg-slate-50 rounded-3xl mb-10 relative flex items-center justify-center overflow-hidden">
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div
                      className={`w-40 h-20 ${themeClasses.primary} rounded-2xl relative shadow-2xl flex items-center justify-center group`}
                    >
                      <div className="absolute -bottom-2 left-4 w-8 h-8 bg-slate-800 rounded-full border-4 border-white"></div>
                      <div className="absolute -bottom-2 right-4 w-8 h-8 bg-slate-800 rounded-full border-4 border-white"></div>
                      <div className="flex gap-1">
                        <div className="w-6 h-6 bg-white/30 rounded-md"></div>
                        <div className="w-6 h-6 bg-white/30 rounded-md"></div>
                        <div className="w-6 h-6 bg-white/30 rounded-md"></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div
                        className="w-8 h-8 bg-rose-400 rounded-full flex items-center justify-center text-white text-xs animate-bounce"
                        style={{ animationDelay: "0s" }}
                      >
                        <i className="fa-solid fa-ghost"></i>
                      </div>
                      <div
                        className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-white text-xs animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      >
                        <i className="fa-solid fa-bolt"></i>
                      </div>
                      <div
                        className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center text-white text-xs animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      >
                        <i className="fa-solid fa-cloud"></i>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto pr-6 space-y-6 text-slate-600 font-medium leading-relaxed custom-scrollbar">
                  <p>
                    "Sit comfortably and take a slow breath in… and out. Imagine
                    you are the driver of a bus. This bus represents your life.
                    The road ahead represents your values — the direction you
                    want your life to move in."
                  </p>
                  <p>
                    "Now imagine there are passengers on your bus. These
                    passengers are your thoughts, feelings, memories, and urges.
                    Some are pleasant and quiet. But some are loud, critical,
                    and frightening."
                  </p>
                  <p>
                    "One passenger might shout, 'You're not good enough.'
                    Another might say, 'Stop. It's too risky.' Another might
                    bring painful memories. Notice that these passengers can be
                    noisy and uncomfortable."
                  </p>
                  <p>
                    "In the past, you may have tried to argue with them. Or you
                    may have stopped the bus to make them quiet. But the more
                    you fight them, the louder they seem to get."
                  </p>
                  <p className={`font-bold ${themeClasses.text}`}>
                    "Now imagine something different."
                  </p>
                  <p>
                    "Instead of arguing, you simply acknowledge them. You say,
                    'I hear you.' You allow them to sit in the back of the bus.
                    They can talk. They can complain. But they cannot drive."
                  </p>
                  <p className="font-black text-slate-800">
                    "You are the driver."
                  </p>
                  <p>
                    "Your hands are on the steering wheel. Your feet are on the
                    pedals. You choose the direction. Even if fear is shouting.
                    Even if shame is criticizing. Even if guilt is present. You
                    can keep driving toward what matters to you."
                  </p>
                  <p>
                    "Take a slow breath. You are not your thoughts. You are the
                    driver of your life. When you are ready, gently bring your
                    attention back to the room."
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}
                >
                  Continue to Plan Builder
                </button>
              </div>
            </div>
          );
        }

        // ── SESSION 12: Relapse Prevention Plan ──────────────────────────────
        if (sessionNum === 12 && stepId === "relapse-prevention-plan-s12") {
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  Resilience Plan Builder
                </h3>
                <p className="text-slate-500 mt-2 font-medium italic">
                  Creating your personalized survival kit for the future.
                </p>
              </div>
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      1. Triggers & Warning Signs
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {[...s12SelectedTriggers, ...s12SelectedWarningSigns].map(
                        (item, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold"
                          >
                            {item}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      2. Selected ACT Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(s12SkillMapping)
                        .filter(Boolean)
                        .map((skill, i) => (
                          <span
                            key={i}
                            className={`px-3 py-1.5 ${themeClasses.secondary} ${themeClasses.text} rounded-lg text-[10px] font-bold`}
                          >
                            {skill}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-6 pt-6 border-t border-slate-100">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      3. Small Value-Based Steps:
                    </label>
                    <textarea
                      value={s12ValueSteps}
                      onChange={(e) => setS12ValueSteps(e.target.value)}
                      placeholder="What small steps will you take when things get tough? (e.g., 'I will go for a walk', 'I will call a friend')..."
                      className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      4. Support Resources (Optional):
                    </label>
                    <textarea
                      value={s12Resources}
                      onChange={(e) => setS12Resources(e.target.value)}
                      placeholder="Crisis hotlines, therapist contact, supportive friends..."
                      className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={!s12ValueSteps}
                  className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl disabled:opacity-50`}
                >
                  Complete Final Session
                </button>
              </div>
            </div>
          );
        }

        // ── Immersive Image Fallback for other known exercises ────────────────
        const isSpecialExercise =
          (sessionNum === 1 && stepId === "exercise-1") ||
          (sessionNum === 2 && stepId === "exercise-2") ||
          (sessionNum === 3 && (stepId === "struggle-switch" || stepId === "visual-defusion")) ||
          (sessionNum === 4 && (stepId === "metaphor-choice" || stepId === "chessboard-exercise" || stepId === "auditory-defusion")) ||
          (sessionNum === 6 && stepId === "exercise-6") ||
          (sessionNum === 9 && stepId === "two-mountains-s9") ||
          (sessionNum === 10 && (stepId === "grief-forgiveness-meditation" || stepId === "self-acceptance" || stepId === "forgiving-yourself")) ||
          (sessionNum === 11 && (stepId === "moral-injury-intro" || stepId === "struggle-switch-s11" || stepId === "cognitive-defusion-s11")) ||
          (sessionNum === 12 && stepId === "passengers-on-bus-s12");

        if (isSpecialExercise) {
          let icon = "fa-leaf";
          let colorClass = "bg-emerald-50 text-emerald-600";
          let bgUrl = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80";
          let subtitle = "A core ACT exercise for psychological flexibility.";

          if (stepId === "exercise-1") {
            icon = "fa-anchor";
            colorClass = "bg-blue-50 text-blue-600";
            bgUrl = "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80";
            subtitle = "A grounding exercise to stabilize yourself in the present.";
          } else if (stepId === "exercise-2") {
            icon = "fa-leaf";
            colorClass = "bg-emerald-50 text-emerald-600";
            bgUrl = "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80";
            subtitle = "Observing thoughts without getting hooked by them.";
          } else if (stepId === "struggle-switch" || stepId === "struggle-switch-s11") {
            icon = "fa-toggle-on";
            colorClass = "bg-amber-50 text-amber-600";
            bgUrl = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80";
            subtitle = "Learning to drop the struggle with difficult emotions.";
          } else if (stepId === "visual-defusion") {
            icon = "fa-eye";
            colorClass = "bg-purple-50 text-purple-600";
            bgUrl = "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80";
            subtitle = "Visualizing thoughts in different ways to reduce their power.";
          } else if (stepId === "auditory-defusion") {
            icon = "fa-volume-high";
            colorClass = "bg-pink-50 text-pink-600";
            bgUrl = "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80";
            subtitle = "Changing how thoughts sound to unhook from them.";
          } else if (stepId === "metaphor-choice") {
            icon = "fa-cloud-sun";
            colorClass = "bg-sky-50 text-sky-600";
            bgUrl = "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1200&q=80";
            subtitle = "Observing thoughts like weather in the sky.";
          } else if (stepId === "chessboard-exercise") {
            icon = "fa-chess-board";
            colorClass = "bg-slate-50 text-slate-600";
            bgUrl = "https://images.unsplash.com/photo-1529697210530-8c4bb1358ce7?auto=format&fit=crop&w=1200&q=80";
            subtitle = "Taking the perspective of the observer.";
          } else if (stepId === "exercise-6") {
            icon = "fa-compass";
            colorClass = "bg-indigo-50 text-indigo-600";
            bgUrl = "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=1200&q=80";
            subtitle = "Distinguishing between the direction (values) and the destination (goals).";
          } else if (stepId === "two-mountains-s9") {
            icon = "fa-mountain-sun";
            colorClass = "bg-slate-50 text-slate-600";
            bgUrl = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80";
            subtitle = "Visualizing the balance between pain and values.";
          } else if (stepId === "grief-forgiveness-meditation") {
            const hasAbuseHistory = (user as any)?.traumaHistory?.abuseEmotional || (user as any)?.traumaHistory?.abusePhysical || (user as any)?.traumaHistory?.abuseSexual;
            icon = "fa-heart-pulse";
            colorClass = "bg-rose-50 text-rose-600";
            bgUrl = "https://images.unsplash.com/photo-1516589174184-c685266e430c?auto=format&fit=crop&w=1200&q=80";
            subtitle = hasAbuseHistory ? "A specialized exercise for healing from past harm." : "A guided exploration of grief and the choice to forgive.";
          } else if (stepId === "self-acceptance") {
            icon = "fa-shield-heart";
            colorClass = "bg-emerald-50 text-emerald-600";
            bgUrl = "https://images.unsplash.com/photo-1499209974431-9dac3adaf471?auto=format&fit=crop&w=1200&q=80";
            subtitle = "A specialized exercise for self-compassion and healing.";
          } else if (stepId === "forgiving-yourself") {
            icon = "fa-hand-holding-heart";
            colorClass = "bg-indigo-50 text-indigo-600";
            bgUrl = "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80";
            subtitle = "Choosing growth over self-punishment.";
          } else if (stepId === "moral-injury-intro") {
            icon = "fa-dove";
            colorClass = "bg-slate-50 text-slate-600";
            bgUrl = "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=1200&q=80";
            subtitle = "Addressing wounds to the soul with integrity.";
          } else if (stepId === "cognitive-defusion-s11") {
            icon = "fa-brain";
            colorClass = "bg-violet-50 text-violet-600";
            bgUrl = "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1200&q=80";
            subtitle = "Creating space from harsh self-judgments.";
          } else if (stepId === "passengers-on-bus-s12") {
            icon = "fa-bus";
            colorClass = "bg-amber-50 text-amber-600";
            bgUrl = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80";
            subtitle = "Being the driver of your life, regardless of the passengers.";
          }

          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{currentStep.title}</h3>
                <p className="text-slate-500 mt-2 font-medium italic">{subtitle}</p>
              </div>

              <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <img
                    src={bgUrl}
                    alt="Metaphor Background"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="relative z-10 flex flex-col items-center gap-8">
                  <div className={`w-32 h-32 ${colorClass} rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner animate-pulse`}>
                    <i className={`fa-solid ${icon}`}></i>
                  </div>
                  <div className="flex flex-col items-center gap-6">
                    <div className="flex flex-col items-center gap-3">
                      <button
                        onClick={() => {
                          if (isAudioPlaying) {
                            if (staticAudioRef.current) {
                              staticAudioRef.current.pause();
                              setIsAudioPlaying(false);
                              setIsAudioPaused(true);
                            } else if (narrationAudioContextRef.current) {
                              narrationAudioContextRef.current.suspend();
                              setIsAudioPlaying(false);
                              setIsAudioPaused(true);
                            } else {
                              stopNarration();
                            }
                          } else if (isAudioPaused) {
                            if (staticAudioRef.current) {
                              staticAudioRef.current.play();
                              setIsAudioPlaying(true);
                              setIsAudioPaused(false);
                            } else if (narrationAudioContextRef.current) {
                              narrationAudioContextRef.current.resume();
                              setIsAudioPlaying(true);
                              setIsAudioPaused(false);
                            }
                          } else {
                            if (currentStep.audioUrl) {
                              playStepNarration(currentStep.stepId || currentStep.id, currentStep.content, currentStep.audioUrl);
                            } else {
                              playTTS(currentStep.content);
                            }
                          }
                        }}
                        className={`group relative flex items-center justify-center w-24 h-24 rounded-full transition-all ${
                          isAudioPlaying ? "bg-indigo-600 text-white scale-110 shadow-indigo-200" : "bg-white border-2 border-slate-100 text-slate-400 hover:border-indigo-500 hover:text-indigo-600"
                        } shadow-xl`}
                      >
                        {isAudioPlaying ? (
                          <i className="fa-solid fa-pause text-2xl"></i>
                        ) : (
                          <i className="fa-solid fa-play text-2xl ml-1"></i>
                        )}
                      </button>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {isAudioPlaying ? "Playing Exercise" : isAudioPaused ? "Paused" : "Play Audio"}
                      </span>
                    </div>

                    <button
                      onClick={() => setShowExerciseText(!showExerciseText)}
                      className="px-6 py-2 bg-slate-50 text-slate-500 rounded-full text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      {showExerciseText ? "Hide Text" : "View Text"}
                    </button>
                  </div>

                  {showExerciseText && (
                    <div className="w-full max-h-80 overflow-y-auto pr-4 space-y-6 text-slate-600 font-medium leading-relaxed animate-in fade-in slide-in-from-top-4 duration-500 custom-scrollbar text-center">
                      <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 italic">
                        {currentStep.content?.split("\n\n").map((p: string, i: number) => (
                          <p key={i} className={i > 0 ? "mt-4" : ""}>{p}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">
                  Back
                </button>
                <button onClick={nextStep} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}>
                  Complete Exercise
                </button>
              </div>
            </div>
          );
        }

        // ── Generic Fallback Exercise ─────────────────────────────────────────
        return (
          <div className="space-y-10 animate-in zoom-in-95 duration-700 max-w-4xl mx-auto text-center">
            <h3 className="text-3xl font-black text-slate-800 tracking-tight px-10">
              {currentStep.title}
            </h3>
            <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-2xl min-h-[400px] flex flex-col justify-center relative overflow-hidden group">
              <div className="relative z-10 space-y-8">
                <div className={`w-24 h-24 ${themeClasses.secondary} ${themeClasses.text} rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner animate-pulse`}>
                  <i className={`fa-solid ${stepType === "meditation" ? "fa-spa" : "fa-puzzle-piece"}`}></i>
                </div>
                <div className="space-y-4">
                  <p className="text-2xl font-medium text-slate-700 max-w-lg mx-auto leading-relaxed italic whitespace-pre-wrap">
                    "{currentStep.content}"
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      if (isAudioPlaying) {
                        if (staticAudioRef.current) {
                          staticAudioRef.current.pause();
                          setIsAudioPlaying(false);
                          setIsAudioPaused(true);
                        } else if (narrationAudioContextRef.current) {
                          narrationAudioContextRef.current.suspend();
                          setIsAudioPlaying(false);
                          setIsAudioPaused(true);
                        } else {
                          stopNarration();
                        }
                      } else if (isAudioPaused) {
                        if (staticAudioRef.current) {
                          staticAudioRef.current.play();
                          setIsAudioPlaying(true);
                          setIsAudioPaused(false);
                        } else if (narrationAudioContextRef.current) {
                          narrationAudioContextRef.current.resume();
                          setIsAudioPlaying(true);
                          setIsAudioPaused(false);
                        }
                      } else {
                        if (currentStep.audioUrl) {
                          playStepNarration(currentStep.stepId || currentStep.id, currentStep.content, currentStep.audioUrl);
                        } else {
                          playTTS(currentStep.content);
                        }
                      }
                    }}
                    className={`mx-auto flex items-center justify-center w-16 h-16 rounded-full transition-all ${
                      isAudioPlaying ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                    }`}
                  >
                    {isAudioPlaying ? <i className="fa-solid fa-pause text-xl"></i> : <i className="fa-solid fa-play text-xl ml-1"></i>}
                  </button>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mt-3">
                    {isAudioPlaying ? "Playing" : isAudioPaused ? "Paused" : "Replay Audio"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">
                Back
              </button>
              <button onClick={nextStep} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}>
                Complete Exercise
              </button>
            </div>
          </div>
        );
      }

      // ── CLOSING / OUTRO / REVIEW ───────────────────────────────────────────
      case "closing":
      case "outro":
      case "review":
        return (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
            <div className="text-center">
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">Session Review</h3>
              <p className="text-slate-500 mt-2 font-medium">
                Consolidating your progress for Session {sessionTemplate.sessionNumber}.
              </p>
            </div>
            <div className="bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-2xl space-y-10 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className={`fa-solid fa-award ${themeClasses.text}`}></i> Module Mastered
                  </h4>
                  <p className="text-sm text-slate-600 font-medium">
                    You have successfully navigated the concepts of {sessionTemplate.title}.
                  </p>
                </div>
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-emerald-500"></i> Final Thought
                  </h4>
                  <p className="text-sm text-slate-600 font-medium italic">
                    "{currentStep.content || "Practice these tools daily."}"
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">
                Back
              </button>
              <button onClick={nextStep} className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all">
                Submit Session Logs
              </button>
            </div>
          </div>
        );

      default:
        console.warn("Unrecognized Step Type:", stepType);
        return null;
    }
  };

  // ── Main Content Renderer ──────────────────────────────────────────────────
  const renderContent = () => {
    if (step === "distress-before") {
      return (
        <MoodCheckIn
          sessionNumber={sessionTemplate?.sessionNumber || 1}
          onComplete={handleDistressBeforeComplete}
        />
      );
    }

    // ── DISTRESS AFTER CHECK-IN ──────────────────────────────────────────────
    if (step === "distress-after") {
      return (
        <div className="max-w-2xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-700 py-10">
          <div className="text-center space-y-4">
            <div className={`w-24 h-24 ${themeClasses.secondary} ${themeClasses.text} rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto shadow-inner`}>
              <i className="fa-solid fa-heart-pulse"></i>
            </div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">Final Check-in</h2>
            <p className="text-slate-500 font-medium italic">
              How is your distress level now that we've finished the session?
            </p>
          </div>

          <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-8">
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {DISTRESS_SCALE.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDistressAfter(opt.value)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${
                      distressAfter === opt.value
                        ? "bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-100"
                        : "bg-slate-50 border-transparent hover:border-rose-200 hover:bg-white"
                    }`}
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{opt.emoji}</span>
                    <div className="text-center">
                      <span className={`block text-[8px] font-black uppercase tracking-tighter ${distressAfter === opt.value ? "text-rose-100" : "text-slate-400"}`}>
                        Level {opt.value}
                      </span>
                      <span className={`block text-[7px] font-bold leading-tight mt-0.5 ${distressAfter === opt.value ? "text-white" : "text-slate-500"}`}>
                        {opt.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {distressAfter !== null && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center animate-in fade-in duration-300">
                  <p className="text-sm text-slate-600 font-medium">
                    {distressAfter <= 3 ? "You're feeling great! Excellent work today."
                      : distressAfter <= 5 ? "You're feeling okay. Take this positive energy with you."
                      : distressAfter <= 7 ? "You're noticing some distress. Remember your grounding tools."
                      : "Your distress is high. Please consider using the Crisis Button tools before exiting."}
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            disabled={distressAfter === null}
            onClick={finishSession}
            className={`w-full py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50`}
          >
            Submit Session Logs <i className="fa-solid fa-paper-plane text-sm"></i>
          </button>
        </div>
      );
    }

    // ── SESSION COMPLETE REFLECTION ──────────────────────────────────────────
    if (step === "reflection") {
      return (
        <div className="max-w-2xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-700 py-10">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto shadow-inner">
              <i className="fa-solid fa-flag-checkered"></i>
            </div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">Session Logged</h2>
            <p className="text-slate-500 font-medium">Your progress has been saved to your clinical record.</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
          >
            Return to Dashboard <i className="fa-solid fa-house text-sm"></i>
          </button>
        </div>
      );
    }

    const currentStep = sessionTemplate?.steps?.[currentStepIdx];
    if (currentStep) {
      return renderDynamicStep(currentStep);
    }

    // Fallback: session complete state before distress-after
    return (
      <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700 text-center">
        <div className={`${themeClasses.primary} rounded-[3.5rem] p-16 text-white shadow-2xl space-y-10 overflow-hidden relative`}>
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <i className="fa-solid fa-trophy text-[20rem]"></i>
          </div>
          <div className="relative z-10 space-y-8">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl mx-auto shadow-xl animate-bounce">
              <i className="fa-solid fa-check-double"></i>
            </div>
            <h3 className="text-4xl font-black tracking-tight uppercase tracking-widest">Session Complete</h3>
          </div>
        </div>
        {!hasNarrationFinished ? (
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
            Wait for closing thoughts...
          </p>
        ) : (
          <button onClick={() => setStep("distress-after")} className={`w-full py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl animate-in fade-in`}>
            Continue to Final Check-in
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 relative min-h-screen">
      {/* Pause Overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-12 text-center shadow-2xl space-y-8 animate-in zoom-in-95">
            <div className={`w-20 h-20 ${themeClasses.secondary} ${themeClasses.text} rounded-[2rem] flex items-center justify-center text-3xl mx-auto shadow-inner`}>
              <i className="fa-solid fa-hourglass-start"></i>
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Session Paused</h2>
            <button onClick={() => setIsPaused(false)} className={`w-full py-5 ${themeClasses.button} rounded-2xl font-black text-lg shadow-xl`}>
              Resume Session
            </button>
            <button onClick={() => setShowExitConfirm(true)} className="w-full py-4 text-xs font-black text-slate-400 uppercase tracking-widest">
              Exit Session
            </button>
          </div>
        </div>
      )}

      {/* Exit Confirm Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[110] bg-slate-900/95 backdrop-blur-lg flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 text-center shadow-2xl space-y-6">
            <h3 className="text-xl font-black text-slate-800">Exit Session?</h3>
            <p className="text-sm text-slate-500">Your progress for this module won't be finalized.</p>
            <div className="flex flex-col gap-3 pt-2">
              <button onClick={handleExitSession} className="w-full py-4 bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg">
                Yes, Exit
              </button>
              <button onClick={() => { setShowExitConfirm(false); setIsPaused(false); }} className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest">
                No, Stay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md px-8 py-4 flex justify-between items-center mb-8 border-b border-slate-200/50">
        <div className="flex items-center gap-4">
          <div className={`w-8 h-8 ${themeClasses.primary} rounded-lg flex items-center justify-center text-white text-xs shadow-sm`}>
            <i className="fa-solid fa-play" />
          </div>
          <div>
            <h1 className="text-[12px] font-black text-slate-800 uppercase tracking-tighter">
              Session {sessionTemplate?.sessionNumber} • {step === "distress-before" ? "Initial Check-in" : step === "distress-after" ? "Final Check-in" : step === "reflection" ? "Complete" : `Step ${currentStepIdx + 1} of ${sessionTemplate?.steps?.length || 0}`}
            </h1>
            <div className="flex gap-1.5 mt-0.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`h-1 rounded-full transition-all ${i <= getProgressCount() ? `w-8 ${themeClasses.primary}` : "w-4 bg-slate-200"}`}></div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {audioLoading && <img src="https://i.ibb.co/FkV0M73k/brain.png" className="w-5 h-5 animate-pulse mr-2" alt="loading" />}
          {isAudioPlaying && !audioLoading && (
            <div className="flex items-center gap-1 mr-2">
              {[1, 2, 3].map((b) => (
                <div key={b} className={`w-1 rounded-full ${themeClasses.primary} animate-bounce`} style={{ height: `${8 + b * 4}px`, animationDelay: `${b * 0.15}s` }}></div>
              ))}
            </div>
          )}
          {quotaExceeded && (
            <div className="bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg flex items-center gap-2 mr-4 animate-in slide-in-from-top-2">
              <i className="fa-solid fa-triangle-exclamation text-amber-500 text-xs" />
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Quota Limit Hit</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const currentStep = sessionTemplate.steps?.[currentStepIdx];
                    if (currentStep) {
                      const activeScript = currentStep.content || `Let's focus on ${currentStep.title}.`;
                      playStepNarration(currentStep.stepId || currentStep._id || currentStep.id, activeScript);
                    }
                  }}
                  className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded text-[8px] font-black hover:bg-amber-300 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => { setIsMuted(true); localStorage.setItem("session_muted", "true"); setQuotaExceeded(false); stopNarration(); }}
                  className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[8px] font-black hover:bg-rose-200 transition-colors ml-1"
                >
                  Mute
                </button>
              </div>
            </div>
          )}
          <button
            onClick={toggleMute}
            className={`w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center transition-all shadow-sm ${isMuted ? "text-rose-500 bg-rose-50" : `text-slate-400 bg-white hover:${themeClasses.text}`}`}
            title={isMuted ? "Unmute Narration" : "Mute Narration"}
          >
            <i className={`fa-solid ${isMuted ? "fa-volume-xmark" : "fa-volume-high"}`}></i>
          </button>
          <button onClick={() => setIsPaused(true)} className={`w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:${themeClasses.text} transition-all shadow-sm`}>
            <i className="fa-solid fa-pause" />
          </button>
          <button onClick={() => { setShowExitConfirm(true); setIsPaused(true); }} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all shadow-sm">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className={`px-6 md:px-10 transition-all duration-500 ${isPaused ? "opacity-0 blur-sm scale-95" : "opacity-100"}`}>
        {renderContent()}
      </div>
    </div>
  );
};

export default VirtualSession;