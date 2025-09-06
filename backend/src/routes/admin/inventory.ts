import { Hono } from "hono";
import { pool } from "../../config/database";
import { type AdminContext, requireAdmin } from "../../middleware/rbac";

const inventory = new Hono();

// Get all inventory items
inventory.get("/", requireAdmin, async (c: AdminContext) => {
	try {
		const { lowStock, search, category } = c.req.query();

		const whereConditions = [];
		const params = [];
		let paramIndex = 1;

		if (lowStock === "true") {
			whereConditions.push("i.current_stock <= i.minimum_stock");
		}

		if (search) {
			whereConditions.push(`mi.name ILIKE $${paramIndex}`);
			params.push(`%${search}%`);
			paramIndex++;
		}

		if (category) {
			whereConditions.push(`mc.id = $${paramIndex}`);
			params.push(category);
			paramIndex++;
		}

		const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

		const result = await pool.query(
			`
      SELECT 
        i.*,
        mi.name as item_name,
        mi.price,
        mi.available,
        mc.name as category_name,
        mc.id as category_id,
        CASE 
          WHEN i.current_stock <= i.minimum_stock THEN 'low'
          WHEN i.current_stock >= i.maximum_stock THEN 'high'
          ELSE 'normal'
        END as stock_status
      FROM inventory i
      JOIN menu_items mi ON i.menu_item_id = mi.id
      JOIN menu_categories mc ON mi.category_id = mc.id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN i.current_stock <= i.minimum_stock THEN 1 
          ELSE 2 
        END,
        mc.sort_order,
        mi.name
    `,
			params,
		);

		return c.json({
			inventory: result.rows.map((item) => ({
				id: item.id,
				menuItemId: item.menu_item_id,
				itemName: item.item_name,
				price: parseFloat(item.price),
				available: item.available,
				category: {
					id: item.category_id,
					name: item.category_name,
				},
				currentStock: item.current_stock,
				minimumStock: item.minimum_stock,
				maximumStock: item.maximum_stock,
				unit: item.unit,
				costPerUnit: item.cost_per_unit ? parseFloat(item.cost_per_unit) : null,
				stockStatus: item.stock_status,
				autoDisableWhenEmpty: item.auto_disable_when_empty,
				lastRestockedAt: item.last_restocked_at,
				supplierInfo: item.supplier_info,
				updatedAt: item.updated_at,
			})),
		});
	} catch (error) {
		console.error("Inventory fetch error:", error);
		return c.json({ error: "Failed to fetch inventory" }, 500);
	}
});

// Update inventory stock
inventory.patch("/:id/stock", requireAdmin, async (c: AdminContext) => {
	try {
		const inventoryId = c.req.param("id");
		const {
			currentStock,
			minimumStock,
			maximumStock,
			operation = "set",
			reason = "Manual adjustment",
		} = await c.req.json();

		// Get current inventory
		const current = await pool.query("SELECT * FROM inventory WHERE id = $1", [inventoryId]);
		if (current.rows.length === 0) {
			return c.json({ error: "Inventory item not found" }, 404);
		}

		const currentItem = current.rows[0];
		let newStock = currentItem.current_stock;

		// Calculate new stock based on operation
		switch (operation) {
			case "add":
				newStock = currentItem.current_stock + (currentStock || 0);
				break;
			case "subtract":
				newStock = Math.max(0, currentItem.current_stock - (currentStock || 0));
				break;
			case "set":
			default:
				newStock = currentStock !== undefined ? currentStock : currentItem.current_stock;
				break;
		}

		const updateFields = ["current_stock = $2"];
		const params = [inventoryId, newStock];
		let paramIndex = 3;

		if (minimumStock !== undefined) {
			updateFields.push(`minimum_stock = $${paramIndex}`);
			params.push(minimumStock);
			paramIndex++;
		}

		if (maximumStock !== undefined) {
			updateFields.push(`maximum_stock = $${paramIndex}`);
			params.push(maximumStock);
			paramIndex++;
		}

		// Mark as restocked if stock was added
		if (newStock > currentItem.current_stock) {
			updateFields.push(
				`last_restocked_at = $${paramIndex}`,
				`last_restocked_by = $${paramIndex + 1}`,
			);
			params.push(new Date(), c.user.id);
			paramIndex += 2;
		}

		updateFields.push("updated_at = CURRENT_TIMESTAMP");

		const result = await pool.query(
			`
      UPDATE inventory 
      SET ${updateFields.join(", ")}
      WHERE id = $1
      RETURNING *
    `,
			params,
		);

		// Auto-disable menu item if out of stock and auto-disable is enabled
		if (newStock === 0 && currentItem.auto_disable_when_empty) {
			await pool.query("UPDATE menu_items SET available = false WHERE id = $1", [
				currentItem.menu_item_id,
			]);
		}

		// Log the inventory change
		await pool.query(
			`
      INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
      VALUES ($1, 'inventory_update', 'inventory', $2, $3, $4)
    `,
			[
				c.user.id,
				inventoryId,
				JSON.stringify({
					currentStock: currentItem.current_stock,
					reason: "Previous value",
				}),
				JSON.stringify({
					currentStock: newStock,
					operation,
					reason,
					updatedBy: c.user.email,
				}),
			],
		);

		return c.json({
			message: "Inventory updated successfully",
			inventory: result.rows[0],
		});
	} catch (error) {
		console.error("Inventory update error:", error);
		return c.json({ error: "Failed to update inventory" }, 500);
	}
});

