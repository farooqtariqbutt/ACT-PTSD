
import React, { useState } from 'react';
import { Clinic } from '../types';

const INITIAL_CLINICS: Clinic[] = [
  { id: '1', name: 'Mayo Clinic - Rochester', address: 'Rochester, MN', contactEmail: 'it@mayo.edu', plan: 'Enterprise', status: 'Live', usersCount: 450 },
  { id: '2', name: 'Johns Hopkins Med', address: 'Baltimore, MD', contactEmail: 'admin@jh.edu', plan: 'Enterprise', status: 'Setup', usersCount: 1200 },
  { id: '3', name: 'Local Outreach PTSD Center', address: 'Austin, TX', contactEmail: 'info@localptsd.org', plan: 'Basic', status: 'Live', usersCount: 12 },
  { id: '4', name: 'City Mental Health', address: 'Chicago, IL', contactEmail: 'cmh@city.gov', plan: 'Professional', status: 'Review', usersCount: 85 },
];

const SuperAdminDashboard: React.FC = () => {
  const [clinics] = useState<Clinic[]>(INITIAL_CLINICS);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 rounded-3xl p-8 text-white border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Platform Revenue (ARR)</p>
          <p className="text-4xl font-black tracking-tighter">$1.2M <span className="text-emerald-400 text-sm font-bold">↑ 18%</span></p>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Active Tenants</p>
          <p className="text-4xl font-black text-slate-800 tracking-tighter">{clinics.length} <span className="text-slate-300 text-sm">/ 250</span></p>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Total SaaS Users</p>
          <p className="text-4xl font-black text-slate-800 tracking-tighter">14.2k</p>
        </div>
      </div>

      <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Tenant Management</h2>
            <p className="text-xs text-slate-400">Manage multi-tenant clinic isolation and billing.</p>
          </div>
          <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2">
            <i className="fa-solid fa-plus"></i> Onboard New Clinic
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-50">
                <th className="px-8 py-5">Clinic Name</th>
                <th className="px-8 py-5">Plan</th>
                <th className="px-8 py-5">Data Isolation</th>
                <th className="px-8 py-5">Users</th>
                <th className="px-8 py-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clinics.map((clinic) => (
                <tr key={clinic.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6 flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                      {clinic.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{clinic.name}</p>
                      <p className="text-xs text-slate-400">{clinic.contactEmail}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                      clinic.plan === 'Enterprise' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {clinic.plan}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                     <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                        <i className="fa-solid fa-shield-halved"></i>
                        Encrypted & Isolated
                     </div>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-600">{clinic.usersCount}</td>
                  <td className="px-8 py-6">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      clinic.status === 'Live' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      clinic.status === 'Setup' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      'bg-slate-50 text-slate-600 border border-slate-100'
                    }`}>
                      {clinic.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-3">
            <i className="fa-solid fa-rocket"></i> Deployment Central
          </h3>
          <p className="text-indigo-100 text-sm mb-6 leading-relaxed">System-wide update v4.2.1 ready. New features include Gemini 3 Native Audio for guided sessions.</p>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-black text-sm hover:bg-indigo-50 transition-colors">
              Deploy Canary
            </button>
            <button className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-black text-sm border border-indigo-400 hover:bg-indigo-400 transition-colors">
              Release Notes
            </button>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4">Infrastructure Health</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
               <span className="text-slate-500 font-medium">Database Latency</span>
               <span className="text-emerald-500 font-bold">14ms</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500 w-[98%]"></div>
            </div>
            <div className="flex justify-between items-center text-sm pt-2">
               <span className="text-slate-500 font-medium">API Availability</span>
               <span className="text-emerald-500 font-bold">99.98%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500 w-[99%]"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SuperAdminDashboard;
