import React, { useEffect } from 'react';
import { AuthProvider } from '../features/auth/useAuth.jsx';
import { ToastProvider } from '../hooks/useToast.js';
import { loadThemeLocal, applyTheme, THEME_PRESETS } from '../lib/theme.js';

export function AppProviders({ children }) {
  useEffect(() => {
    const saved = loadThemeLocal();
    if (saved) {
      applyTheme(saved);
    } else {
      // Default theme
      applyTheme({
        presetId: 'indigo',
        isDark: false,
        tokens: THEME_PRESETS[0].light
      });
    }
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}