// Get low stock alerts
inventory.get("/alerts", requireAdmin, async (c: AdminContext) => {
	try {
		const result = await pool.query(`
      SELECT 
        i.*,
        mi.name as item_name,
        mi.price,
        mc.name as category_name,
        (i.minimum_stock - i.current_stock) as shortage_amount
      FROM inventory i
      JOIN menu_items mi ON i.menu_item_id = mi.id
      JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE i.current_stock <= i.minimum_stock
      ORDER BY (i.minimum_stock - i.current_stock) DESC, mi.name
    `);

		return c.json({
			alerts: result.rows.map((item) => ({
				id: item.id,
				menuItemId: item.menu_item_id,
				itemName: item.item_name,
				categoryName: item.category_name,
				currentStock: item.current_stock,
				minimumStock: item.minimum_stock,
				shortageAmount: item.shortage_amount,
				unit: item.unit,
				price: parseFloat(item.price),
				severity: item.current_stock === 0 ? "critical" : "warning",
			})),
		});
	} catch (error) {
		console.error("Inventory alerts error:", error);
		return c.json({ error: "Failed to fetch inventory alerts" }, 500);
	}
});

// Bulk stock update
inventory.patch("/bulk", requireAdmin, async (c: AdminContext) => {
	try {
		const { updates } = await c.req.json();

		if (!Array.isArray(updates) || updates.length === 0) {
			return c.json({ error: "Updates array is required" }, 400);
		}

		const results = [];
		const client = await pool.connect();

		try {
			await client.query("BEGIN");

			for (const update of updates) {
				const { inventoryId, currentStock, minimumStock, maximumStock, operation = "set" } = update;

				// Get current stock
				const current = await client.query("SELECT current_stock FROM inventory WHERE id = $1", [
					inventoryId,
				]);
				if (current.rows.length === 0) continue;

				let newStock = current.rows[0].current_stock;

				switch (operation) {
					case "add":
						newStock += currentStock || 0;
						break;
					case "subtract":
						newStock = Math.max(0, newStock - (currentStock || 0));
						break;
					case "set":
					default:
						newStock = currentStock !== undefined ? currentStock : newStock;
						break;
				}

				const updateFields = ["current_stock = $2", "updated_at = CURRENT_TIMESTAMP"];
				const params = [inventoryId, newStock];
				let paramIndex = 3;

				if (minimumStock !== undefined) {
					updateFields.push(`minimum_stock = $${paramIndex}`);
					params.push(minimumStock);
					paramIndex++;
				}

				if (maximumStock !== undefined) {
					updateFields.push(`maximum_stock = $${paramIndex}`);
					params.push(maximumStock);
					paramIndex++;
				}

				const result = await client.query(
					`
          UPDATE inventory 
          SET ${updateFields.join(", ")}
          WHERE id = $1
          RETURNING *
        `,
					params,
				);

				results.push(result.rows[0]);
			}

			await client.query("COMMIT");

			// Log bulk update
			await pool.query(
				`
        INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
        VALUES ($1, 'bulk_inventory_update', 'inventory', $2, $3)
      `,
				[c.user.id, null, JSON.stringify({ updateCount: updates.length, updates })],
			);

			return c.json({
				message: `Successfully updated ${results.length} inventory items`,
				updated: results.length,
			});
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	} catch (error) {
		console.error("Bulk inventory update error:", error);
		return c.json({ error: "Failed to bulk update inventory" }, 500);
	}
});

// Get inventory history/movements
inventory.get("/history", requireAdmin, async (c: AdminContext) => {
	try {
		const { menuItemId, limit = "50" } = c.req.query();

		const whereCondition = menuItemId
			? "WHERE al.table_name = 'inventory' AND al.record_id = (SELECT id FROM inventory WHERE menu_item_id = $2)"
			: "WHERE al.table_name = 'inventory'";

		const params: any[] = [parseInt(limit as string)];
		if (menuItemId) {
			params.push(menuItemId);
		}

		const result = await pool.query(
			`
      SELECT 
        al.*,
        u.first_name || ' ' || u.last_name as user_name,
        mi.name as item_name
      FROM audit_log al
      JOIN users u ON al.user_id = u.id
      LEFT JOIN inventory i ON al.record_id = i.id::text
      LEFT JOIN menu_items mi ON i.menu_item_id = mi.id
      ${whereCondition}
      ORDER BY al.created_at DESC
      LIMIT $1
    `,
			params,
		);

		return c.json({
			history: result.rows.map((log) => ({
				id: log.id,
				action: log.action,
				userName: log.user_name,
				itemName: log.item_name,
				oldValues: log.old_values,
				newValues: log.new_values,
				createdAt: log.created_at,
			})),
		});
	} catch (error) {
		console.error("Inventory history error:", error);
		return c.json({ error: "Failed to fetch inventory history" }, 500);
	}
});

export default inventory;
