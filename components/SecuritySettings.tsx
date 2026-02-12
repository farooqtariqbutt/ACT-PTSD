
import React, { useState } from 'react';
import PrivacyConsent from './Security/PrivacyConsent';
import AccessibilitySettings from './Security/AccessibilitySettings';

const SecuritySettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'security' | 'privacy' | 'accessibility'>('security');

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">System & Security</h2>
          <p className="text-sm text-slate-500">Manage your credentials, accessibility, and HIPAA consent status.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
           <button 
             onClick={() => setActiveTab('security')}
             className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'security' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
           >Security</button>
           <button 
             onClick={() => setActiveTab('privacy')}
             className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'privacy' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
           >Privacy</button>
           <button 
             onClick={() => setActiveTab('accessibility')}
             className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'accessibility' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
           >Accessibility</button>
        </div>
      </header>

      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-indigo-500"></i>
                Compliance Audit Log
              </h3>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <th className="pb-4 pr-4">Timestamp</th>
                        <th className="pb-4 pr-4">Action</th>
                        <th className="pb-4 pr-4">Module</th>
                        <th className="pb-4 pr-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { time: 'Today, 2:45 PM', action: 'Successful Login', module: 'Auth', status: 'Secure', icon: 'fa-check-circle text-emerald-500' },
                        { time: 'Yesterday, 10:20 AM', action: 'PCL-5 Assessment', module: 'Patient Record', status: 'Encrypted', icon: 'fa-shield-halved text-indigo-500' },
                        { time: 'Oct 22, 4:00 PM', action: 'Value Update', module: 'Clinical Tools', status: 'Saved', icon: 'fa-floppy-disk text-slate-400' },
                        { time: 'Oct 21, 9:15 AM', action: '2FA Verification', module: 'Security', status: 'Verified', icon: 'fa-user-check text-emerald-500' },
                      ].map((log, i) => (
                        <tr key={i} className="group">
                          <td className="py-4 text-xs font-medium text-slate-500 whitespace-nowrap">{log.time}</td>
                          <td className="py-4">
                            <p className="text-sm font-bold text-slate-800">{log.action}</p>
                          </td>
                          <td className="py-4 text-xs font-medium text-slate-400">{log.module}</td>
                          <td className="py-4">
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                <i className={`fa-solid ${log.icon}`}></i>
                                {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </section>

            <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <i className="fa-solid fa-laptop-medical text-indigo-500"></i>
                Active Sessions
              </h3>
              <div className="space-y-4">
                  {[
                    { device: 'iPhone 15 Pro (App)', location: 'Seattle, WA', current: true, icon: 'fa-mobile-screen' },
                    { device: 'MacBook Pro (Chrome)', location: 'San Francisco, CA', current: false, icon: 'fa-laptop' },
                  ].map((session, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg text-slate-400">
                            <i className={`fa-solid ${session.icon}`}></i>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{session.device} {session.current && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-2 uppercase">Current</span>}</p>
                            <p className="text-xs text-slate-400 font-medium">{session.location} • 2 days ago</p>
                          </div>
                      </div>
                      {!session.current && (
                        <button className="text-xs font-bold text-rose-600 hover:text-rose-700 uppercase tracking-widest">Revoke</button>
                      )}
                    </div>
                  ))}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-slate-900 rounded-3xl p-8 text-white">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-key text-indigo-400"></i>
                  Global Logout
                </h3>
                <p className="text-slate-400 text-xs mb-6 leading-relaxed">Instantly revoke all active sessions across all devices. This will require re-authentication on next access.</p>
                <button className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-all">
                  Log Out All Devices
                </button>
            </section>

            <section className="bg-indigo-50 rounded-3xl p-8 border border-indigo-100">
                <h3 className="font-bold text-indigo-900 mb-2">Privacy Shield</h3>
                <p className="text-indigo-700 text-xs mb-6 leading-relaxed">Your account is protected by HIPAA-compliant data isolation. Individual patient PII is never shared across tenants.</p>
                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-white p-2 rounded-lg border border-indigo-100 w-fit">
                  <i className="fa-solid fa-lock-hashtag"></i>
                  AES-256 Encrypted
                </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'privacy' && <PrivacyConsent />}
      {activeTab === 'accessibility' && <AccessibilitySettings />}
    </div>
  );
};

export default SecuritySettings;
