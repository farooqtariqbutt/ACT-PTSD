
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MoodCheckIn from './MoodCheckIn';
import { THERAPY_SESSIONS, User, SessionResult, SessionData } from '../types';
import { generateGuidedMeditation, decodeBase64, decodeAudioData } from '../services/geminiService';
import { storageService } from '../services/storageService';

type SessionStep = 'mood' | 'intro' | 'practice-check' | 'inner-world' | 'noticing-conversion' | 'questions' | 'grounding' | 'reflection';

interface VirtualSessionProps {
  user: User;
}

const VirtualSession: React.FC<VirtualSessionProps> = ({ user }) => {
  const navigate = useNavigate();
  const { sessionNumber } = useParams();
  const sessionIdx = sessionNumber ? parseInt(sessionNumber, 10) - 1 : 0;
  
  const [step, setStep] = useState<SessionStep>('mood');
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  const clientName = user.name.split(' ')[0] || "Client";

  // Results to be committed to DB
  const [moodBefore, setMoodBefore] = useState<number>(3);
  
  // Session 1 state
  const [q1Responses, setQ1Responses] = useState<string[]>([]);
  const [q1Other, setQ1Other] = useState('');
  const [q2Response, setQ2Response] = useState<boolean | null>(null);
  const [q3Response, setQ3Response] = useState<boolean | null>(null);
  const [q4Response, setQ4Response] = useState('');

  // Session 2 state
  const [s2PracticeReflection, setS2PracticeReflection] = useState('');
  const [s2InnerWorld, setS2InnerWorld] = useState({ thoughts: '', feelings: '', sensations: '' });

  // Audio state
  const [audioLoading, setAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const currentSession = THERAPY_SESSIONS[sessionIdx] || THERAPY_SESSIONS[0];

  const logStep = (stepId: string, inputValue: any, stepTitle?: string) => {
    const data: SessionData = {
      sessionNumber: currentSession.number,
      stepId,
      stepTitle,
      inputValue,
      timestamp: new Date().toISOString()
    };
    storageService.addSessionData(user.id, data);
  };

  const handleMoodComplete = (score: number) => {
    setMoodBefore(score);
    logStep('session-start-mood', score, 'Pre-session Mood Check-in');
    setStep('intro');
  };

  const commitToDB = (isComplete: boolean = false) => {
    const reflections = currentSession.number === 1 
      ? { q1Responses, q1Other, q2Response, q3Response, q4Response }
      : { s2PracticeReflection, s2InnerWorld };

    const result: SessionResult = {
      sessionNumber: currentSession.number,
      timestamp: new Date().toISOString(),
      moodBefore: moodBefore,
      reflections: reflections,
      completed: isComplete
    };

    storageService.commitSessionResult(user.id, result);
  };

  const finishSession = () => {
    commitToDB(true);
    stopAudio();
    setStep('reflection');
  };

  const startGroundingAudio = async () => {
    setAudioLoading(true);
    try {
      let prompt = "";
      if (currentSession.number === 1) {
        prompt = `Dropping the Anchor meditation: Sit or lie down in a position that feels safe and relaxed. Feel the weight of your body. Bring attention to your feet. Notice tension. Look around and notice three things you can see, two things you hear, one thing you can touch. Breathe. Silently say: I am here. I am safe. I am in the present.`;
      } else if (currentSession.number === 2) {
        prompt = `"Leaves on a Stream" Exercise:
        (1) Sit in a comfortable position and either close your eyes or rest them gently on a fixed spot in the room.
        (2) Visualize yourself sitting beside a gently flowing stream with leaves floating along the surface of the water. (Include a 10 second silence here)
        (3) For the next few minutes, take each thought that enters your mind and place it on a leaf… let it float by. Do this with each thought – pleasurable, painful, or neutral. Even if you have joyous or enthusiastic thoughts, place them on a leaf and let them float by.
        (4) If your thoughts momentarily stop, continue to watch the stream. Sooner or later, your thoughts will start up again. (Include a 20 second silence here)
        (5) Allow the stream to flow at its own pace. Don’t try to speed it up and rush your thoughts along. You’re not trying to rush the leaves along or “get rid” of your thoughts. You are allowing them to come and go at their own pace.
        (6) If your mind says “This is dumb,” “I’m bored,” or “I’m not doing this right” place those thoughts on leaves, too, and let them pass. (Include a 20 second silence here)
        (7) If a leaf gets stuck, allow it to hang around until it’s ready to float by. If the thought comes up again, watch it float by another time. (Include a 20 second silence here)
        (8) If a difficult or painful feeling arises, simply acknowledge it. Say to yourself, “I notice myself having a feeling of boredom/impatience/frustration.” Place those thoughts on leaves and allow them float along.
        (9) From time to time, your thoughts may hook you and distract you from being fully present in this exercise. This is normal. As soon as you realize that you have become sidetracked, gently bring your attention back to the exercise.`;
      }

      const { audioBase64 } = await generateGuidedMeditation(prompt);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch (e) {}
      }

      const audioBuffer = await decodeAudioData(decodeBase64(audioBase64), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsAudioPlaying(false);
        setIsAudioPaused(false);
      };

      source.start();
      sourceRef.current = source;
      setIsAudioPlaying(true);
      setIsAudioPaused(false);
    } catch (err) {
      console.error(err);
      alert("Error generating session audio guide.");
    } finally {
      setAudioLoading(false);
    }
  };

  const toggleAudioPlayPause = async () => {
    if (!audioContextRef.current) return;
    if (audioContextRef.current.state === 'running') {
      await audioContextRef.current.suspend();
      setIsAudioPaused(true);
    } else {
      await audioContextRef.current.resume();
      setIsAudioPaused(false);
    }
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
      sourceRef.current = null;
    }
    setIsAudioPlaying(false);
    setIsAudioPaused(false);
  };

  const handleExitSession = () => {
    commitToDB(false); // Save partial progress
    stopAudio();
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    navigate('/');
  };

  const renderContent = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="bg-indigo-600 rounded-[3rem] p-10 md:p-16 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-10">
                <i className={`fa-solid ${currentSession.number === 2 ? 'fa-leaf' : 'fa-handshake'} text-[12rem]`}></i>
              </div>
              <div className="relative z-10 space-y-6">
                <h3 className="text-3xl md:text-4xl font-black tracking-tight">
                  {currentSession.number === 2 ? `${clientName}, welcome back!` : `Welcome to Session ${currentSession.number}`}
                </h3>
                <div className="prose prose-indigo text-indigo-100 text-lg leading-relaxed max-w-2xl">
                  {currentSession.number === 2 && <p className="font-bold">I hope you’ve had a good week.</p>}
                  <p>Find a position that feels comfortable for your body. Choose a place where you feel safe and have as few distractions as possible.</p>
                  <p className="italic">If at any point you feel uncomfortable, you can adjust your position or pause.</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => currentSession.number === 1 ? setStep('questions') : setStep('practice-check')} 
              className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all"
            >
              {currentSession.number === 1 ? 'Begin Exploration' : 'Continue'}
            </button>
          </div>
        );

      case 'practice-check':
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="text-center">
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">Check-in on Practice</h3>
              <p className="text-slate-500 mt-2">Reflecting on last week's skills.</p>
            </div>
            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm space-y-6">
              <p className="text-lg text-slate-700 font-medium">
                “Last week, we practiced the ‘Dropping the Anchor’ exercise. Can you tell me when and where you did it? Did you notice any changes in your body, mind, or emotions while doing it?”
              </p>
              <textarea 
                value={s2PracticeReflection}
                onChange={(e) => setS2PracticeReflection(e.target.value)}
                placeholder="Type your reflection here..."
                className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all text-sm font-medium leading-relaxed"
              />
            </div>
            <button onClick={() => { 
              logStep('practice-reflection', s2PracticeReflection, 'Reflecting on last week practice');
              commitToDB(); 
              setStep('inner-world'); 
            }} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all">
              Save & Next Step
            </button>
          </div>
        );

      case 'inner-world':
        return (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
            <div className="text-center">
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">Acknowledge Your Inner World</h3>
              <p className="text-slate-500 mt-2">Write down your answers to these simple questions.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { key: 'thoughts', label: 'What thoughts are in my mind right now?', icon: 'fa-brain', placeholder: 'e.g., I am worrying about...' },
                { key: 'feelings', label: 'What feelings am I noticing in my body?', icon: 'fa-heart', placeholder: 'e.g., I am noticing sadness...' },
                { key: 'sensations', label: 'What physical sensations am I aware of?', icon: 'fa-body-back', placeholder: 'e.g., I am having anxiety...' },
              ].map(field => (
                <div key={field.key} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4 group hover:border-indigo-500 transition-colors">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <i className={`fa-solid ${field.icon}`}></i>
                  </div>
                  <label className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight">{field.label}</label>
                  <textarea 
                    value={(s2InnerWorld as any)[field.key]}
                    onChange={(e) => setS2InnerWorld({...s2InnerWorld, [field.key]: e.target.value})}
                    placeholder={field.placeholder}
                    className="flex-1 w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[120px]"
                  />
                </div>
              ))}
            </div>
            <button onClick={() => { 
              logStep('inner-world-thoughts', s2InnerWorld.thoughts, 'Session 2: Current Thoughts');
              logStep('inner-world-feelings', s2InnerWorld.feelings, 'Session 2: Current Feelings');
              logStep('inner-world-sensations', s2InnerWorld.sensations, 'Session 2: Current Sensations');
              commitToDB(); 
              setStep('noticing-conversion'); 
            }} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all">
              Continue to Transformation
            </button>
          </div>
        );

      case 'noticing-conversion':
        return (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-3xl mx-auto">
            <div className="text-center">
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">Convert to Noticing</h3>
              <p className="text-slate-500 mt-2">Practice distancing yourself from these internal events by labeling them.</p>
            </div>
            <div className="bg-white rounded-[3rem] p-12 border border-slate-200 shadow-xl space-y-10">
              <div className="space-y-6">
                <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] text-center">Practice Exercise: Read Aloud</p>
                <div className="space-y-8">
                  <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-3xl animate-in zoom-in-95">
                    <p className="text-2xl font-black text-indigo-900 leading-snug">
                      "I am <span className="text-indigo-600 underline">having</span> the thought that <span className="italic">"{s2InnerWorld.thoughts || 'I am a failure'}"</span>"
                    </p>
                  </div>
                  <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-3xl animate-in zoom-in-95 delay-100">
                    <p className="text-2xl font-black text-emerald-900 leading-snug">
                      "I am <span className="text-emerald-600 underline">noticing</span> a feeling of <span className="italic">"{s2InnerWorld.feelings || 'sadness'}"</span>"
                    </p>
                  </div>
                  <div className="p-8 bg-rose-50 border border-rose-100 rounded-3xl animate-in zoom-in-95 delay-200">
                    <p className="text-2xl font-black text-rose-900 leading-snug">
                      "I am <span className="text-rose-600 underline">having</span> a sensation of <span className="italic">"{s2InnerWorld.sensations || 'anxiety'}"</span>"
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center animate-pulse">
                  <i className="fa-solid fa-microphone"></i>
                </div>
                <p className="text-sm font-bold text-slate-500 italic">Try saying these phrases out loud. Notice if it changes how heavy the thoughts feel.</p>
              </div>
            </div>
            <button onClick={() => {
              logStep('noticing-exercise-attempt', true, 'Acknowledged noticing exercise');
              setStep('grounding');
            }} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all">
              Next: Leaves on a Stream
            </button>
          </div>
        );

      case 'questions':
        const avoidanceOptions = ['Avoid people', 'Sleep too much', 'Overthink', 'Distract', 'Substance use', 'Suppress feelings'];
        return (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
            <div className="text-center">
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">Questionnaire</h3>
              <p className="text-slate-500 mt-2">Your responses help us understand you better.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-sm space-y-12">
              <div className="space-y-6">
                <label className="text-xl font-bold text-slate-800 block">Q1. What do you do when pain shows up?</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {avoidanceOptions.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setQ1Responses(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])}
                      className={`p-4 rounded-2xl border-2 text-left text-sm font-bold transition-all ${
                        q1Responses.includes(opt) ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <i className={`fa-solid ${q1Responses.includes(opt) ? 'fa-square-check' : 'fa-square'} mr-3`}></i>
                      {opt}
                    </button>
                  ))}
                  <div className="md:col-span-2">
                    <input 
                      type="text" 
                      placeholder="Others: Describe here..." 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={q1Other}
                      onChange={(e) => setQ1Other(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-10 border-t border-slate-50">
                <label className="text-xl font-bold text-slate-800 block">Q2. Did this help long-term?</label>
                <div className="flex gap-4">
                  {[true, false].map((val) => (
                    <button
                      key={val.toString()}
                      onClick={() => setQ2Response(val)}
                      className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest border-2 transition-all ${
                        q2Response === val ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-400'
                      }`}
                    >
                      {val ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6 pt-10 border-t border-slate-50">
                <label className="text-xl font-bold text-slate-800 block">Q3. Have these habits helped in the moment but caused stress later?</label>
                <div className="flex gap-4">
                  {[true, false].map((val) => (
                    <button
                      key={val.toString()}
                      onClick={() => setQ3Response(val)}
                      className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest border-2 transition-all ${
                        q3Response === val ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-400'
                      }`}
                    >
                      {val ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6 pt-10 border-t border-slate-50">
                <label className="text-xl font-bold text-slate-800 block">Q4. What did it cost you? / What did you lose in the process?</label>
                <p className="text-xs text-slate-400 font-medium italic">Example: distancing relationships, delaying important tasks, missing responsibilities</p>
                <textarea 
                  value={q4Response}
                  onChange={(e) => setQ4Response(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>
            </div>

            <button 
              onClick={() => { 
                logStep('avoidance-check', [...q1Responses, q1Other].filter(Boolean), 'What do you do when pain shows up?');
                logStep('long-term-effectiveness', q2Response, 'Did this help long-term?');
                logStep('immediate-relief-vs-long-term-stress', q3Response, 'Momentary help vs later stress');
                logStep('cost-of-avoidance', q4Response, 'What did it cost you?');
                commitToDB(); 
                setStep('grounding'); 
              }} 
              disabled={q2Response === null || q3Response === null}
              className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              Next: Dropping the Anchor
            </button>
          </div>
        );

      case 'grounding':
        return (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
            <div className="text-center">
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                {currentSession.number === 2 ? 'Leaves on a Stream' : 'Dropping the Anchor'}
              </h3>
              <p className="text-slate-500 mt-2 italic font-medium">
                {currentSession.number === 2 
                  ? 'A visualization to practice observing your thoughts without getting hooked.' 
                  : 'A grounding exercise to steady yourself in the present moment.'}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl space-y-8 h-fit lg:sticky lg:top-24">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-xl">
                    <i className={`fa-solid ${currentSession.number === 2 ? 'fa-leaf' : 'fa-anchor'}`}></i>
                  </div>
                  <h4 className="text-xl font-bold uppercase tracking-tight">Audio Guide</h4>
                </div>
                
                <div className="bg-white/10 p-8 rounded-3xl border border-white/10 backdrop-blur-sm space-y-6">
                  <div className="flex items-center justify-between text-indigo-300 text-[10px] font-black uppercase tracking-widest">
                    <span>{currentSession.number === 2 ? 'Leaves on a Stream' : 'Grounding Meditation'}</span>
                    <span>{isAudioPlaying ? (isAudioPaused ? 'Paused' : 'Playing') : 'Ready to Start'}</span>
                  </div>
                  <div className="flex items-center justify-center gap-8">
                    <button onClick={stopAudio} disabled={!isAudioPlaying} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-rose-400 disabled:opacity-20"><i className="fa-solid fa-stop"></i></button>
                    <button 
                      onClick={() => !isAudioPlaying ? startGroundingAudio() : toggleAudioPlayPause()}
                      className="w-20 h-20 bg-white text-slate-900 rounded-full flex items-center justify-center text-3xl hover:scale-105 transition-all shadow-xl"
                    >
                      {audioLoading ? <img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-8 h-8 brain-loading-img" /> : <i className={`fa-solid ${(!isAudioPlaying || isAudioPaused) ? 'fa-play ml-1' : 'fa-pause'}`}></i>}
                    </button>
                    <div className="w-12 h-12"></div>
                  </div>
                </div>

                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-xs italic leading-relaxed text-indigo-100">
                    {currentSession.number === 2 
                      ? "If your thoughts momentarily stop, continue to watch the stream. Sooner or later, your thoughts will start up again."
                      : "Notice any small changes in your body, mind, or mood. You can return to this exercise anytime you feel overwhelmed."}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {currentSession.number === 2 ? (
                   [
                    { icon: 'fa-couch', text: 'Sit in a comfortable position and either close your eyes or rest them gently on a fixed spot in the room.' },
                    { icon: 'fa-stream', text: 'Visualize yourself sitting beside a gently flowing stream with leaves floating along the surface of the water.' },
                    { icon: 'fa-brain', text: 'For the next few minutes, take each thought that enters your mind and place it on a leaf… let it float by.' },
                    { icon: 'fa-hourglass', text: 'Allow the stream to flow at its own pace. Don’t try to speed it up or get rid of thoughts.' },
                    { icon: 'fa-wind', text: 'If your mind says “This is dumb,” place those thoughts on leaves, too, and let them pass.' },
                    { icon: 'fa-hand-dots', text: 'If a difficult or painful feeling arises, simply acknowledge it and place it on a leaf.' },
                    { icon: 'fa-anchor', text: 'If you get sidetracked, gently bring your attention back to the visualization exercise.' }
                  ].map((step, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex gap-5 items-start animate-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0"><i className={`fa-solid ${step.icon}`}></i></div>
                      <p className="text-slate-700 text-sm font-medium leading-relaxed">{step.text}</p>
                    </div>
                  ))
                ) : (
                  [
                    { icon: 'fa-couch', text: 'Sit or lie down in a position that feels safe and relaxed. Let your hands rest comfortably.' },
                    { icon: 'fa-shoe-prints', text: 'Bring attention to your feet touching the floor. Feel the weight of your body.' },
                    { icon: 'fa-eye', text: 'Gently look around and notice three things you can see.' },
                    { icon: 'fa-ear-listen', text: 'Listen carefully for two things you can hear.' },
                    { icon: 'fa-hand-pointer', text: 'Notice one thing you can touch or feel with your hands.' },
                    { icon: 'fa-lungs', text: 'Take slow, gentle breaths. Notice the air entering and leaving your lungs.' },
                    { icon: 'fa-quote-left', text: 'Silently say: "I am here. I am safe. I am in the present."' }
                  ].map((step, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex gap-5 items-start animate-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0"><i className={`fa-solid ${step.icon}`}></i></div>
                      <p className="text-slate-700 text-sm font-medium leading-relaxed">{step.text}</p>
                    </div>
                  ))
                )}
                <button onClick={() => {
                  logStep('grounding-exercise-complete', true, 'Completed main session exercise');
                  finishSession();
                }} className="w-full mt-6 py-5 bg-emerald-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all">
                  Finish Exercise
                </button>
              </div>
            </div>
          </div>
        );

      case 'reflection':
        return (
          <div className="max-w-2xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-700 py-10">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto shadow-inner">
                <i className="fa-solid fa-flag-checkered"></i>
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Session Complete</h2>
              <p className="text-slate-500 font-medium italic">
                {currentSession.number === 2 ? '"Leaves on a Stream."' : '"I am here. I am safe. I am in the present."'}
              </p>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl space-y-6">
              <h4 className="font-bold text-slate-800 uppercase text-xs tracking-widest text-center">Closing Insight</h4>
              <p className="text-slate-600 leading-relaxed text-center font-medium">
                {currentSession.number === 2 
                  ? "Today, you've practiced the skill of acceptance—learning to let thoughts and feelings flow by without getting entangled in them. This is the art of unhooking. Carry this perspective with you throughout the week."
                  : "Today, you've started the journey of noticing how your avoidance patterns work and practicing grounding yourself when things feel heavy. This is the first step toward creative hopelessness—realizing that fighting the pain hasn't worked, and choosing a different path instead."
                }
              </p>
            </div>

            <button onClick={() => navigate('/')} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
              Go to Dashboard
              <i className="fa-solid fa-house text-sm"></i>
            </button>
          </div>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 relative min-h-screen">
      {/* Session Pause Overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-12 text-center shadow-2xl space-y-8 animate-in zoom-in-95">
             <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto">
                <i className="fa-solid fa-hourglass-start"></i>
             </div>
             <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Taking a break?</h2>
                <p className="text-slate-500 mt-2 font-medium">Take as much time as you need. We're here when you're ready to continue your progress.</p>
             </div>
             <button 
               onClick={() => setIsPaused(false)}
               className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
             >
               Resume Session
               <i className="fa-solid fa-play text-sm"></i>
             </button>
             <button 
               onClick={() => setShowExitConfirm(true)}
               className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
             >
               Or Exit Session Now
             </button>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[110] bg-slate-900/95 backdrop-blur-lg flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-sm bg-white rounded-[2.5rem] p-10 text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-2xl mx-auto">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Exit Session?</h3>
              <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed">Your current session progress will be lost if you leave now.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleExitSession}
                className="w-full py-4 bg-rose-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all"
              >
                Yes, Exit Session
              </button>
              <button 
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                No, Keep Going
              </button>
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
               {['intro', 'practice-check', 'inner-world', 'noticing-conversion', 'grounding', 'reflection'].map((s, i) => (
                 <div key={s} className={`h-1 rounded-full transition-all ${step === s ? 'w-8 bg-indigo-600' : i < ['intro', 'practice-check', 'inner-world', 'noticing-conversion', 'grounding', 'reflection'].indexOf(step) ? 'w-4 bg-emerald-400' : 'w-4 bg-slate-200'}`}></div>
               ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate(`/session/${currentSession.number}/details`)}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all"
            title="View Session Details"
          >
            <i className="fa-solid fa-circle-info"></i>
          </button>
          <button 
            onClick={() => setIsPaused(true)}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all"
            title="Pause Session"
          >
            <i className="fa-solid fa-pause"></i>
          </button>
          <button 
            onClick={() => setShowExitConfirm(true)}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"
            title="Quit Session"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className="w-px h-6 bg-slate-200 mx-2"></div>
          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400"><i className="fa-solid fa-headset"></i></div>
        </div>
      </header>

      <div className={`px-6 md:px-10 transition-all duration-500 ${isPaused ? 'opacity-0 scale-95 blur-sm' : 'opacity-100'}`}>
        {step === 'mood' ? (
          <MoodCheckIn sessionNumber={currentSession.number} onComplete={handleMoodComplete} />
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
};

export default VirtualSession;
