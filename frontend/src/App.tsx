import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole } from '../types';
import { useApp } from './context/AppContext';
import Sidebar from './Sidebar';
import ClientDashboard from './components/ClientDashboard';
import TherapistDashboard from './components/TherapistDashboard';
import AdminDashboard from './components/AdminDashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import ImageGenerator from './components/ImageGenerator';
import Education from './components/Education';
import Mindfulness from './components/Mindfulness';
import Assessments from './components/Assessments';
import ACTChat from './components/ACTChat';
import VirtualSession from './components/VirtualSession';
import SessionDetail from './components/SessionDetail';
import ValuesTool from './components/ValuesTool';
import DefusionLab from './components/DefusionLab';
import ClientAssignments from './components/ClientAssignments';
import ClientReports from './components/ClientReports';
import Profile from './components/Profile';
import TherapistClients from './components/Therapist/TherapistClients';
import ClientDetail from './components/Therapist/ClientDetail';
import TherapistBilling from './components/Therapist/TherapistBilling';
import ClinicStaff from './components/ClinicStaff';
import ClinicSettings from './components/ClinicSettings';
import ClinicRegistry from './components/SuperAdmin/ClinicRegistry';
import GlobalUserRegistry from './components/SuperAdmin/GlobalUserRegistry';
import SystemMaintenance from './components/SuperAdmin/SystemMaintenance';
import SaaSPricing from './components/Billing/SaaSPricing';
import PlatformAnalytics from './components/SuperAdmin/PlatformAnalytics';
import ClinicOnboarding from './components/Onboarding/ClinicOnboarding';
import ClinicReports from './components/ClinicReports';
import AuthFlow from './components/Auth/AuthFlow';
import SecuritySettings from './components/SecuritySettings';
import PanicModal from './components/PanicModal';
import ConsentModal from './components/ConsentModal';
import AudioLibrary from './components/AudioLibrary';
import ValuesActionLog from './components/ValuesActionLog';
import GroundMeNow from './components/GroundMeNow';


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
    // handleLogin signature now accepts the isNewRegistration flag from AuthFlow
    return <AuthFlow onLogin={handleLogin} />;
  }

  // ── Clinic onboarding — only for brand-new ADMIN registrations ────────────
  // showOnboarding is only ever set to true inside handleLogin when
  // isNewRegistration === true && role === ADMIN, so this is safe.
  if (showOnboarding && currentUser.role === UserRole.ADMIN) {
    return <ClinicOnboarding onComplete={() => setShowOnboarding(false)} />;
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
                <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all">
                  <i className="fa-solid fa-bell"></i>
                </button>
              </div>
            </div>
          </header>

          <div className="p-8 max-w-7xl mx-auto pb-24">
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
          </div>
        </main>
      </div>

      <PanicModal />
      <GroundMeNow isOpen={isGroundingOpen} onClose={() => setIsGroundingOpen(false)} />
    </HashRouter>
  );
};

export default App;