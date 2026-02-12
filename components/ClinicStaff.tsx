
import React, { useState } from 'react';

interface StaffMember {
  id: string;
  name: string;
  specialty: string;
  clients: number;
  capacity: number;
  status: 'Active' | 'On Leave' | 'Oversubscribed';
}

const MOCK_STAFF: StaffMember[] = [
  { id: 't1', name: 'Dr. Sarah Smith', specialty: 'CBT / ACT', clients: 24, capacity: 30, status: 'Active' },
  { id: 't2', name: 'Dr. Mark Ranson', specialty: 'PTSD / Trauma', clients: 28, capacity: 25, status: 'Oversubscribed' },
  { id: 't3', name: 'Jane Doe, LCSW', specialty: 'Mindfulness', clients: 12, capacity: 20, status: 'Active' },
  { id: 't4', name: 'Bill Knight, PhD', specialty: 'Group Therapy', clients: 18, capacity: 20, status: 'Active' },
];

const ClinicStaff: React.FC = () => {
  const [staff] = useState<StaffMember[]>(MOCK_STAFF);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Clinic Staff</h2>
          <p className="text-sm text-slate-500">Manage your therapeutic team and patient assignments.</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
          <i className="fa-solid fa-user-plus mr-2"></i> Add Therapist
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Therapist</th>
                <th className="px-8 py-5">Specialty</th>
                <th className="px-8 py-5">Workload</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                        {s.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-bold text-slate-800">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm text-slate-600">{s.specialty}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${s.clients >= s.capacity ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${Math.min((s.clients/s.capacity)*100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-slate-700">{s.clients} / {s.capacity}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      s.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      s.status === 'Oversubscribed' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                      'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <button className="p-2 text-slate-400 hover:text-indigo-600"><i className="fa-solid fa-ellipsis-vertical"></i></button>
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

export default ClinicStaff;
