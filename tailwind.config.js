/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{js,ts,html}',
        './src/views/**/*.ts',
        './src/ui/**/*.ts',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: 'var(--interactive-accent)',
                },
                'obsidian-bg': 'var(--background-primary)',
                'obsidian-bg-secondary': 'var(--background-secondary)',
                'obsidian-text': 'var(--text-normal)',
                'obsidian-text-muted': 'var(--text-muted)',
                'obsidian-border': 'var(--background-modifier-border)',
            },
        },
    },
    corePlugins: {
        preflight: false,
    },
    plugins: [],
};
