/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    container: {
      center: true,
      padding: '1rem'
    },
    extend: {
      colors: {
        app: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        main: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        line: 'rgb(var(--border) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          contrast: 'rgb(var(--primary-contrast) / <alpha-value>)'
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)'
        },
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)'
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)'
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)'
        }
      },
      textColor: {
        main: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        'primary-contrast': 'rgb(var(--primary-contrast) / <alpha-value>)'
      },
      backgroundColor: {
        app: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)'
      },
      borderColor: {
        line: 'rgb(var(--border) / <alpha-value>)'
      },
      borderRadius: {
        token: 'var(--radius)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif']
      }
    }
  },
  plugins: []
};
