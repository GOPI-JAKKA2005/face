/**
 * Theme Engine and Design Tokens Manager.
 * Manages runtime CSS variable manipulation, 8 presets (light/dark),
 * contrast verification, and local storage persistence.
 */

export const THEME_STORAGE_KEY = 'faceattend_theme';

export const THEME_PRESETS = [
  {
    id: 'indigo',
    name: 'Indigo (Default)',
    light: {
      bg: '248 250 252',
      surface: '255 255 255',
      'surface-2': '241 245 249',
      text: '15 23 42',
      'text-muted': '100 116 139',
      border: '226 232 240',
      primary: '79 70 229',
      'primary-contrast': '255 255 255',
      accent: '20 184 166',
      success: '22 163 74',
      warning: '217 119 6',
      danger: '220 38 38'
    },
    dark: {
      bg: '15 23 42',
      surface: '30 41 59',
      'surface-2': '51 65 85',
      text: '248 250 252',
      'text-muted': '148 163 184',
      border: '51 65 85',
      primary: '99 102 241',
      'primary-contrast': '255 255 255',
      accent: '45 212 191',
      success: '34 197 94',
      warning: '245 158 11',
      danger: '239 68 68'
    }
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    light: {
      bg: '240 249 255',
      surface: '255 255 255',
      'surface-2': '224 242 254',
      text: '12 74 110',
      'text-muted': '3 105 161',
      border: '186 230 253',
      primary: '2 132 199',
      'primary-contrast': '255 255 255',
      accent: '14 165 233',
      success: '22 163 74',
      warning: '217 119 6',
      danger: '220 38 38'
    },
    dark: {
      bg: '8 47 73',
      surface: '12 74 110',
      'surface-2': '3 105 161',
      text: '240 249 255',
      'text-muted': '186 230 253',
      border: '3 105 161',
      primary: '56 189 248',
      'primary-contrast': '8 47 73',
      accent: '125 211 252',
      success: '34 197 94',
      warning: '245 158 11',
      danger: '239 68 68'
    }
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    light: {
      bg: '240 253 244',
      surface: '255 255 255',
      'surface-2': '220 252 231',
      text: '20 83 45',
      'text-muted': '22 101 52',
      border: '187 247 208',
      primary: '22 163 74',
      'primary-contrast': '255 255 255',
      accent: '13 148 136',
      success: '22 163 74',
      warning: '217 119 6',
      danger: '220 38 38'
    },
    dark: {
      bg: '5 46 22',
      surface: '20 83 45',
      'surface-2': '22 101 52',
      text: '240 253 244',
      'text-muted': '187 247 208',
      border: '22 101 52',
      primary: '74 222 128',
      'primary-contrast': '5 46 22',
      accent: '45 212 191',
      success: '34 197 94',
      warning: '245 158 11',
      danger: '239 68 68'
    }
  },
  {
    id: 'sunset',
    name: 'Sunset Amber',
    light: {
      bg: '255 251 235',
      surface: '255 255 255',
      'surface-2': '254 243 199',
      text: '120 53 15',
      'text-muted': '180 83 9',
      border: '253 230 138',
      primary: '217 119 6',
      'primary-contrast': '255 255 255',
      accent: '234 88 12',
      success: '22 163 74',
      warning: '217 119 6',
      danger: '220 38 38'
    },
    dark: {
      bg: '69 26 3',
      surface: '120 53 15',
      'surface-2': '146 64 14',
      text: '255 251 235',
      'text-muted': '253 230 138',
      border: '146 64 14',
      primary: '251 191 36',
      'primary-contrast': '69 26 3',
      accent: '251 146 60',
      success: '34 197 94',
      warning: '245 158 11',
      danger: '239 68 68'
    }
  },
  {
    id: 'rose',
    name: 'Rose Quartz',
    light: {
      bg: '255 241 242',
      surface: '255 255 255',
      'surface-2': '255 228 230',
      text: '136 19 55',
      'text-muted': '190 24 93',
      border: '254 205 211',
      primary: '225 29 72',
      'primary-contrast': '255 255 255',
      accent: '219 39 119',
      success: '22 163 74',
      warning: '217 119 6',
      danger: '220 38 38'
    },
    dark: {
      bg: '76 5 25',
      surface: '136 19 55',
      'surface-2': '159 18 57',
      text: '255 241 242',
      'text-muted': '254 205 211',
      border: '159 18 57',
      primary: '251 113 133',
      'primary-contrast': '76 5 25',
      accent: '244 114 182',
      success: '34 197 94',
      warning: '245 158 11',
      danger: '239 68 68'
    }
  },
  {
    id: 'slate',
    name: 'Minimal Slate',
    light: {
      bg: '241 245 249',
      surface: '255 255 255',
      'surface-2': '226 232 240',
      text: '30 41 59',
      'text-muted': '100 116 139',
      border: '203 213 225',
      primary: '71 85 105',
      'primary-contrast': '255 255 255',
      accent: '15 23 42',
      success: '22 163 74',
      warning: '217 119 6',
      danger: '220 38 38'
    },
    dark: {
      bg: '15 23 42',
      surface: '30 41 59',
      'surface-2': '51 65 85',
      text: '241 245 249',
      'text-muted': '148 163 184',
      border: '71 85 105',
      primary: '148 163 184',
      'primary-contrast': '15 23 42',
      accent: '226 232 240',
      success: '34 197 94',
      warning: '245 158 11',
      danger: '239 68 68'
    }
  },
  {
    id: 'midnight',
    name: 'Midnight Deep',
    light: {
      bg: '245 243 255',
      surface: '255 255 255',
      'surface-2': '237 233 254',
      text: '46 16 101',
      'text-muted': '109 40 217',
      border: '221 214 254',
      primary: '124 58 237',
      'primary-contrast': '255 255 255',
      accent: '147 51 234',
      success: '22 163 74',
      warning: '217 119 6',
      danger: '220 38 38'
    },
    dark: {
      bg: '10 10 26',
      surface: '26 16 60',
      'surface-2': '46 16 101',
      text: '245 243 255',
      'text-muted': '221 214 254',
      border: '76 29 149',
      primary: '167 139 250',
      'primary-contrast': '10 10 26',
      accent: '192 132 252',
      success: '34 197 94',
      warning: '245 158 11',
      danger: '239 68 68'
    }
  },
  {
    id: 'high-contrast',
    name: 'High Contrast (Accessible)',
    light: {
      bg: '255 255 255',
      surface: '255 255 255',
      'surface-2': '240 240 240',
      text: '0 0 0',
      'text-muted': '50 50 50',
      border: '0 0 0',
      primary: '0 0 0',
      'primary-contrast': '255 255 255',
      accent: '0 0 180',
      success: '0 128 0',
      warning: '180 90 0',
      danger: '180 0 0'
    },
    dark: {
      bg: '0 0 0',
      surface: '18 18 18',
      'surface-2': '35 35 35',
      text: '255 255 255',
      'text-muted': '210 210 210',
      border: '255 255 255',
      primary: '255 255 255',
      'primary-contrast': '0 0 0',
      accent: '100 200 255',
      success: '50 255 50',
      warning: '255 200 50',
      danger: '255 70 70'
    }
  }
];

