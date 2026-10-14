import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiHome,
  FiUserCheck,
  FiUsers,
  FiBarChart2,
  FiFolder,
  FiFilm,
  FiMessageSquare,
  FiSettings,
  FiSliders,
  FiCamera,
  FiChevronLeft,
  FiChevronRight,
  FiLogOut
} from 'react-icons/fi';
import { useAuth } from '../../features/auth/useAuth.jsx';

const SIDEBAR_COLLAPSED_KEY = 'faceattend_sidebar_collapsed';

export function Sidebar() {
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: FiHome, end: true },
    { to: '/admin/attendance', label: 'Attendance', icon: FiUserCheck },
    { to: '/admin/students', label: 'Students', icon: FiUsers },
    { to: '/admin/enroll', label: 'Enroll Face', icon: FiCamera },
    { to: '/admin/reports', label: 'Reports', icon: FiBarChart2 },
    { to: '/admin/media', label: 'Media Library', icon: FiFolder },
    { to: '/admin/movie', label: 'Movie View', icon: FiFilm },
    { to: '/admin/chat', label: 'Chatbot', icon: FiMessageSquare },
    { to: '/admin/themes', label: 'Themes', icon: FiSliders },
    { to: '/admin/settings', label: 'Settings', icon: FiSettings }
  ];

  return (
    <aside
      aria-label="Admin Navigation"
      className={`hidden md:flex flex-col bg-surface border-r border-line transition-all duration-200 z-30 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-line">
        <NavLink to="/admin" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-token bg-primary flex items-center justify-center text-primary-contrast font-bold text-base flex-shrink-0">
            FA
          </div>
          {!collapsed && (
            <span className="font-bold text-base tracking-tight text-main truncate font-poppins">
              FaceAttend
            </span>
          )}
        </NavLink>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-token text-muted hover:text-main hover:bg-surface-2 transition-colors ml-auto"
        >
          {collapsed ? <FiChevronRight className="w-4 h-4" /> : <FiChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-token text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-contrast shadow-sm'
                    : 'text-main hover:bg-surface-2 hover:text-primary'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Kiosk Shortcut & Sign Out */}
      <div className="p-3 border-t border-line space-y-1.5">
        <a
          href="/kiosk"
          target="_blank"
          rel="noopener noreferrer"
          title={collapsed ? 'Launch Public Kiosk' : undefined}
          className="flex items-center gap-3 px-3 py-2 rounded-token text-xs font-semibold uppercase tracking-wider text-accent hover:bg-accent/10 transition-colors"
        >
          <FiCamera className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Open Kiosk ↗</span>}
        </a>

        <button
          type="button"
          onClick={signOut}
          title={collapsed ? 'Sign Out' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-token text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
        >
          <FiLogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="truncate">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
