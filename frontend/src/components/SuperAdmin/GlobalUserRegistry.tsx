
import React, { useState,useEffect } from 'react';
import { UserRole } from '../../../types';

interface GlobalUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clinic: string;
  joined: string;
  createdAt: string;
}

const BASE_URL=import.meta.env.VITE_API_BASE_URL;

const GlobalUserRegistry: React.FC = () => {
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  const fetchUsers = async (page: number) => {
    setIsLoading(true);
    setError(null);

    try {
      // Assuming you store your JWT in localStorage. Adjust if using Context/Redux!
      const token = localStorage.getItem('token'); 
      
      const response = await fetch(`${BASE_URL}/admin/users?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch users');
      }

      if (result.success) {
        setUsers(result.data);
        setTotalPages(result.meta.totalPages);
        setTotalUsers(result.meta.totalCount);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Trigger fetch when component mounts or currentPage changes
  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  // Helper function to format the DB timestamp into "Oct 2023"
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Global User Registry</h2>
          <p className="text-sm text-slate-500">
            {isLoading ? 'Loading platform users...' : `Manage all ${totalUsers.toLocaleString()} platform users across all clinical tenants.`}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search & Filter Bar (Kept exactly as you had it) */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex gap-4">
           <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input type="text" placeholder="Search by name, email, or user ID..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
           </div>
           <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-white transition-all flex items-center gap-2">
             <i className="fa-solid fa-filter"></i> Filters
           </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 text-rose-600 text-sm text-center font-medium border-b border-rose-100">
            <i className="fa-solid fa-triangle-exclamation mr-2"></i> {error}
          </div>
        )}

        {/* Table */}
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
            <tbody className="divide-y divide-slate-50 relative">
              {/* Loading Overlay */}
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400">
                    <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i>
                    <p className="text-sm font-medium">Fetching users...</p>
                  </td>
                </tr>
              )}

              {/* Data Mapping */}
              {!isLoading && users.map((u) => (
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
                  {/* Note: Depending on your DB, 'clinic' might be an object. You might need u.clinic.name here */}
                  <td className="px-8 py-6 text-sm font-medium text-slate-600">{u.clinic}</td>
                  <td className="px-8 py-6 text-sm text-slate-500">{formatDate(u.createdAt)}</td>
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
              
              {!isLoading && users.length === 0 && !error && (
                <tr>
                  <td colSpan={5} className="px-8 py-8 text-center text-sm text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination Controls Footer */}
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

export default GlobalUserRegistry;
