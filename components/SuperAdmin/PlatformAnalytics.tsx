
import React from 'react';

const PlatformAnalytics: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Platform Intelligence</h2>
        <p className="text-sm text-slate-500">Cross-tenant performance metrics and SaaS retention modeling.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Retention (90d)', value: '84.2%', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Churn Rate', value: '1.4%', color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Avg Clinic Size', value: '4.2 Staff', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'SaaS Multiplier', value: '8.4x', color: 'text-sky-600', bg: 'bg-sky-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <p className="text-2xl font-black text-slate-800 tracking-tighter">{stat.value}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-slate-800">Growth per Tier (New Clinics)</h3>
            <select className="text-[10px] font-black uppercase bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-64 flex items-end justify-between gap-4 px-4 relative border-b border-slate-50">
            {[
              { m: 'May', b: 20, p: 40, e: 10 },
              { m: 'Jun', b: 25, p: 45, e: 12 },
              { m: 'Jul', b: 18, p: 55, e: 15 },
              { m: 'Aug', b: 30, p: 60, e: 18 },
              { m: 'Sep', b: 22, p: 75, e: 20 },
              { m: 'Oct', b: 28, p: 82, e: 25 },
            ].map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="w-full flex items-end justify-center gap-1">
                  <div className="w-2 bg-slate-200 rounded-t-sm" style={{ height: `${d.b}%` }}></div>
                  <div className="w-2 bg-indigo-500 rounded-t-sm" style={{ height: `${d.p}%` }}></div>
                  <div className="w-2 bg-indigo-900 rounded-t-sm" style={{ height: `${d.e}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold mt-2">{d.m}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-6 text-[10px] font-bold uppercase tracking-widest justify-center">
            <span className="flex items-center gap-2"><span className="w-2 h-2 bg-slate-200 rounded-full"></span> Basic</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 bg-indigo-500 rounded-full"></span> Professional</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 bg-indigo-900 rounded-full"></span> Enterprise</span>
          </div>
        </section>

        <section className="bg-slate-900 rounded-3xl p-8 text-white">
          <h3 className="font-bold text-lg mb-6">Retention Factors</h3>
          <div className="space-y-6">
            {[
              { label: 'Weekly Active Therapists', score: 92 },
              { label: 'Patient Goal Completion', score: 74 },
              { label: 'Defusion Lab Usage', score: 88 },
              { label: 'Client Return Rate', score: 65 },
            ].map(factor => (
              <div key={factor.label} className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-60">
                  <span>{factor.label}</span>
                  <span>{factor.score}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${factor.score}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-10 py-3 bg-white/10 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/20 transition-all">
            Export Deep Modeling PDF
          </button>
        </section>
      </div>
    </div>
  );
};

export default PlatformAnalytics;
