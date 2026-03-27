import React, { useState, useEffect } from 'react';
import { type Clinic } from '../../types';
import GlobalUserRegistry from './SuperAdmin/GlobalUserRegistry';
import ClinicRegistry from './SuperAdmin/ClinicRegistry';
import SystemMaintenance from './SuperAdmin/SystemMaintenance';
import PlatformAnalytics from './SuperAdmin/PlatformAnalytics';
import SubscriptionManagement from './SuperAdmin/SubscriptionManagement';

const BASE_URL=import.meta.env.VITE_API_BASE_URL;

const SuperAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'clinics' | 'settings' | 'analytics' | 'subscriptions'>('overview');
  
  // 1. Setup State for Overview Data
  const [recentClinics, setRecentClinics] = useState<Clinic[]>([]);
  const [totalClinics, setTotalClinics] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 2. Fetch Dashboard Overview Data
  useEffect(() => {
    const fetchOverviewData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch Clinics (limit 3 for the recent tenants table)
        const clinicsRes = await fetch(`${BASE_URL}/admin/clinics?page=1&limit=3`, { headers });
        const clinicsData = await clinicsRes.json();

        // Fetch Users (just getting 1 item to get the totalCount meta data)
        const usersRes = await fetch(`${BASE_URL}/admin/users?page=1&limit=1`, { headers });
        const usersData = await usersRes.json();

        if (clinicsData.success) {
          setRecentClinics(clinicsData.data);
          setTotalClinics(clinicsData.meta.totalCount);
        }

        if (usersData.success) {
          setTotalUsers(usersData.meta.totalCount);
        }

      } catch (error) {
        console.error('Failed to load dashboard overview data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch this data if we are actually looking at the overview tab
    if (activeTab === 'overview') {
      fetchOverviewData();
    }
  }, [activeTab]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'fa-house' },
    { id: 'users', label: 'Users', icon: 'fa-users-gear' },
    { id: 'clinics', label: 'Clinics', icon: 'fa-hospital' },
    { id: 'subscriptions', label: 'Subscriptions', icon: 'fa-credit-card' },
    { id: 'analytics', label: 'Analytics', icon: 'fa-chart-pie' },
    { id: 'settings', label: 'Settings', icon: 'fa-sliders' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
            }`}
          >
            <i className={`fa-solid ${tab.icon}`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 rounded-3xl p-8 text-white border border-slate-800 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Platform Revenue (ARR)</p>
              {/* This might need its own API call later! Hardcoded for now. */}
              <p className="text-4xl font-black tracking-tighter">$1.2M <span className="text-emerald-400 text-sm font-bold">↑ 18%</span></p>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col justify-center">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Active Tenants</p>
              {isLoading ? (
                <div className="h-10 w-24 bg-slate-100 animate-pulse rounded-lg"></div>
              ) : (
                <p className="text-4xl font-black text-slate-800 tracking-tighter">{totalClinics}</p>
              )}
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col justify-center">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Total SaaS Users</p>
              {isLoading ? (
                <div className="h-10 w-24 bg-slate-100 animate-pulse rounded-lg"></div>
              ) : (
                <p className="text-4xl font-black text-slate-800 tracking-tighter">
                  {/* Format numbers larger than 1000 nicely (e.g., 14,200) */}
                  {totalUsers.toLocaleString()} 
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <section className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Recent Tenants</h2>
                  <p className="text-xs text-slate-400">Latest clinics onboarded to the platform.</p>
                </div>
                <button onClick={() => setActiveTab('clinics')} className="text-xs font-bold text-indigo-600 hover:underline">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-50">
                      <th className="px-8 py-5">Clinic Name</th>
                      <th className="px-8 py-5">Plan</th>
                      <th className="px-8 py-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isLoading ? (
                      <tr>
                        <td colSpan={3} className="px-8 py-12 text-center text-slate-400">
                          <i className="fa-solid fa-circle-notch fa-spin text-xl mb-2"></i>
                        </td>
                      </tr>
                    ) : (
                      recentClinics.map((clinic) => {
                        // Handle MongoDB _id if necessary
                        const clinicId = (clinic as any)._id || clinic.id;
                        
                        return (
                          <tr key={clinicId} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <p className="font-bold text-slate-800">{clinic.name}</p>
                              <p className="text-xs text-slate-400">{clinic.contactEmail}</p>
                            </td>
                            <td className="px-8 py-6">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                clinic.plan === 'Enterprise' ? 'bg-indigo-100 text-indigo-700' : 
                                clinic.plan === 'Professional' ? 'bg-purple-100 text-purple-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {clinic.plan || 'N/A'}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                clinic.status === 'Live' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                clinic.status === 'Setup' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                'bg-rose-50 text-rose-600 border border-rose-100'
                              }`}>
                                {clinic.status || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    
                    {!isLoading && recentClinics.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-8 py-8 text-center text-sm text-slate-500">
                          No tenants onboarded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="space-y-8">
              <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200">
                <h3 className="font-bold text-xl mb-4 flex items-center gap-3">
                  <i className="fa-solid fa-rocket"></i> System Update
                </h3>
                <p className="text-indigo-100 text-sm mb-6 leading-relaxed">v4.2.1-stable is live. All regions operational.</p>
                <button onClick={() => setActiveTab('settings')} className="w-full py-3 bg-white text-indigo-600 rounded-xl font-black text-sm hover:bg-indigo-50 transition-colors">
                  Control Panel
                </button>
              </div>
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4">Infrastructure</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">API Health</span>
                    <span className="text-emerald-500 font-bold">99.9%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[99%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && <GlobalUserRegistry />}
      {activeTab === 'clinics' && <ClinicRegistry />}
      {activeTab === 'subscriptions' && <SubscriptionManagement />}
      {activeTab === 'analytics' && <PlatformAnalytics />}
      {activeTab === 'settings' && <SystemMaintenance />}
    </div>
  );
};

export default SuperAdminDashboard;