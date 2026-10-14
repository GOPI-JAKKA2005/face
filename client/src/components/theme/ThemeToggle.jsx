import React from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
import { applyTheme, loadThemeLocal, saveThemeLocal, THEME_PRESETS } from '../../lib/theme.js';

export function ThemeToggle({ className = '' }) {
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark';
    }
    return false;
  });

  const toggleTheme = () => {
    const currentSaved = loadThemeLocal() || {
      presetId: 'indigo',
      tokens: THEME_PRESETS[0].light
    };

    const nextIsDark = !isDark;
    setIsDark(nextIsDark);

    const preset = THEME_PRESETS.find(p => p.id === currentSaved.presetId) || THEME_PRESETS[0];
    const newTheme = {
      ...currentSaved,
      isDark: nextIsDark,
      tokens: nextIsDark ? preset.dark : preset.light
    };

    applyTheme(newTheme);
    saveThemeLocal(newTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`p-2 rounded-token text-muted hover:text-main hover:bg-surface-2 transition-colors ${className}`}
    >
      {isDark ? <FiSun className="w-5 h-5 text-warning" /> : <FiMoon className="w-5 h-5" />}
    </button>
  );
}
