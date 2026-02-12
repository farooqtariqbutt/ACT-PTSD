
import React from 'react';
import { NavLink } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Patients', value: '412', icon: 'fa-hospital-user', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Active Therapists', value: '18', icon: 'fa-user-doctor', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Avg Improvement', value: '+14%', icon: 'fa-chart-line', color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'Sessions This Month', value: '1,240', icon: 'fa-video', color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
              <i className={`fa-solid ${stat.icon}`}></i>
            </div>
            <p className="text-2xl font-bold text-slate-800 tracking-tight">{stat.value}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <h2 className="text-lg font-bold text-slate-800">Staff Workload Distribution</h2>
            <NavLink to="/staff" className="text-xs font-bold text-indigo-600 hover:underline">Manage Team</NavLink>
          </div>
          <div className="p-8 space-y-8">
            {[
              { name: 'Dr. Sarah Smith', load: 85, color: 'bg-indigo-500', count: 24 },
              { name: 'Dr. Mark Ranson', load: 92, color: 'bg-rose-500', count: 28 },
              { name: 'Jane Doe, LCSW', load: 45, color: 'bg-emerald-500', count: 12 },
              { name: 'Bill Knight, PhD', load: 60, color: 'bg-amber-500', count: 18 },
            ].map(staff => (
              <div key={staff.name}>
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-bold text-slate-700">{staff.name}</span>
                  <span className="text-slate-500 font-medium">{staff.count} clients • {staff.load}% Capacity</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${staff.color} rounded-full transition-all duration-1000`} style={{ width: `${staff.load}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-8">
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <i className="fa-solid fa-bell text-rose-500"></i>
              System Alerts
            </h3>
            <div className="space-y-4">
               <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex gap-3">
                  <i className="fa-solid fa-triangle-exclamation text-rose-500 mt-1"></i>
                  <div>
                    <p className="text-sm font-bold text-rose-900">Therapist Capacity</p>
                    <p className="text-xs text-rose-700">Dr. Ranson is at 92% capacity. Consider rerouting new intakes.</p>
                  </div>
               </div>
               <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3">
                  <i className="fa-solid fa-info-circle text-indigo-500 mt-1"></i>
                  <div>
                    <p className="text-sm font-bold text-indigo-900">License Renewal</p>
                    <p className="text-xs text-indigo-700">Subscribed Clinic Pro plan will renew in 14 days.</p>
                  </div>
               </div>
            </div>
          </section>

          <section className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
               <i className="fa-solid fa-chart-pie text-7xl"></i>
            </div>
            <h3 className="text-xl font-bold mb-2">Clinic Reports</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">Download aggregated HIPAA-compliant PDF reports for board review.</p>
            <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
              <i className="fa-solid fa-file-pdf"></i>
              Generate Q3 Report
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
