
import React, { useState } from 'react';
import { UserRole } from '../../types';

interface GlobalUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clinic: string;
  joined: string;
}

const MOCK_USERS: GlobalUser[] = [
  { id: 'u1', name: 'Alex Johnson', email: 'alex@example.com', role: UserRole.CLIENT, clinic: 'Mayo Clinic', joined: 'Oct 2023' },
  { id: 'u2', name: 'Dr. Sarah Smith', email: 'sarah@clinic.com', role: UserRole.THERAPIST, clinic: 'Mayo Clinic', joined: 'Sep 2023' },
  { id: 'u3', name: 'James Wilson', email: 'admin@clinic.com', role: UserRole.ADMIN, clinic: 'Johns Hopkins', joined: 'Aug 2023' },
  { id: 'u4', name: 'David Chen', email: 'david@client.org', role: UserRole.CLIENT, clinic: 'Vets Wellness', joined: 'Nov 2023' },
];

const GlobalUserRegistry: React.FC = () => {
  const [users] = useState<GlobalUser[]>(MOCK_USERS);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Global User Registry</h2>
          <p className="text-sm text-slate-500">Manage all 14,240 platform users across all clinical tenants.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex gap-4">
           <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input type="text" placeholder="Search by name, email, or user ID..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
           </div>
           <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-white transition-all flex items-center gap-2">
             <i className="fa-solid fa-filter"></i> Filters
           </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-50">
                <th className="px-8 py-5">User</th>
                <th className="px-8 py-5">Role</th>
                <th className="px-8 py-5">Tenant Clinic</th>
                <th className="px-8 py-5">Joined</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div>
                      <p className="font-bold text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                      u.role === UserRole.SUPER_ADMIN ? 'bg-slate-900 text-white' : 
                      u.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-700' : 
                      u.role === UserRole.THERAPIST ? 'bg-emerald-100 text-emerald-700' : 
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm font-medium text-slate-600">{u.clinic}</td>
                  <td className="px-8 py-6 text-sm text-slate-500">{u.joined}</td>
                  <td className="px-8 py-6 text-right">
                     <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit User">
                          <i className="fa-solid fa-user-pen"></i>
                        </button>
                        <button className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete User">
                          <i className="fa-solid fa-trash-can"></i>
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

export default GlobalUserRegistry;
