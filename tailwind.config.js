/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Obsidian CSS variable integration
        'ob-primary': 'var(--interactive-accent)',
        'ob-primary-hover': 'var(--interactive-accent-hover)',
        'ob-background': 'var(--background-primary)',
        'ob-background-secondary': 'var(--background-secondary)',
        'ob-text': 'var(--text-normal)',
        'ob-text-muted': 'var(--text-muted)',
        'ob-text-faint': 'var(--text-faint)',
        'ob-border': 'var(--background-modifier-border)',
        'ob-border-hover': 'var(--background-modifier-border-hover)',
        'ob-success': 'var(--text-success)',
        'ob-warning': 'var(--text-warning)',
        'ob-error': 'var(--text-error)',
        'ob-accent': 'var(--interactive-accent)',
        'ob-accent-hover': 'var(--interactive-accent-hover)'
      },
      fontFamily: {
        'ob-default': 'var(--font-interface)',
        'ob-mono': 'var(--font-monospace)',
        'ob-text': 'var(--font-text)'
      },
      borderRadius: {
        'ob-s': 'var(--radius-s)',
        'ob-m': 'var(--radius-m)',
        'ob-l': 'var(--radius-l)',
        'ob-xl': 'var(--radius-xl)'
      },
      spacing: {
        'ob-xs': 'var(--size-2-1)',
        'ob-s': 'var(--size-2-2)',
        'ob-m': 'var(--size-2-3)',
        'ob-l': 'var(--size-4-1)',
        'ob-xl': 'var(--size-4-2)'
      }
    }
  },
  plugins: [],
  darkMode: ['class', '[data-theme="dark"]']
};