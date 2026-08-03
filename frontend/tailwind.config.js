/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // ---------------------------------------------------------------
      // COLOR TOKENS
      // Use these instead of raw Tailwind colors (blue-600, rose-500...)
      // in any NEW component. Existing raw-color usages get migrated as
      // we touch each screen in Phase 2/3 — no need to mass find/replace.
      // ---------------------------------------------------------------
      colors: {
        // Brand — primary interactive color (links, active states, focus rings)
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // primary brand color — use for links, active nav, focus rings
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Semantic status — use these for incidents, alerts, quality scores.
        // Never hand-pick a red/yellow/green shade outside this set.
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        danger: {
          50: '#fff1f2',
          100: '#ffe4e6',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
        info: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
      },

      // ---------------------------------------------------------------
      // FONTS
      // Roles are intentional, not accidental:
      //   - display  (Poppins)  → h1–h6 only
      //   - body     (Manrope)  → paragraph copy
      //   - ui       (Inter)    → buttons, labels, nav, form controls (default)
      //   - mono     (JetBrains Mono) → metrics, table figures, code
      // Montserrat is currently unused in any file we've reviewed — flag
      // before Phase 3 if a screen actually depends on it; otherwise drop it.
      // ---------------------------------------------------------------
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        jet: ['JetBrains Mono', 'monospace'],
        manrope: ['Manrope', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'], // pending confirmation, see note above
      },

      // ---------------------------------------------------------------
      // ELEVATION
      // A restrained 3-step shadow scale instead of ad hoc shadow-sm/xl
      // picked per component. Matches the quiet, "trustworthy SaaS" feel.
      // ---------------------------------------------------------------
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        elevated: '0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.04)',
        overlay: '0 20px 40px -8px rgb(15 23 42 / 0.16), 0 8px 16px -4px rgb(15 23 42 / 0.08)',
      },

      // ---------------------------------------------------------------
      // Z-INDEX SCALE
      // Every overlay in the app should use one of these names, not a
      // hand-picked number. Fixes the 50 / 60 / 100 / 9999 drift we found.
      // ---------------------------------------------------------------
      zIndex: {
        header: '50',
        dropdown: '60',
        overlay: '100',
        modal: '110',
        toast: '120',
      },

      // ---------------------------------------------------------------
      // MOTION
      // Named durations so transitions feel deliberate, not random.
      // ---------------------------------------------------------------
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
      },

      // ---------------------------------------------------------------
      // ANIMATIONS
      // NOTE: previous config's custom `pulse` keyframe (scale-based)
      // silently overrode Tailwind's built-in `pulse` (opacity-based),
      // which broke every plain `animate-pulse` loading skeleton in the
      // app. Renamed to `pulse-scale` so Tailwind's native pulse is
      // restored, and `pulse-slow` now points at the renamed keyframe.
      // ---------------------------------------------------------------
      animation: {
        fadeInUp: 'fadeInUp 0.6s ease-out forwards',
        marquee: 'marquee 40s linear infinite',
        backgroundGrid: 'backgroundGrid 2s ease-out forwards',
        'pulse-slow': 'pulse-scale 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.25s ease-out forwards',
      },

      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
        backgroundGrid: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pulse-scale': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide'),
  ],
};