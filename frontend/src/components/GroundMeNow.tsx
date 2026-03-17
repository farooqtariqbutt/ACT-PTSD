
import React, { useState, useEffect } from 'react';

interface GroundingStep {
  count: number;
  sense: string;
  icon: string;
  color: string;
  prompt: string;
  sub: string;
  image: string;
}

const GROUNDING_STEPS: GroundingStep[] = [
  { 
    count: 5, 
    sense: "See", 
    icon: "fa-eye", 
    color: "bg-blue-50 text-blue-600", 
    prompt: "Look around you. Slowly notice 5 things you can see.", 
    sub: "It can be anything — colors, shapes, light, objects. Take your time.",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80"
  },
  { 
    count: 4, 
    sense: "Touch", 
    icon: "fa-hand", 
    color: "bg-emerald-50 text-emerald-600", 
    prompt: "Now, notice 4 things you can feel or touch.", 
    sub: "Maybe your clothes on your skin, the chair under you, the floor under your feet, or the air on your face.",
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80"
  },
  { 
    count: 3, 
    sense: "Hear", 
    icon: "fa-ear-listen", 
    color: "bg-amber-50 text-amber-600", 
    prompt: "Now listen carefully. Notice 3 things you can hear.", 
    sub: "It might be nearby sounds or distant sounds. There is no right or wrong answer.",
    image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80"
  },
  { 
    count: 2, 
    sense: "Smell", 
    icon: "fa-nose", 
    color: "bg-rose-50 text-rose-600", 
    prompt: "Now bring attention to your sense of smell. Notice 2 things you can smell.", 
    sub: "If you don’t notice a smell, that’s okay — simply notice the neutral air around you.",
    image: "https://images.unsplash.com/photo-1516589174184-c685266e430c?auto=format&fit=crop&w=800&q=80"
  },
  { 
    count: 1, 
    sense: "Taste", 
    icon: "fa-mouth", 
    color: "bg-indigo-50 text-indigo-600", 
    prompt: "Finally, notice 1 thing you can taste.", 
    sub: "It may be a recent drink, food, or just the natural taste in your mouth.",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80"
  }
];

interface GroundMeNowProps {
  isOpen: boolean;
  onClose: () => void;
}