/**
 * Calculates relative luminance of an RGB array [r, g, b].
 */
export function getLuminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Parses space-separated RGB string ("79 70 229") or Hex ("#4f46e5") to [r, g, b].
 */
export function parseRgb(colorStr) {
  if (!colorStr) return [0, 0, 0];
  if (colorStr.startsWith('#')) {
    const hex = colorStr.replace('#', '');
    return [
      parseInt(hex.substring(0, 2), 16) || 0,
      parseInt(hex.substring(2, 4), 16) || 0,
      parseInt(hex.substring(4, 6), 16) || 0
    ];
  }
  return colorStr.trim().split(/\s+/).map(Number);
}

/**
 * Formats [r, g, b] to Hex "#rrggbb".
 */
export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Computes WCAG Contrast Ratio between two colors.
 * @returns {number} Ratio (1 to 21)
 */
export function calculateContrastRatio(color1, color2) {
  const l1 = getLuminance(parseRgb(color1));
  const l2 = getLuminance(parseRgb(color2));
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Applies theme settings to document root.
 */
export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Temporary transition class for 200ms
  root.classList.add('theme-transition');
  setTimeout(() => root.classList.remove('theme-transition'), 250);

  if (theme.isDark) {
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');
  } else {
    root.removeAttribute('data-theme');
    root.classList.remove('dark');
  }

  if (theme.tokens) {
    for (const [key, val] of Object.entries(theme.tokens)) {
      root.style.setProperty(`--${key}`, val);
    }
  }

  if (theme.radius) {
    root.style.setProperty('--radius', `${theme.radius}px`);
  }

  if (theme.fontScale) {
    root.style.fontSize = `${theme.fontScale}%`;
  }

  if (theme.fontFamily) {
    root.style.fontFamily = theme.fontFamily === 'poppins'
      ? 'Poppins, sans-serif'
      : theme.fontFamily === 'system'
      ? 'system-ui, -apple-system, sans-serif'
      : 'Inter, system-ui, sans-serif';
  }
}

export function saveThemeLocal(theme) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  }
}

export function loadThemeLocal() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const data = localStorage.getItem(THEME_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (_e) {
    return null;
  }
}
