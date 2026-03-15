
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { UserRole } from './types';
import { useApp } from './contexts/AppContext';

const Sidebar: React.FC = () => {
  const { currentUser: user, handleLogout: onLogout, isAssessmentInProgress, setShowAssessmentQuitDialog, themeClasses, isSidebarOpen, setIsSidebarOpen } = useApp();
  const navigate = useNavigate();
  
  const handleLinkClick = (e: React.MouseEvent, to: string) => {
    if (isAssessmentInProgress) {
      e.preventDefault();
      setShowAssessmentQuitDialog(true);
    } else {
      setIsSidebarOpen(false);
    }
  };
  
  const commonLinks = [
    { to: '/', label: 'Dashboard', icon: 'fa-chart-line' },
  ];

  const clientLinks = [
    ...commonLinks,
    { to: '/assessments', label: 'Assessments', icon: 'fa-clipboard-check' },
    { to: '/assignments', label: 'Recovery Path', icon: 'fa-map-location-dot' },
    { to: '/reports', label: 'My Progress', icon: 'fa-chart-simple' },
    { to: '/education', label: 'ACT Education', icon: 'fa-graduation-cap' },
    { to: '/values-log', label: 'Values Action Log', icon: 'fa-calendar-check' },
    { to: '/values', label: 'Values Compass', icon: 'fa-location-dot' },
    { to: '/defuse', label: 'Defusion Lab', icon: 'fa-scissors' },
    { to: '/mindfulness', label: 'Guided Sessions', icon: 'fa-spa' },
    { to: '/visualize', label: 'Visualize Calm', icon: 'fa-image' },
    { to: '/chat', label: 'ACT Companion', icon: 'fa-comments' },
    { to: '/profile', label: 'Profile Settings', icon: 'fa-user' },
  ];

  const therapistLinks = [
    ...commonLinks,
    { to: '/clients', label: 'My Clients', icon: 'fa-users' },
    { to: '/assignments', label: 'View Recovery Path', icon: 'fa-map-location-dot' },
    { to: '/defuse', label: 'Defusion Lab', icon: 'fa-scissors' },
    { to: '/visualize', label: 'Media Lab', icon: 'fa-palette' },
    { to: '/session/dummy', label: 'Start Session', icon: 'fa-video' },
    { to: '/billing', label: 'License & Billing', icon: 'fa-credit-card' },
  ];

  const adminLinks = [
    ...commonLinks,
    { to: '/assignments', label: 'Recovery Path', icon: 'fa-map-location-dot' },
    { to: '/staff', label: 'Clinic Staff', icon: 'fa-user-doctor' },
    { to: '/reports', label: 'Clinic Reports', icon: 'fa-file-lines' },
    { to: '/billing', label: 'Clinic Subscription', icon: 'fa-credit-card' },
    { to: '/settings', label: 'Clinic Settings', icon: 'fa-gears' },
  ];

  const superAdminLinks = [
    ...commonLinks,
    { to: '/assignments', label: 'Recovery Path', icon: 'fa-map-location-dot' },
    { to: '/clinics', label: 'Clinic Registry', icon: 'fa-hospital' },
    { to: '/users', label: 'Global Users', icon: 'fa-id-card' },
    { to: '/system', label: 'System Health', icon: 'fa-microchip' },
    { to: '/reports', label: 'Platform Metrics', icon: 'fa-chart-pie' },
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

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 ${themeClasses.sidebar} text-slate-600 flex flex-col border-r ${themeClasses.border} shrink-0 transition-transform duration-300 lg:static lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${themeClasses.primary} rounded-lg flex items-center justify-center text-white shadow-lg`}>
                <i className="fa-solid fa-heart-pulse"></i>
              </div>
              <span className={`text-xl font-bold text-slate-800 tracking-tight`}>ACT Path</span>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>

          <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 scrollbar-thin scrollbar-thumb-slate-700">
            {getLinks().map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={(e) => handleLinkClick(e, link.to)}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                    isActive ? `${themeClasses.primary} text-white shadow-lg ${themeClasses.shadow}` : `${themeClasses.sidebarHover} hover:text-slate-900`
                  }`
                }
              >
                <i className={`fa-solid ${link.icon} text-lg w-6`}></i>
                <span className="font-medium text-sm">{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className={`mt-auto p-6 border-t ${themeClasses.border}`}>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className={`w-8 h-8 rounded-full ${themeClasses.secondary} flex items-center justify-center text-xs font-bold ${themeClasses.text} overflow-hidden`}>
               {user.profileImage ? (
                 <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
               ) : (
                 user.name.charAt(0)
               )}
            </div>
            <div className="overflow-hidden">
              <p className={`text-sm font-medium text-slate-800 truncate`}>{user.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className={`w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider`}
          >
            <i className="fa-solid fa-right-from-bracket"></i>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
