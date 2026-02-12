
import React from 'react';

const TherapistDashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Clients', value: '24', icon: 'fa-users', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Weekly Revenue', value: '$2,840', icon: 'fa-hand-holding-dollar', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'High Risk Alerts', value: '2', icon: 'fa-triangle-exclamation', color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Avg PCL-5 Change', value: '-12%', icon: 'fa-chart-line', color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
              <i className={`fa-solid ${stat.icon}`}></i>
            </div>
            <p className="text-2xl font-bold text-slate-800 tracking-tight">{stat.value}</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Active Client Roster</h2>
            <div className="flex gap-2">
               <button className="p-2 text-slate-400 hover:text-indigo-600"><i className="fa-solid fa-magnifying-glass"></i></button>
               <button className="p-2 text-slate-400 hover:text-indigo-600"><i className="fa-solid fa-filter"></i></button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                  <th className="px-8 py-4">Patient</th>
                  <th className="px-8 py-4">PCL-5 Score</th>
                  <th className="px-8 py-4">Compliance</th>
                  <th className="px-8 py-4">Next Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { name: 'Alex Johnson', score: 42, compliance: '92%', session: 'Today, 10am', color: 'text-emerald-500' },
                  { name: 'Sarah Miller', score: 58, compliance: '65%', session: 'Tomorrow, 2pm', color: 'text-amber-500' },
                  { name: 'David Chen', score: 65, compliance: '40%', session: 'Fri, 9am', color: 'text-rose-500' },
                  { name: 'Emily White', score: 28, compliance: '100%', session: 'Mon, 11am', color: 'text-emerald-500' },
                ].map((client, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                    <td className="px-8 py-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                        {client.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-700">{client.name}</span>
                    </td>
                    <td className="px-8 py-5">
                       <span className={`font-black ${client.color}`}>{client.score}</span>
                       <span className="text-[10px] text-slate-400 ml-1">pts</span>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-slate-500">{client.compliance}</td>
                    <td className="px-8 py-5 text-sm font-bold text-indigo-600">{client.session}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-8">
           <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl">
              <h3 className="font-bold text-xl mb-4">Team Practice</h3>
              <p className="text-slate-400 text-sm mb-6">Central Wellness Clinic (Regional Hub)</p>
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><i className="fa-solid fa-user-doctor"></i></div>
                    <span className="text-sm font-medium text-slate-300">Shared Notes enabled</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><i className="fa-solid fa-lock"></i></div>
                    <span className="text-sm font-medium text-slate-300">Multi-tenant isolation active</span>
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-6">Recent Alerts</h3>
              <div className="space-y-4">
                 <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex gap-3 items-start">
                    <i className="fa-solid fa-circle-exclamation text-rose-500 mt-1"></i>
                    <div>
                       <p className="text-sm font-bold text-rose-900">High Risk: David Chen</p>
                       <p className="text-xs text-rose-700">PCL-5 score increased by 15 points in 7 days.</p>
                    </div>
                 </div>
                 <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 items-start">
                    <i className="fa-solid fa-clock text-amber-500 mt-1"></i>
                    <div>
                       <p className="text-sm font-bold text-amber-900">Low Compliance: Sarah M.</p>
                       <p className="text-xs text-amber-700">Hasn't logged values for 4 consecutive days.</p>
                    </div>
                 </div>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
};

export default TherapistDashboard;
