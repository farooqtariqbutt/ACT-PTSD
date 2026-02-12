
import React, { useState } from 'react';

interface OnboardingStep {
  id: number;
  title: string;
  icon: string;
}

const STEPS: OnboardingStep[] = [
  { id: 1, title: 'Clinic Identity', icon: 'fa-hospital' },
  { id: 2, title: 'Staff Roster', icon: 'fa-user-doctor' },
  { id: 3, title: 'Subscription', icon: 'fa-credit-card' },
  { id: 4, title: 'Launch', icon: 'fa-rocket' },
];

const ClinicOnboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);

  const next = () => currentStep < 4 ? setCurrentStep(currentStep + 1) : onComplete();
  const back = () => currentStep > 1 && setCurrentStep(currentStep - 1);

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="w-full max-w-4xl space-y-8">
        {/* Progress Stepper */}
        <div className="flex justify-between relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>
          {STEPS.map((step) => (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                currentStep >= step.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border-2 border-slate-200 text-slate-300'
              }`}>
                <i className={`fa-solid ${step.icon} text-xs`}></i>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                currentStep >= step.id ? 'text-indigo-600' : 'text-slate-400'
              }`}>{step.title}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 min-h-[500px] flex flex-col">
          <div className="flex-1">
            {currentStep === 1 && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Set your foundation.</h2>
                  <p className="text-slate-500">How should patients and staff identify your clinic?</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Clinic Legal Name</label>
                    <input type="text" placeholder="e.g., Riverside Wellness Hub" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Primary Specialty</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                      <option>PTSD & Trauma Specialist</option>
                      <option>General ACT Practice</option>
                      <option>Inpatient Rehabilitation</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Physical Address</label>
                    <input type="text" placeholder="123 Clinical Way, Suite 400..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Build your team.</h2>
                  <p className="text-slate-500">Invite therapists to begin managing their caseloads.</p>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <input type="email" placeholder="colleague@clinic.com" className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    <button className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm">Send Invite</button>
                  </div>
                  <div className="border border-slate-100 rounded-2xl p-4 divide-y divide-slate-50">
                    <div className="py-3 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold">JW</div>
                        <span className="text-sm font-medium text-slate-700">James Wilson (You - Admin)</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Owner</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 text-center">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Confirm your license.</h2>
                  <p className="text-slate-500">Select the plan that fits your clinic size.</p>
                </div>
                <div className="p-8 bg-indigo-600 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-100">
                  <div className="text-left space-y-1">
                    <h3 className="text-xl font-bold">Professional Clinic</h3>
                    <p className="text-indigo-100 text-sm">Unlimited clients • Up to 5 therapists • Branding</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black">$249/mo</p>
                    <p className="text-indigo-200 text-xs">7-day free trial included</p>
                  </div>
                </div>
                <button className="text-xs font-bold text-indigo-600 uppercase tracking-widest hover:underline">Change Plan</button>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-8 animate-in zoom-in duration-500 text-center py-10">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto border-4 border-emerald-100 shadow-xl shadow-emerald-50">
                  <i className="fa-solid fa-check"></i>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Ready for impact.</h2>
                  <p className="text-slate-500 max-w-md mx-auto">Your multi-tenant workspace is provisioned and encrypted. You can now start onboarding patients.</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-8 border-t border-slate-50 flex justify-between items-center">
            <button 
              onClick={back} 
              className={`px-8 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest text-xs ${currentStep === 1 ? 'invisible' : ''}`}
            >
              Back
            </button>
            <button 
              onClick={next} 
              className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              {currentStep === 4 ? 'Enter Dashboard' : 'Next Step'} <i className="fa-solid fa-arrow-right text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicOnboarding;
