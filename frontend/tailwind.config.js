/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        jet: ['JetBrains Mono', 'monospace'],
        manrope: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwind-scrollbar-hide')],
  variants: {
  scrollbar: ['rounded'],
},
};
