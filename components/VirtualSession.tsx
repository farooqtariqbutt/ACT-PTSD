
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MoodCheckIn from './MoodCheckIn';
import { THERAPY_SESSIONS, SessionResult, SessionData, PTSD_TRIGGERS_LIST, WARNING_SIGNS_LIST, ACT_SKILLS_LIST, DISTRESS_SCALE } from '../types';
import { generateGuidedMeditation, decodeBase64, decodeAudioData, getTTSAudio, checkTTSAvailability } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { useApp } from '../contexts/AppContext';

type SessionStep = 'distress-before' | 'reflection' | string;

const VirtualSession: React.FC = () => {
  const { currentUser: user, updateUser, themeClasses } = useApp();
  const navigate = useNavigate();
  const { sessionNumber } = useParams();
  const sessionIdx = sessionNumber ? parseInt(sessionNumber, 10) - 1 : 0;
  
  const currentSession = THERAPY_SESSIONS[sessionIdx] || THERAPY_SESSIONS[0];
  
  const sessionSteps = useMemo(() => {
    if (!currentSession) return [];
    return currentSession.steps.filter(step => {
      if (step.id === 'self-acceptance') {
        const history = user.traumaHistory;
        return !!(history?.abuseEmotional || history?.abusePhysical || history?.abuseSexual || history?.domesticViolence);
      }
      return true;
    });
  }, [currentSession, user.traumaHistory]);

  if (!currentSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <img src="https://i.ibb.co/FkV0M73k/brain.png" className="w-16 h-16 mx-auto brain-loading-img" alt="Loading" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Initializing Session...</p>
        </div>
      </div>
    );
  }

  const [step, setStep] = useState<SessionStep>('distress-before');
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const clientName = user.name.split(' ')[0] || "Client";

  // Audio Control State
  const [hasNarrationFinished, setHasNarrationFinished] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [isTTSAvailable, setIsTTSAvailable] = useState<boolean | null>(null);
  const [isMuted, setIsMuted] = useState(localStorage.getItem('session_muted') === 'true');
  
  const staticAudioRef = useRef<HTMLAudioElement | null>(null);
  const geminiAudioRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const narrationIdRef = useRef<number>(0);

  // Persistent States
  const [distressBefore, setDistressBefore] = useState<number>(5);
  const [distressAfter, setDistressAfter] = useState<number | null>(null);
  
  // Dynamic Input States
  const [stepInputs, setStepInputs] = useState<Record<string, any>>({});

  // Session 2 Specific States
  const [s2InnerWorldStep, setS2InnerWorldStep] = useState(0);

  // Session 5 Specific States
  const [s5SelectedDomains, setS5SelectedDomains] = useState<string[]>([]);
  const [s5Ratings, setS5Ratings] = useState<Record<string, string>>({});
  const [s5SortedValues, setS5SortedValues] = useState<string[]>([]);
  const [s5ActionLog, setS5ActionLog] = useState<any[]>([]);

  // Session 7 Specific States
  const [s7SelectedValue, setS7SelectedValue] = useState('');
  const [s7SmartGoal, setS7SmartGoal] = useState({
    specific: '',
    measurable: '',
    achievable: false,
    relevant: '',
    timebound: ''
  });
  const [s7Barriers, setS7Barriers] = useState<string[]>([]);
  const [s7CustomBarrier, setS7CustomBarrier] = useState('');

  // Session 8 Specific States
  const [s8SelectedValues, setS8SelectedValues] = useState<string[]>([]);

  // Session 9 Specific States
  const [s9SelectedValue, setS9SelectedValue] = useState('');
  const [s9Letter, setS9Letter] = useState('');

  // Session 10 Specific States
  // (No specific states needed for S10 yet as it uses meditation text)

  // Session 11 Specific States
  const [s11StruggleSwitch, setS11StruggleSwitch] = useState(true); // true = ON, false = OFF
  const [s11DefusionThoughts, setS11DefusionThoughts] = useState<string[]>([]);
  const [s11CurrentThought, setS11CurrentThought] = useState('');

  // Session 12 Specific States
  const [s12SelectedTriggers, setS12SelectedTriggers] = useState<string[]>([]);
  const [s12CustomTrigger, setS12CustomTrigger] = useState('');
  const [s12SelectedWarningSigns, setS12SelectedWarningSigns] = useState<string[]>([]);
  const [s12SkillMapping, setS12SkillMapping] = useState<Record<string, string>>({});
  const [s12ValueSteps, setS12ValueSteps] = useState('');
  const [s12Resources, setS12Resources] = useState('');
  
  // States used by other components (e.g. Crisis Button)
  const [s12SelectedSigns, setS12SelectedSigns] = useState<string[]>([]);
  const [s12SkillsMap, setS12SkillsMap] = useState<Record<string, string[]>>({});
  const [activeVisualIdx, setActiveVisualIdx] = useState(0);
  const [groundingStep, setGroundingStep] = useState(0);
  const [groundingClicks, setGroundingClicks] = useState(0);
  const [showExerciseText, setShowExerciseText] = useState(false);

  const VALUES_LIST = [
    { id: 'v1', name: 'Acceptance & Mindfulness', desc: 'Being open to yourself, others, and the present moment.' },
    { id: 'v2', name: 'Adventure & Curiosity', desc: 'Seeking new experiences, exploring, and staying open-minded.' },
    { id: 'v3', name: 'Assertiveness & Courage', desc: 'Standing up for yourself respectfully and facing challenges bravely.' },
    { id: 'v4', name: 'Authenticity & Honesty', desc: 'Being true, genuine, and sincere in thoughts, words, and actions.' },
    { id: 'v5', name: 'Respect', desc: 'Treating yourself and others with consideration and positive regard.' },
    { id: 'v6', name: 'Beauty & Creativity', desc: 'Appreciating, creating, and nurturing beauty in life and self-expression.' },
    { id: 'v7', name: 'Caring & Kindness', desc: 'Acting with compassion and consideration toward yourself and others.' },
    { id: 'v8', name: 'Connection & Intimacy', desc: 'Building meaningful relationships and being fully present with others.' },
    { id: 'v9', name: 'Contribution & Supportiveness', desc: 'Helping, giving, and making a positive difference.' },
    { id: 'v10', name: 'Fairness & Justice', desc: 'Treating self and others with equality, fairness, and integrity.' },
    { id: 'v11', name: 'Fitness & Self-care', desc: 'Maintaining physical and mental health and wellbeing.' },
    { id: 'v12', name: 'Flexibility & Adaptability', desc: 'Adjusting and responding well to change.' },
    { id: 'v13', name: 'Freedom & Independence', desc: 'Living freely, making choices, and being self-directed.' },
    { id: 'v14', name: 'Fun & Excitement', desc: 'Seeking enjoyment, thrill, and joy in life.' },
    { id: 'v15', name: 'Gratitude & Humility', desc: 'Appreciating life, others, and staying humble.' },
    { id: 'v16', name: 'Patience & Persistence', desc: 'Staying steady, waiting calmly, and continuing despite obstacles.' },
    { id: 'v17', name: 'Power & Responsibility', desc: 'Taking charge, influencing, and being accountable for your actions.' },
    { id: 'v18', name: 'Romance & Love', desc: 'Expressing love, affection, and emotional closeness.' },
    { id: 'v19', name: 'Self-Development', desc: 'Growing, learning, and improving your skills, knowledge, and character.' },
    { id: 'v20', name: 'Spirituality & Meaning', desc: 'Connecting to something larger than yourself, purpose, or deeper values.' }
  ];

  useEffect(() => {
    const checkTTS = async () => {
      const available = await checkTTSAvailability();
      setIsTTSAvailable(available);
    };
    checkTTS();
  }, []);

  const stopAllAudio = () => {
    narrationIdRef.current += 1; 
    if (staticAudioRef.current) {
      staticAudioRef.current.pause();
      staticAudioRef.current.src = "";
      staticAudioRef.current = null;
    }
    if (geminiAudioRef.current) {
      try { geminiAudioRef.current.stop(); } catch (e) {}
      geminiAudioRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setIsAudioPlaying(false);
    setIsAudioPaused(false);
  };

  const playTTS = async (text: string) => {
    if (isTTSAvailable === false) return;
    stopAllAudio();
    const currentRequestId = narrationIdRef.current;
    setAudioLoading(true);

    try {
      const audioBase64 = await getTTSAudio(text);
      if (narrationIdRef.current !== currentRequestId) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      const audioBuffer = await decodeAudioData(decodeBase64(audioBase64), ctx, 24000, 1);
      
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
      geminiAudioRef.current = source;
      setIsAudioPlaying(true);
    } catch (err) {
      console.error("TTS Playback Failed", err);
    } finally {
      setAudioLoading(false);
    }
  };

  const playSessionNarration = async (stepId: string, fallbackPrompt?: string, customUrl?: string) => {
    stopAllAudio();
    const currentRequestId = narrationIdRef.current;
    
    setHasNarrationFinished(false);
    setAudioLoading(true);
    setQuotaExceeded(false);

    const staticUrl = customUrl || `/audio/s${currentSession.number}_${stepId}.mp3`;

    try {
      const audio = new Audio(staticUrl);
      staticAudioRef.current = audio;
      await new Promise((resolve, reject) => {
        audio.oncanplaythrough = resolve;
        audio.onerror = reject;
        setTimeout(() => reject(new Error("Static audio missing or timed out")), 600);
      });

      if (narrationIdRef.current !== currentRequestId) return;

      setAudioLoading(false);
      setIsAudioPlaying(true);
      audio.onended = () => {
        if (narrationIdRef.current === currentRequestId) {
          setIsAudioPlaying(false);
          setHasNarrationFinished(true);
        }
      };
      await audio.play();
      return;
    } catch (e) {
      // Static audio failed, try AI fallback if provided
    }

    if (fallbackPrompt && narrationIdRef.current === currentRequestId && !isMuted && isTTSAvailable !== false) {
      try {
        const audioBase64 = await getTTSAudio(fallbackPrompt);
        if (narrationIdRef.current !== currentRequestId) return;

        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        const audioBuffer = await decodeAudioData(decodeBase64(audioBase64), ctx, 24000, 1);
        
        if (narrationIdRef.current !== currentRequestId) return;

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          if (narrationIdRef.current === currentRequestId) {
            setIsAudioPlaying(false);
            setHasNarrationFinished(true);
          }
        };
        source.start();
        geminiAudioRef.current = source;
        setIsAudioPlaying(true);
      } catch (err: any) {
        console.error("Gemini Fallback Failed", err);
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

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('session_muted', String(newMuted));
    if (newMuted) stopAllAudio();
  };

  useEffect(() => {
    if (step === 'distress-before' || step === 'reflection') {
      setHasNarrationFinished(true);
      return;
    }

    const currentStep = sessionSteps[currentStepIdx];
    if (!currentStep) return;

    // Prevent re-triggering if we are already playing this step
    if (audioLoading || isAudioPlaying) {
      // But only if it's the SAME step. If it's a new step, we should stop and play new.
      // The stopAllAudio in playSessionNarration handles this.
    }

    let activeScript = "";
    if (currentStep.type === 'intro') {
      activeScript = `Welcome to Session ${currentSession.number}, ${clientName}. Today we are focusing on ${currentSession.title}. ${currentStep.content || ''}`;
    } else if (currentStep.type === 'closing') {
      activeScript = `You've done great work today. ${currentStep.content || ''}`;
    } else {
      activeScript = currentStep.content || `Let's focus on ${currentStep.title}.`;
    }

    if (activeScript) {
      playSessionNarration(currentStep.id, activeScript);
    } else {
      setHasNarrationFinished(true);
    }
    
    return () => stopAllAudio();
  }, [currentStepIdx, currentSession.number]); // Removed 'step' to avoid double triggers

  const scrollToTop = () => {
    window.scrollTo(0, 0);
    document.body.scrollTo(0, 0);
    const mainElement = document.querySelector('main');
    if (mainElement) mainElement.scrollTo(0, 0);
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) scrollContainer.scrollTo(0, 0);
  };

  useEffect(() => {
    scrollToTop();
  }, [step, currentStepIdx]);

  const handleDistressBeforeComplete = (distressScore: number) => {
    setDistressBefore(distressScore);
    setCurrentStepIdx(0);
    setStep(sessionSteps[0].id);
  };

  const nextStep = () => {
    setActiveVisualIdx(0);
    setGroundingStep(0);
    setGroundingClicks(0);
    setS2InnerWorldStep(0);
    if (currentStepIdx < sessionSteps.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      setStep(sessionSteps[nextIdx].id);
    } else {
      setStep('distress-after');
    }
  };

  const prevStep = () => {
    setActiveVisualIdx(0);
    setGroundingStep(0);
    setGroundingClicks(0);
    setS2InnerWorldStep(0);
    if (currentStepIdx > 0) {
      const nextIdx = currentStepIdx - 1;
      setCurrentStepIdx(nextIdx);
      setStep(sessionSteps[nextIdx].id);
    }
  };

  const handleExitSession = () => {
    stopAllAudio();
    navigate('/');
  };

  const finishSession = () => {
    const result: SessionResult = {
      sessionNumber: currentSession.number,
      timestamp: new Date().toISOString(),
      distressBefore: distressBefore,
      distressAfter: distressAfter,
      reflections: { 
        ...stepInputs,
        s12SelectedTriggers, 
        s12SelectedSigns, 
        s12SkillsMap 
      },
      completed: true
    };

    storageService.commitSessionResult(user.id, result);
    
    // Sync with AppContext to ensure UI updates
    const updatedUsers = storageService.getUsers();
    const entryKey = Object.keys(updatedUsers).find(k => updatedUsers[k].id === user.id);
    if (entryKey) {
      updateUser(updatedUsers[entryKey]);
    }

    setStep('reflection');
  };

  const getProgressCount = (): number => {
    if (step === 'distress-before') return 0;
    if (step === 'reflection') return 6;
    return Math.floor(((currentStepIdx + 1) / sessionSteps.length) * 6);
  };

  const renderDynamicStep = (currentStep: any) => {
    switch (currentStep.type) {
      case 'intro':
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className={`${themeClasses.secondary} rounded-[3rem] p-10 md:p-16 text-slate-800 shadow-2xl relative overflow-hidden transition-colors duration-500`}>
              <div className={`absolute top-0 right-0 p-12 opacity-10 ${themeClasses.text}`}><i className="fa-solid fa-graduation-cap text-[12rem]"></i></div>
              <div className="relative z-10 space-y-6 text-center md:text-left">
                <h3 className="text-3xl md:text-4xl font-black tracking-tight">
                  Session {currentSession.number}: {currentSession.title}
                </h3>
                <div className={`prose prose-slate text-slate-600 text-lg leading-relaxed max-w-2xl font-medium`}>
                  <p>{currentStep.content || currentSession.description}</p>
                  <div className={`mt-6 flex items-center gap-3 ${themeClasses.text}`}>
                    <i className="fa-solid fa-bullseye"></i>
                    <span className="text-sm font-black uppercase tracking-widest">Objective: {currentSession.objective}</span>
                  </div>
                </div>
              </div>
            </div>
            <button 
              onClick={nextStep} 
              className={`w-full py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl transition-all`}
            >
              Begin Session
            </button>
          </div>
        );

      case 'reflection':
      case 'questionnaire':
        const isS2Defusion = currentSession.number === 2 && currentStep.id === 'defusion-practice';
        const isS2InnerWorld = currentSession.number === 2 && currentStep.id === 'inner-world';
        
        return (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
            <div className="text-center">
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{currentStep.title}</h3>
              {!isS2InnerWorld && <p className="text-slate-500 mt-2 font-medium italic whitespace-pre-wrap">{currentStep.content}</p>}
              {isS2InnerWorld && (
                <p className="text-slate-500 mt-2 font-medium italic">
                  {s2InnerWorldStep % 2 === 0 ? "Acknowledge what is present." : "Now, practice defusion by noticing."}
                </p>
              )}
            </div>

            {isS2Defusion && (
              <div className="space-y-8">
                <div className={`${themeClasses.secondary} rounded-[2.5rem] p-8 border ${themeClasses.border} shadow-inner space-y-6 max-w-2xl mx-auto`}>
                  <h4 className={`text-xs font-black ${themeClasses.accent} uppercase tracking-widest text-center mb-4`}>Read these aloud:</h4>
                  <div className="space-y-4">
                    <div className="p-6 bg-white rounded-2xl border border-indigo-200 shadow-sm flex items-center justify-between gap-4 transform hover:scale-[1.02] transition-transform">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Thought Defusion</p>
                        <p className="text-xl font-black text-indigo-900 leading-tight">"I am having the thought that {stepInputs['thoughts_now'] || '...'}"</p>
                      </div>
                      <button 
                        onClick={() => playTTS(`I am having the thought that ${stepInputs['thoughts_now'] || '...'}`)}
                        disabled={isTTSAvailable === false}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isTTSAvailable === false ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                        title={isTTSAvailable === false ? "Audio unavailable" : "Listen"}
                      >
                        <i className="fa-solid fa-volume-high"></i>
                      </button>
                    </div>
                    <div className="p-6 bg-white rounded-2xl border border-indigo-200 shadow-sm flex items-center justify-between gap-4 transform hover:scale-[1.02] transition-transform">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Feeling Acknowledgment</p>
                        <p className="text-xl font-black text-indigo-900 leading-tight">"I am noticing {stepInputs['feelings_now'] || '...'}"</p>
                      </div>
                      <button 
                        onClick={() => playTTS(`I am noticing ${stepInputs['feelings_now'] || '...'}`)}
                        disabled={isTTSAvailable === false}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isTTSAvailable === false ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                        title={isTTSAvailable === false ? "Audio unavailable" : "Listen"}
                      >
                        <i className="fa-solid fa-volume-high"></i>
                      </button>
                    </div>
                    <div className="p-6 bg-white rounded-2xl border border-indigo-200 shadow-sm flex items-center justify-between gap-4 transform hover:scale-[1.02] transition-transform">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sensation Awareness</p>
                        <p className="text-xl font-black text-indigo-900 leading-tight">"I am having {stepInputs['sensations_now'] || '...'}"</p>
                      </div>
                      <button 
                        onClick={() => playTTS(`I am having ${stepInputs['sensations_now'] || '...'}`)}
                        disabled={isTTSAvailable === false}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isTTSAvailable === false ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                        title={isTTSAvailable === false ? "Audio unavailable" : "Listen"}
                      >
                        <i className="fa-solid fa-volume-high"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 max-w-2xl mx-auto">
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={nextStep} className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800">Continue to Exercise</button>
                </div>
              </div>
            )}

            {isS2InnerWorld && (
              <div className="space-y-8 max-w-2xl mx-auto">
                {s2InnerWorldStep % 2 === 0 ? (
                  // Question Step
                  <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-6">
                    <label className="text-xl text-slate-700 font-bold block text-center">
                      {currentStep.questions?.[Math.floor(s2InnerWorldStep / 2)].text}
                    </label>
                    <textarea 
                      value={stepInputs[currentStep.questions?.[Math.floor(s2InnerWorldStep / 2)].id || ''] || ''}
                      onChange={(e) => setStepInputs({...stepInputs, [currentStep.questions?.[Math.floor(s2InnerWorldStep / 2)].id || '']: e.target.value})}
                      placeholder="Type your answer here..."
                      className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm font-medium"
                    />
                  </div>
                ) : (
                  // Notice Step
                  <div className={`${themeClasses.secondary} rounded-[2.5rem] p-10 border ${themeClasses.border} shadow-inner space-y-8 text-center`}>
                    <h4 className={`text-xs font-black ${themeClasses.accent} uppercase tracking-widest mb-4`}>Read this Aloud:</h4>
                    <div className="p-8 bg-white rounded-3xl border border-indigo-200 shadow-sm transform scale-105 transition-transform flex items-center justify-between gap-4">
                      <div className="flex-1">
                        {s2InnerWorldStep === 1 && (
                          <p className="text-2xl font-black text-indigo-900 leading-tight">
                            "I am having the thought that {stepInputs['thoughts_now'] || '...'}"
                          </p>
                        )}
                        {s2InnerWorldStep === 3 && (
                          <p className="text-2xl font-black text-indigo-900 leading-tight">
                            "I am noticing {stepInputs['feelings_now'] || '...'}"
                          </p>
                        )}
                        {s2InnerWorldStep === 5 && (
                          <p className="text-2xl font-black text-indigo-900 leading-tight">
                            "I am having {stepInputs['sensations_now'] || '...'}"
                          </p>
                        )}
                      </div>
                      <button 
                        onClick={() => {
                          let text = "";
                          if (s2InnerWorldStep === 1) text = `I am having the thought that ${stepInputs['thoughts_now'] || '...'}`;
                          if (s2InnerWorldStep === 3) text = `I am noticing ${stepInputs['feelings_now'] || '...'}`;
                          if (s2InnerWorldStep === 5) text = `I am having ${stepInputs['sensations_now'] || '...'}`;
                          playTTS(text);
                        }}
                        disabled={isTTSAvailable === false}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shrink-0 ${isTTSAvailable === false ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                        title={isTTSAvailable === false ? "Audio unavailable" : "Listen"}
                      >
                        <i className="fa-solid fa-volume-high"></i>
                      </button>
                    </div>
                    <p className="text-slate-500 text-sm font-bold animate-pulse">Speak clearly and notice the space it creates.</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <button 
                    onClick={() => s2InnerWorldStep === 0 ? prevStep() : setS2InnerWorldStep(s2InnerWorldStep - 1)} 
                    className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => {
                      if (s2InnerWorldStep < 5) {
                        setS2InnerWorldStep(s2InnerWorldStep + 1);
                      } else {
                        nextStep();
                      }
                    }} 
                    disabled={s2InnerWorldStep % 2 === 0 && !stepInputs[currentStep.questions?.[Math.floor(s2InnerWorldStep / 2)].id || '']}
                    className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 disabled:opacity-50"
                  >
                    {s2InnerWorldStep % 2 === 0 ? "Convert to Notice" : (s2InnerWorldStep === 5 ? "Continue to Exercise" : "Next Question")}
                  </button>
                </div>
              </div>
            )}

            {!isS2Defusion && !isS2InnerWorld && (
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-8">
                {currentStep.questions ? (
                  currentStep.questions.map((q: any) => (
                    <div key={q.id} className="space-y-4">
                      <label className="text-lg text-slate-700 font-bold">{q.text}</label>
                      {q.type === 'text' && (
                        <textarea 
                          value={stepInputs[q.id] || ''}
                          onChange={(e) => setStepInputs({...stepInputs, [q.id]: e.target.value})}
                          placeholder="Type your answer here..."
                          className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm font-medium"
                        />
                      )}
                      {q.type === 'likert' && (
                        <div className="flex justify-between gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <button
                              key={num}
                              onClick={() => setStepInputs({...stepInputs, [q.id]: num})}
                              className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${stepInputs[q.id] === num ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      )}
                      {q.type === 'choice' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {q.options?.map((opt: string) => (
                            <button
                              key={opt}
                              onClick={() => setStepInputs({...stepInputs, [q.id]: opt})}
                              className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all ${stepInputs[q.id] === opt ? 'bg-indigo-50 border-indigo-600 text-indigo-600 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                      {q.type === 'multiselect' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {q.options?.map((opt: string) => {
                            const currentValues = stepInputs[q.id] || [];
                            const isSelected = currentValues.includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => {
                                  const nextValues = isSelected 
                                    ? currentValues.filter((v: string) => v !== opt)
                                    : [...currentValues, opt];
                                  setStepInputs({...stepInputs, [q.id]: nextValues});
                                }}
                                className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all flex items-center justify-between ${isSelected ? 'bg-indigo-50 border-indigo-600 text-indigo-600 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                              >
                                <span>{opt}</span>
                                {isSelected && <i className="fa-solid fa-check text-xs"></i>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))
                ) : !currentStep.hideInput ? (
                  <textarea 
                    value={stepInputs[currentStep.id] || ''}
                    onChange={(e) => setStepInputs({...stepInputs, [currentStep.id]: e.target.value})}
                    placeholder="Share your thoughts..."
                    className="w-full h-48 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm font-medium"
                  />
                ) : null}
              </div>
            )}
            {!isS2Defusion && !isS2InnerWorld && (
              <div className="flex gap-4">
                <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                <button onClick={nextStep} className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800">Continue</button>
              </div>
            )}
          </div>
        );

      case 'exercise':
      case 'meditation':
        // Handle Session 5 Values Compass
        if (currentSession.number === 5) {
          if (currentStep.id === 'choose-domains') {
            const domains = [
              { id: 'family', name: 'Family', icon: 'fa-house-user' },
              { id: 'work', name: 'Work', icon: 'fa-briefcase' },
              { id: 'hobbies', name: 'Hobbies', icon: 'fa-palette' },
              { id: 'yourself', name: 'Yourself', icon: 'fa-user' }
            ];
            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">Choose Life Domains</h3>
                  <p className="text-slate-500 mt-2 font-medium italic">{currentStep.content}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {domains.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setS5SelectedDomains(prev => prev.includes(d.id) ? prev.filter(id => id !== d.id) : [...prev, d.id])}
                      className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 ${s5SelectedDomains.includes(d.id) ? 'bg-indigo-600 border-transparent text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                    >
                      <i className={`fa-solid ${d.icon} text-3xl`}></i>
                      <span className="font-black uppercase tracking-widest text-xs">{d.name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-4">
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={nextStep} disabled={s5SelectedDomains.length === 0} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl disabled:opacity-50`}>Continue to Values</button>
                </div>
              </div>
            );
          }

          if (currentStep.id === 'rate-values') {
            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-5xl mx-auto">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">Rate Your Values</h3>
                  <p className="text-slate-500 mt-2 font-medium italic">{currentStep.content}</p>
                </div>
                <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
                  <div className="max-h-[500px] overflow-y-auto p-8 space-y-4 custom-scrollbar">
                    {VALUES_LIST.map(v => (
                      <div key={v.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50 rounded-2xl gap-4 border border-slate-100">
                        <div className="flex-1">
                          <h4 className="font-black text-slate-800">{v.name}</h4>
                          <p className="text-xs text-slate-500 font-medium">{v.desc}</p>
                        </div>
                        <div className="flex gap-2">
                          {['V', 'Q', 'N'].map(rating => (
                            <button
                              key={rating}
                              onClick={() => setS5Ratings(prev => ({ ...prev, [v.id]: rating }))}
                              className={`w-12 h-12 rounded-xl font-black text-sm transition-all ${s5Ratings[v.id] === rating ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}
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
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={() => {
                    const veryImportant = VALUES_LIST.filter(v => s5Ratings[v.id] === 'V').map(v => v.id);
                    setS5SortedValues(veryImportant);
                    nextStep();
                  }} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}>Continue to Card Sort</button>
                </div>
              </div>
            );
          }

          if (currentStep.id === 'card-sort') {
            const moveValue = (idx: number, dir: 'up' | 'down') => {
              const newList = [...s5SortedValues];
              const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
              if (targetIdx < 0 || targetIdx >= newList.length) return;
              [newList[idx], newList[targetIdx]] = [newList[targetIdx], newList[idx]];
              setS5SortedValues(newList);
            };

            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">Values Card Sort</h3>
                  <p className="text-slate-500 mt-2 font-medium italic">{currentStep.content}</p>
                </div>
                <div className="space-y-4">
                  {s5SortedValues.length === 0 ? (
                    <div className="p-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center text-slate-400 font-bold">
                      No "Very Important" values selected. Go back to rate some as 'V'.
                    </div>
                  ) : (
                    s5SortedValues.map((vId, idx) => {
                      const v = VALUES_LIST.find(val => val.id === vId);
                      return (
                        <div key={vId} className="flex items-center gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-md group">
                          <div className="flex flex-col gap-1">
                            <button onClick={() => moveValue(idx, 'up')} disabled={idx === 0} className="text-slate-300 hover:text-indigo-600 disabled:opacity-0"><i className="fa-solid fa-chevron-up"></i></button>
                            <button onClick={() => moveValue(idx, 'down')} disabled={idx === s5SortedValues.length - 1} className="text-slate-300 hover:text-indigo-600 disabled:opacity-0"><i className="fa-solid fa-chevron-down"></i></button>
                          </div>
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-black text-xs">{idx + 1}</div>
                          <div className="flex-1">
                            <h4 className="font-black text-slate-800">{v?.name}</h4>
                            <p className="text-xs text-slate-500 font-medium">{v?.desc}</p>
                          </div>
                          <i className="fa-solid fa-grip-vertical text-slate-200 group-hover:text-slate-400 transition-colors"></i>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex gap-4">
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={nextStep} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}>Continue to Reflection</button>
                </div>
              </div>
            );
          }

          if (currentStep.id === 'action-log') {
            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-6xl mx-auto">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">Values Action Log</h3>
                  <p className="text-slate-500 mt-2 font-medium italic">{currentStep.content}</p>
                </div>
                <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-bottom border-slate-100">
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Value</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action Taken</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Size</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3].map(i => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="p-6"><input type="text" placeholder="Date" className="bg-transparent outline-none text-sm font-medium w-full" /></td>
                          <td className="p-6"><input type="text" placeholder="Value" className="bg-transparent outline-none text-sm font-medium w-full" /></td>
                          <td className="p-6"><input type="text" placeholder="What did you do?" className="bg-transparent outline-none text-sm font-medium w-full" /></td>
                          <td className="p-6">
                            <select className="bg-transparent outline-none text-sm font-medium">
                              <option>Small</option>
                              <option>Medium</option>
                              <option>Big</option>
                            </select>
                          </td>
                          <td className="p-6">
                            <select className="bg-transparent outline-none text-sm font-medium">
                              {[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-4">
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={nextStep} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}>Finish Session</button>
                </div>
              </div>
            );
          }
        }

        // Handle Session 9 Trauma Narrative & Compassion
        if (currentSession.number === 9) {
          if (currentStep.id === 'compassion-letter-s9') {
            const selectedValues = VALUES_LIST.filter(v => s5Ratings[v.id] === 'V');
            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">Self-Compassion Letter</h3>
                  <p className="text-slate-500 mt-2 font-medium italic">{currentStep.content.substring(0, 100)}...</p>
                </div>
                
                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-8">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Mark today's focus value:</label>
                    <select 
                      value={s9SelectedValue}
                      onChange={(e) => setS9SelectedValue(e.target.value)}
                      className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                    >
                      <option value="">-- Choose a Value --</option>
                      {selectedValues.length > 0 ? (
                        selectedValues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)
                      ) : (
                        VALUES_LIST.map(v => <option key={v.id} value={v.name}>{v.name}</option>)
                      )}
                    </select>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Your Letter:</label>
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
                      Tip: What would you say to a dear friend who had been through this?
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={nextStep} disabled={!s9Letter || !s9SelectedValue} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl disabled:opacity-50`}>Complete Session</button>
                </div>
              </div>
            );
          }
        }

        // Handle Session 12 Resilience & Relapse Prevention
        if (currentSession.number === 12) {
          if (currentStep.id === 'identify-triggers-s12') {
            const commonTriggers = [
              'Crowded places', 'Loud noises', 'Anniversaries of the event', 
              'Conflict with others', 'Feeling trapped', 'Specific smells or sounds',
              'News reports', 'Physical pain', 'Stress at work/home'
            ];
            const toggleTrigger = (t: string) => {
              setS12SelectedTriggers(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
            };
            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">Identify Your Triggers</h3>
                  <p className="text-slate-500 mt-2 font-medium italic">Recognizing what sets off your distress is the first step in managing it.</p>
                </div>
                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {commonTriggers.map(t => (
                      <button
                        key={t}
                        onClick={() => toggleTrigger(t)}
                        className={`p-5 rounded-2xl text-left font-bold transition-all border-2 ${
                          s12SelectedTriggers.includes(t) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-600 hover:border-indigo-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Add Custom Trigger:</label>
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
                            setS12SelectedTriggers([...s12SelectedTriggers, s12CustomTrigger.trim()]);
                            setS12CustomTrigger('');
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
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={nextStep} disabled={s12SelectedTriggers.length === 0} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl disabled:opacity-50`}>Continue to Warning Signs</button>
                </div>
              </div>
            );
          }

          if (currentStep.id === 'warning-signs-s12') {
            const warningSigns = [
              'Repeated unwanted memories or nightmares',
              'Flashbacks or strong reactions to reminders',
              'Avoiding places, people, or thoughts related to the event',
              'Feeling numb, detached, guilty, or ashamed',
              'Irritability, anger, or being easily startled',
              'Trouble sleeping or concentrating',
              'Feeling constantly on guard or unsafe'
            ];
            const toggleSign = (s: string) => {
              setS12SelectedWarningSigns(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
            };
            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">Early Warning Signs</h3>
                  <p className="text-slate-500 mt-2 font-medium italic">Notice when symptoms start to return.</p>
                </div>
                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-6">
                  {warningSigns.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSign(s)}
                      className={`w-full p-6 rounded-2xl text-left font-bold transition-all border-2 flex items-center gap-4 ${
                        s12SelectedWarningSigns.includes(s) ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm' : 'bg-slate-50 border-transparent text-slate-600 hover:border-indigo-100'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${s12SelectedWarningSigns.includes(s) ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-transparent'}`}>
                        <i className="fa-solid fa-check text-[10px]"></i>
                      </div>
                      {s}
                    </button>
                  ))}
                  <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 text-xs font-medium leading-relaxed">
                    <i className="fa-solid fa-circle-info mr-2"></i>
                    Note: If these symptoms continue for more than a month and affect daily life, professional support may be needed.
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={nextStep} disabled={s12SelectedWarningSigns.length === 0} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl disabled:opacity-50`}>Continue to Skills Review</button>
                </div>
              </div>
            );
          }

          if (currentStep.id === 'act-skills-review-s12') {
            const skills = [
              { id: 'grounding', name: 'Grounding', icon: 'fa-shoe-prints', desc: 'Connecting to the present through your senses.' },
              { id: 'defusion', name: 'Defusion', icon: 'fa-cloud', desc: 'Creating space from difficult thoughts.' },
              { id: 'acceptance', name: 'Acceptance', icon: 'fa-heart', desc: 'Allowing feelings to be as they are.' },
              { id: 'action', name: 'Committed Action', icon: 'fa-person-walking', desc: 'Taking steps toward your values.' },
              { id: 'crisis', name: 'Crises Button', icon: 'fa-circle-exclamation', desc: 'Immediate emergency grounding tools.' }
            ];
            
            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">ACT Skills Toolkit</h3>
                  <p className="text-slate-500 mt-2 font-medium italic">Review your toolkit and match skills to your triggers.</p>
                </div>
                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {skills.map(s => (
                      <div key={s.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-xl shrink-0">
                          <i className={`fa-solid ${s.icon}`}></i>
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">{s.name}</h4>
                          <p className="text-xs text-slate-500 font-medium mt-1">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Match Skills to Triggers:</h4>
                    {s12SelectedTriggers.map(trigger => (
                      <div key={trigger} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                        <span className="font-bold text-slate-700 flex-1">{trigger}</span>
                        <select 
                          value={s12SkillMapping[trigger] || ''}
                          onChange={(e) => setS12SkillMapping({...s12SkillMapping, [trigger]: e.target.value})}
                          className="p-3 bg-white border border-indigo-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Select Skill --</option>
                          {skills.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={nextStep} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}>Continue to Visualization</button>
                </div>
              </div>
            );
          }


          if (currentStep.id === 'relapse-prevention-plan-s12') {
            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">Resilience Plan Builder</h3>
                  <p className="text-slate-500 mt-2 font-medium italic">Creating your personalized survival kit for the future.</p>
                </div>
                
                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">1. Triggers & Warning Signs</h4>
                      <div className="flex flex-wrap gap-2">
                        {[...s12SelectedTriggers, ...s12SelectedWarningSigns].map((item, i) => (
                          <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold">{item}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">2. Selected ACT Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.values(s12SkillMapping).filter(Boolean).map((skill, i) => (
                          <span key={i} className="px-3 py-1.5 bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-bold">{skill}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-slate-100">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">3. Small Value-Based Steps:</label>
                      <textarea 
                        value={s12ValueSteps}
                        onChange={(e) => setS12ValueSteps(e.target.value)}
                        placeholder="What small steps will you take when things get tough? (e.g., 'I will go for a walk', 'I will call a friend')..."
                        className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">4. Support Resources (Optional):</label>
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
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={nextStep} disabled={!s12ValueSteps} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl disabled:opacity-50`}>Complete Final Session</button>
                </div>
              </div>
            );
          }
        }


        // Handle Session 8 Value-Guided Exposure

        // Handle Session 8 Value-Guided Exposure
        if (currentSession.number === 8) {
          if (currentStep.id === 'choose-values-s8') {
            const selectedValues = VALUES_LIST.filter(v => s5Ratings[v.id] === 'V');
            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">Choose Your Values</h3>
                  <p className="text-slate-500 mt-2 font-medium italic">{currentStep.content}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(selectedValues.length > 0 ? selectedValues : VALUES_LIST.slice(0, 6)).map(v => (
                    <button
                      key={v.id}
                      onClick={() => setS8SelectedValues(prev => prev.includes(v.name) ? prev.filter(i => i !== v.name) : [...prev, v.name])}
                      className={`p-6 rounded-3xl border-2 transition-all text-left flex items-center gap-4 ${s8SelectedValues.includes(v.name) ? 'bg-indigo-600 border-transparent text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s8SelectedValues.includes(v.name) ? 'bg-white/20' : 'bg-slate-50'}`}>
                        <i className={`fa-solid ${s8SelectedValues.includes(v.name) ? 'fa-check' : 'fa-star'}`}></i>
                      </div>
                      <span className="font-bold">{v.name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-4">
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={nextStep} disabled={s8SelectedValues.length === 0} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl disabled:opacity-50`}>Continue to Situation</button>
                </div>
              </div>
            );
          }

          if (currentStep.id === 'prepare-act-skills') {
            const skills = [
              { id: 'grounding', title: 'Grounding', icon: 'fa-anchor', desc: 'Feel your feet on the floor and notice your surroundings.' },
              { id: 'defusion', title: 'Defusion', icon: 'fa-scissors', desc: 'Say: "I notice I am having the thought that..."' },
              { id: 'acceptance', title: 'Acceptance', icon: 'fa-heart', desc: 'Say: "I allow this anxiety to be here. It is just a feeling."' }
            ];
            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">Prepare Your Toolkit</h3>
                  <p className="text-slate-500 mt-2 font-medium italic">{currentStep.content}</p>
                </div>
                <div className="space-y-6">
                  {skills.map(s => (
                    <div key={s.id} className="p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-lg flex items-start gap-6 group hover:border-indigo-200 transition-colors">
                      <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        <i className={`fa-solid ${s.icon}`}></i>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-black text-slate-800 mb-2">{s.title}</h4>
                        <p className="text-slate-500 font-medium leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4">
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={nextStep} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}>Ready for Exposure</button>
                </div>
              </div>
            );
          }
        }

        // Handle Session 7 Committed Action
        if (currentSession.number === 7) {
          if (currentStep.id === 'value-selection-s7') {
            const selectedValues = VALUES_LIST.filter(v => s5Ratings[v.id] === 'V');
            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">Focus Value</h3>
                  <p className="text-slate-500 mt-2 font-medium italic">{currentStep.content}</p>
                </div>
                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-6">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Select your value for today:</label>
                  <select 
                    value={s7SelectedValue}
                    onChange={(e) => setS7SelectedValue(e.target.value)}
                    className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                  >
                    <option value="">-- Choose a Value --</option>
                    {selectedValues.length > 0 ? (
                      selectedValues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)
                    ) : (
                      VALUES_LIST.map(v => <option key={v.id} value={v.name}>{v.name}</option>)
                    )}
                  </select>
                </div>
                <div className="flex gap-4">
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={nextStep} disabled={!s7SelectedValue} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl disabled:opacity-50`}>Build SMART Goal</button>
                </div>
              </div>
            );
          }

          if (currentStep.id === 'smart-goal-builder') {
            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">SMART Goal Builder</h3>
                  <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest">
                    <i className="fa-solid fa-star"></i>
                    Value: {s7SelectedValue}
                  </div>
                </div>
                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px]">S</span>
                        Specific
                      </label>
                      <input 
                        type="text" 
                        value={s7SmartGoal.specific}
                        onChange={(e) => setS7SmartGoal({...s7SmartGoal, specific: e.target.value})}
                        placeholder="What exactly will you do?"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px]">M</span>
                        Measurable
                      </label>
                      <input 
                        type="text" 
                        value={s7SmartGoal.measurable}
                        onChange={(e) => setS7SmartGoal({...s7SmartGoal, measurable: e.target.value})}
                        placeholder="How will you track it?"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px]">A</span>
                        Achievable
                      </label>
                      <button 
                        onClick={() => setS7SmartGoal({...s7SmartGoal, achievable: !s7SmartGoal.achievable})}
                        className={`w-full p-4 rounded-xl border-2 font-bold transition-all flex items-center justify-between ${s7SmartGoal.achievable ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                      >
                        Is this small enough to do?
                        <i className={`fa-solid ${s7SmartGoal.achievable ? 'fa-circle-check' : 'fa-circle'}`}></i>
                      </button>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <span className={`w-6 h-6 ${themeClasses.primary} text-white rounded-full flex items-center justify-center text-[10px]`}>T</span>
                        Time-bound
                      </label>
                      <input 
                        type="text" 
                        value={s7SmartGoal.timebound}
                        onChange={(e) => setS7SmartGoal({...s7SmartGoal, timebound: e.target.value})}
                        placeholder="When will you do it?"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pro-Tip for PTSD:</p>
                    <p className="text-sm text-slate-600 italic">"Keep it tiny. Instead of 'I will go to the gym', try 'I will put on my sneakers and walk for 5 minutes at 10 AM'."</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={nextStep} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}>Anticipate Barriers</button>
                </div>
              </div>
            );
          }

          if (currentStep.id === 'barriers-s7') {
            const commonTriggers = ['Impulsivity', 'Self-Blame', 'Feeling trapped', 'Nightmares', 'Flashbacks', 'Self-criticism'];
            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">Anticipate Barriers</h3>
                  <p className="text-slate-500 mt-2 font-medium italic">{currentStep.content}</p>
                </div>
                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {commonTriggers.map(t => (
                      <button
                        key={t}
                        onClick={() => setS7Barriers(prev => prev.includes(t) ? prev.filter(i => i !== t) : [...prev, t])}
                        className={`p-4 rounded-2xl border-2 font-bold text-xs transition-all ${s7Barriers.includes(t) ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-rose-200'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {s7Barriers.length > 0 && (
                    <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100 space-y-4">
                      <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest">Suggested ACT Skills:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-xl text-center shadow-sm">
                          <i className="fa-solid fa-anchor text-emerald-500 mb-2 block"></i>
                          <span className="text-xs font-bold text-slate-700">Grounding</span>
                        </div>
                        <div className="p-4 bg-white rounded-xl text-center shadow-sm">
                          <i className="fa-solid fa-scissors text-emerald-500 mb-2 block"></i>
                          <span className="text-xs font-bold text-slate-700">Defusion</span>
                        </div>
                        <div className="p-4 bg-white rounded-xl text-center shadow-sm">
                          <i className="fa-solid fa-heart text-emerald-500 mb-2 block"></i>
                          <span className="text-xs font-bold text-slate-700">Acceptance</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={nextStep} className={`flex-1 py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl`}>The Choice Point</button>
                </div>
              </div>
            );
          }

          if (currentStep.id === 'choice-point-s7') {
            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-6xl mx-auto">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">The Choice Point</h3>
                  <p className="text-slate-500 mt-2 font-medium italic">{currentStep.content}</p>
                </div>
                
                <div className="relative bg-white rounded-[4rem] p-12 border border-slate-200 shadow-2xl overflow-hidden min-h-[600px]">
                  {/* Choice Point Diagram */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {/* Y-Shape Path */}
                    <svg className="w-full h-full absolute top-0 left-0 pointer-events-none" viewBox="0 0 800 600">
                      <path d="M400 600 L400 350 L150 100" fill="none" stroke="#e2e8f0" strokeWidth="8" strokeDasharray="12 12" />
                      <path d="M400 350 L650 100" fill="none" stroke="#e2e8f0" strokeWidth="8" strokeDasharray="12 12" />
                      <circle cx="400" cy="350" r="40" fill="white" stroke="currentColor" className={themeClasses.text} strokeWidth="4" />
                    </svg>
                    
                    {/* Labels */}
                    <div className="relative z-10 w-full h-full flex flex-col justify-between p-8">
                      <div className="flex justify-between items-start">
                        {/* AWAY MOVE */}
                        <div className="w-64 p-6 bg-rose-50 rounded-3xl border-2 border-rose-200 shadow-lg transform -rotate-3">
                          <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest mb-3">"AWAY" MOVES</h4>
                          <p className="text-[10px] text-rose-400 mb-4 leading-tight">Moving away from the outcome you want. Behaving unlike the person you want to be.</p>
                          <div className="space-y-2">
                            {stepInputs['coping_mechanisms'] ? (
                              <div className="p-2 bg-white rounded-lg text-[10px] font-bold text-slate-600 border border-rose-100 italic">
                                "{stepInputs['coping_mechanisms']}"
                              </div>
                            ) : (
                              <div className="p-2 bg-white rounded-lg text-[10px] font-bold text-slate-400 border border-rose-100">Avoidance, Suppression...</div>
                            )}
                          </div>
                        </div>

                        {/* TOWARDS MOVE */}
                        <div className="w-64 p-6 bg-emerald-50 rounded-3xl border-2 border-emerald-200 shadow-lg transform rotate-3">
                          <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3">"TOWARDS" MOVES</h4>
                          <p className="text-[10px] text-emerald-400 mb-4 leading-tight">Moving towards the outcome you want. Behaving like the person you want to be.</p>
                          <div className="space-y-2">
                            <div className="p-2 bg-white rounded-lg text-[10px] font-bold text-slate-600 border border-emerald-100 italic">
                              "{s7SmartGoal.specific || 'Your SMART Goal'}"
                            </div>
                            <div className="p-2 bg-white rounded-lg text-[10px] font-bold text-slate-600 border border-emerald-100 italic">
                              "{s7SelectedValue || 'Your Value'}"
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-4">
                        <div className="px-8 py-4 bg-indigo-600 text-white rounded-full font-black text-sm shadow-xl z-20">
                          CHOICE POINT
                        </div>
                        <div className="w-64 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Challenging Situation</p>
                          <p className="text-xs font-bold text-slate-700 italic">"When {s7Barriers[0] || 'a trigger'} shows up..."</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                  <button onClick={nextStep} className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700">Continue to Closing</button>
                </div>
              </div>
            );
          }
        }

        // Handle Session 5 Grounding
        if (currentSession.number === 5 && currentStep.id === 'grounding-54321') {
          const groundingSteps = [
            { count: 5, sense: "See", icon: "fa-eye", color: "bg-blue-50 text-blue-600", prompt: "Look around you. Slowly notice 5 things you can see.", sub: "It can be anything — colors, shapes, light, objects. Take your time." },
            { count: 4, sense: "Touch", icon: "fa-hand", color: "bg-emerald-50 text-emerald-600", prompt: "Now, notice 4 things you can feel or touch.", sub: "Maybe your clothes on your skin, the chair under you, the floor under your feet, or the air on your face." },
            { count: 3, sense: "Hear", icon: "fa-ear-listen", color: "bg-amber-50 text-amber-600", prompt: "Now listen carefully. Notice 3 things you can hear.", sub: "It might be nearby sounds or distant sounds. There is no right or wrong answer." },
            { count: 2, sense: "Smell", icon: "fa-nose-hook", color: "bg-rose-50 text-rose-600", prompt: "Now bring attention to your sense of smell. Notice 2 things you can smell.", sub: "If you don’t notice a smell, that’s okay — simply notice the neutral air around you." },
            { count: 1, sense: "Taste", icon: "fa-mouth", color: "bg-indigo-50 text-indigo-600", prompt: "Finally, notice 1 thing you can taste.", sub: "It may be a recent drink, food, or just the natural taste in your mouth." }
          ];
          const curr = groundingSteps[groundingStep];

          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">5-4-3-2-1 Grounding</h3>
                <p className="text-slate-500 mt-2 font-medium italic">Grounding yourself in the here and now.</p>
              </div>

              <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-2xl min-h-[450px] flex flex-col items-center justify-center relative overflow-hidden text-center">
                <div className="absolute top-8 flex gap-2">
                  {groundingSteps.map((_, i) => (
                    <div key={i} className={`h-2 rounded-full transition-all ${i === groundingStep ? 'w-12 bg-indigo-600' : i < groundingStep ? 'w-4 bg-emerald-400' : 'w-4 bg-slate-200'}`}></div>
                  ))}
                </div>

                <div className={`w-24 h-24 ${curr.color} rounded-full flex items-center justify-center text-4xl mb-8 shadow-inner animate-in zoom-in duration-500`}>
                  <i className={`fa-solid ${curr.icon}`}></i>
                </div>

                <div className="space-y-6 max-w-lg">
                  <h4 className="text-4xl font-black text-slate-800 tracking-tight">Step {groundingStep + 1}: {curr.sense} {curr.count} Things</h4>
                  <p className="text-xl font-medium text-slate-600 leading-relaxed">{curr.prompt}</p>
                  <p className="text-sm text-slate-400 font-medium italic">{curr.sub}</p>
                </div>

                <div className="mt-10 flex flex-wrap justify-center gap-3">
                  {Array.from({ length: curr.count }).map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => i === groundingClicks && setGroundingClicks(prev => prev + 1)}
                      disabled={i > groundingClicks}
                      className={`w-14 h-14 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center ${i < groundingClicks ? curr.color.replace('text-', 'bg-').replace('50', '600') + ' text-white border-transparent shadow-lg' : i === groundingClicks ? 'border-indigo-400 border-dashed bg-indigo-50/50 animate-pulse cursor-pointer' : 'border-slate-200 border-dashed text-slate-200 cursor-not-allowed'}`}
                    >
                      <i className={`fa-solid ${curr.icon} ${i < groundingClicks ? 'opacity-100' : 'opacity-20'}`}></i>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    if (groundingStep > 0) {
                      setGroundingStep(prev => prev - 1);
                      setGroundingClicks(0);
                    } else {
                      prevStep();
                    }
                  }} 
                  className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200"
                >
                  Back
                </button>
                <button 
                  onClick={() => {
                    if (groundingStep < groundingSteps.length - 1) {
                      setGroundingStep(prev => prev + 1);
                      setGroundingClicks(0);
                    } else {
                      nextStep();
                    }
                  }} 
                  disabled={groundingClicks < curr.count}
                  className={`flex-1 py-5 rounded-3xl font-black text-lg shadow-xl transition-all ${groundingClicks < curr.count ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  {groundingStep < groundingSteps.length - 1 ? 'Next Sense' : 'Complete Grounding'}
                </button>
              </div>
            </div>
          );
        }

        // Handle Session 3 Visual Defusion
        if (currentSession.number === 3 && currentStep.id === 'visual-defusion') {
          const thought = stepInputs['bothering_thought'] || "I am broken";
          const visuals = [
            { name: "Children's Book", style: "font-serif text-pink-500 bg-yellow-50 p-8 rounded-lg border-4 border-yellow-200 shadow-inner", icon: "fa-book-open" },
            { name: "Restaurant Menu", style: "font-serif italic text-slate-800 bg-stone-50 p-8 border-double border-4 border-stone-300", icon: "fa-utensils" },
            { name: "Floating Clouds", style: "bg-sky-400 text-white p-12 rounded-full shadow-lg animate-bounce", icon: "fa-cloud" },
            { name: "Leaves on Stream", style: "bg-emerald-500 text-white p-8 rounded-tr-[3rem] rounded-bl-[3rem] animate-pulse", icon: "fa-leaf" },
            { name: "Weather Animation", style: "bg-slate-800 text-cyan-400 p-8 border-l-4 border-cyan-400 font-mono", icon: "fa-cloud-showers-heavy" },
            { name: "Birthday Cake", style: "bg-rose-100 text-rose-500 p-10 rounded-full border-4 border-dashed border-rose-300 font-black", icon: "fa-cake-candles" },
            { name: "Blackboard", style: "bg-slate-700 text-white p-10 border-8 border-stone-800 font-mono italic", icon: "fa-chalkboard" },
            { name: "T-Shirt Slogan", style: "bg-white text-black p-12 border border-slate-200 shadow-sm uppercase font-black", icon: "fa-shirt" },
            { name: "Computer Screen", style: "bg-black text-green-500 p-8 font-mono overflow-hidden whitespace-nowrap animate-pulse", icon: "fa-terminal" }
          ];

          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Visualizing the Thought</h3>
                <p className="text-slate-500 mt-2 font-medium">Notice how the thought changes when you see it in different ways.</p>
              </div>

              <div className="bg-slate-100 rounded-[4rem] p-12 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1">
                  {visuals.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all ${i === activeVisualIdx ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-300'}`}></div>
                  ))}
                </div>

                <div className={`transition-all duration-500 transform ${visuals[activeVisualIdx].style} max-w-md text-center shadow-2xl`}>
                  <p className="text-2xl font-bold break-words">
                    {activeVisualIdx === 8 ? thought.split('').join(' ') : thought}
                  </p>
                </div>

                <div className="mt-12 flex items-center gap-6">
                  <button 
                    onClick={() => setActiveVisualIdx(prev => Math.max(0, prev - 1))}
                    disabled={activeVisualIdx === 0}
                    className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm"
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  <div className="text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Style {activeVisualIdx + 1} of {visuals.length}</span>
                    <span className="text-sm font-bold text-slate-700">{visuals[activeVisualIdx].name}</span>
                  </div>
                  <button 
                    onClick={() => setActiveVisualIdx(prev => Math.min(visuals.length - 1, prev + 1))}
                    disabled={activeVisualIdx === visuals.length - 1}
                    className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm"
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                <button onClick={nextStep} className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700">Continue to Reflection</button>
              </div>
            </div>
          );
        }

        // Handle Session 12 Custom UI within the dynamic framework
        if (currentSession.number === 12) {
          if (currentStep.id === 'exercise-12') {
            // Re-use the existing Session 12 logic but adapted
            return (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                 <div className="text-center">
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">Resilience Survival Kit</h3>
                    <p className="text-slate-500 mt-2 font-medium">Identify your triggers and the skills you will use to stay flexible.</p>
                 </div>
                 <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-8 max-w-4xl mx-auto">
                    <p className="text-center font-bold text-slate-600 italic">"You have the tools. Now let's map them to your life."</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <button onClick={() => setS12SelectedTriggers(['Crowded spaces', 'Loud noises'])} className="p-8 bg-indigo-50 rounded-3xl border border-indigo-100 text-indigo-900 font-bold hover:bg-indigo-100 transition-all">
                          <i className="fa-solid fa-bolt mb-3 block text-2xl"></i>
                          Quick Map Triggers
                       </button>
                       <button onClick={() => setS12SelectedSigns(['w1', 'w2'])} className="p-8 bg-rose-50 rounded-3xl border border-rose-100 text-rose-900 font-bold hover:bg-rose-100 transition-all">
                          <i className="fa-solid fa-flag mb-3 block text-2xl"></i>
                          Quick Map Signs
                       </button>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                    <button onClick={nextStep} className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700">Continue to Closing</button>
                 </div>
              </div>
            );
          }
        }

        // Handle Specific Therapy Exercises (S1, S2, S3, S4, S6, S9, S10, S11, S12)
        const isSpecialExercise = 
          (currentSession.number === 1 && currentStep.id === 'exercise-1') ||
          (currentSession.number === 2 && currentStep.id === 'exercise-2') ||
          (currentSession.number === 3 && (currentStep.id === 'struggle-switch' || currentStep.id === 'visual-defusion')) ||
          (currentSession.number === 4 && (currentStep.id === 'metaphor-choice' || currentStep.id === 'chessboard-exercise' || currentStep.id === 'auditory-defusion')) ||
          (currentSession.number === 6 && currentStep.id === 'exercise-6') ||
          (currentSession.number === 9 && currentStep.id === 'two-mountains-s9') ||
          (currentSession.number === 10 && (currentStep.id === 'grief-forgiveness-meditation' || currentStep.id === 'self-acceptance' || currentStep.id === 'forgiving-yourself')) ||
          (currentSession.number === 11 && (currentStep.id === 'moral-injury-intro' || currentStep.id === 'struggle-switch-s11' || currentStep.id === 'cognitive-defusion-s11')) ||
          (currentSession.number === 12 && currentStep.id === 'passengers-on-bus-s12');

        if (isSpecialExercise) {
          let icon = 'fa-leaf';
          let colorClass = 'bg-emerald-50 text-emerald-600';
          let bgUrl = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80';
          let subtitle = 'A core ACT exercise for psychological flexibility.';

          if (currentStep.id === 'exercise-1') {
            icon = 'fa-anchor';
            colorClass = 'bg-blue-50 text-blue-600';
            bgUrl = 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80';
            subtitle = 'A grounding exercise to stabilize yourself in the present.';
          } else if (currentStep.id === 'exercise-2') {
            icon = 'fa-leaf';
            colorClass = 'bg-emerald-50 text-emerald-600';
            bgUrl = 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80';
            subtitle = 'Observing thoughts without getting hooked by them.';
          } else if (currentStep.id === 'struggle-switch' || currentStep.id === 'struggle-switch-s11') {
            icon = 'fa-toggle-on';
            colorClass = 'bg-amber-50 text-amber-600';
            bgUrl = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80';
            subtitle = 'Learning to drop the struggle with difficult emotions.';
          } else if (currentStep.id === 'visual-defusion') {
            icon = 'fa-eye';
            colorClass = 'bg-purple-50 text-purple-600';
            bgUrl = 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80';
            subtitle = 'Visualizing thoughts in different ways to reduce their power.';
          } else if (currentStep.id === 'auditory-defusion') {
            icon = 'fa-volume-high';
            colorClass = 'bg-pink-50 text-pink-600';
            bgUrl = 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80';
            subtitle = 'Changing how thoughts sound to unhook from them.';
          } else if (currentStep.id === 'metaphor-choice') {
            icon = 'fa-cloud-sun';
            colorClass = 'bg-sky-50 text-sky-600';
            bgUrl = 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1200&q=80';
            subtitle = 'Observing thoughts like weather in the sky.';
          } else if (currentStep.id === 'chessboard-exercise') {
            icon = 'fa-chess-board';
            colorClass = 'bg-slate-50 text-slate-600';
            bgUrl = 'https://images.unsplash.com/photo-1529697210530-8c4bb1358ce7?auto=format&fit=crop&w=1200&q=80';
            subtitle = 'Taking the perspective of the observer.';
          } else if (currentStep.id === 'exercise-6') {
            icon = 'fa-compass';
            colorClass = 'bg-indigo-50 text-indigo-600';
            bgUrl = 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=1200&q=80';
            subtitle = 'Distinguishing between the direction (values) and the destination (goals).';
          } else if (currentStep.id === 'two-mountains-s9') {
            icon = 'fa-mountain-sun';
            colorClass = 'bg-slate-50 text-slate-600';
            bgUrl = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80';
            subtitle = 'Visualizing the balance between pain and values.';
          } else if (currentStep.id === 'grief-forgiveness-meditation') {
            const hasAbuseHistory = user?.traumaHistory?.abuseEmotional || 
                                    user?.traumaHistory?.abusePhysical || 
                                    user?.traumaHistory?.abuseSexual;
            icon = 'fa-heart-pulse';
            colorClass = 'bg-rose-50 text-rose-600';
            bgUrl = 'https://images.unsplash.com/photo-1516589174184-c685266e430c?auto=format&fit=crop&w=1200&q=80';
            subtitle = hasAbuseHistory ? 'A specialized exercise for healing from past harm.' : 'A guided exploration of grief and the choice to forgive.';
            if (hasAbuseHistory) {
              currentStep.title = 'Healing from Hurt';
              currentStep.content = "Sit comfortably and, if it feels safe, gently close your eyes or lower your gaze. Take a slow breath in… and slowly breathe out. Feel your feet on the ground and notice that you are here, in this moment, and safe right now. Notice three things you can see, two things you can feel in your body, and one sound you can hear. Let your body settle.\n\nNow gently bring awareness to the hurt or loss you have experienced. You do not need to go into details. Just acknowledge the impact. Notice what emotions are present — sadness, anger, fear, disappointment, or something else. Silently say to yourself, ‘This hurt me.’ ‘What happened was painful.’ Allow your feelings to be real and valid. There is nothing wrong with you for feeling this way.\n\nAs thoughts appear, such as ‘I am broken’ or ‘I will never heal,’ gently create a little space from them. Say, ‘I am noticing the thought that I am broken.’ Notice that you are the one observing the thought. You are not the trauma. You are not the pain. You are the person who has survived it.\n\nNow gently consider forgiveness. Forgiveness does not mean saying what happened was okay. It does not mean forgetting. It does not mean allowing harm again. Forgiveness, if you choose it, is about freeing yourself from carrying the heavy weight of anger or resentment forever. Ask yourself softly, ‘Am I willing to loosen my grip on this pain, even a little?’ There is no pressure. You can move at your own pace.\n\nShift your focus toward yourself. You might say, ‘I deserve peace.’ ‘I choose to move toward healing.’ ‘I may still feel pain, but I do not want this pain to control my future.’ Notice what kind of person you want to be moving forward — strong, compassionate, boundaried, courageous. Even with grief present, you can take small steps toward these values.\n\nTake one more slow breath in… and slowly breathe out. Feel the ground beneath you. Notice the room around you. When you are ready, gently open your eyes. Remember, healing does not mean forgetting. It means learning to carry your story with strength while choosing the direction of your life.";
            }
          } else if (currentStep.id === 'self-acceptance') {
            icon = 'fa-shield-heart';
            colorClass = 'bg-emerald-50 text-emerald-600';
            bgUrl = 'https://images.unsplash.com/photo-1499209974431-9dac3adaf471?auto=format&fit=crop&w=1200&q=80';
            subtitle = 'A specialized exercise for self-compassion and healing.';
          } else if (currentStep.id === 'forgiving-yourself') {
            icon = 'fa-hand-holding-heart';
            colorClass = 'bg-indigo-50 text-indigo-600';
            bgUrl = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80';
            subtitle = 'Choosing growth over self-punishment.';
          } else if (currentStep.id === 'moral-injury-intro') {
            icon = 'fa-dove';
            colorClass = 'bg-slate-50 text-slate-600';
            bgUrl = 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=1200&q=80';
            subtitle = 'Addressing wounds to the soul with integrity.';
          } else if (currentStep.id === 'cognitive-defusion-s11') {
            icon = 'fa-brain';
            colorClass = 'bg-violet-50 text-violet-600';
            bgUrl = 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1200&q=80';
            subtitle = 'Creating space from harsh self-judgments.';
          } else if (currentStep.id === 'passengers-on-bus-s12') {
            icon = 'fa-bus';
            colorClass = 'bg-amber-50 text-amber-600';
            bgUrl = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80';
            subtitle = 'Being the driver of your life, regardless of the passengers.';
          }

          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{currentStep.title}</h3>
                <p className="text-slate-500 mt-2 font-medium italic">{subtitle}</p>
              </div>

              <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-2xl relative overflow-hidden group">
                {/* Background Image Metaphor */}
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
                            } else if (audioContextRef.current) {
                              audioContextRef.current.suspend();
                              setIsAudioPlaying(false);
                              setIsAudioPaused(true);
                            } else {
                              stopAllAudio();
                            }
                          } else if (isAudioPaused) {
                            if (staticAudioRef.current) {
                              staticAudioRef.current.play();
                              setIsAudioPlaying(true);
                              setIsAudioPaused(false);
                            } else if (audioContextRef.current) {
                              audioContextRef.current.resume();
                              setIsAudioPlaying(true);
                              setIsAudioPaused(false);
                            }
                          } else {
                            if (currentStep.audioUrl) {
                              playSessionNarration(currentStep.id, currentStep.content, currentStep.audioUrl);
                            } else {
                              playTTS(currentStep.content);
                            }
                          }
                        }}
                        disabled={isTTSAvailable === false && !currentStep.audioUrl}
                        className={`group relative flex items-center justify-center w-24 h-24 rounded-full transition-all ${
                          isAudioPlaying ? 'bg-indigo-600 text-white scale-110 shadow-indigo-200' : 'bg-white border-2 border-slate-100 text-slate-400 hover:border-indigo-500 hover:text-indigo-600'
                        } shadow-xl`}
                      >
                        {isAudioPlaying ? (
                          <i className="fa-solid fa-pause text-2xl"></i>
                        ) : (
                          <i className="fa-solid fa-play text-2xl ml-1"></i>
                        )}
                      </button>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {isAudioPlaying ? 'Playing Exercise' : isAudioPaused ? 'Paused' : 'Play Audio'}
                      </span>
                    </div>
                    
                    <button 
                      onClick={() => setShowExerciseText(!showExerciseText)}
                      className="px-6 py-2 bg-slate-50 text-slate-500 rounded-full text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      {showExerciseText ? 'Hide Text' : 'View Text'}
                    </button>
                  </div>

                  {showExerciseText && (
                    <div className="w-full max-h-80 overflow-y-auto pr-4 space-y-6 text-slate-600 font-medium leading-relaxed animate-in fade-in slide-in-from-top-4 duration-500 custom-scrollbar text-center">
                      <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 italic">
                        {currentStep.content.split('\n\n').map((p: string, i: number) => (
                          <p key={i} className={i > 0 ? 'mt-4' : ''}>{p}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                <button onClick={nextStep} className="flex-1 py-5 bg-emerald-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-emerald-700">Complete Exercise</button>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-10 animate-in zoom-in-95 duration-700 max-w-4xl mx-auto text-center">
            <h3 className="text-3xl font-black text-slate-800 tracking-tight px-10">{currentStep.title}</h3>
            <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-2xl min-h-[400px] flex flex-col justify-center relative overflow-hidden group">
               <div className="relative z-10 space-y-8">
                  <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner animate-pulse">
                     <i className={`fa-solid ${currentStep.type === 'meditation' ? 'fa-spa' : 'fa-puzzle-piece'}`}></i>
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
                          } else if (audioContextRef.current) {
                            audioContextRef.current.suspend();
                            setIsAudioPlaying(false);
                            setIsAudioPaused(true);
                          } else {
                            stopAllAudio();
                          }
                        } else if (isAudioPaused) {
                          if (staticAudioRef.current) {
                            staticAudioRef.current.play();
                            setIsAudioPlaying(true);
                            setIsAudioPaused(false);
                          } else if (audioContextRef.current) {
                            audioContextRef.current.resume();
                            setIsAudioPlaying(true);
                            setIsAudioPaused(false);
                          }
                        } else {
                          if (currentStep.audioUrl) {
                            playSessionNarration(currentStep.id, currentStep.content, currentStep.audioUrl);
                          } else {
                            playTTS(currentStep.content);
                          }
                        }
                      }}
                      className={`mx-auto flex items-center justify-center w-16 h-16 rounded-full transition-all ${
                        isAudioPlaying ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
                      }`}
                    >
                      {isAudioPlaying ? <i className="fa-solid fa-pause text-xl"></i> : <i className="fa-solid fa-play text-xl ml-1"></i>}
                    </button>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mt-3">
                      {isAudioPlaying ? 'Playing' : isAudioPaused ? 'Paused' : 'Replay Audio'}
                    </p>
                  </div>
               </div>
            </div>
            <div className="flex gap-4">
              <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
              <button onClick={nextStep} className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700">Complete Exercise</button>
            </div>
          </div>
        );

      case 'closing':
        return (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
             <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Session Review</h3>
                <p className="text-slate-500 mt-2 font-medium">Consolidating your progress for Session {currentSession.number}.</p>
             </div>
             <div className="bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-2xl space-y-10 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
                   <div className="space-y-6">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <i className="fa-solid fa-award text-indigo-500"></i>
                         Module Mastered
                      </h4>
                      <p className="text-sm text-slate-600 font-medium">
                        You have successfully navigated the concepts of **{currentSession.title}**.
                      </p>
                   </div>
                   <div className="space-y-6">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <i className="fa-solid fa-list-check text-emerald-500"></i>
                         Final Thought
                      </h4>
                      <p className="text-sm text-slate-600 font-medium italic">
                        "{currentStep.content}"
                      </p>
                   </div>
                </div>
             </div>
             <div className="flex gap-4">
                <button onClick={prevStep} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200">Back</button>
                <button onClick={nextStep} className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all">Submit Session Logs</button>
             </div>
          </div>
        );

      default: return null;
    }
  };

  const renderContent = () => {
    if (step === 'distress-before') {
      return <MoodCheckIn sessionNumber={currentSession.number} onComplete={handleDistressBeforeComplete} />;
    }

    if (step === 'distress-after') {
      return (
        <div className="max-w-2xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-700 py-10">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto shadow-inner"><i className="fa-solid fa-heart-pulse"></i></div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">Final Check-in</h2>
            <p className="text-slate-500 font-medium italic">How is your distress level now that we've finished the session?</p>
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
                        ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-100'
                        : 'bg-slate-50 border-transparent hover:border-rose-200 hover:bg-white'
                    }`}
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{opt.emoji}</span>
                    <div className="text-center">
                      <span className={`block text-[8px] font-black uppercase tracking-tighter ${distressAfter === opt.value ? 'text-rose-100' : 'text-slate-400'}`}>
                        Level {opt.value}
                      </span>
                      <span className={`block text-[7px] font-bold leading-tight mt-0.5 ${distressAfter === opt.value ? 'text-white' : 'text-slate-500'}`}>
                        {opt.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {distressAfter !== null && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center animate-in fade-in duration-300">
                  <p className="text-sm text-slate-600 font-medium">
                    {distressAfter >= 8 ? "You're feeling great! Excellent work today." : 
                     distressAfter >= 6 ? "You're feeling okay. Take this positive energy with you." : 
                     distressAfter >= 4 ? "You're noticing some distress. Remember your grounding tools." : 
                     "Your distress is high. Please consider using the Crisis Button tools before exiting."}
                  </p>
                </div>
              )}
            </div>
          </div>

          <button 
            disabled={distressAfter === null}
            onClick={finishSession} 
            className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            Submit Session Logs <i className="fa-solid fa-paper-plane text-sm"></i>
          </button>
        </div>
      );
    }

    if (step === 'reflection') {
      return (
        <div className="max-w-2xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-700 py-10">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto shadow-inner"><i className="fa-solid fa-flag-checkered"></i></div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">Session Logged</h2>
            <p className="text-slate-500 font-medium">Your progress has been saved to your clinical record.</p>
          </div>
          <button onClick={() => navigate('/')} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3">Return to Dashboard <i className="fa-solid fa-house text-sm"></i></button>
        </div>
      );
    }

    const currentStep = sessionSteps[currentStepIdx];
    if (currentStep) {
      return renderDynamicStep(currentStep);
    }

    // Fallback for closing state
    return (
      <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700 text-center">
        <div className={`${themeClasses.primary} rounded-[3.5rem] p-16 text-white shadow-2xl space-y-10 overflow-hidden relative`}>
           <div className="absolute top-0 right-0 p-8 opacity-10"><i className="fa-solid fa-trophy text-[20rem]"></i></div>
           <div className="relative z-10 space-y-8">
             <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl mx-auto shadow-xl animate-bounce"><i className="fa-solid fa-check-double"></i></div>
             <h3 className="text-4xl font-black tracking-tight uppercase tracking-widest">Session Complete</h3>
           </div>
        </div>
        {!hasNarrationFinished ? (
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Wait for closing thoughts...</p>
        ) : (
          <button onClick={finishSession} className={`w-full py-5 ${themeClasses.button} rounded-3xl font-black text-lg shadow-xl animate-in fade-in`}>Finalize and Exit</button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 relative min-h-screen">
      {isPaused && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-12 text-center shadow-2xl space-y-8 animate-in zoom-in-95">
             <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto shadow-inner"><i className="fa-solid fa-hourglass-start"></i></div>
             <h2 className="text-3xl font-black text-slate-800 tracking-tight">Session Paused</h2>
             <button onClick={() => setIsPaused(false)} className={`w-full py-5 ${themeClasses.button} rounded-2xl font-black text-lg shadow-xl`}>Resume Session</button>
             <button onClick={() => setShowExitConfirm(true)} className="w-full py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Exit Session</button>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 z-[110] bg-slate-900/95 backdrop-blur-lg flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-sm bg-white rounded-[2.5rem] p-10 text-center shadow-2xl space-y-6">
            <h3 className="text-xl font-black text-slate-800">Exit Session?</h3>
            <p className="text-sm text-slate-500">Your progress for this module won't be finalized.</p>
            <div className="flex flex-col gap-3 pt-2">
              <button onClick={handleExitSession} className="w-full py-4 bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg">Yes, Exit</button>
              <button onClick={() => { setShowExitConfirm(false); setIsPaused(false); }} className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest">No, Stay</button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md px-8 py-4 flex justify-between items-center mb-8 border-b border-slate-200/50">
        <div className="flex items-center gap-4">
          <div className={`w-8 h-8 ${themeClasses.primary} rounded-lg flex items-center justify-center text-white text-xs shadow-sm`}><i className="fa-solid fa-play"></i></div>
          <div>
            <h1 className="text-[12px] font-black text-slate-800 uppercase tracking-tighter">
              Session {currentSession.number} • {step === 'distress-before' ? 'Initial Check-in' : step === 'distress-after' ? 'Final Check-in' : step === 'reflection' ? 'Complete' : `Step ${currentStepIdx + 1} of ${sessionSteps.length}`}
            </h1>
            <div className="flex gap-1.5 mt-0.5">
               {[1, 2, 3, 4, 5, 6].map((i) => (
                 <div key={i} className={`h-1 rounded-full transition-all ${i <= getProgressCount() ? `w-8 ${themeClasses.primary}` : 'w-4 bg-slate-200'}`}></div>
               ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {audioLoading && <img src="https://i.ibb.co/FkV0M73k/brain.png" className="w-5 h-5 brain-loading-img mr-2" />}
          {quotaExceeded && (
            <div className="bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg flex items-center gap-2 mr-4 animate-in slide-in-from-top-2">
              <i className="fa-solid fa-triangle-exclamation text-amber-500 text-xs"></i>
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Quota Limit Hit</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const currentStep = sessionSteps[currentStepIdx];
                    if (currentStep) {
                      let activeScript = currentStep.content || `Let's focus on ${currentStep.title}.`;
                      playSessionNarration(currentStep.id, activeScript);
                    }
                  }}
                  className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded text-[8px] font-black hover:bg-amber-300 transition-colors"
                >
                  Retry
                </button>
                <button 
                  onClick={() => { setIsMuted(true); localStorage.setItem('session_muted', 'true'); setQuotaExceeded(false); stopAllAudio(); }}
                  className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[8px] font-black hover:bg-rose-200 transition-colors"
                >
                  Mute
                </button>
              </div>
            </div>
          )}
          <button 
            onClick={toggleMute}
            className={`w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center transition-all shadow-sm ${isMuted ? 'text-rose-500 bg-rose-50' : `text-slate-400 bg-white hover:${themeClasses.text}`}`}
            title={isMuted ? "Unmute Narration" : "Mute Narration"}
          >
            <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
          </button>
          <button onClick={() => setIsPaused(true)} className={`w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:${themeClasses.text} transition-all shadow-sm`}><i className="fa-solid fa-pause"></i></button>
          <button onClick={() => { setShowExitConfirm(true); setIsPaused(true); }} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all shadow-sm"><i className="fa-solid fa-xmark"></i></button>
        </div>
      </header>
      <div className={`px-6 md:px-10 transition-all duration-500 ${isPaused ? 'opacity-0 blur-sm scale-95' : 'opacity-100'}`}>
        {renderContent()}
      </div>
    </div>
  );
};

export default VirtualSession;
