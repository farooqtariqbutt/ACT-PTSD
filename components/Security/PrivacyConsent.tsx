
import React, { useState } from 'react';

const PrivacyConsent: React.FC = () => {
  const [consents, setConsents] = useState({
    therapyAccess: true,
    anonymizedResearch: false,
    aiAnalysis: true,
    marketing: false
  });

  const toggle = (key: keyof typeof consents) => {
    setConsents(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl">
            <i className="fa-solid fa-user-shield"></i>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Privacy & Data Consent</h3>
            <p className="text-sm text-slate-500 font-medium">Manage how your clinical data is used and shared.</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { id: 'therapyAccess', label: 'Primary Therapist Access', desc: 'Allows your assigned doctor to view your PCL-5 scores and notes.', mandatory: true },
            { id: 'aiAnalysis', label: 'AI Synthesis (Gemini)', desc: 'Allows the system to analyze patterns to provide personalized ACT insights.', mandatory: false },
            { id: 'anonymizedResearch', label: 'Anonymized Research', desc: 'Contribute your data (without PII) to clinical PTSD studies.', mandatory: false },
            { id: 'marketing', label: 'Platform Updates', desc: 'Receive emails about new features and ACT education content.', mandatory: false },
          ].map((item) => (
            <div key={item.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all">
              <div className="max-w-[80%]">
                <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  {item.label}
                  {item.mandatory && <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-black uppercase">Mandatory</span>}
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
              </div>
              <button 
                disabled={item.mandatory}
                onClick={() => toggle(item.id as keyof typeof consents)}
                className={`w-12 h-6 rounded-full relative transition-all mt-1 ${
                  item.mandatory || consents[item.id as keyof typeof consents] ? 'bg-indigo-600' : 'bg-slate-300'
                } ${item.mandatory ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={`Toggle ${item.label}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                   item.mandatory || consents[item.id as keyof typeof consents] ? 'right-1' : 'left-1'
                }`}></div>
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-8 border-t border-slate-50 flex flex-col md:flex-row gap-4">
          <button className="flex-1 py-3 px-6 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
            <i className="fa-solid fa-download"></i> Download My Data (JSON/PDF)
          </button>
          <button className="flex-1 py-3 px-6 border border-rose-200 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-50 transition-all">
            Request Data Deletion
          </button>
        </div>
      </div>

      <div className="p-6 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-100 flex items-center gap-4">
        <i className="fa-solid fa-shield-check text-2xl opacity-50"></i>
        <p className="text-sm font-medium">Your data is encrypted using <strong>AES-256</strong> and isolated within your clinic's tenant vault.</p>
      </div>
    </div>
  );
};

export default PrivacyConsent;
