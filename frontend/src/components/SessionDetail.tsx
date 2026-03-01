import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSessionDetailContent } from '../services/sessionDetailContentMap';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const SessionDetail: React.FC = () => {
  const { sessionNumber } = useParams();
  const navigate = useNavigate();
  const sessionNum = parseInt(sessionNumber || '1', 10);
  
  // Audio reference
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Session template from database
  const [sessionTemplate, setSessionTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simplified Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // 1. Fetch session template from API
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`${BASE_URL}/sessions/${sessionNum}`);
        
        if (!res.ok) {
          throw new Error('Session template not found');
        }
        
        const data = await res.json();
        setSessionTemplate(data);
      } catch (err) {
        console.error('Error fetching session template:', err);
        setError('Failed to load session details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplate();
  }, [sessionNum]);

  // 2. Load the Static Audio (NO AUTO-PLAY)
  useEffect(() => {
    const sessionNum = parseInt(sessionNumber || "1", 10);
    
    // Choose the right intro audio
    const audioUrl = sessionNum === 12 
      ? `/audio/s12_intro.mp3.wav` 
      : `/audio/s[1-11]_intro.mp3.wav`;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Reset state when audio naturally finishes
    audio.onended = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    // CLEANUP: This stops the audio if they hit the "Back" button
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [sessionNumber]);

  // Get session detail content
  const sessionDetailData = getSessionDetailContent(sessionNum);

  // 3. Audio Control Functions
  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPaused) {
      audioRef.current.play();
      setIsPaused(false);
    } else {
      audioRef.current.pause();
      setIsPaused(true);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // Rewind to start
    }
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleLaunchSession = () => {
    // Safely kill audio before navigating to the full session
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    navigate(`/session/${sessionNumber}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-medium">Loading session details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !sessionTemplate) {
    return (
      <div className="max-w-4xl mx-auto p-10 text-center">
        <div className="bg-rose-50 rounded-[2.5rem] p-10 border border-rose-200">
          <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6">
            <i className="fa-solid fa-exclamation-triangle"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Session Not Found</h2>
          <p className="text-slate-600 mb-6">{error || 'The requested session could not be loaded.'}</p>
          <button 
            onClick={() => navigate('/assignments')} 
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            <i className="fa-solid fa-arrow-left mr-2"></i>
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <header className="flex items-center gap-6">
        <button 
          onClick={() => navigate('/assignments')}
          className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1 block">
            Module Detail
          </span>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            Session {sessionTemplate.sessionNumber}: {sessionTemplate.title}
          </h2>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-indigo-500"></i>
                Clinical Description
              </h3>
              <p className="text-lg text-slate-700 leading-relaxed font-medium">
                {sessionDetailData.description}
              </p>
            </div>

            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                Core Objective
              </h3>
              <p className="text-slate-800 font-bold leading-relaxed italic">
                "{sessionDetailData.objective}"
              </p>
            </div>

            {/* Session Steps Preview */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-list-check text-emerald-500"></i>
                Session Structure
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sessionTemplate.steps.map((step: any, idx: number) => (
                  <div 
                    key={step.stepId}
                    className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100"
                  >
                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xs font-black">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-bold text-slate-700">{step.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex gap-4">
               <button 
                onClick={handleLaunchSession}
                className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
               >
                 <i className="fa-solid fa-play mr-2"></i>
                 Launch Full Session
               </button>
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl space-y-8">
            <div>
              <h3 className="text-xl font-bold mb-2">Audio Content</h3>
              <p className="text-slate-400 text-xs font-medium">
                {sessionDetailData.groundingExercise}
              </p>
            </div>

            <div className="bg-white/10 p-8 rounded-3xl border border-white/10 backdrop-blur-sm space-y-6">
               <div className="flex items-center justify-center gap-6">
                  {isPlaying && (
                    <button 
                      onClick={stopAudio}
                      className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-rose-400"
                    >
                      <i className="fa-solid fa-stop"></i>
                    </button>
                  )}
                  <button 
                    onClick={() => !isPlaying ? playAudio() : togglePlayPause()}
                    className="w-20 h-20 bg-white text-slate-900 rounded-full flex items-center justify-center text-3xl hover:scale-105 transition-all shadow-xl"
                  >
                    <i className={`fa-solid ${(!isPlaying || isPaused) ? 'fa-play ml-1' : 'fa-pause'}`}></i>
                  </button>
               </div>
               <div className="text-center">
                  <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                    {isPlaying ? (isPaused ? 'Paused' : 'Playing Audio') : 'Click to play audio'}
                  </span>
               </div>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
               <div className="flex gap-3 items-start">
                  <i className="fa-solid fa-circle-check text-emerald-400 mt-1"></i>
                  <p className="text-[10px] font-medium text-slate-300 leading-relaxed uppercase tracking-tighter">
                    Static Clinical Narration
                  </p>
               </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <h3 className="font-black text-slate-800 mb-6 uppercase text-[10px] tracking-widest">
               Module Info
             </h3>
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xs">
                     <i className="fa-solid fa-hashtag"></i>
                   </div>
                   <div>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Session Number</p>
                     <p className="text-sm font-bold text-slate-800">{sessionTemplate.sessionNumber} of 12</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xs">
                     <i className="fa-solid fa-layer-group"></i>
                   </div>
                   <div>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Module Key</p>
                     <p className="text-sm font-bold text-slate-800">{sessionTemplate.moduleKey.toUpperCase()}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xs">
                     <i className="fa-solid fa-stairs"></i>
                   </div>
                   <div>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Total Steps</p>
                     <p className="text-sm font-bold text-slate-800">{sessionTemplate.steps.length} steps</p>
                   </div>
                </div>
             </div>
          </section>

          <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <h3 className="font-black text-slate-800 mb-6 uppercase text-[10px] tracking-widest">
               Prerequisites
             </h3>
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xs">
                     <i className="fa-solid fa-check"></i>
                   </div>
                   <span className="text-xs font-bold text-slate-600">Initial Assessment</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xs">
                     <i className="fa-solid fa-check"></i>
                   </div>
                   <span className="text-xs font-bold text-slate-600">Privacy Consent</span>
                </div>
                {sessionTemplate.sessionNumber > 1 && (
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-xs">
                       <i className="fa-solid fa-clock"></i>
                     </div>
                     <span className="text-xs font-bold text-slate-600">
                       Previous Session {sessionTemplate.sessionNumber - 1}
                     </span>
                  </div>
                )}
             </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default SessionDetail;