import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, type User } from '../types';
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
import { storageService } from './services/storageService';
import { userService } from './services/userService';
import ValuesActionLog from './components/ValuesActionLog';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isResolvingAuth, setIsResolvingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null); 
const [currentUserKey, setCurrentUserKey] = useState<string>('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isPanicOpen, setIsPanicOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Persist Session on Load
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUserKey = localStorage.getItem('current_user_key');

      if (token && savedUserKey) {
        // Restore the session with the correct user
        const users = storageService.getUsers();
        let restoredUser = users[savedUserKey];
        
        if (restoredUser) {
          // Fix: Ensure user has a role, default to CLIENT if missing
          if (!restoredUser.role) {
            restoredUser = { ...restoredUser, role: UserRole.CLIENT };
            storageService.saveUser(savedUserKey, restoredUser);
          }
          
          setCurrentUser(restoredUser);
          setCurrentUserKey(savedUserKey);
          setIsAuthenticated(true);
        } else {
          // If the saved key doesn't exist, clear the session
          localStorage.removeItem('token');
          localStorage.removeItem('current_user_key');
        }
      }
      
      // 2. Auth check is done, hide the splash/login
      setIsResolvingAuth(false);
    };

    initAuth();
  }, []);

  // Sync state with storage service whenever user data changes
  const handleLogin = (roleOrKey: string, userData?: User) => {
    
    
    // If userData is provided (from AuthFlow), use it directly
    if (userData) {
      // Ensure user has a role, default to CLIENT if missing
      const userWithRole = {
        ...userData,
        role: userData.role || UserRole.CLIENT
      };
      
      const userKey = (userData as any)._id || (userData as any).id || roleOrKey;
      
      
      setCurrentUser(userWithRole);
      setCurrentUserKey(userKey);
      setIsAuthenticated(true);
      
      // Store the user data and key
      storageService.saveUser(userKey, userWithRole);
      // NOTE: The actual JWT token should already be stored by AuthFlow
      // We don't store 'authenticated' here - the real token is already in localStorage
      localStorage.setItem('current_user_key', userKey);
    } else {
      // Fallback for role-based switching (demo accounts)
      const users = storageService.getUsers();
      
      setCurrentUser(users[roleOrKey]);
      setCurrentUserKey(roleOrKey);
      setIsAuthenticated(true);
      localStorage.setItem('token', 'authenticated'); // Placeholder token for demo purposes
    
      localStorage.setItem('current_user_key', roleOrKey);

      setShowOnboarding(false); 
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    // Clear ALL authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('current_user_key');
    
    // Also clear any cached user data from storageService
    // This ensures a fresh start on next login
    
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentUserKey('');
  };

  const handleAcceptConsent = async() => {
    const updatedUser = await userService.updateProfile({ 
      hasConsented: true,
      consentTimestamp: new Date().toISOString() 
    });
    console.log("Response from server after consent:", updatedUser);
    updateUser(updatedUser);
  };

  const updateUser = (updated: User) => {
    setCurrentUser(updated);
    storageService.saveUser(currentUserKey, updated);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (isResolvingAuth) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Auth Guard
  if (!isAuthenticated || !currentUser) {
    return <AuthFlow onLogin={handleLogin} />;
  }

  // Only show onboarding for Admins who haven't set up
if (showOnboarding && currentUser.role === UserRole.ADMIN) {
  return <ClinicOnboarding onComplete={() => setShowOnboarding(false)} />;
}

// Only show consent for Clients who haven't accepted
if (currentUser.role === UserRole.CLIENT && currentUser.hasConsented === false) {
  return <ConsentModal onAccept={handleAcceptConsent} />;
}

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden text-slate-900 bg-slate-50">
        <Sidebar user={currentUser} onLogout={handleLogout} />

        <main className="flex-1 overflow-y-auto relative scroll-smooth">
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center">
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
                  className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                  title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
                >
                  <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
                </button>
                <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all">
                  <i className="fa-solid fa-bell"></i>
                </button>
              </div>
            </div>
          </header>

          <div className="p-8 max-w-7xl mx-auto pb-24">
            <Routes>
              <Route path="/" element={
                currentUser.role === UserRole.CLIENT ? <ClientDashboard user={currentUser} /> :
                currentUser.role === UserRole.THERAPIST ? <TherapistDashboard /> :
                currentUser.role === UserRole.ADMIN ? <AdminDashboard /> :
                <SuperAdminDashboard />
              } />
              <Route path="/visualize" element={<ImageGenerator />} />
              <Route path="/audio-library" element={<AudioLibrary />} />
              <Route path="/education" element={<Education />} />
              <Route path="/values" element={<ValuesTool />} />
              <Route path="/values-log" element={<ValuesActionLog user={currentUser} />} />
              <Route path="/defuse" element={<DefusionLab />} />
              <Route path="/mindfulness" element={<Mindfulness />} />
              <Route path="/assessments" element={<Assessments />} />
              <Route path="/chat" element={<ACTChat />} />
              <Route path="/session/:sessionNumber" element={<VirtualSession user={currentUser} />} />
              <Route path="/session" element={<Navigate to={`/session/${currentUser.currentSession || 1}`} replace />} />
              <Route path="/session/:sessionNumber/details" element={<SessionDetail />} />
              <Route path="/assignments" element={<ClientAssignments user={currentUser} onUpdateUser={updateUser} />} />
              <Route path="/reports" element={
                currentUser.role === UserRole.CLIENT ? <ClientReports /> : 
                currentUser.role === UserRole.ADMIN ? <ClinicReports /> : 
                currentUser.role === UserRole.SUPER_ADMIN ? <PlatformAnalytics /> :
                <Navigate to="/" replace />
              } />
              <Route path="/profile" element={<Profile user={currentUser} onUpdateUser={updateUser} />} />
              <Route path="/security" element={<SecuritySettings />} />
              
              <Route path="/clients" element={<TherapistClients />} />
              <Route path="/clients/:clientId" element={<ClientDetail />} />
              <Route path="/billing" element={
                currentUser.role === UserRole.THERAPIST ? <TherapistBilling /> : 
                <SaaSPricing currentPlan="Professional" />
              } />
              
              <Route path="/staff" element={<ClinicStaff />} />
              <Route path="/settings" element={<ClinicSettings />} />

              <Route path="/clinics" element={<ClinicRegistry />} />
              <Route path="/users" element={<GlobalUserRegistry />} />
              <Route path="/system" element={<SystemMaintenance />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      <PanicModal isOpen={isPanicOpen} onClose={() => setIsPanicOpen(false)} />
    </HashRouter>
  );
};

export default App;