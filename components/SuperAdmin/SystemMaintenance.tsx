
import React, { useState, useEffect } from 'react';

const SystemMaintenance: React.FC = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [latency, setLatency] = useState(42);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(prev => Math.max(15, Math.min(150, prev + (Math.random() * 10 - 5))));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">System Control Panel</h2>
          <p className="text-sm text-slate-500">Monitor platform health, security audits, and global performance.</p>
        </div>
        <div className="text-right">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Platform Version</span>
           <span className="text-sm font-bold text-indigo-600">v4.2.1-stable</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
            <div className="flex justify-between items-start mb-10 relative z-10">
              <div>
                <h3 className="text-2xl font-black mb-1">Global Health Index</h3>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Real-time performance metrics</p>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Operational
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10 mb-10">
              {[
                { label: 'API Latency', value: `${latency.toFixed(0)}ms`, color: 'text-emerald-400', sub: 'Healthy' },
                { label: 'CPU Usage', value: '28%', color: 'text-indigo-400', sub: 'Optimized' },
                { label: 'DB Load', value: '14%', color: 'text-sky-400', sub: 'Idle' },
                { label: 'Sockets', value: '14.2k', color: 'text-purple-400', sub: 'Streaming' },
              ].map(stat => (
                <div key={stat.label} className="space-y-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                  <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-indigo-500/50" style={{ width: '40%' }}></div>
                  </div>
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">{stat.sub}</p>
                </div>
              ))}
            </div>

            <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
               <div className="flex gap-10">
                  <div className="text-center md:text-left">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Uptime</p>
                    <p className="text-xl font-black text-slate-200">99.998%</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">MTTR (Avg)</p>
                    <p className="text-xl font-black text-emerald-400">12.4m</p>
                  </div>
               </div>
               <button className="px-8 py-3 bg-white text-slate-900 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all uppercase tracking-widest shadow-xl">
                 Platform Console
               </button>
            </div>
          </section>

          <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-10">
                <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                  <i className="fa-solid fa-shield-virus text-indigo-500"></i>
                  Security & Audit
                </h3>
                <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Full Log Export</button>
             </div>
             <div className="space-y-4">
                {[
                  { time: '2 mins ago', event: 'New Enterprise Tenant Verified', level: 'Info', detail: 'Johns Hopkins Med (TENANT-002) completed security onboarding.' },
                  { time: '14 mins ago', event: 'API Key Rotation', level: 'Secure', detail: 'Automated 30-day credential rotation for platform gateways.' },
                  { time: '1 hour ago', event: 'Suspicious Login Blocked', level: 'Warning', detail: 'IP 192.168.1.1 tried to access Super Admin from unauthorized region.' },
                ].map((log, i) => (
                  <div key={i} className="flex gap-6 p-6 hover:bg-slate-50 rounded-3xl transition-all border border-transparent hover:border-slate-100 group">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shrink-0 ${
                      log.level === 'Warning' ? 'bg-rose-100 text-rose-600' : 
                      log.level === 'Secure' ? 'bg-emerald-100 text-emerald-600' : 
                      'bg-indigo-100 text-indigo-600'
                    }`}>
                      <i className={`fa-solid ${
                        log.level === 'Warning' ? 'fa-shield-halved' : 
                        log.level === 'Secure' ? 'fa-key' : 
                        'fa-info-circle'
                      }`}></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                         <p className="text-sm font-black text-slate-800">{log.event}</p>
                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{log.time}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{log.detail}</p>
                    </div>
                  </div>
                ))}
             </div>
          </section>
        </div>

        <div className="space-y-8">
           <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-800 text-lg mb-8">Service Region Status</h3>
             <div className="space-y-6">
                {[
                  { region: 'US East (Virginia)', status: 'Operational', load: 45 },
                  { region: 'US West (Oregon)', status: 'Operational', load: 22 },
                  { region: 'Europe (Frankfurt)', status: 'Operational', load: 68 },
                  { region: 'Asia (Tokyo)', status: 'Latency Alert', load: 89 },
                ].map(r => (
                  <div key={r.region} className="space-y-2">
                     <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-700">{r.region}</span>
                        <span className={r.load > 80 ? 'text-amber-600' : 'text-emerald-600'}>{r.status}</span>
                     </div>
                     <div className="w-full h-1.5 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full transition-all ${r.load > 80 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${r.load}%` }}></div>
                     </div>
                  </div>
                ))}
             </div>
           </section>

           <section className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-xl shadow-indigo-100">
             <h3 className="font-bold text-xl mb-6">Global Actions</h3>
             <div className="space-y-4">
                <button 
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`w-full p-5 rounded-2xl border transition-all flex items-center gap-4 text-left group ${
                    maintenanceMode ? 'bg-rose-500 border-rose-400' : 'bg-white/10 border-white/10 hover:bg-white/20'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${maintenanceMode ? 'bg-white text-rose-600' : 'bg-white/20 text-white'}`}>
                    <i className="fa-solid fa-screwdriver-wrench"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold">Maintenance Mode</p>
                    <p className="text-[10px] opacity-70 font-bold uppercase">{maintenanceMode ? 'Platform Locked' : 'Fully Active'}</p>
                  </div>
                </button>
                <button className="w-full p-5 bg-white/10 border border-white/10 rounded-2xl hover:bg-white/20 transition-all flex items-center gap-4 text-left">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-lg">
                    <i className="fa-solid fa-bullhorn"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold">Global Push</p>
                    <p className="text-[10px] opacity-70 font-bold uppercase tracking-wider">Alert all active users</p>
                  </div>
                </button>
             </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default SystemMaintenance;