const GroundMeNow: React.FC<GroundMeNowProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(-1); // -1 for symptom check
  const [clicks, setClicks] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);

  const SYMPTOMS = [
    { id: 'flashback', label: 'Flashback', icon: 'fa-bolt' },
    { id: 'panic', label: 'Panic Attack', icon: 'fa-heart-pulse' },
    { id: 'anxiety', label: 'High Anxiety', icon: 'fa-wind' },
    { id: 'dissociation', label: 'Feeling Numb', icon: 'fa-cloud' },
    { id: 'overwhelmed', label: 'Overwhelmed', icon: 'fa-layer-group' }
  ];

  useEffect(() => {
    if (isOpen) {
      setStep(-1);
      setClicks(0);
      setIsComplete(false);
      setSymptoms([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const curr = step >= 0 ? GROUNDING_STEPS[step] : null;

  const handleNext = () => {
    if (step < GROUNDING_STEPS.length - 1) {
      setStep(step + 1);
      setClicks(0);
    } else {
      setIsComplete(true);
    }
  };

  const handleBack = () => {
    if (step > -1) {
      setStep(step - 1);
      setClicks(0);
    }
  };

  const toggleSymptom = (id: string) => {
    setSymptoms(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-slate-900/95 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl bg-white rounded-[2rem] sm:rounded-[4rem] shadow-2xl relative overflow-hidden">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-8 sm:right-8 w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all z-20"
          >
            <i className="fa-solid fa-xmark text-lg sm:text-xl"></i>
          </button>

          <div className="p-6 sm:p-12">
          {!isComplete ? (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                  <i className="fa-solid fa-shield-heart"></i>
                  Safety Mode Active
                </div>
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">
                  {step === -1 ? "How are you feeling?" : "Grounding 5-4-3-2-1"}
                </h2>
                {step >= 0 && (
                  <div className="flex justify-center gap-2 mt-4">
                    {GROUNDING_STEPS.map((_, i) => (
                      <div key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-12 bg-indigo-600' : i < step ? 'w-4 bg-emerald-400' : 'w-4 bg-slate-200'}`}></div>
                    ))}
                  </div>
                )}
              </div>

              {step === -1 ? (
                <div className="space-y-6">
                  <p className="text-center text-slate-500 font-medium">Select what you are experiencing right now:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SYMPTOMS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => toggleSymptom(s.id)}
                        className={`p-6 rounded-3xl border-2 transition-all flex items-center gap-4 text-left ${
                          symptoms.includes(s.id) 
                            ? 'bg-rose-600 border-transparent text-white shadow-xl shadow-rose-100' 
                            : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-rose-200'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${symptoms.includes(s.id) ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                          <i className={`fa-solid ${s.icon}`}></i>
                        </div>
                        <span className="font-black uppercase tracking-widest text-xs">{s.label}</span>
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setStep(0)}
                    className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-xl shadow-xl hover:bg-indigo-700 transition-all"
                  >
                    Start Grounding Exercise
                  </button>
                </div>
              ) : curr && (
                <div className="space-y-8">
                  <div className="relative rounded-[3rem] overflow-hidden aspect-video shadow-2xl group">
                    <img 
                      src={curr.image} 
                      alt={curr.sense} 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-10">
                      <div className={`w-16 h-16 ${curr.color} rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-xl`}>
                        <i className={`fa-solid ${curr.icon}`}></i>
                      </div>
                      <h3 className="text-3xl font-black text-white tracking-tight">Step {step + 1}: {curr.sense} {curr.count} Things</h3>
                    </div>
                  </div>

                  <div className="text-center space-y-4">
                    <p className="text-2xl font-bold text-slate-700 leading-relaxed italic">"{curr.prompt}"</p>
                    <p className="text-slate-400 font-medium">{curr.sub}</p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-wrap justify-center gap-4">
                      {Array.from({ length: curr.count }).map((_, i) => (
                        <button 
                          key={i} 
                          onClick={() => i === clicks && setClicks(prev => prev + 1)}
                          disabled={i > clicks}
                          className={`w-14 h-14 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center text-xl ${
                            i < clicks 
                              ? curr.color.replace('text-', 'bg-').replace('50', '600') + ' text-white border-transparent shadow-lg' 
                              : i === clicks 
                                ? 'border-indigo-400 border-dashed bg-indigo-50/50 animate-pulse cursor-pointer' 
                                : 'border-slate-200 border-dashed text-slate-200 cursor-not-allowed'
                          }`}
                        >
                          <i className={`fa-solid ${curr.icon} ${i < clicks ? 'opacity-100' : 'opacity-20'}`}></i>
                        </button>
                      ))}
                    </div>

                    <div className="relative group max-w-md mx-auto">
                      <input 
                        type="text" 
                        placeholder={`Type what you ${curr.sense.toLowerCase()}...`}
                        className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all shadow-inner"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                            setClicks(prev => Math.min(curr.count, prev + 1));
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">Press Enter</div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={handleBack}
                      className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleNext}
                      disabled={clicks < curr.count}
                      className={`flex-1 py-5 rounded-3xl font-black text-xl shadow-xl transition-all ${
                        clicks < curr.count 
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1'
                      }`}
                    >
                      {step < GROUNDING_STEPS.length - 1 ? 'Next Step' : 'Finish Grounding'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-10 py-10 animate-in zoom-in duration-500">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto shadow-inner">
                <i className="fa-solid fa-check-double"></i>
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">You are here.</h2>
                <p className="text-xl text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                  The wave has passed. You are safe in this moment. Feel your feet on the ground.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-full py-6 bg-emerald-600 text-white rounded-3xl font-black text-xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 hover:-translate-y-1 transition-all"
              >
                I Feel Better Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
};

export default GroundMeNow;