
import React from 'react';
import { NavLink } from 'react-router-dom';
import { User, UserRole } from './types';

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
    { to: '/assignments', label: 'My Tasks', icon: 'fa-list-check' },
    { to: '/reports', label: 'My Progress', icon: 'fa-chart-simple' },
    { to: '/education', label: 'ACT Education', icon: 'fa-graduation-cap' },
    { to: '/values', label: 'Values Tool', icon: 'fa-location-dot' },
    { to: '/defuse', label: 'Defusion Lab', icon: 'fa-scissors' },
    { to: '/mindfulness', label: 'Guided Sessions', icon: 'fa-spa' },
    { to: '/visualize', label: 'Visualize Calm', icon: 'fa-image' },
    { to: '/chat', label: 'ACT Companion', icon: 'fa-comments' },
    { to: '/profile', label: 'Profile Settings', icon: 'fa-user' },
  ];

  const therapistLinks = [
    ...commonLinks,
    { to: '/clients', label: 'My Clients', icon: 'fa-users' },
    { to: '/defuse', label: 'Defusion Lab', icon: 'fa-scissors' },
    { to: '/visualize', label: 'Media Lab', icon: 'fa-palette' },
    { to: '/session', label: 'Start Session', icon: 'fa-video' },
    { to: '/billing', label: 'License & Billing', icon: 'fa-credit-card' },
  ];

  const adminLinks = [
    ...commonLinks,
    { to: '/staff', label: 'Clinic Staff', icon: 'fa-user-doctor' },
    { to: '/reports', label: 'Clinic Reports', icon: 'fa-file-lines' },
    { to: '/billing', label: 'Clinic Subscription', icon: 'fa-credit-card' },
    { to: '/settings', label: 'Clinic Settings', icon: 'fa-gears' },
  ];

  const superAdminLinks = [
    ...commonLinks,
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
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
            <i className="fa-solid fa-heart-pulse"></i>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">ACT Path</span>
        </div>

        <nav className="space-y-1 overflow-y-auto max-h-[70vh] pr-2 scrollbar-thin scrollbar-thumb-slate-700">
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
      </div>

      <div className="mt-auto p-6 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 overflow-hidden">
             {user.profileImage ? (
               <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
             ) : (
               user.name.charAt(0)
             )}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{user.role.replace('_', ' ')}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider"
        >
          <i className="fa-solid fa-right-from-bracket"></i>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
