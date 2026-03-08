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
  handleLogin: (roleOrKey: string, userData?: User) => void;
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

  // Theme Logic
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
          button: 'bg-sky-400 hover:bg-sky-500 text-white'
        };
    }
  };

  const themeClasses = getThemeClasses(currentUser?.themeColor);

  // 1. Persist Session on Load
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUserKey = localStorage.getItem('current_user_key');

      if (token && savedUserKey) {
        const users = storageService.getUsers();
        let restoredUser = users[savedUserKey];
        
        if (restoredUser) {
          if (!restoredUser.role) {
            restoredUser = { ...restoredUser, role: UserRole.CLIENT };
            storageService.saveUser(savedUserKey, restoredUser);
          }
          setCurrentUser(restoredUser);
          setCurrentUserKey(savedUserKey);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('current_user_key');
        }
      }
      setIsResolvingAuth(false);
    };

    initAuth();
  }, []);

  const handleLogin = (roleOrKey: string, userData?: User) => {
    if (userData) {
      const userWithRole = {
        ...userData,
        role: userData.role || UserRole.CLIENT
      };
      const userKey = (userData as any)._id || (userData as any).id || roleOrKey;
      
      setCurrentUser(userWithRole);
      setCurrentUserKey(userKey);
      setIsAuthenticated(true);
      
      storageService.saveUser(userKey, userWithRole);
      localStorage.setItem('current_user_key', userKey);
    } else {
      const users = storageService.getUsers();
      setCurrentUser(users[roleOrKey]);
      setCurrentUserKey(roleOrKey);
      setIsAuthenticated(true);
      localStorage.setItem('token', 'authenticated'); 
      localStorage.setItem('current_user_key', roleOrKey);
      setShowOnboarding(false); 
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('current_user_key');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentUserKey('');
  };

  const handleAcceptConsent = async () => {
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

  const value = {
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