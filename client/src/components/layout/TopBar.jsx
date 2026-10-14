import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { FiLogOut, FiSliders, FiExternalLink } from 'react-icons/fi';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth.jsx';
import { ThemeToggle } from '../theme/ThemeToggle.jsx';

export function TopBar({ title = 'Admin Portal' }) {
  const { user, signOut } = useAuth();
  const email = user?.email || 'Administrator';
  const initial = email.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-16 bg-surface/90 backdrop-blur-md border-b border-line px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-base sm:text-lg font-bold text-main tracking-tight font-poppins truncate">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="/kiosk"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/20 rounded-token transition-colors"
        >
          <span>Kiosk</span>
          <FiExternalLink className="w-3.5 h-3.5" />
        </a>

        <ThemeToggle />

        {/* Profile Avatar & Dropdown Menu */}
        <Menu as="div" className="relative">
          <Menu.Button
            aria-label="User account menu"
            className="w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {initial}
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-token bg-surface p-1.5 shadow-xl border border-line focus:outline-none z-50">
              <div className="px-3 py-2 border-b border-line mb-1">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Signed in as</p>
                <p className="text-sm font-medium text-main truncate mt-0.5">{email}</p>
              </div>

              <Menu.Item>
                {({ active }) => (
                  <NavLink
                    to="/admin/themes"
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-token ${
                      active ? 'bg-surface-2 text-main' : 'text-main'
                    }`}
                  >
                    <FiSliders className="w-4 h-4 text-muted" />
                    <span>Theme Studio</span>
                  </NavLink>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={signOut}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-token text-danger ${
                      active ? 'bg-danger/10' : ''
                    }`}
                  >
                    <FiLogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </header>
  );
}
