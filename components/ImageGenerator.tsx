
import React, { useState, useEffect } from 'react';
import { generateTherapyImage, forceSelectKey } from '../services/geminiService';
import { ImageSize } from '../types';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<ImageSize>('1K');
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSetKey = async () => {
    await forceSelectKey();
    setHasKey(true);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const url = await generateTherapyImage(prompt, size);
      if (url) {
        setResultImage(url);
      } else {
        setError("Failed to generate image. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("PERMISSION_DENIED") || err.message?.includes("403")) {
        setError(
          <div className="space-y-2">
            <p><strong>Access Denied:</strong> This model requires an API key from a <strong>paid GCP project</strong> with billing enabled.</p>
            <p className="text-xs">
              Please ensure your project is configured correctly at 
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline ml-1 text-indigo-600">
                ai.google.dev/gemini-api/docs/billing
              </a>.
            </p>
            <button 
              onClick={handleSetKey}
              className="mt-2 text-xs bg-rose-600 text-white px-3 py-1 rounded hover:bg-rose-700 transition-colors"
            >
              Re-select API Key
            </button>
          </div>
        );
      } else {
        setError(err.message || "An error occurred during generation.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* API Key Status Banner */}
      {!hasKey && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-key text-amber-500"></i>
            <div>
              <p className="text-sm font-bold text-amber-900">Pro Features Restricted</p>
              <p className="text-xs text-amber-700">Image generation requires a personal API key from a paid project.</p>
            </div>
          </div>
          <button 
            onClick={handleSetKey}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors"
          >
            Connect Key
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 bg-indigo-600 text-white flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Therapeutic Visualization Lab</h2>
            <p className="text-indigo-100">Create calming imagery for grounding and diffusion exercises.</p>
          </div>
          {hasKey && (
            <button 
              onClick={handleSetKey}
              className="text-[10px] uppercase tracking-widest font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded border border-white/20 transition-colors"
            >
              Change Key
            </button>
          )}
        </div>
        
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">What would you like to visualize?</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A peaceful mountain landscape at dawn with soft purple mist and golden light, representing inner stillness..."
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider block">Image Resolution</label>
              <div className="flex gap-2">
                {(['1K', '2K', '4K'] as ImageSize[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${
                      size === s ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="mt-6 flex-1 bg-indigo-600 text-white py-4 px-8 rounded-xl font-bold shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-5 h-5 brain-loading-img" />
                  Generating Calm...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                  Create Visualization
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl flex items-start gap-3">
              <i className="fa-solid fa-circle-exclamation mt-1"></i>
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}
        </div>
      </div>

      {resultImage && (
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Your Generated Visualization</h3>
            <div className="flex gap-2">
              <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                <i className="fa-solid fa-download"></i>
              </button>
              <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                <i className="fa-solid fa-share-nodes"></i>
              </button>
            </div>
          </div>
          <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
             <img src={resultImage} alt="Therapeutic visualization" className="w-full h-full object-cover" />
          </div>
          <p className="text-xs text-slate-400 text-center italic">Powered by Gemini 3 Pro Image Preview</p>
        </div>
      )}

      {loading && !resultImage && (
        <div className="h-96 w-full flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
           <img src="https://i.ibb.co/FkV0M73k/brain.png" alt="loading" className="w-16 h-16 brain-loading-img mb-4" />
           <p className="text-sm font-medium">Mixing the colors of stillness...</p>
           <p className="text-xs mt-2 px-12 text-center max-w-sm">High-quality therapeutic imagery can take up to 20 seconds. Please stay with us.</p>
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;