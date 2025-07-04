// Updated menu routes without item_options references
import { Hono } from "hono";
import { pool, redis } from "../config/database";
import { optionalAuthMiddleware } from "../middleware/auth";
import type { AppContext } from "../types/index";

const menu = new Hono();

menu.use("*", optionalAuthMiddleware);

menu.get("/categories", async (c: AppContext) => {
	try {
		const cached = await redis.get("menu:categories");

		if (cached) {
			return c.json(JSON.parse(cached));
		}

		const result = await pool.query(
			`SELECT id, name, description, sort_order, image_url 
       FROM menu_categories 
       WHERE is_active = true 
       ORDER BY sort_order, name`,
		);

		const categories = result.rows.map((row) => ({
			id: row.id,
			name: row.name,
			description: row.description,
			sortOrder: row.sort_order,
			imageUrl: row.image_url,
		}));

		await redis.setex("menu:categories", 300, JSON.stringify(categories));

		return c.json(categories);
	} catch (error) {
		console.error("Error fetching categories:", error);
		return c.json({ error: "Failed to fetch categories" }, 500);
	}
});

menu.get("/items", async (c: AppContext) => {
	try {
		const categoryId = c.req.query("category");
		const search = c.req.query("search");
		const dietary = c.req.query("dietary");
		const page = parseInt(c.req.query("page") || "1", 10);
		const limit = Math.min(100, parseInt(c.req.query("limit") || "20", 10));
		const offset = (page - 1) * limit;

		let query = `
      SELECT 
        mi.id, mi.name, mi.description, mi.price, mi.image_url,
        mi.preparation_time, mi.calories, mi.is_vegetarian, 
        mi.is_vegan, mi.is_gluten_free, mi.is_available,
        mi.category_id, mc.name as category_name
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.is_available = true
    `;

		const params: any[] = [];
		let paramCount = 0;

		if (categoryId) {
			paramCount++;
			query += ` AND mi.category_id = $${paramCount}`;
			params.push(categoryId);
		}

		if (search) {
			paramCount++;
			query += ` AND (mi.name ILIKE $${paramCount} OR mi.description ILIKE $${paramCount})`;
			params.push(`%${search}%`);
		}

		if (dietary) {
			const dietaryFilters = dietary.split(",");
			const validFilters = [];
			dietaryFilters.forEach((filter: string) => {
				if (filter === "vegetarian") {
					validFilters.push("mi.is_vegetarian = true");
				} else if (filter === "vegan") {
					validFilters.push("mi.is_vegan = true");
				} else if (filter === "gluten_free") {
					validFilters.push("mi.is_gluten_free = true");
				}
			});
			if (validFilters.length > 0) {
				query += ` AND (${validFilters.join(" OR ")})`;
			}
		}

		query += ` ORDER BY mi.sort_order, mi.name`;
		query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
		params.push(limit, offset);

		// Get total count for pagination
		let countQuery = `SELECT COUNT(mi.id) FROM menu_items mi WHERE mi.is_available = true`;
		const countParams: any[] = [];
		let countParamCount = 0;

		if (categoryId) {
			countParamCount++;
			countQuery += ` AND mi.category_id = $${countParamCount}`;
			countParams.push(categoryId);
		}

		if (search) {
			countParamCount++;
			countQuery += ` AND (mi.name ILIKE $${countParamCount} OR mi.description ILIKE $${countParamCount})`;
			countParams.push(`%${search}%`);
		}

		if (dietary) {
			const dietaryFilters = dietary.split(",");
			const validFilters = [];
			dietaryFilters.forEach((filter: string) => {
				if (filter === "vegetarian") {
					validFilters.push("mi.is_vegetarian = true");
				} else if (filter === "vegan") {
					validFilters.push("mi.is_vegan = true");
				} else if (filter === "gluten_free") {
					validFilters.push("mi.is_gluten_free = true");
				}
			});
			if (validFilters.length > 0) {
				countQuery += ` AND (${validFilters.join(" OR ")})`;
			}
		}

		const [result, countResult] = await Promise.all([
			pool.query(query, params),
			pool.query(countQuery, countParams),
		]);

		const items = result.rows.map((row) => ({
			id: row.id,
			name: row.name,
			description: row.description,
			price: parseFloat(row.price),
			imageUrl: row.image_url,
			preparationTime: row.preparation_time,
			calories: row.calories,
			isVegetarian: row.is_vegetarian,
			isVegan: row.is_vegan,
			isGlutenFree: row.is_gluten_free,
			isAvailable: row.is_available,
			categoryId: row.category_id,
			categoryName: row.category_name,
			options: [], // Empty options array since we don't have option tables
		}));

		const total = parseInt(countResult.rows[0].count, 10);
		const totalPages = Math.ceil(total / limit);

		const response = {
			data: items,
			pagination: {
				page,
				limit,
				total,
				totalPages,
				hasNext: page < totalPages,
				hasPrev: page > 1,
			},
		};

		return c.json(response);
	} catch (error) {
		console.error("Error fetching menu items:", error);
		return c.json({ error: "Failed to fetch menu items" }, 500);
	}
});

menu.get("/items/:id", async (c: AppContext) => {
	try {
		const id = c.req.param("id");

		const cached = await redis.get(`menu:item:${id}`);

		if (cached) {
			return c.json(JSON.parse(cached));
		}

		const result = await pool.query(
			`SELECT 
        mi.id, mi.name, mi.description, mi.price, mi.image_url,
        mi.preparation_time, mi.calories, mi.is_vegetarian, 
        mi.is_vegan, mi.is_gluten_free, mi.is_available,
        mi.category_id, mc.name as category_name
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.id = $1`,
			[id],
		);

		if (result.rows.length === 0) {
			return c.json({ error: "Item not found" }, 404);
		}

		const row = result.rows[0];
		const item = {
			id: row.id,
			name: row.name,
			description: row.description,
			price: parseFloat(row.price),
			imageUrl: row.image_url,
			preparationTime: row.preparation_time,
			calories: row.calories,
			isVegetarian: row.is_vegetarian,
			isVegan: row.is_vegan,
			isGlutenFree: row.is_gluten_free,
			isAvailable: row.is_available,
			categoryId: row.category_id,
			categoryName: row.category_name,
			options: [], // Empty options array since we don't have option tables
		};

		await redis.setex(`menu:item:${id}`, 300, JSON.stringify(item));

		return c.json(item);
	} catch (error) {
		console.error("Error fetching menu item:", error);
		return c.json({ error: "Failed to fetch menu item" }, 500);
	}
});

export default menu;
