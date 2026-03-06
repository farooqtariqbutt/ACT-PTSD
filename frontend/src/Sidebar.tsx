import React from 'react';
import { NavLink } from 'react-router-dom';
import { type User, UserRole } from '../types';

interface SidebarProps { 
  user: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const commonLinks = [
    { to: '/', label: 'Dashboard', icon: 'fa-chart-line' },
  ];

  const clientLinks = [
    ...commonLinks,
    { to: '/assessments', label: 'Assessments', icon: 'fa-clipboard-check' },
    { to: '/assignments', label: 'Recovery Path', icon: 'fa-list-check' },
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
    { to: '/assignments', label: 'Recovery Path', icon: 'fa-map-location-dot' },
    { to: '/defuse', label: 'Defusion Lab', icon: 'fa-scissors' },
    { to: '/visualize', label: 'Media Lab', icon: 'fa-palette' },
    { to: '/session', label: 'Start Session', icon: 'fa-video' },
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
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 h-screen sticky top-0">
      
      {/* Top Section: Logo (Fixed) */}
      <div className="p-6 shrink-0 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
            <i className="fa-solid fa-heart-pulse"></i>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">ACT Path</span>
        </div>
      </div>

      {/* Middle Section: Navigation (Scrollable) */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
        {getLinks().map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <i className={`fa-solid ${link.icon} text-lg w-6`}></i>
            <span className="font-medium text-sm">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section: Profile & Logout (Fixed) */}
      <div className="shrink-0 p-6 border-t border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 overflow-hidden shrink-0 shadow-inner">
             {user.profileImage ? (
               <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
             ) : (
               user.name.charAt(0)
             )}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{user.name}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold truncate">
              {user.role.replace('_', ' ')}
            </p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 border border-transparent text-slate-300 rounded-xl transition-all text-xs font-black uppercase tracking-wider"
        >
          <i className="fa-solid fa-right-from-bracket"></i>
          Logout
        </button>
      </div>
      
    </aside>
  );
};

export default Sidebar;