import React, { useState, useEffect, useRef, Fragment } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dialog, Transition } from '@headlessui/react';
import {
  FiHome,
  FiUserCheck,
  FiUsers,
  FiMoreHorizontal,
  FiCamera,
  FiBarChart2,
  FiFolder,
  FiFilm,
  FiMessageSquare,
  FiSliders,
  FiSettings,
  FiLogOut,
  FiX
} from 'react-icons/fi';
import { useAuth } from '../../features/auth/useAuth.jsx';

export function MobileNavbar() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const lastScrollY = useRef(0);
  const longPressTimer = useRef(null);

  // Scroll direction threshold detection (24px)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollY.current;

      if (diff > 24 && currentScrollY > 60) {
        setIsVisible(false); // scrolling down
      } else if (diff < -24 || currentScrollY <= 20) {
        setIsVisible(true); // scrolling up
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Center button handler: click opens /kiosk, long press navigates to /admin/enroll
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      navigate('/admin/enroll');
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleScanClick = () => {
    window.open('/kiosk', '_blank');
  };

  const moreItems = [
    { to: '/admin/enroll', label: 'Enroll Face', icon: FiCamera },
    { to: '/admin/reports', label: 'Reports', icon: FiBarChart2 },
    { to: '/admin/media', label: 'Media Library', icon: FiFolder },
    { to: '/admin/movie', label: 'Movie View', icon: FiFilm },
    { to: '/admin/chat', label: 'Chatbot', icon: FiMessageSquare },
    { to: '/admin/themes', label: 'Theme Studio', icon: FiSliders },
    { to: '/admin/settings', label: 'System Settings', icon: FiSettings }
  ];

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line transition-transform duration-300 pb-safe ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {/* 1. Home */}
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-colors ${
                isActive ? 'text-accent font-semibold' : 'text-muted hover:text-main'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <FiHome className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 tracking-tight" aria-current={isActive ? 'page' : undefined}>
                  Home
                </span>
              </>
            )}
          </NavLink>

          {/* 2. Attendance */}
          <NavLink
            to="/admin/attendance"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-colors ${
                isActive ? 'text-accent font-semibold' : 'text-muted hover:text-main'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <FiUserCheck className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 tracking-tight" aria-current={isActive ? 'page' : undefined}>
                  Attend
                </span>
              </>
            )}
          </NavLink>

          {/* 3. Center Raised Scan Button */}
          <div className="relative -top-5 flex flex-col items-center">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={handleScanClick}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleTouchStart}
              onMouseUp={handleTouchEnd}
              aria-label="Launch Kiosk Scanner (Long press for Enroll)"
              className="w-14 h-14 rounded-full bg-accent text-white shadow-lg flex items-center justify-center border-4 border-surface focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <FiCamera className="w-6 h-6" />
            </motion.button>
            <span className="text-[10px] font-semibold text-main tracking-tight mt-1">Scan</span>
          </div>

          {/* 4. Students */}
          <NavLink
            to="/admin/students"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-colors ${
                isActive ? 'text-accent font-semibold' : 'text-muted hover:text-main'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <FiUsers className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 tracking-tight" aria-current={isActive ? 'page' : undefined}>
                  Students
                </span>
              </>
            )}
          </NavLink>

          {/* 5. More */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            aria-label="Open More Menu"
            className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-muted hover:text-main transition-colors"
          >
            <FiMoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* Headless UI Bottom Sheet for "More" */}
      <Transition appear show={isMoreOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 md:hidden" onClose={() => setIsMoreOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="translate-y-full"
                enterTo="translate-y-0"
                leave="ease-in duration-150"
                leaveFrom="translate-y-0"
                leaveTo="translate-y-full"
              >
                <Dialog.Panel className="w-full bg-surface rounded-t-2xl border-t border-line p-5 pb-safe shadow-2xl text-main">
                  <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
                    <Dialog.Title className="text-base font-semibold text-main">Navigation Menu</Dialog.Title>
                    <button
                      type="button"
                      onClick={() => setIsMoreOpen(false)}
                      aria-label="Close menu"
                      className="p-1 rounded-token text-muted hover:text-main hover:bg-surface-2"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-2">
                    {moreItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setIsMoreOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 p-3 rounded-token text-sm font-medium transition-colors ${
                              isActive ? 'bg-primary text-primary-contrast' : 'bg-surface-2 text-main hover:bg-line/60'
                            }`
                          }
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-line mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-token text-sm font-semibold text-danger bg-danger/10 hover:bg-danger/20 transition-colors"
                    >
                      <FiLogOut className="w-5 h-5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
