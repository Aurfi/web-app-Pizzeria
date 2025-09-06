import { Hono } from "hono";
import { pool } from "../../config/database";
import { type AdminContext, requireOwner } from "../../middleware/rbac";

const reset = new Hono();

// Danger: resets all menu items and categories, then seeds 4 categories
reset.post("/menu/reset", requireOwner, async (c: AdminContext) => {
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		await client.query("DELETE FROM order_items");
		await client.query("DELETE FROM orders");
		await client.query("DELETE FROM menu_items");
		await client.query("DELETE FROM menu_categories");

		const names = [
			{ name: "Bases Tomate", description: "Pizzas base tomate", sort: 1 },
			{ name: "Bases Crème", description: "Pizzas base crème", sort: 2 },
			{ name: "Desserts", description: "Desserts italiens", sort: 3 },
			{ name: "Boissons", description: "Boissons", sort: 4 },
		];
		const inserted: any[] = [];
		for (const n of names) {
			const res = await client.query(
				`INSERT INTO menu_categories (name, description, sort_order, is_active)
         VALUES ($1, $2, $3, true) RETURNING id, name, description, sort_order`,
				[n.name, n.description, n.sort],
			);
			inserted.push(res.rows[0]);
		}
		await client.query("COMMIT");
		return c.json({ categories: inserted });
	} catch (e) {
		await client.query("ROLLBACK");
		console.error("Reset menu error:", e);
		return c.json({ error: "Failed to reset menu" }, 500);
	} finally {
		client.release();
	}
});

export default reset;
