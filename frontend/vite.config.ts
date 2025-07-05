import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			injectRegister: null,
			registerType: "autoUpdate",
			includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
			manifest: {
				name: "Mario's Pizzeria - Authentic Italian Pizza",
				short_name: "Mario's Pizzeria",
				description: "Order authentic Italian pizza from Mario's Pizzeria since 1962",
				theme_color: "#C41E3A",
				background_color: "#ffffff",
				display: "standalone",
				orientation: "portrait",
				scope: "/",
				start_url: "/",
				icons: [
					{
						src: "/icons/icon-72x72.png",
						sizes: "72x72",
						type: "image/png",
					},
					{
						src: "/icons/icon-96x96.png",
						sizes: "96x96",
						type: "image/png",
					},
					{
						src: "/icons/icon-128x128.png",
						sizes: "128x128",
						type: "image/png",
					},
					{
						src: "/icons/icon-144x144.png",
						sizes: "144x144",
						type: "image/png",
					},
					{
						src: "/icons/icon-152x152.png",
						sizes: "152x152",
						type: "image/png",
					},
					{
						src: "/icons/icon-192x192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "/icons/icon-384x384.png",
						sizes: "384x384",
						type: "image/png",
					},
					{
						src: "/icons/icon-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}"],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/api\./,
						handler: "NetworkFirst",
						options: {
							cacheName: "api-cache",
							networkTimeoutSeconds: 10,
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 30 * 24 * 60 * 60,
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
					{
						urlPattern: /\.(jpg|jpeg|png|gif|webp|svg)$/,
						handler: "CacheFirst",
						options: {
							cacheName: "image-cache",
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 24 * 60 * 60,
							},
						},
					},
				],
			},
			devOptions: {
				enabled: false,
			},
			srcDir: "src",
			filename: "sw.ts",
		}),
	],
	server: {
		port: 5173,
		host: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
	},
	test: {
		globals: true,
		environment: 'happy-dom',
	},
});
