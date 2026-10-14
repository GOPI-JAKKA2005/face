import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar.jsx';
import { MobileNavbar } from './MobileNavbar.jsx';
import { TopBar } from './TopBar.jsx';
import { ToastContainer } from '../ui/Toast.jsx';
import { ChatLauncher } from '../chat/ChatLauncher.jsx';

export function AppShell() {
  const location = useLocation();

  // Map route to human title
  const getPageTitle = (pathname) => {
    if (pathname === '/admin') return 'Dashboard';
    if (pathname.startsWith('/admin/attendance')) return 'Attendance Records';
    if (pathname.startsWith('/admin/enroll')) return 'Enroll Student';
    if (pathname.startsWith('/admin/students')) return 'Students Directory';
    if (pathname.startsWith('/admin/reports')) return 'Attendance Analytics';
    if (pathname.startsWith('/admin/media')) return 'Media Library';
    if (pathname.startsWith('/admin/movie')) return 'Movie View';
    if (pathname.startsWith('/admin/chat')) return 'Admin Chatbot';
    if (pathname.startsWith('/admin/themes')) return 'Theme Studio';
    if (pathname.startsWith('/admin/settings')) return 'System Settings';
    return 'Admin Portal';
  };

  const title = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-app text-main flex flex-col md:flex-row antialiased">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        <TopBar title={title} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNavbar />

      {/* Floating Chatbot Assistant */}
      <ChatLauncher />

      {/* Global Notifications */}
      <ToastContainer />
    </div>
  );
}
