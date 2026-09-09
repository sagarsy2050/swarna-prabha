/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        gold: {
          50: '#FBF7EC', 100: '#F6ECCB', 200: '#EDD896', 300: '#E4C461', 400: '#D9B23A',
          500: '#D4AF37', 600: '#B8932B', 700: '#947222', 800: '#6F551A', 900: '#4D3B12', 950: '#2E230A',
        },
        silver: {
          50: '#F9FAFB', 100: '#F1F3F5', 200: '#E2E6EA', 300: '#CBD2D8', 400: '#AEB7C0',
          500: '#94A0AB', 600: '#768089', 700: '#5A626A', 800: '#40464C', 900: '#2A2E33', 950: '#1A1D20',
        },
        platinum: {
          50: '#F7F8F9', 100: '#EDEEF0', 200: '#D9DCE0', 300: '#B9BFC7', 400: '#97A0AA',
          500: '#7C8794', 600: '#636D78', 700: '#4D555E', 800: '#363C43', 900: '#23282D', 950: '#16191C',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'ui-serif', 'Georgia', 'serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
