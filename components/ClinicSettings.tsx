
import React, { useState } from 'react';

const ClinicSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'features' | 'integrations'>('profile');

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Clinic Configuration</h2>
        <p className="text-sm text-slate-500">Customize your SaaS workspace and external integrations.</p>
      </header>

      <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl w-fit">
        {(['profile', 'features', 'integrations'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {activeTab === 'profile' && (
            <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-in slide-in-from-left-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="fa-solid fa-hospital text-indigo-500"></i>
                Profile & Branding
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clinic Name</label>
                  <input type="text" defaultValue="Central Wellness Clinic" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Email</label>
                  <input type="email" defaultValue="admin@centralwellness.com" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clinic Logo</label>
                <div className="flex items-center gap-6 p-4 border-2 border-dashed border-slate-200 rounded-2xl">
                  <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                    <i className="fa-solid fa-image text-2xl"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-700">Upload high-res PNG or SVG</p>
                    <p className="text-[10px] text-slate-400">Recommended 512x512px</p>
                  </div>
                  <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">Select File</button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'features' && (
            <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-in slide-in-from-left-4">
               <h3 className="font-bold text-slate-800 mb-6">Clinic Features</h3>
               <div className="space-y-4">
                 {[
                   { id: 'f1', label: 'AI Guided Meditation', desc: 'Enable Gemini-powered mindfulness sessions.', active: true },
                   { id: 'f2', label: 'Video Consultations', desc: 'Secure in-app virtual sessions.', active: true },
                   { id: 'f3', label: 'Defusion Lab', desc: 'AI-assisted cognitive defusion tools.', active: true },
                   { id: 'f4', label: 'Symptom SMS Reminders', desc: 'Automated check-in messages for clients.', active: false },
                 ].map(feature => (
                   <div key={feature.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                     <div>
                       <p className="text-sm font-bold text-slate-800">{feature.label}</p>
                       <p className="text-xs text-slate-500">{feature.desc}</p>
                     </div>
                     <button className={`w-12 h-6 rounded-full relative transition-colors ${feature.active ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                       <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${feature.active ? 'right-1' : 'left-1'}`}></div>
                     </button>
                   </div>
                 ))}
               </div>
            </section>
          )}

          {activeTab === 'integrations' && (
            <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8 animate-in slide-in-from-left-4">
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800">EHR & External Systems</h3>
                <p className="text-sm text-slate-500">Connect ACT Path to your existing Electronic Health Record systems.</p>
              </div>

              <div className="space-y-6">
                {[
                  { name: 'Epic Systems', logo: 'fa-hospital-user', status: 'Available' },
                  { name: 'Cerner Health', logo: 'fa-notes-medical', status: 'Beta' },
                  { name: 'SimplePractice', logo: 'fa-user-md', status: 'Enterprise Only' },
                ].map(sys => (
                  <div key={sys.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-100 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-xl text-indigo-500 group-hover:scale-110 transition-transform">
                        <i className={`fa-solid ${sys.logo}`}></i>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{sys.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sys.status}</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-white transition-colors">Configure</button>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-50 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-700">Clinical API Access</h4>
                  <button className="text-xs font-bold text-indigo-600 hover:underline">+ New API Key</button>
                </div>
                <div className="p-4 bg-slate-900 rounded-2xl text-indigo-400 font-mono text-xs flex justify-between items-center group">
                  <span>act_live_4920kL9...••••••••</span>
                  <button className="text-slate-500 hover:text-white transition-colors">
                    <i className="fa-solid fa-copy"></i>
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="space-y-8">
          <section className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100">
            <h3 className="font-bold text-lg mb-4">Clinic Pro Plan</h3>
            <p className="text-indigo-100 text-xs mb-6">Subscribed until Jan 2025</p>
            <div className="text-3xl font-black mb-6">$249<span className="text-sm opacity-60">/mo</span></div>
            <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors">
              Manage Billing
            </button>
          </section>

          <section className="bg-slate-900 p-8 rounded-3xl text-white">
            <h3 className="font-bold text-lg mb-4">Export Clinic Data</h3>
            <p className="text-slate-400 text-xs mb-6">Generate an encrypted archive of all clinic records and staff notes.</p>
            <button className="w-full py-3 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm border border-slate-700 hover:bg-slate-700 transition-colors">
              <i className="fa-solid fa-download mr-2"></i> Create Archive
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ClinicSettings;
