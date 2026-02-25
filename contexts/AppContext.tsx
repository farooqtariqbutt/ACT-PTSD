
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
