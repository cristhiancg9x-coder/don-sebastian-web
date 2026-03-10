/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				// Paleta "Detalles del Corazón" (Floral)
				primary: '#D81B60', // Rosa Vibrante
				secondary: '#FCE4EC', // Rosa Pastel
				accent: '#FFC107', // Ámbar/Dorado
				dark: '#1B5E20', // Verde Bosque
			},
			fontFamily: {
				sans: ['Inter', 'sans-serif'], // Texto cuerpo
				serif: ['Playfair Display', 'serif'], // Títulos elegantes
			},
			keyframes: {
				// Animación personalizada para "colgar"
				swing: {
					'0%, 100%': { transform: 'rotate(5deg)' },
					'50%': { transform: 'rotate(-5deg)' },
				}
			},
			animation: {
				// Duración lenta y suave para no marear
				swing: 'swing 3s ease-in-out infinite',
			}
		},
	},
	plugins: [],
}