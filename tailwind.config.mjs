/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				// Paleta "Don Sebastián"
				primary: '#D2691E', // Chocolate Cinnamon
				secondary: '#FFF8E1', // Cream/Vainilla (Fondo)
				accent: '#FFD700', // Golden Glaze (Estrellas/Likes)
				dark: '#3E2723', // Dark Coffee (Texto)
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