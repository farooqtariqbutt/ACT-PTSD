
import React, { useState } from 'react';

const ClinicReports: React.FC = () => {
  const [reportType, setReportType] = useState('clinical');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Clinic Insights Hub</h2>
          <p className="text-sm text-slate-500 font-medium">Aggregated clinical outcomes and operational performance.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
           <button 
             onClick={() => setReportType('clinical')}
             className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${reportType === 'clinical' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
           >Clinical</button>
           <button 
             onClick={() => setReportType('ops')}
             className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${reportType === 'ops' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
           >Operational</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Avg PCL-5 Drop', value: '-14.2', icon: 'fa-chart-line', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Patient Retention', value: '88%', icon: 'fa-user-check', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Tool Adoption', value: '72%', icon: 'fa-laptop-medical', color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'High-Risk alerts', value: '12', icon: 'fa-triangle-exclamation', color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-200">
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4 text-sm`}>
              <i className={`fa-solid ${stat.icon}`}></i>
            </div>
            <p className="text-2xl font-black text-slate-800 tracking-tighter">{stat.value}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <div>
                 <h3 className="font-bold text-slate-800 text-lg">Cross-Clinic Symptom Reduction</h3>
                 <p className="text-xs text-slate-400 font-medium">Average PCL-5 improvement by clinical domain</p>
              </div>
              <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">Details</button>
           </div>
           
           <div className="space-y-6">
              {[
                { label: 'Re-experiencing', val: 78, color: 'bg-indigo-500' },
                { label: 'Avoidance', val: 62, color: 'bg-sky-500' },
                { label: 'Cognition & Mood', val: 45, color: 'bg-emerald-500' },
                { label: 'Arousal & Reactivity', val: 84, color: 'bg-rose-500' },
              ].map(item => (
                <div key={item.label} className="group">
                   <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-bold text-slate-700">{item.label}</span>
                      <span className="text-xs font-black text-slate-400">{item.val}% Improvement</span>
                   </div>
                   <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <div className={`h-full ${item.color} rounded-full transition-all duration-1000 group-hover:brightness-110`} style={{ width: `${item.val}%` }}></div>
                   </div>
                </div>
              ))}
           </div>
        </section>

        <section className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
           <h3 className="text-xl font-bold mb-8">Therapist Efficacy</h3>
           <div className="space-y-8">
              {[
                { name: 'Dr. Sarah Smith', score: 9.2, clients: 24 },
                { name: 'Dr. Mark Ranson', score: 8.8, clients: 28 },
                { name: 'Jane Doe, LCSW', score: 9.4, clients: 12 },
                { name: 'Bill Knight, PhD', score: 7.9, clients: 18 },
              ].map(t => (
                <div key={t.name} className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center font-bold text-indigo-400">
                        {t.name.split(' ').pop()?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">{t.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.clients} Active Caseload</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-lg font-black text-indigo-400">{t.score}</p>
                      <p className="text-[8px] text-slate-600 font-black uppercase tracking-tighter">Flex Index</p>
                   </div>
                </div>
              ))}
           </div>
           <button className="w-full mt-10 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/50">
             Compare Multi-year Trends
           </button>
        </section>
      </div>

      <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
         <div className="flex justify-between items-center mb-10">
            <h3 className="font-bold text-slate-800 text-lg">Clinic Value Domains</h3>
            <p className="text-xs text-slate-400 font-medium italic">What matters most to our patients?</p>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Personal Growth', count: 142, icon: 'fa-seedling', color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Health & Vitality', count: 118, icon: 'fa-heart-pulse', color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Intimate Relations', count: 98, icon: 'fa-people-group', color: 'text-sky-600', bg: 'bg-sky-50' },
              { label: 'Work & Service', count: 85, icon: 'fa-briefcase', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map(domain => (
              <div key={domain.label} className="text-center group">
                 <div className={`w-16 h-16 mx-auto ${domain.bg} ${domain.color} rounded-[1.5rem] flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-500`}>
                    <i className={`fa-solid ${domain.icon}`}></i>
                 </div>
                 <p className="text-sm font-bold text-slate-800 mb-1">{domain.label}</p>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{domain.count} Patients</p>
              </div>
            ))}
         </div>
      </section>
    </div>
  );
};

export default ClinicReports;
