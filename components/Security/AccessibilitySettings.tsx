
import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';

const AccessibilitySettings: React.FC = () => {
  const { highContrast, setHighContrast } = useApp();
  const [fontSize, setFontSize] = useState('standard');
  const [reducedMotion, setReducedMotion] = useState(false);

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl">
            <i className="fa-solid fa-universal-access"></i>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Accessibility Tools</h3>
            <p className="text-sm text-slate-500 font-medium">Customize the interface for your specific needs (WCAG 2.1 Ready).</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">High Contrast Mode</p>
              <p className="text-xs text-slate-400">Enhance color visibility for better readability.</p>
            </div>
            <button 
              onClick={() => setHighContrast(!highContrast)}
              className={`w-14 h-8 rounded-full relative transition-all ${highContrast ? 'bg-indigo-600 shadow-inner' : 'bg-slate-200'}`}
              aria-pressed={highContrast}
            >
              <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-all ${highContrast ? 'right-1.5' : 'left-1.5 shadow-sm'}`}></div>
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-800">Text Display Size</p>
            <div className="grid grid-cols-3 gap-3">
              {['Small', 'Standard', 'Large'].map(size => (
                <button
                  key={size}
                  onClick={() => setFontSize(size.toLowerCase())}
                  className={`py-3 rounded-xl text-xs font-bold border transition-all ${
                    fontSize === size.toLowerCase() 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">Reduced Motion</p>
              <p className="text-xs text-slate-400">Minimize animations and transitions across the app.</p>
            </div>
            <button 
              onClick={() => setReducedMotion(!reducedMotion)}
              className={`w-14 h-8 rounded-full relative transition-all ${reducedMotion ? 'bg-indigo-600 shadow-inner' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-all ${reducedMotion ? 'right-1.5' : 'left-1.5 shadow-sm'}`}></div>
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Screen Reader Tip</p>
            <p className="text-xs text-slate-600 leading-relaxed italic">The "ACT Companion" uses aria-live regions. New messages will be announced automatically by your screen reader.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilitySettings;
