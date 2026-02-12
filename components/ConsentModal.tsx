
import React, { useState } from 'react';

interface ConsentModalProps {
  onAccept: () => void;
}

const points = [
  { key: 'therapyRole', text: 'I understand this app is part of my structured therapy and does not replace direct sessions with my therapist.' },
  { key: 'emotionalDiscomfort', text: 'I understand some exercises may bring up uncomfortable emotions, and I can stop at any time.' },
  { key: 'therapistContact', text: 'I agree to contact my therapist if I experience distress or difficulty while using the app.' },
  { key: 'noEmergency', text: 'I understand this app is not for emergencies. In a crisis, I will contact emergency services.' },
  { key: 'voluntary', text: 'I voluntarily agree to participate in this mobile-assisted therapy program.' }
];

const ConsentModal: React.FC<ConsentModalProps> = ({ onAccept }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [agreedSteps, setAgreedSteps] = useState<Set<number>>(new Set());

  const handleAgree = () => {
    const nextAgreed = new Set(agreedSteps);
    nextAgreed.add(currentStep);
    setAgreedSteps(nextAgreed);

    if (currentStep < points.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isFinalStep = currentStep === points.length - 1;
  const allAgreed = agreedSteps.size === points.length;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 flex flex-col min-h-[450px]">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 flex">
          {points.map((_, i) => (
            <div 
              key={i} 
              className={`h-full flex-1 transition-all duration-500 ${
                i <= currentStep ? 'bg-indigo-600' : 'bg-transparent'
              } ${i < currentStep ? 'opacity-40' : ''}`}
            />
          ))}
        </div>

        <div className="p-10 md:p-14 flex-1 flex flex-col">
          <header className="mb-10 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-1">
                Clinical Consent
              </span>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                Step {currentStep + 1} of {points.length}
              </h2>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-lg">
              <i className="fa-solid fa-file-shield"></i>
            </div>
          </header>

          <div className="flex-1 flex flex-col justify-center animate-in slide-in-from-right-8 fade-in duration-500" key={currentStep}>
            <p className="text-xl md:text-2xl font-medium text-slate-700 leading-relaxed mb-10">
              "{points[currentStep].text}"
            </p>
          </div>

          <div className="space-y-4">
            {!allAgreed ? (
              <div className="flex gap-4">
                {currentStep > 0 && (
                  <button
                    onClick={handleBack}
                    className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center"
                  >
                    <i className="fa-solid fa-arrow-left"></i>
                  </button>
                )}
                <button
                  onClick={handleAgree}
                  className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  {isFinalStep ? 'I Agree to All' : 'I Understand & Agree'}
                  <i className="fa-solid fa-check text-sm"></i>
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-in zoom-in-95 duration-500">
                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center text-lg shadow-lg shadow-emerald-100">
                    <i className="fa-solid fa-check"></i>
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-800 uppercase tracking-wide">All Points Confirmed</p>
                    <p className="text-xs text-emerald-600 font-medium">You have reviewed and accepted the clinical terms.</p>
                  </div>
                </div>
                <button
                  onClick={onAccept}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-2xl hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  Enter My Journey
                  <i className="fa-solid fa-arrow-right text-sm"></i>
                </button>
              </div>
            )}
            
            <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest pt-4">
              Authorized Clinical Agreement • {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentModal;
