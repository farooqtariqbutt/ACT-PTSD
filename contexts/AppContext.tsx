
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { storageService } from '../services/storageService';

interface AppContextType {
  isAuthenticated: boolean;
  currentUser: User;
  currentUserKey: string;
  showOnboarding: boolean;
  highContrast: boolean;
  isPanicOpen: boolean;
  isFullscreen: boolean;
  isAdminOpen: boolean;
  isAssessmentInProgress: boolean;
  showAssessmentQuitDialog: boolean;
  handleLogin: (roleOrKey: string) => void;
  handleLogout: () => void;
  handleAcceptConsent: () => void;
  switchRole: (key: string) => void;
  updateUser: (updated: User) => void;
  resetDB: () => void;
  toggleFullScreen: () => void;
  setShowOnboarding: (show: boolean) => void;
  setHighContrast: (high: boolean) => void;
  setIsPanicOpen: (open: boolean) => void;
  setIsAdminOpen: (open: boolean) => void;
  setIsAssessmentInProgress: (inProgress: boolean) => void;
  setShowAssessmentQuitDialog: (show: boolean) => void;
  themeClasses: ThemeClasses;
}

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

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(storageService.getUsers()[UserRole.CLIENT]);
  const [currentUserKey, setCurrentUserKey] = useState<string>(UserRole.CLIENT);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [isPanicOpen, setIsPanicOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(true);
  const [isAssessmentInProgress, setIsAssessmentInProgress] = useState(false);
  const [showAssessmentQuitDialog, setShowAssessmentQuitDialog] = useState(false);

  const getThemeClasses = (color?: string): ThemeClasses => {
    switch (color) {
      case 'blue':
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
          button: 'bg-sky-400 hover:bg-sky-500 text-white'
        };
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
          button: 'bg-emerald-400 hover:bg-emerald-500 text-white'
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
          button: 'bg-pink-400 hover:bg-pink-500 text-white'
        };
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
          button: 'bg-sky-400 hover:bg-sky-500 text-white'
        };
    }
  };

  const themeClasses = getThemeClasses(currentUser.themeColor);

  const handleLogin = (roleOrKey: string) => {
    const users = storageService.getUsers();
    setCurrentUser(users[roleOrKey]);
    setCurrentUserKey(roleOrKey);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleAcceptConsent = () => {
    const updated = { 
      ...currentUser, 
      hasConsented: true,
      consentTimestamp: new Date().toISOString() 
    };
    updateUser(updated);
  };

  const switchRole = (key: string) => {
    const users = storageService.getUsers();
    setCurrentUser(users[key]);
    setCurrentUserKey(key);
  };

  const updateUser = (updated: User) => {
    setCurrentUser(updated);
    storageService.saveUser(currentUserKey, updated);
  };

  const resetDB = () => {
    storageService.resetDatabase();
    window.location.reload();
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

  const value = {
    isAuthenticated,
    currentUser,
    currentUserKey,
    showOnboarding,
    highContrast,
    isPanicOpen,
    isFullscreen,
    isAdminOpen,
    isAssessmentInProgress,
    showAssessmentQuitDialog,
    handleLogin,
    handleLogout,
    handleAcceptConsent,
    switchRole,
    updateUser,
    resetDB,
    toggleFullScreen,
    setShowOnboarding,
    setHighContrast,
    setIsPanicOpen,
    setIsAdminOpen,
    setIsAssessmentInProgress,
    setShowAssessmentQuitDialog,
    themeClasses,
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
