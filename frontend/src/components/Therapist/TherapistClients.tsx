
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

interface Patient {
  id: string;
  name: string;
  lastScore: number;
  trend: 'up' | 'down' | 'stable';
  compliance: number;
  nextSession: string;
  risk: 'High' | 'Moderate' | 'Low';
}

const TherapistClients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/therapist/clients`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to fetch clients');
        
        const data = await response.json();

        // Map the backend DB structure to our frontend UI interface
        // Note: Fallbacks are provided for fields you may not be tracking yet
        const formattedPatients: Patient[] = data.map((client: any) => {
          const score = client.currentClinicalSnapshot?.pcl5Total || 0;
          
          return {
            id: client._id,
            name: client.name || 'Unknown Client',
            lastScore: score,
            trend: 'stable', // Placeholder until you implement trend tracking
            compliance: 100, // Placeholder for app usage percentage
            nextSession: 'TBD', // Placeholder for scheduling system
            risk: score > 50 ? 'High' : score > 30 ? 'Moderate' : 'Low'
          };
        });

        setPatients(formattedPatients);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <i className="fa-solid fa-circle-notch animate-spin text-3xl text-indigo-600"></i>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600">
        <h3 className="font-bold mb-2">Error Loading Clients</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Client Roster</h2>
          <p className="text-sm text-slate-500">Manage and monitor your {patients.length} active patients.</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
          <i className="fa-solid fa-user-plus mr-2"></i> Add New Client
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-4">
           <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input type="text" placeholder="Search by name, risk, or score..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
           </div>
           <select className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 outline-none">
              <option>All Risk Levels</option>
              <option>High Risk</option>
              <option>Moderate Risk</option>
              <option>Low Risk</option>
           </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-50">
                <th className="px-8 py-5">Patient Name</th>
                <th className="px-8 py-5">Symptom Score (PCL-5)</th>
                <th className="px-8 py-5">App Compliance</th>
                <th className="px-8 py-5">Risk Status</th>
                <th className="px-8 py-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-10 text-center text-slate-400 font-medium">
                    No clients currently assigned to you.
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-sm">
                          {p.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Next: {p.nextSession}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-700">{p.lastScore}</span>
                        {p.trend === 'up' && <i className="fa-solid fa-arrow-trend-up text-rose-500 text-xs"></i>}
                        {p.trend === 'down' && <i className="fa-solid fa-arrow-trend-down text-emerald-500 text-xs"></i>}
                        {p.trend === 'stable' && <i className="fa-solid fa-minus text-slate-300 text-xs"></i>}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${p.compliance > 80 ? 'bg-emerald-500' : p.compliance > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${p.compliance}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 block">{p.compliance}% Active</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        p.risk === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                        p.risk === 'Moderate' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}>
                        {p.risk} Risk
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <NavLink to={`/clients/${p.id}`} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Detail">
                          <i className="fa-solid fa-chart-user"></i>
                        </NavLink>
                        <NavLink to="/session" className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Start Session">
                          <i className="fa-solid fa-video"></i>
                        </NavLink>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TherapistClients;
