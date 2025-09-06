import type { RestaurantConfig } from "../restaurant";

// Mario's Pizzeria Configuration
export const marioPizzeriaConfig: RestaurantConfig = {
	restaurant: {
		name: "Mario's Pizzeria",
		tagline: "Authentic Italian Pizza Since 1962",
		type: "pizzeria",
		cuisine: "Italian",
		description:
			"Traditional wood-fired pizzas made with fresh ingredients and family recipes passed down through generations.",
	},

	colors: {
		primary: "#C41E3A", // Italian red
		secondary: "#2E8B57", // Basil green
		accent: "#FF6B35", // Warm orange
		success: "#28A745",
		warning: "#FFC107",
		error: "#DC3545",
		background: "#FAFAFA",
		surface: "#FFFFFF",
		text: {
			primary: "#2C3E50",
			secondary: "#6C757D",
			light: "#FFFFFF",
		},
	},

	fonts: {
		primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		headings: '"Playfair Display", Georgia, serif',
		accent: '"Dancing Script", cursive',
	},

	contact: {
		phone: "(555) 123-PIZZA",
		address: "123 Little Italy Street, New York, NY 10013",
		hours: "Mon-Thu: 11am-10pm | Fri-Sat: 11am-11pm | Sun: 12pm-9pm",
	},

	features: {
		delivery: true,
		pickup: true,
		reservations: false,
		loyalty: true,
	},

	demo: {
		email: "demo@mariospizzeria.com",
		password: "demo123",
	},
};
