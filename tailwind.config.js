// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cname: '#6A0DAD', // Your custom purple (change this HEX code as needed)
      },
    },
  },
  plugins: [],
    presets: [require("nativewind/preset")],
};
