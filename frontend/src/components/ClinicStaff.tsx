
import React, { useEffect, useState } from 'react';

interface StaffMember {
  id: string;
  name: string;
  specialty: string;
  clients: number;
  capacity: number;
  status: 'Active' | 'On Leave' | 'Oversubscribed';
}

const BASE_URL=import.meta.env.VITE_API_BASE_URL;

const ClinicStaff: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTherapists = async () => {
      try {
        // 1. Get your auth token (adjust this if you use cookies or a context provider)
        const token = localStorage.getItem('token'); 

        // 2. Call your new admin controller endpoint
        // Replace this URL with your actual API route
        const response = await fetch(`${BASE_URL}/admin/clinicStaff?page=1&limit=50`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Passing the token to req.user
          }
        });

        const result = await response.json();

        if (result.success) {
          // 3. Map the MongoDB document (_id) to your frontend interface (id)
          const mappedStaff = result.data.map((user: any) => ({
            id: user._id,
            name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            specialty: user.specialty || 'General Therapist', // Fallback if not in schema
            clients: user.currentClientsCount || 0,           // Fallback if not in schema
            capacity: user.maxCapacity || 20,                 // Fallback if not in schema
            status: user.status || 'Active'
          }));
          
          setStaff(mappedStaff);
        } else {
          setError(result.message || 'Failed to fetch therapists.');
        }
      } catch (err) {
        console.error('Error fetching staff:', err);
        setError('A network error occurred while fetching staff.');
      } finally {
        setLoading(false);
      }
    };

    fetchTherapists();
  }, []);

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
        {loading ? (
          <div className="p-10 text-center text-slate-500 font-medium">
            <i className="fa-solid fa-circle-notch fa-spin mr-2 text-indigo-600"></i>
            Loading clinic staff...
          </div>
        ) : error ? (
          <div className="p-10 text-center text-rose-500 font-medium bg-rose-50">
            <i className="fa-solid fa-triangle-exclamation mr-2"></i>
            {error}
          </div>
        ) : staff.length === 0 ? (
          <div className="p-10 text-center text-slate-500 font-medium">
            No therapists found for this clinic.
          </div>
        ) : (
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
                          {s.name ? s.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?'}
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
        )}
      </div>
    </div>
  );
};

export default ClinicStaff;