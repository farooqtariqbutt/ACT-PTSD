import React, { useState, useEffect } from 'react';
import { type Clinic } from '../../../types';

const BASE_URL=import.meta.env.VITE_API_BASE_URL;

const ClinicRegistry: React.FC = () => {
  // 1. Setup State for Data, Pagination, and UI
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalClinics, setTotalClinics] = useState<number>(0);

  // 2. Fetch Logic
  const fetchClinics = async (page: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token'); 
      
      const response = await fetch(`${BASE_URL}/admin/clinics?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch clinics');
      }

      if (result.success) {
        setClinics(result.data);
        setTotalPages(result.meta.totalPages);
        setTotalClinics(result.meta.totalCount);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching clinics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Trigger fetch on mount and page change
  useEffect(() => {
    fetchClinics(currentPage);
  }, [currentPage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Clinic Tenants</h2>
          <p className="text-sm text-slate-500">
            {isLoading ? 'Loading tenants...' : `Oversee all ${totalClinics} clinical organizations and their subscription status.`}
          </p>
        </div>
        <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
          <i className="fa-solid fa-plus mr-2"></i> Onboard New Clinic
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search & Filters */}
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

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 text-rose-600 text-sm text-center font-medium border-b border-rose-100">
            <i className="fa-solid fa-triangle-exclamation mr-2"></i> {error}
          </div>
        )}

        {/* Table Area */}
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
            <tbody className="divide-y divide-slate-50 relative">
              {/* Loading Spinner */}
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-400">
                    <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i>
                    <p className="text-sm font-medium">Fetching clinics...</p>
                  </td>
                </tr>
              )}

              {/* Data Mapping */}
              {!isLoading && clinics.map((c) => {
                // Safely handle MongoDB _id vs standard id
                const clinicId = (c as any)._id || c.id; 
                // Display a shorter version of the DB ID so it looks clean in the UI
                const shortId = clinicId.substring(clinicId.length - 6).toUpperCase();

                return (
                  <tr key={clinicId} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">ID: {shortId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                        c.plan === 'Enterprise' ? 'bg-purple-100 text-purple-700' : 
                        c.plan === 'Professional' ? 'bg-indigo-100 text-indigo-700' : 
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {c.plan || 'N/A'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-600">
                      {/* Note: If your DB schema doesn't store usersCount directly, this will be empty */}
                      {c.usersCount || 0}
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        c.status === 'Live' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        c.status === 'Setup' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {c.status || 'Pending'}
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
                );
              })}

              {!isLoading && clinics.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className="px-8 py-8 text-center text-sm text-slate-500">
                    No clinics found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination Footer */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <p className="text-xs text-slate-500 font-medium ml-4">
              Showing page <span className="font-bold text-slate-800">{currentPage}</span> of <span className="font-bold text-slate-800">{totalPages}</span>
            </p>
            <div className="flex gap-2 mr-4">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicRegistry;