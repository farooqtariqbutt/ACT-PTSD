import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole } from '../types';
import { useApp } from './context/AppContext';

// ── Synchronous Imports (Layout, Auth, and Emergency Modals) ────────────
import Sidebar from './Sidebar';
import AuthFlow from './components/Auth/AuthFlow';
import PanicModal from './components/PanicModal';
import ConsentModal from './components/ConsentModal';
import GroundMeNow from './components/GroundMeNow';

// ── Lazy Loaded Imports (Routes) ──────────────────────────────────────────
const ClientDashboard = lazy(() => import('./components/ClientDashboard'));
const TherapistDashboard = lazy(() => import('./components/TherapistDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('./components/SuperAdminDashboard'));
const ImageGenerator = lazy(() => import('./components/ImageGenerator'));
const Education = lazy(() => import('./components/Education'));
const Mindfulness = lazy(() => import('./components/Mindfulness'));
const Assessments = lazy(() => import('./components/Assessments'));
const ACTChat = lazy(() => import('./components/ACTChat'));
const VirtualSession = lazy(() => import('./components/VirtualSession'));
const SessionDetail = lazy(() => import('./components/SessionDetail'));
const ValuesTool = lazy(() => import('./components/ValuesTool'));
const DefusionLab = lazy(() => import('./components/DefusionLab'));
const ClientAssignments = lazy(() => import('./components/ClientAssignments'));
const ClientReports = lazy(() => import('./components/ClientReports'));
const Profile = lazy(() => import('./components/Profile'));
const TherapistClients = lazy(() => import('./components/Therapist/TherapistClients'));
const ClientDetail = lazy(() => import('./components/Therapist/ClientDetail'));
const TherapistBilling = lazy(() => import('./components/Therapist/TherapistBilling'));
const ClinicStaff = lazy(() => import('./components/ClinicStaff'));
const ClinicSettings = lazy(() => import('./components/ClinicSettings'));
const ClinicRegistry = lazy(() => import('./components/SuperAdmin/ClinicRegistry'));
const GlobalUserRegistry = lazy(() => import('./components/SuperAdmin/GlobalUserRegistry'));
const SystemMaintenance = lazy(() => import('./components/SuperAdmin/SystemMaintenance'));
const SaaSPricing = lazy(() => import('./components/Billing/SaaSPricing'));
const PlatformAnalytics = lazy(() => import('./components/SuperAdmin/PlatformAnalytics'));
const ClinicOnboarding = lazy(() => import('./components/Onboarding/ClinicOnboarding'));
const ClinicReports = lazy(() => import('./components/ClinicReports'));
const SecuritySettings = lazy(() => import('./components/SecuritySettings'));
const AudioLibrary = lazy(() => import('./components/AudioLibrary'));
const ValuesActionLog = lazy(() => import('./components/ValuesActionLog'));

const App: React.FC = () => {
  const {
    isAuthenticated,
    isResolvingAuth,
    currentUser,
    showOnboarding,
    setShowOnboarding,
    setIsPanicOpen,
    isGroundingOpen,
    setIsGroundingOpen,
    setIsSidebarOpen,
    isFullscreen,
    toggleFullScreen,
    handleLogin,
    handleAcceptConsent,
  } = useApp();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Fetch Notifications ───────────────────────────────────────────────────
  useEffect(() => {
    // Only fetch if authenticated
    if (!isAuthenticated || !currentUser) return;

    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        // Fetch from your backend notifications endpoint
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          // Assuming your API returns { notifications: [...] }
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      }
    };

    fetchNotifications();

    // Optional: Poll every 30 seconds to get real-time reminders
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser]);

  // Handle clicking outside the notification dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      // Optimistically update the UI
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  // ── Resolving auth (checking localStorage + token) ──────────────────────
  if (isResolvingAuth) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (!isAuthenticated || !currentUser) {
    return <AuthFlow onLogin={handleLogin} />;
  }

  // ── Clinic onboarding — only for brand-new ADMIN registrations ────────────
  if (showOnboarding && currentUser.role === UserRole.ADMIN) {
    return (
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>}>
        <ClinicOnboarding onComplete={() => setShowOnboarding(false)} />
      </Suspense>
    );
  }

  // ── Consent — only for clients who haven't accepted yet ──────────────────
  if (currentUser.role === UserRole.CLIENT && currentUser.hasConsented === false) {
    return <ConsentModal onAccept={handleAcceptConsent} />;
  }

  // ── Main app ──────────────────────────────────────────────────────────────
  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden text-slate-900 bg-slate-50">
        <Sidebar />

        <main className="flex-1 overflow-y-auto relative scroll-smooth">
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center">
          <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <i className="fa-solid fa-bars-staggered text-xl"></i>
              </button>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">
                {currentUser.role === UserRole.CLIENT && "My Journey"}
                {currentUser.role === UserRole.THERAPIST && "Practice Console"}
                {currentUser.role === UserRole.ADMIN && "Clinic Manager"}
                {currentUser.role === UserRole.SUPER_ADMIN && "Platform Hub"}
              </h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Welcome, {currentUser.name.split(' ')[0]}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {currentUser.role === UserRole.CLIENT && (
                <button
                  onClick={() => setIsPanicOpen(true)}
                  className="px-4 py-2.5 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all flex items-center gap-2 animate-pulse"
                >
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  Panic
                </button>
              )}

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                System Live
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullScreen}
                  className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                  title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
                >
                  <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
                </button>
                {/* ── Notifications Dropdown ─────────────────────────────────── */}
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <i className="fa-solid fa-bell"></i>
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-white"></span>
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-bold">
                            {unreadCount} New
                          </span>
                        )}
                      </div>
                      
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-3">
                            <i className="fa-solid fa-bell-slash text-3xl opacity-20"></i>
                            <p className="text-xs font-bold uppercase tracking-widest">No new notifications</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-50">
                            {notifications.map((notif) => (
                              <div 
                                key={notif._id} 
                                onClick={() => !notif.isRead && markAsRead(notif._id)}
                                className={`p-5 transition-colors cursor-pointer hover:bg-slate-50 flex gap-4 ${!notif.isRead ? 'bg-indigo-50/30' : 'opacity-75'}`}
                              >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!notif.isRead ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                  <i className="fa-solid fa-clipboard-check"></i>
                                </div>
                                <div className="flex-1">
                                  <p className={`text-sm mb-1 ${!notif.isRead ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                                    {notif.title || "Task Reminder"}
                                  </p>
                                  <p className="text-xs text-slate-500 leading-relaxed">
                                    {notif.message}
                                  </p>
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">
                                    {new Date(notif.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                {!notif.isRead && (
                                  <div className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1"></div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </header>

          <div className="p-8 max-w-7xl mx-auto pb-24">
            {/* ── Suspense Boundary for Lazy Routes ── */}
            <Suspense fallback={
              <div className="flex justify-center items-center h-[60vh]">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            }>
              <Routes>
                {/* ── Default dashboard — always "/" so no stale route survives login ── */}
                <Route path="/" element={
                  currentUser.role === UserRole.CLIENT ? <ClientDashboard /> :
                  currentUser.role === UserRole.THERAPIST ? <TherapistDashboard /> :
                  currentUser.role === UserRole.ADMIN ? <AdminDashboard /> :
                  <SuperAdminDashboard />
                } />

                {/* ── Client routes ─────────────────────────────────────────────── */}
                <Route path="/visualize" element={<ImageGenerator />} />
                <Route path="/audio-library" element={<AudioLibrary />} />
                <Route path="/education" element={<Education />} />
                <Route path="/values" element={<ValuesTool />} />
                <Route path="/values-log" element={<ValuesActionLog user={currentUser} />} />
                <Route path="/defuse" element={<DefusionLab />} />
                <Route path="/mindfulness" element={<Mindfulness />} />
                <Route path="/assessments" element={<Assessments />} />
                <Route path="/chat" element={<ACTChat />} />
                <Route path="/session/:sessionNumber" element={<VirtualSession  />} />
                <Route path="/session" element={<Navigate to={`/session/${currentUser.currentSession || 1}`} replace />} />
                <Route path="/session/dummy" element={
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-3xl shadow-sm">
                      <i className="fa-solid fa-video"></i>
                    </div>
                    <div className="max-w-md">
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">Virtual Session Hub</h2>
                      <p className="text-slate-500 mt-2 font-medium">This area will be used to schedule and launch online sessions with your clients. This feature is currently in development.</p>
                    </div>
                    <button onClick={() => window.history.back()} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">
                      Go Back
                    </button>
                  </div>
                } />
                <Route path="/session/:sessionNumber/details" element={<SessionDetail />} />
                <Route path="/assignments" element={<ClientAssignments />} />

                {/* ── Shared / role-switched routes ─────────────────────────────── */}
                <Route path="/reports" element={
                  currentUser.role === UserRole.CLIENT ? <ClientReports /> :
                  currentUser.role === UserRole.ADMIN ? <ClinicReports /> :
                  currentUser.role === UserRole.SUPER_ADMIN ? <PlatformAnalytics /> :
                  <Navigate to="/" replace />
                } />
                <Route path="/profile" element={<Profile />} />
                <Route path="/security" element={<SecuritySettings />} />

                {/* ── Therapist routes ──────────────────────────────────────────── */}
                <Route path="/clients" element={<TherapistClients />} />
                <Route path="/clients/:clientId" element={<ClientDetail />} />
                <Route path="/billing" element={
                  currentUser.role === UserRole.THERAPIST
                    ? <TherapistBilling />
                    : <SaaSPricing currentPlan="Professional" />
                } />

                {/* ── Admin routes ──────────────────────────────────────────────── */}
                <Route path="/staff" element={<ClinicStaff />} />
                <Route path="/settings" element={<ClinicSettings />} />

                {/* ── Super-admin routes ────────────────────────────────────────── */}
                <Route path="/clinics" element={<ClinicRegistry />} />
                <Route path="/users" element={<GlobalUserRegistry />} />
                <Route path="/system" element={<SystemMaintenance />} />

                {/* ── Catch-all → dashboard ─────────────────────────────────────── */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>

      <PanicModal />
      <GroundMeNow isOpen={isGroundingOpen} onClose={() => setIsGroundingOpen(false)} />
    </HashRouter>
  );
};

export default App;