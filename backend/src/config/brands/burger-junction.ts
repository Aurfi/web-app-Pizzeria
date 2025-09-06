import type { RestaurantConfig } from "../restaurant";

// Burger Junction Configuration
export const burgerJunctionConfig: RestaurantConfig = {
	restaurant: {
		name: "Burger Junction",
		tagline: "Gourmet Burgers & Fresh Fries",
		type: "burger",
		cuisine: "American",
		description: "Premium burgers made with locally sourced beef and fresh ingredients.",
	},

	colors: {
		primary: "#8B4513", // Brown
		secondary: "#FFD700", // Golden yellow
		accent: "#FF4500", // Orange red
		success: "#28A745",
		warning: "#FFC107",
		error: "#DC3545",
		background: "#F8F9FA",
		surface: "#FFFFFF",
		text: {
			primary: "#2C3E50",
			secondary: "#6C757D",
			light: "#FFFFFF",
		},
	},

	fonts: {
		primary: '"Open Sans", sans-serif',
		headings: '"Bebas Neue", cursive',
		accent: '"Fredoka One", cursive',
	},

	contact: {
		phone: "(555) 123-BURG",
		address: "456 Main Street, Downtown",
		hours: "Daily: 11am-10pm",
	},

	features: {
		delivery: true,
		pickup: true,
		reservations: false,
		loyalty: true,
	},

	demo: {
		email: "demo@burgerjunction.com",
		password: "demo123",
	},
};
