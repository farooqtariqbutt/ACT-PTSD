
import React, { useState, useRef } from 'react';
import { generateGuidedMeditation, decodeBase64, decodeAudioData } from '../services/geminiService';

const Mindfulness: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const [focus, setFocus] = useState('Grounding in the present moment');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const startMeditation = async () => {
    setLoading(true);
    setScript(null);
    setIsPlaying(false);
    setIsPaused(false);

    try {
      const { audioBase64, script: textScript } = await generateGuidedMeditation(focus);
      setScript(textScript);

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch (e) {}
      }

      const audioBuffer = await decodeAudioData(decodeBase64(audioBase64), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        if (sourceRef.current === source) {
          setIsPlaying(false);
          setIsPaused(false);
        }
      };

      source.start();
      sourceRef.current = source;
      setIsPlaying(true);
      setIsPaused(false);
      
    } catch (err) {
      console.error(err);
      alert("Failed to generate meditation audio. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const togglePlayPause = async () => {
    if (!audioContextRef.current) return;
    
    if (audioContextRef.current.state === 'running') {
      await audioContextRef.current.suspend();
      setIsPaused(true);
    } else if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopMeditation = async () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
      sourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setScript(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden relative">
        <div className="p-10 bg-emerald-600 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
             <i className="fa-solid fa-spa text-[8rem]"></i>
          </div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                <i className="fa-solid fa-spa"></i>
                AI-Guided Mindfulness
              </h2>
              <p className="text-emerald-100 font-medium">Personalized sessions synthesized in real-time to anchor you in the now.</p>
            </div>
            {(isPlaying || loading) && (
              <button 
                onClick={stopMeditation}
                className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Exit Session
              </button>
            )}
          </div>
        </div>

        <div className="p-10 space-y-8">
          {!isPlaying && !loading ? (
            <div className="space-y-6">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Select Session Focus</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  "Grounding in the present moment",
                  "Soothing panic and anxiety",
                  "Body scan and relaxation"
                ].map(option => (
                  <button
                    key={option}
                    onClick={() => setFocus(option)}
                    className={`text-left p-6 rounded-3xl border-2 transition-all flex flex-col gap-2 ${
                      focus === option 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-lg shadow-emerald-50 font-bold' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-emerald-200 hover:bg-slate-50'
                    }`}
                  >
                    <i className={`fa-solid ${
                      option.includes('Grounding') ? 'fa-anchor' : 
                      option.includes('panic') ? 'fa-wind' : 'fa-child-reaching'
                    } text-xl ${focus === option ? 'text-emerald-600' : 'text-slate-300'}`}></i>
                    <span className="text-sm leading-tight">{option}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={startMeditation}
                className="w-full mt-4 py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
              >
                <i className="fa-solid fa-play"></i> Begin Guided Session
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 space-y-10">
              {loading ? (
                <div className="flex flex-col items-center gap-6 py-10">
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center">
                    <img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-12 h-12 brain-loading-img" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-slate-800 uppercase tracking-widest text-xs">Synthesizing Voice...</p>
                    <p className="text-sm text-slate-400 mt-1">Our AI is crafting your personalized meditation script.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center w-full max-w-md space-y-10">
                  <div className="w-48 h-48 rounded-[3rem] bg-emerald-50 flex items-center justify-center relative shadow-inner">
                    <div className={`absolute inset-0 bg-emerald-200 rounded-[3rem] animate-ping opacity-10 ${isPaused ? 'pause-animation' : ''}`} style={{ animationDuration: '3s' }}></div>
                    <div className={`w-32 h-32 rounded-full border-4 border-emerald-200 flex items-center justify-center transition-all ${isPaused ? 'scale-95 border-slate-200' : 'scale-110'}`}>
                       <i className={`fa-solid ${isPaused ? 'fa-pause' : 'fa-microphone-lines'} text-4xl ${isPaused ? 'text-slate-300' : 'text-emerald-600'}`}></i>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{focus}</h3>
                    <div className="flex items-center justify-center gap-2 mt-2">
                       <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-slate-300' : 'bg-emerald-500 animate-pulse'}`}></span>
                       <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{isPaused ? 'Session Paused' : 'Live Guidance Active'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-6 w-full">
                    <div className="flex items-center justify-center gap-8 w-full">
                      <button 
                        onClick={stopMeditation}
                        className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center shadow-sm"
                        title="Stop Session"
                      >
                        <i className="fa-solid fa-stop text-2xl"></i>
                      </button>
                      <button 
                        onClick={togglePlayPause}
                        className="w-24 h-24 rounded-[2rem] bg-emerald-600 text-white flex items-center justify-center text-4xl shadow-2xl shadow-emerald-100 hover:bg-emerald-700 hover:scale-105 transition-all"
                        title={isPaused ? "Resume Guidance" : "Pause Guidance"}
                      >
                        <i className={`fa-solid ${isPaused ? 'fa-play ml-1' : 'fa-pause'}`}></i>
                      </button>
                    </div>
                    
                    <button 
                      onClick={stopMeditation}
                      className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100 flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-door-open"></i>
                      Exit Session Anytime
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                    Tap to {isPaused ? 'Resume' : 'Pause'} anytime during your session
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {script && (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-lg border border-slate-200 space-y-6 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-sm tracking-tight">
              <i className="fa-solid fa-quote-left text-emerald-500"></i>
              Session Script
            </h3>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Visual Feedback</span>
          </div>
          <div className="prose prose-emerald italic text-slate-600 text-lg leading-relaxed font-medium">
            {script.split('\n').map((line, i) => (
              <p key={i} className="mb-4">{line}</p>
            ))}
          </div>
          <div className="pt-6 border-t border-slate-50 text-center">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gemini 2.5 Flash Native Voice Synthesis</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mindfulness;
