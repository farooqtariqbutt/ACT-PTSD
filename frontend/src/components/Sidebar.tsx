import React from 'react';
import { NavLink } from 'react-router-dom';
import { type User, UserRole } from '../../types';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  user: User;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const { 
    themeClasses, 
    isAssessmentInProgress, 
    setShowAssessmentQuitDialog, 
    setPendingNavigation 
  } = useApp();

  const handleLogout = () => {
    console.log('Logging out user...');
    localStorage.removeItem('token');
    localStorage.removeItem('current_user_key');
    
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = '/'; 
    }
  };

  const handleLinkClick = (e: React.MouseEvent, to: string) => {
    // 1. If an assessment is in progress, intercept and show the confirmation dialog
    if (isAssessmentInProgress) {
      e.preventDefault();
      setPendingNavigation(to);
      setShowAssessmentQuitDialog(true);
    } 
    // 2. Handle Logout
    else if (to === '/logout') {
      handleLogout();
    } 
    // 3. For all other links, bypass React Router and force a full page reload
    else {
      e.preventDefault(); // Stop React Router from handling the transition
      window.location.href = to; // Force the browser to refresh and load the new URL
    }
  };

  const commonLinks = [
    { to: '/', label: 'Dashboard', icon: 'fa-chart-line' },
    { to: '/assignments', label: 'Recovery Path', icon: 'fa-map-location-dot' },
  ];

  const clientLinks = [
    ...commonLinks,
    { to: '/education', label: 'ACT Education', icon: 'fa-graduation-cap' },
    { to: '/mindfulness', label: 'Guided Sessions', icon: 'fa-spa' },
    { to: '/assessments', label: 'Symptom Tracker', icon: 'fa-clipboard-check' },
    { to: '/visualize', label: 'Visualize Calm', icon: 'fa-image' },
    { to: '/chat', label: 'Messages', icon: 'fa-message' },
  ];

  const therapistLinks = [
    ...commonLinks,
    { to: '/clients', label: 'My Clients', icon: 'fa-users' },
    { to: '/audio-library', label: 'Audio Library', icon: 'fa-music' },
    { to: '/visualize', label: 'Media Lab', icon: 'fa-image' },
  ];

  const adminLinks = [
    ...commonLinks,
    { to: '/staff', label: 'Clinic Staff', icon: 'fa-user-doctor' },
    { to: '/audio-library', label: 'Audio Library', icon: 'fa-music' },
    { to: '/reports', label: 'Reports', icon: 'fa-file-lines' },
    { to: '/settings', label: 'Clinic Settings', icon: 'fa-gears' },
  ];

  const superAdminLinks = [
    ...commonLinks,
    { to: '/clinics', label: 'Clinics', icon: 'fa-hospital' },
    { to: '/users', label: 'User Registry', icon: 'fa-id-card' },
    { to: '/audio-library', label: 'Audio Library', icon: 'fa-music' },
    { to: '/system', label: 'System Health', icon: 'fa-microchip' },
  ];

  const getLinks = () => {
    switch (user.role) {
      case UserRole.CLIENT: return clientLinks;
      case UserRole.THERAPIST: return therapistLinks;
      case UserRole.ADMIN: return adminLinks;
      case UserRole.SUPER_ADMIN: return superAdminLinks;
      default: return commonLinks;
    }
  };

  const displayRole = user.role ? user.role.toLowerCase().replace('_', ' ') : 'user';

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
        <div className={`w-8 h-8 ${themeClasses.primary} rounded-lg flex items-center justify-center text-white`}>
            <i className="fa-solid fa-heart-pulse"></i>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">ACT Path</span>
        </div>

        <nav className="space-y-1">
          {getLinks().map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={(e) => handleLinkClick(e, link.to)}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
                  isActive ? `${themeClasses.primary} text-white shadow-lg ${themeClasses.shadow}` : 'hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <i className={`fa-solid ${link.icon} text-lg w-6`}></i>
              <span className="font-medium">{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-slate-700"></div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{displayRole}</p>
          </div>
        </div>
        <button 
          onClick={(e) => handleLinkClick(e, '/logout')}
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm"
        >
          <i className="fa-solid fa-right-from-bracket"></i>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;