/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
    "./store/**/*.{js,jsx,ts,tsx}",
    "./database/**/*.{js,jsx,ts,tsx}",
    "./utils/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        medium: ['PlusJakartaSans_500Medium'],
        semibold: ['PlusJakartaSans_600SemiBold'],
        bold: ['PlusJakartaSans_700Bold'],
        extrabold: ['PlusJakartaSans_800ExtraBold'],
      },
      colors: {
        easypay: {
          purple: '#7859d9',
          purpleDark: '#5d3ec2',
          purpleVibrant: '#7350F2',
          purpleLight: '#ECE7FF',
          bg: '#F6F7FB',
          textPrimary: '#1a1a1a',
          textSecondary: '#8a8a8e',
          textTertiary: '#aeaeaf',
        },
      },
    },
  },
  plugins: [],
};
