
import React, { useState } from 'react';
import { Clinic } from '../../types';

const INITIAL_CLINICS: Clinic[] = [
  { id: '1', name: 'Mayo Clinic - Rochester', address: 'Rochester, MN', contactEmail: 'it@mayo.edu', plan: 'Enterprise', status: 'Live', usersCount: 450 },
  { id: '2', name: 'Johns Hopkins Med', address: 'Baltimore, MD', contactEmail: 'admin@jh.edu', plan: 'Enterprise', status: 'Setup', usersCount: 1200 },
  { id: '3', name: 'Local Outreach PTSD Center', address: 'Austin, TX', contactEmail: 'info@localptsd.org', plan: 'Basic', status: 'Live', usersCount: 12 },
  { id: '4', name: 'City Mental Health', address: 'Chicago, IL', contactEmail: 'cmh@city.gov', plan: 'Professional', status: 'Review', usersCount: 85 },
  { id: '5', name: 'Veterans Wellness Hub', address: 'Seattle, WA', contactEmail: 'vwh@va.gov', plan: 'Professional', status: 'Live', usersCount: 210 },
];

const ClinicRegistry: React.FC = () => {
  const [clinics] = useState<Clinic[]>(INITIAL_CLINICS);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Clinic Tenants</h2>
          <p className="text-sm text-slate-500">Oversee all clinical organizations and their subscription status.</p>
        </div>
        <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
          <i className="fa-solid fa-plus mr-2"></i> Onboard New Clinic
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-4">
           <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input type="text" placeholder="Search clinics by name, ID, or email..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
           </div>
           <select className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 outline-none">
              <option>All Plans</option>
              <option>Enterprise</option>
              <option>Professional</option>
              <option>Basic</option>
           </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-50">
                <th className="px-8 py-5">Clinic Name & ID</th>
                <th className="px-8 py-5">Subscription Plan</th>
                <th className="px-8 py-5">Users</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Managed By</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clinics.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">ID: TENANT-00{c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                      c.plan === 'Enterprise' ? 'bg-purple-100 text-purple-700' : 
                      c.plan === 'Professional' ? 'bg-indigo-100 text-indigo-700' : 
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {c.plan}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-600">{c.usersCount}</td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      c.status === 'Live' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      c.status === 'Setup' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-xs text-slate-500 font-medium">{c.contactEmail}</td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Manage Tenant">
                        <i className="fa-solid fa-gears"></i>
                      </button>
                      <button className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Suspend Access">
                        <i className="fa-solid fa-ban"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClinicRegistry;
