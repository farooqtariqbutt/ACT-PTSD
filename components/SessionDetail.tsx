
import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { THERAPY_SESSIONS } from '../types';
import { generateGuidedMeditation, decodeBase64, decodeAudioData } from '../services/geminiService';

const SessionDetail: React.FC = () => {
  const { sessionNumber } = useParams();
  const navigate = useNavigate();
  const sessionNum = parseInt(sessionNumber || '1', 10);
  const session = THERAPY_SESSIONS.find(s => s.number === sessionNum);

  const [loadingAudio, setLoadingAudio] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  if (!session) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold text-slate-800">Session not found.</h2>
        <button onClick={() => navigate('/assignments')} className="mt-4 text-indigo-600 font-bold underline">Back to Tasks</button>
      </div>
    );
  }

  const startPreview = async () => {
    setLoadingAudio(true);
    setScript(null);
    try {
      const prompt = `A short mindfulness preview for the therapy session: "${session.title}". Focus on ${session.description}. Tonality: Compassionate, slow, and grounding.`;
      const { audioBase64, script: textScript } = await generateGuidedMeditation(prompt);
      setScript(textScript);

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
        setIsPlaying(false);
        setIsPaused(false);
      };

      source.start();
      sourceRef.current = source;
      setIsPlaying(true);
      setIsPaused(false);
    } catch (err) {
      console.error(err);
      alert("Error generating session preview.");
    } finally {
      setLoadingAudio(false);
    }
  };

  const togglePlayPause = async () => {
    if (!audioContextRef.current) return;
    if (audioContextRef.current.state === 'running') {
      await audioContextRef.current.suspend();
      setIsPaused(true);
    } else {
      await audioContextRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopPreview = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
      sourceRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
  };

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
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1 block">Module Detail</span>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Session {session.number}: {session.title}</h2>
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
                {session.description}
              </p>
            </div>

            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Core Objective</h3>
              <p className="text-slate-800 font-bold leading-relaxed italic">
                "{session.objective}"
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 flex gap-4">
               <button 
                onClick={() => navigate('/session')}
                className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
               >
                 Launch Full Session
               </button>
            </div>
          </section>

          {script && (
            <section className="bg-indigo-50/50 p-10 rounded-[2.5rem] border border-indigo-100 shadow-sm animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-indigo-900 uppercase text-xs tracking-widest">Mindfulness Script Preview</h3>
                <i className="fa-solid fa-quote-right text-indigo-200"></i>
              </div>
              <div className="prose prose-indigo italic text-indigo-800 text-lg leading-relaxed font-medium">
                {script.split('\n').map((line, i) => (
                  <p key={i} className="mb-4">{line}</p>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-8">
          <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl space-y-8">
            <div>
              <h3 className="text-xl font-bold mb-2">Audio Content</h3>
              <p className="text-slate-400 text-xs font-medium">Preview the grounding exercise for this module.</p>
            </div>

            <div className="bg-white/10 p-8 rounded-3xl border border-white/10 backdrop-blur-sm space-y-6">
               <div className="flex items-center justify-center gap-6">
                  {isPlaying && (
                    <button 
                      onClick={stopPreview}
                      className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-rose-400"
                    >
                      <i className="fa-solid fa-stop"></i>
                    </button>
                  )}
                  <button 
                    onClick={() => !isPlaying ? startPreview() : togglePlayPause()}
                    className="w-20 h-20 bg-white text-slate-900 rounded-full flex items-center justify-center text-3xl hover:scale-105 transition-all shadow-xl"
                  >
                    {loadingAudio ? (
                      <img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-8 h-8 brain-loading-img" />
                    ) : (
                      <i className={`fa-solid ${(!isPlaying || isPaused) ? 'fa-play ml-1' : 'fa-pause'}`}></i>
                    )}
                  </button>
               </div>
               <div className="text-center">
                  <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                    {isPlaying ? (isPaused ? 'Paused' : 'Playing Preview') : 'Click to preview audio'}
                  </span>
               </div>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
               <div className="flex gap-3 items-start">
                  <i className="fa-solid fa-circle-check text-emerald-400 mt-1"></i>
                  <p className="text-[10px] font-medium text-slate-300 leading-relaxed uppercase tracking-tighter">
                    Gemini 2.5 Flash Voice Synthesis (Kore)
                  </p>
               </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <h3 className="font-black text-slate-800 mb-6 uppercase text-[10px] tracking-widest">Prerequisites</h3>
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
             </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default SessionDetail;
