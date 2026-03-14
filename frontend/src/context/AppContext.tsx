/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { type User, UserRole } from '../../types';
import { storageService } from '../services/storageService';
import { userService } from '../services/userService';

export interface ThemeClasses {
  primary: string;
  secondary: string;
  text: string;
  border: string;
  hover: string;
  sidebar: string;
  sidebarHover: string;
  accent: string;
  shadow: string;
  ring: string;
  gradient: string;
  button: string;
}

interface AppContextType {
  isAuthenticated: boolean;
  isResolvingAuth: boolean;
  currentUser: User | null;
  currentUserKey: string;
  showOnboarding: boolean;
  highContrast: boolean;
  isPanicOpen: boolean;
  isFullscreen: boolean;
  isAdminOpen: boolean;
  isAssessmentInProgress: boolean;
  showAssessmentQuitDialog: boolean;
  themeClasses: ThemeClasses;
  // isNewRegistration flag lets AuthFlow signal a fresh signup
  handleLogin: (roleOrKey: string, userData?: User, isNewRegistration?: boolean) => void;
  handleLogout: () => void;
  handleAcceptConsent: () => Promise<void>;
  updateUser: (updated: User) => void;
  toggleFullScreen: () => void;
  setShowOnboarding: (show: boolean) => void;
  setHighContrast: (high: boolean) => void;
  setIsPanicOpen: (open: boolean) => void;
  setIsAdminOpen: (open: boolean) => void;
  setIsAssessmentInProgress: (inProgress: boolean) => void;
  setShowAssessmentQuitDialog: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isResolvingAuth, setIsResolvingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserKey, setCurrentUserKey] = useState<string>('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [isPanicOpen, setIsPanicOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(true);
  const [isAssessmentInProgress, setIsAssessmentInProgress] = useState(false);
  const [showAssessmentQuitDialog, setShowAssessmentQuitDialog] = useState(false);

  // ─── Theme Logic ─────────────────────────────────────────────────────────────
  const getThemeClasses = (color?: string): ThemeClasses => {
    switch (color) {
      case 'green':
        return {
          primary: 'bg-emerald-400',
          secondary: 'bg-emerald-50',
          text: 'text-emerald-500',
          border: 'border-emerald-100',
          hover: 'hover:bg-emerald-500',
          sidebar: 'bg-emerald-50',
          sidebarHover: 'hover:bg-emerald-100',
          accent: 'text-emerald-300',
          shadow: 'shadow-emerald-100',
          ring: 'focus:ring-emerald-400',
          gradient: 'from-emerald-300 to-emerald-500',
          button: 'bg-emerald-400 hover:bg-emerald-500 text-white',
        };
      case 'pink':
        return {
          primary: 'bg-pink-400',
          secondary: 'bg-pink-50',
          text: 'text-pink-500',
          border: 'border-pink-100',
          hover: 'hover:bg-pink-500',
          sidebar: 'bg-pink-50',
          sidebarHover: 'hover:bg-pink-100',
          accent: 'text-pink-300',
          shadow: 'shadow-pink-100',
          ring: 'focus:ring-pink-400',
          gradient: 'from-pink-300 to-pink-500',
          button: 'bg-pink-400 hover:bg-pink-500 text-white',
        };
      case 'blue':
      default:
        return {
          primary: 'bg-sky-400',
          secondary: 'bg-sky-50',
          text: 'text-sky-500',
          border: 'border-sky-100',
          hover: 'hover:bg-sky-500',
          sidebar: 'bg-sky-50',
          sidebarHover: 'hover:bg-sky-100',
          accent: 'text-sky-300',
          shadow: 'shadow-sky-100',
          ring: 'focus:ring-sky-400',
          gradient: 'from-sky-300 to-sky-500',
          button: 'bg-sky-400 hover:bg-sky-500 text-white',
        };
    }
  };

  const themeClasses = getThemeClasses(currentUser?.themeColor);

  // ─── Restore session from localStorage on mount ───────────────────────────
  // NOTE: showOnboarding is intentionally NOT restored here.
  // Onboarding only fires once during a fresh registration (see handleLogin).
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUserKey = localStorage.getItem('current_user_key');

      if (token && savedUserKey) {
        try {
          // Always try to get fresh data from the server first
          const freshUser = await userService.getProfile();
          if (freshUser) {
            const userWithRole = { ...freshUser, role: freshUser.role || UserRole.CLIENT };
            setCurrentUser(userWithRole);
            setCurrentUserKey(savedUserKey);
            setIsAuthenticated(true);
            const { profileImage: _omit2, ...safeRestore } = userWithRole as any;
            storageService.saveUser(savedUserKey, safeRestore);
          }
        } catch {
          // If server fetch fails (e.g. expired token), clear the session cleanly
          localStorage.removeItem('token');
          localStorage.removeItem('current_user_key');
        }
      }

      setIsResolvingAuth(false);
    };

    initAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Login ────────────────────────────────────────────────────────────────
  const handleLogin = (roleOrKey: string, userData?: User, isNewRegistration = false) => {
    if (!userData) {
      console.error('handleLogin called without userData. Login aborted.');
      return;
    }

    const userWithRole: User = {
      ...userData,
      role: userData.role || UserRole.CLIENT,
    };

    const userKey = (userData as any)._id || (userData as any).id || roleOrKey;

    // Set what we have immediately so the UI is responsive
    setCurrentUser(userWithRole);
    setCurrentUserKey(userKey);
    setIsAuthenticated(true);

    const { profileImage: _omit, ...safeLogin } = userWithRole as any;
    storageService.saveUser(userKey, safeLogin);
    localStorage.setItem('current_user_key', userKey);

    // ── Hydrate full profile in the background ─────────────────────────────
    // Auth endpoints (/verify-mfa) typically omit heavy fields like
    // profileImage. Fetch the full profile silently so the avatar appears
    // immediately on the dashboard without waiting for the Profile page.
    userService.getProfile().then((fullUser) => {
      const hydrated: User = { ...userWithRole, ...fullUser };
      setCurrentUser(hydrated);
      const { profileImage: _img, ...safeHydrated } = hydrated as any;
      storageService.saveUser(userKey, safeHydrated);
    }).catch(() => {
      // Non-critical — user is already logged in, image just won't show
      // until they visit the Profile page
    });

    // ── Onboarding gate ────────────────────────────────────────────────────
    if (isNewRegistration && userWithRole.role === UserRole.ADMIN) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }

    // ── Routing reset ──────────────────────────────────────────────────────
    window.location.hash = '#/';
  };

  // ─── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('current_user_key');

    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentUserKey('');
    setShowOnboarding(false);

    // Reset route so the next login doesn't inherit the previous user's page
    window.location.hash = '#/';
  };

  // ─── Consent ─────────────────────────────────────────────────────────────
  const handleAcceptConsent = async () => {
    const updatedUser = await userService.updateProfile({
      hasConsented: true,
      consentTimestamp: new Date().toISOString(),
    });
    updateUser(updatedUser);
  };

  // ─── Profile update (does NOT touch onboarding state) ────────────────────
  // IMPORTANT: merge into currentUser rather than replacing it wholesale.
  // Profile update endpoints often return only the fields they changed.
  // Replacing outright would wipe fields like `hasConsented` that the server
  // didn't include in its response — causing the consent modal to re-appear.
  const updateUser = (updated: User) => {
    const merged: User = { ...currentUser, ...updated } as User;
    setCurrentUser(merged); // keep full data (incl. image) in React state

    // Strip base64 profileImage before writing to localStorage.
    // A single base64 image is 1–3 MB and localStorage has a hard 5 MB cap.
    // The image is already persisted on the server — we only need lightweight
    // metadata locally for session restore. On next mount, initAuth fetches
    // fresh data from the server anyway, so the image is never lost.
    const { profileImage: _omit, ...safeToStore } = merged as any;
    storageService.saveUser(currentUserKey, safeToStore);
    // Intentionally no setShowOnboarding — profile updates must never
    // re-trigger onboarding.
  };

  // ─── Fullscreen ───────────────────────────────────────────────────────────
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error enabling full-screen: ${err.message}`);
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

  const value: AppContextType = {
    isAuthenticated,
    isResolvingAuth,
    currentUser,
    currentUserKey,
    showOnboarding,
    highContrast,
    isPanicOpen,
    isFullscreen,
    isAdminOpen,
    isAssessmentInProgress,
    showAssessmentQuitDialog,
    themeClasses,
    handleLogin,
    handleLogout,
    handleAcceptConsent,
    updateUser,
    toggleFullScreen,
    setShowOnboarding,
    setHighContrast,
    setIsPanicOpen,
    setIsAdminOpen,
    setIsAssessmentInProgress,
    setShowAssessmentQuitDialog,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};