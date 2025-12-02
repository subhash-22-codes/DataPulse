/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // 1. FONTS: Merged from your frontend config
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        jet: ['JetBrains Mono', 'monospace'],
        manrope: ['Manrope', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'], // Added from project
      },
      
      // 3. ANIMATIONS: Merged from your project
      animation: {
        'fadeInUp': 'fadeInUp 0.6s ease-out forwards',
        'marquee': 'marquee 40s linear infinite',
        'backgroundGrid': 'backgroundGrid 2s ease-out forwards',
        'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.25s ease-out forwards',
      },
      
      // 4. KEYFRAMES: The logic behind the animations
      keyframes: {
        fadeInUp: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          'from': { transform: 'translateX(0)' },
          'to': { transform: 'translateX(-100%)' },
        },
        backgroundGrid: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        pulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'fade-in': {
          'from': { opacity: '0', transform: 'scale(0.95)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide') // Ensure this is installed: npm install tailwind-scrollbar-hide
  ],
};