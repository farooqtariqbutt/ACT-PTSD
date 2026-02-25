
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MoodCheckIn from './MoodCheckIn';
import { THERAPY_SESSIONS, SessionResult, SessionData } from '../types';
import { generateGuidedMeditation, decodeBase64, decodeAudioData } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { useApp } from '../contexts/AppContext';

type SessionStep = 
  | 'mood' 
  | 'intro' 
  | 'generic-review' | 'generic-exercise' | 'generic-closing'
  | 's12-reflection' | 's12-triggers' | 's12-warning-signs' | 's12-skills-map' | 's12-bus-meditation' | 's12-plan-summary'
  | 'closing' | 'reflection';

const PTSD_TRIGGERS_LIST = [
  "Crowded spaces", "Loud noises", "Conflict with family", "Work stress", "Anniversaries", "Specific smells/places", "Feelings of failure", "Nightmares"
];

const WARNING_SIGNS_LIST = [
  { id: 'w1', text: "Repeated unwanted memories or nightmares" },
  { id: 'w2', text: "Flashbacks or strong reactions to reminders" },
  { id: 'w3', text: "Avoiding places, people, or thoughts" },
  { id: 'w4', text: "Feeling numb, detached, guilty, or ashamed" },
  { id: 'w5', text: "Irritability, anger, or being easily startled" },
  { id: 'w6', text: "Trouble sleeping or concentrating" },
  { id: 'w7', text: "Feeling constantly on guard or unsafe" }
];

const ACT_SKILLS_LIST = [
  { id: 'grounding', name: 'Grounding', icon: 'fa-anchor' },
  { id: 'defusion', name: 'Defusion', icon: 'fa-scissors' },
  { id: 'acceptance', name: 'Acceptance', icon: 'fa-heart' },
  { id: 'action', name: 'Committed Action', icon: 'fa-play' },
  { id: 'crisis', name: 'Crisis Button', icon: 'fa-bolt-lightning' }
];

