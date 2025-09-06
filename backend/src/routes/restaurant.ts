import { Hono } from "hono";
import { pool } from "../config/database";
import { restaurantConfig } from "../config/restaurant.js";
import type { AppContext } from "../types/index";

const restaurant = new Hono();

// Get restaurant configuration
restaurant.get("/config", async (c: AppContext) => {
	try {
		// Return the restaurant configuration
		// Note: We don't include sensitive data like database credentials
		return c.json({
			restaurant: restaurantConfig.restaurant,
			colors: restaurantConfig.colors,
			fonts: restaurantConfig.fonts,
			contact: restaurantConfig.contact,
			features: restaurantConfig.features,
			demo: restaurantConfig.demo,
		});
	} catch (error) {
		console.error("Error fetching restaurant config:", error);
		return c.json({ error: "Failed to fetch restaurant configuration" }, 500);
	}
});

// Health check specifically for restaurant config
restaurant.get("/config/health", async (c: AppContext) => {
	return c.json({
		status: "healthy",
		restaurant: restaurantConfig.restaurant.name,
		type: restaurantConfig.restaurant.type,
	});
});

export default restaurant;

// Public business hours endpoint
restaurant.get("/hours", async (c) => {
	try {
		const result = await pool.query(
			`SELECT value FROM business_settings WHERE key = 'business_hours'`,
		);
		const raw = result.rows.length > 0 ? result.rows[0].value : null;
		const defaultHours: any = {
			monday: {
				closed: false,
				intervals: [
					{ open: "11:00", close: "14:00" },
					{ open: "18:00", close: "22:00" },
				],
			},
			tuesday: {
				closed: false,
				intervals: [
					{ open: "11:00", close: "14:00" },
					{ open: "18:00", close: "22:00" },
				],
			},
			wednesday: {
				closed: false,
				intervals: [
					{ open: "11:00", close: "14:00" },
					{ open: "18:00", close: "22:00" },
				],
			},
			thursday: {
				closed: false,
				intervals: [
					{ open: "11:00", close: "14:00" },
					{ open: "18:00", close: "22:00" },
				],
			},
			friday: {
				closed: false,
				intervals: [
					{ open: "11:00", close: "14:30" },
					{ open: "18:00", close: "23:00" },
				],
			},
			saturday: {
				closed: false,
				intervals: [
					{ open: "11:00", close: "15:00" },
					{ open: "18:00", close: "23:00" },
				],
			},
			sunday: { closed: true, intervals: [] },
		};
		const normalize = (day: any) => {
			if (!day) return { closed: true, intervals: [] };
			if (Array.isArray(day.intervals)) return { closed: !!day.closed, intervals: day.intervals };
			if (day.closed) return { closed: true, intervals: [] };
			if (day.open && day.close)
				return { closed: false, intervals: [{ open: day.open, close: day.close }] };
			return { closed: true, intervals: [] };
		};
		const keys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
		const hours: any = {};
		const src = raw || defaultHours;
		keys.forEach((k) => (hours[k] = normalize(src[k])));
		return c.json({ hours });
	} catch (error) {
		console.error("Error fetching business hours:", error);
		return c.json({ error: "Failed to fetch business hours" }, 500);
	}
});