const VirtualSession: React.FC = () => {
  const { currentUser: user } = useApp();
  const navigate = useNavigate();
  const { sessionNumber } = useParams();
  const sessionIdx = sessionNumber ? parseInt(sessionNumber, 10) - 1 : 0;
  
  const [step, setStep] = useState<SessionStep>('mood');
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const clientName = user.name.split(' ')[0] || "Client";

  // Audio Control State
  const [hasNarrationFinished, setHasNarrationFinished] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  
  const staticAudioRef = useRef<HTMLAudioElement | null>(null);
  const geminiAudioRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const narrationIdRef = useRef<number>(0);

  // Persistent States
  const [moodBefore, setMoodBefore] = useState<number>(3);
  
  // Generic states for placeholder sessions
  const [genericReflection, setGenericReflection] = useState('');

  // Session 12 States
  const [s12Review, setS12Review] = useState('');
  const [s12SelectedTriggers, setS12SelectedTriggers] = useState<string[]>([]);
  const [s12CustomTrigger, setS12CustomTrigger] = useState('');
  const [s12SelectedSigns, setS12SelectedSigns] = useState<string[]>([]);
  const [s12SkillsMap, setS12SkillsMap] = useState<Record<string, string[]>>({});
  const [busStep, setBusStep] = useState(0);

  const currentSession = THERAPY_SESSIONS[sessionIdx] || THERAPY_SESSIONS[0];

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
    setIsAudioPlaying(false);
  };

  const playSessionNarration = async (stepId: string, fallbackPrompt?: string) => {
    stopAllAudio();
    const currentRequestId = narrationIdRef.current;
    
    setHasNarrationFinished(false);
    setAudioLoading(true);
    setQuotaExceeded(false);

    const staticUrl = `/audio/s${currentSession.number}_${stepId}.mp3`;

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

    if (fallbackPrompt && narrationIdRef.current === currentRequestId) {
      try {
        const { audioBase64 } = await generateGuidedMeditation(fallbackPrompt);
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

  useEffect(() => {
    // Generate scripts for Session 12 or Generic placeholders
    let activeScript = "";
    if (currentSession.number === 12) {
      const scriptsMap: Record<string, string> = {
        'intro': `Welcome to Session Twelve, ${clientName}. This is your Resilience Builder. Today we build a sustainable plan for long-term psychological flexibility.`,
        's12-triggers': "Let's begin by identifying your current triggers. Awareness is the prerequisite for flexibility.",
        's12-warning-signs': "Identify the red flags that show up in your body or mind when you are starting to feel 'hooked'.",
        's12-bus-meditation': "We will now practice the 'Passengers on the Bus' visualization. This will help you stay in the driver's seat of your life.",
        'closing': "Congratulations on completing the core 12-session journey. You have the tools to live a rich and meaningful life."
      };
      activeScript = scriptsMap[step] || "";
    } else {
      const genericScripts: Record<string, string> = {
        'intro': `Welcome to Session ${currentSession.number}, ${clientName}. Today we are focusing on ${currentSession.title}.`,
        'generic-review': `Let's start with a clinical check-in. How did your committed actions go since our last session?`,
        'generic-exercise': `For today's objective, which is ${currentSession.objective}, I'd like you to follow the instructions on your screen.`,
        'generic-closing': `You've done great work today. You're building the skills of psychological flexibility.`
      };
      activeScript = genericScripts[step] || "";
    }

    if (activeScript) {
      playSessionNarration(step, activeScript);
    } else {
      setHasNarrationFinished(true);
    }
    
    return () => stopAllAudio();
  }, [step, currentSession.number]);

  const handleMoodComplete = (score: number) => {
    setMoodBefore(score);
    setStep('intro');
  };

  const handleExitSession = () => {
    stopAllAudio();
    navigate('/');
  };

  const finishSession = () => {
    storageService.commitSessionResult(user.id, {
      sessionNumber: currentSession.number,
      timestamp: new Date().toISOString(),
      moodBefore: moodBefore,
      reflections: { 
        genericReflection,
        s12SelectedTriggers, 
        s12SelectedSigns, 
        s12SkillsMap 
      },
      completed: true
    });
    setStep('reflection');
  };

  // Helper to determine progress bar filled segments
  const getProgressCount = (): number => {
    const mapping: Partial<Record<SessionStep, number>> = {
      'mood': 0,
      'intro': 0,
      'generic-review': 1,
      's12-reflection': 1,
      'generic-exercise': 3,
      's12-triggers': 2,
      's12-warning-signs': 3,
      's12-skills-map': 4,
      's12-bus-meditation': 5,
      'generic-closing': 6,
      's12-plan-summary': 6,
      'closing': 6,
      'reflection': 6
    };
    return mapping[step] || 0;
  };

  const renderContent = () => {
    if (step === 'mood') {
      return <MoodCheckIn sessionNumber={currentSession.number} onComplete={handleMoodComplete} />;
    }

    if (step === 'intro') {
      return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
          <div className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-10"><i className="fa-solid fa-graduation-cap text-[12rem]"></i></div>
            <div className="relative z-10 space-y-6 text-center md:text-left">
              <h3 className="text-3xl md:text-4xl font-black tracking-tight">
                Session {currentSession.number}: {currentSession.title}
              </h3>
              <div className="prose prose-indigo text-slate-300 text-lg leading-relaxed max-w-2xl font-medium">
                <p>{currentSession.description}</p>
                <div className="mt-6 flex items-center gap-3 text-indigo-400">
                  <i className="fa-solid fa-bullseye"></i>
                  <span className="text-sm font-black uppercase tracking-widest">Objective: {currentSession.objective}</span>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setStep(currentSession.number === 12 ? 's12-reflection' : 'generic-review')} 
            className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all"
          >
            Begin Session
          </button>
        </div>
      );
    }

    // SESSION 12 CUSTOM CONTENT
    if (currentSession.number === 12) {
      switch (step) {
        case 's12-reflection':
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Clinical Check-In</h3>
                <p className="text-slate-500 mt-2 font-medium italic">Reflecting on moral repair and the 'Struggle Switch'.</p>
              </div>
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-6">
                <p className="text-lg text-slate-700 font-medium leading-relaxed text-center italic">
                  "How did it feel to pivot toward your values this week when guilt or shame showed up?"
                </p>
                <textarea 
                  value={s12Review}
                  onChange={(e) => setS12Review(e.target.value)}
                  placeholder="Share your experience..."
                  className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm font-medium"
                />
              </div>
              <button onClick={() => setStep('s12-triggers')} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800">Step 1: Identify Triggers</button>
            </div>
          );

        case 's12-triggers':
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
               <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">1. Mapping Your Triggers</h3>
                  <p className="text-slate-500 mt-2 font-medium">What specific situations or thoughts typically "hook" you?</p>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                  {PTSD_TRIGGERS_LIST.map(t => (
                    <button
                      key={t}
                      onClick={() => setS12SelectedTriggers(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                      className={`p-6 rounded-[2rem] border-2 transition-all font-bold text-xs uppercase tracking-widest text-center h-28 flex items-center justify-center ${
                        s12SelectedTriggers.includes(t) ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
               </div>
               <div className="max-w-2xl mx-auto space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Personal / Custom Trigger</label>
                  <input 
                    type="text"
                    value={s12CustomTrigger}
                    onChange={(e) => setS12CustomTrigger(e.target.value)}
                    placeholder="Type another trigger here..."
                    className="w-full p-5 bg-white border border-slate-200 rounded-[2rem] text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
               </div>
               <button 
                disabled={s12SelectedTriggers.length === 0 && !s12CustomTrigger}
                onClick={() => setStep('s12-warning-signs')} 
                className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl"
               >Next: Early Warning Signs</button>
            </div>
          );

        case 's12-warning-signs':
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
               <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">2. Early Warning Signs</h3>
                  <p className="text-slate-500 mt-2 font-medium">Identify the physical or mental "red flags" that show up early.</p>
               </div>
               <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-4 max-w-3xl mx-auto">
                  {WARNING_SIGNS_LIST.map(sign => (
                    <button
                      key={sign.id}
                      onClick={() => setS12SelectedSigns(prev => prev.includes(sign.id) ? prev.filter(x => x !== sign.id) : [...prev, sign.id])}
                      className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center gap-6 text-left ${
                        s12SelectedSigns.includes(sign.id) ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-sm' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-white'
                      }`}
                    >
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${s12SelectedSigns.includes(sign.id) ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-200 text-white'}`}>
                          <i className="fa-solid fa-flag"></i>
                       </div>
                       <span className="font-bold text-sm leading-tight">{sign.text}</span>
                    </button>
                  ))}
               </div>
               <button 
                disabled={s12SelectedSigns.length === 0}
                onClick={() => setStep('s12-skills-map')} 
                className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl"
               >Step 3: ACT Skills Review</button>
            </div>
          );

        case 's12-skills-map':
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
               <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">3. Resilience Skill Matrix</h3>
                  <p className="text-slate-500 mt-2 font-medium">Assign your tools to your most frequent triggers.</p>
               </div>
               <div className="space-y-8 max-w-4xl mx-auto">
                  {s12SelectedTriggers.slice(0, 3).map(trigger => (
                    <div key={trigger} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-lg"><i className="fa-solid fa-bolt"></i></div>
                          <div>
                             <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">When I face:</h4>
                             <p className="text-lg font-bold text-indigo-600">{trigger}</p>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {ACT_SKILLS_LIST.map(skill => {
                            const isMapped = (s12SkillsMap[trigger] || []).includes(skill.id);
                            return (
                              <button
                                key={skill.id}
                                onClick={() => {
                                  const currentMap = s12SkillsMap[trigger] || [];
                                  const nextMap = currentMap.includes(skill.id) ? currentMap.filter(x => x !== skill.id) : [...currentMap, skill.id];
                                  setS12SkillsMap({...s12SkillsMap, [trigger]: nextMap});
                                }}
                                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                                  isMapped ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white'
                                }`}
                              >
                                 <i className={`fa-solid ${skill.icon} text-lg mb-1`}></i>
                                 <span className="text-[9px] font-black uppercase text-center leading-none">{skill.name}</span>
                              </button>
                            );
                          })}
                       </div>
                    </div>
                  ))}
               </div>
               <button 
                onClick={() => setStep('s12-bus-meditation')} 
                className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl"
               >Step 4: Passengers on the Bus</button>
            </div>
          );

        case 's12-bus-meditation':
          const busScripts = [
            "Sit comfortably. Imagine you are the driver of a bus. This bus represents your life.",
            "The road ahead represents your values — the direction you want your life to move in.",
            "Imagine there are passengers on your bus. These are your thoughts, feelings, and memories.",
            "Some are loud and frightening. They shout: 'Stop. It’s too risky.' But they cannot drive.",
            "Instead of arguing, simply acknowledge them. You say, 'I hear you.'",
            "You are the driver. Your hands are on the wheel. Keep driving toward what matters to you."
          ];
          const currBusText = busScripts[busStep];

          return (
            <div className="space-y-10 animate-in zoom-in-95 duration-700 max-w-4xl mx-auto text-center">
               <h3 className="text-3xl font-black text-slate-800 tracking-tight italic px-10">"The passengers are there, but you are the driver."</h3>
               <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-2xl min-h-[400px] flex flex-col justify-center relative overflow-hidden group">
                  <div className="relative z-10 space-y-10 animate-in fade-in slide-in-from-bottom-4" key={busStep}>
                     <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner animate-bounce">
                        <i className={`fa-solid ${busStep < 2 ? 'fa-bus-simple' : busStep < 5 ? 'fa-users' : 'fa-steering-wheel'}`}></i>
                     </div>
                     <p className="text-2xl md:text-3xl font-medium text-slate-700 leading-relaxed px-6">"{currBusText}"</p>
                  </div>
               </div>

               <div className="flex gap-4">
                  {busStep > 0 && (
                     <button onClick={() => setBusStep(prev => prev - 1)} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest transition-all hover:bg-slate-200"><i className="fa-solid fa-arrow-left"></i></button>
                  )}
                  {busStep < busScripts.length - 1 ? (
                     <button onClick={() => setBusStep(prev => prev + 1)} className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700">Continue Journey</button>
                  ) : (
                     <button onClick={() => setStep('s12-plan-summary')} className="flex-1 py-5 bg-emerald-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-emerald-700">Finalize Plan</button>
                  )}
               </div>
            </div>
          );

        case 's12-plan-summary':
          return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
               <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">Your Survival Kit</h3>
                  <p className="text-slate-500 mt-2 font-medium">Consolidated Relapse Prevention Strategy</p>
               </div>
               <div className="bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-2xl space-y-10 max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-6">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <i className="fa-solid fa-triangle-exclamation text-rose-500"></i>
                           Identified Triggers
                        </h4>
                        <div className="flex flex-wrap gap-2">
                           {s12SelectedTriggers.map(t => <span key={t} className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-[10px] font-black uppercase border border-slate-100">{t}</span>)}
                        </div>
                     </div>
                     <div className="space-y-6">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <i className="fa-solid fa-shield-halved text-emerald-500"></i>
                           The Pilot Mentality
                        </h4>
                        <p className="text-sm text-slate-600 font-medium italic">
                          "I notice my passengers but I am the one driving. I choose the direction of my life."
                        </p>
                     </div>
                  </div>
               </div>
               <button onClick={() => setStep('closing')} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all">Graduate Session XII</button>
            </div>
          );
      }
    }

    // UNIVERSAL GENERIC SESSION CONTENT (Sessions 1-11)
    switch (step) {
      case 'generic-review':
        return (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
            <div className="text-center">
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">Clinical Check-In</h3>
              <p className="text-slate-500 mt-2 font-medium italic">Connecting today's work to your previous progress.</p>
            </div>
            <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl space-y-6">
              <p className="text-lg text-slate-700 font-medium leading-relaxed text-center italic">
                "Think back to your committed actions this week. How did you handle the barriers that showed up?"
              </p>
              <textarea 
                value={genericReflection}
                onChange={(e) => setGenericReflection(e.target.value)}
                placeholder="Briefly describe your experience..."
                className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm font-medium"
              />
            </div>
            <button onClick={() => setStep('generic-exercise')} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800">Continue to Interactive Exercise</button>
          </div>
        );

      case 'generic-exercise':
        return (
          <div className="space-y-10 animate-in zoom-in-95 duration-700 max-w-4xl mx-auto text-center">
            <h3 className="text-3xl font-black text-slate-800 tracking-tight px-10">Core Skill Integration</h3>
            <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-2xl min-h-[400px] flex flex-col justify-center relative overflow-hidden group">
               <div className="relative z-10 space-y-8">
                  <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner animate-pulse">
                     <i className="fa-solid fa-puzzle-piece"></i>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Current Phase: {currentSession.title}</h4>
                    <p className="text-lg font-medium text-slate-500 max-w-lg mx-auto leading-relaxed italic">
                      "We are exploring {currentSession.objective.toLowerCase()} through experiential practice."
                    </p>
                  </div>
                  <div className="p-8 bg-indigo-50/50 rounded-3xl border border-indigo-100/50 max-w-md mx-auto">
                    <p className="text-sm font-bold text-indigo-700 leading-relaxed">
                      This module is currently active in the clinical test environment. Please proceed to the final review to log completion.
                    </p>
                  </div>
               </div>
            </div>
            <button onClick={() => setStep('generic-closing')} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700">Move to Session Closing</button>
          </div>
        );

      case 'generic-closing':
        return (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
             <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Session Review</h3>
                <p className="text-slate-500 mt-2 font-medium">Consolidating your progress for Session {currentSession.number}.</p>
             </div>
             <div className="bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-2xl space-y-10 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
                         Task Assigned
                      </h4>
                      <p className="text-sm text-slate-600 font-medium italic">
                        "Between now and our next session, practice noticing when you feel 'hooked' by a thought."
                      </p>
                   </div>
                </div>
             </div>
             <button onClick={() => setStep('closing')} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all">Submit Session Logs</button>
          </div>
        );

      case 'closing':
        return (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700 text-center">
            <div className="bg-indigo-600 rounded-[3.5rem] p-16 text-white shadow-2xl space-y-10 overflow-hidden relative">
               <div className="absolute top-0 right-0 p-8 opacity-10"><i className="fa-solid fa-trophy text-[20rem]"></i></div>
               <div className="relative z-10 space-y-8">
                 <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl mx-auto shadow-xl animate-bounce"><i className="fa-solid fa-check-double"></i></div>
                 <h3 className="text-4xl font-black tracking-tight uppercase tracking-widest">Session Complete</h3>
                 <p className="text-indigo-100 font-bold uppercase tracking-[0.2em] text-xs">Progress Logged in Clinical Record</p>
               </div>
            </div>
            {!hasNarrationFinished ? (
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Wait for closing thoughts...</p>
            ) : (
              <button onClick={finishSession} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl animate-in fade-in">Return to Roadmap</button>
            )}
          </div>
        );

      case 'reflection':
        return (
          <div className="max-w-2xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-700 py-10">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto shadow-inner"><i className="fa-solid fa-flag-checkered"></i></div>
              <h2 className="text-4xl font-black text-slate-800 tracking-tight">Full Curriculum Logged</h2>
            </div>
            <button onClick={() => navigate('/')} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3">Return to Dashboard <i className="fa-solid fa-house text-sm"></i></button>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 relative min-h-screen">
      {isPaused && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-12 text-center shadow-2xl space-y-8 animate-in zoom-in-95">
             <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto shadow-inner"><i className="fa-solid fa-hourglass-start"></i></div>
             <h2 className="text-3xl font-black text-slate-800 tracking-tight">Session Paused</h2>
             <button onClick={() => setIsPaused(false)} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl">Resume Session</button>
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
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs"><i className="fa-solid fa-play"></i></div>
          <div>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Session {currentSession.number}: {currentSession.title}</h1>
            <div className="flex gap-1.5 mt-0.5">
               {[1, 2, 3, 4, 5, 6].map((i) => (
                 <div key={i} className={`h-1 rounded-full transition-all ${i <= getProgressCount() ? 'w-8 bg-indigo-600' : 'w-4 bg-slate-200'}`}></div>
               ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {audioLoading && <img src="https://i.ibb.co/FkV0M73k/brain.png" className="w-5 h-5 brain-loading-img mr-2" />}
          {quotaExceeded && (
            <div className="bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg flex items-center gap-2 mr-4 animate-in slide-in-from-top-2">
              <i className="fa-solid fa-triangle-exclamation text-amber-500 text-xs"></i>
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Narration Muted (Quota Limit)</span>
            </div>
          )}
          <button onClick={() => setIsPaused(true)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all shadow-sm"><i className="fa-solid fa-pause"></i></button>
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
