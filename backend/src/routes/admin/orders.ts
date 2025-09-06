import { Hono } from "hono";
import { pool } from "../../config/database";
import { type AdminContext, requireStaff } from "../../middleware/rbac";

const orders = new Hono();

// Get all orders with filtering and pagination
orders.get("/", requireStaff, async (c: AdminContext) => {
	try {
		const {
			status,
			date,
			customer,
			page = "1",
			limit = "20",
			sortBy = "created_at",
			sortOrder = "desc",
		} = c.req.query();

		const offset = (parseInt(page) - 1) * parseInt(limit);
		const whereConditions = [];
		const params = [];
		let paramIndex = 1;

		if (status) {
			whereConditions.push(`o.status = $${paramIndex}`);
			params.push(status);
			paramIndex++;
		}

		if (date) {
			const targetDate = new Date(date);
			const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
			whereConditions.push(`o.created_at >= $${paramIndex} AND o.created_at < $${paramIndex + 1}`);
			params.push(targetDate, nextDay);
			paramIndex += 2;
		}

		if (customer) {
			whereConditions.push(
				`(u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`,
			);
			params.push(`%${customer}%`);
			paramIndex++;
		}

		const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

		// Get total count
		const countResult = await pool.query(
			`
      SELECT COUNT(*) as total
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ${whereClause}
    `,
			params,
		);

		const total = parseInt(countResult.rows[0].total);

		// Sorting
		const sortColumn = sortBy === "customer" ? "customer_name" : `o.${sortBy}`;
		const sortDirection = sortOrder.toUpperCase();

		// Add pagination params with correct indices
		const limitVal = parseInt(limit);
		const offsetVal = offset;
		const limitIndex = params.length + 1;
		const offsetIndex = params.length + 2;
		const finalParams = [...params, limitVal, offsetVal];

		// Get orders with details
		const result = await pool.query(
			`
      SELECT 
        o.id,
        o.status,
        o.subtotal,
        o.tax,
        o.delivery_fee,
        o.total,
        o.notes,
        o.estimated_delivery_time,
        o.actual_delivery_time,
        o.created_at,
        o.updated_at,
        u.first_name || ' ' || u.last_name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        a.street || ', ' || a.city || ', ' || a.state as delivery_address,
        COUNT(oi.id) as item_count,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'id', oi.id,
            'name', mi.name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'subtotal', oi.subtotal
          )
        ) as items
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN addresses a ON o.delivery_address_id = a.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      ${whereClause}
      GROUP BY o.id, u.first_name, u.last_name, u.email, u.phone, a.street, a.city, a.state
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `,
			finalParams,
		);

		return c.json({
			orders: result.rows.map((order) => ({
				id: order.id,
				status: order.status,
				subtotal: parseFloat(order.subtotal),
				tax: parseFloat(order.tax),
				deliveryFee: parseFloat(order.delivery_fee),
				total: parseFloat(order.total),
				notes: order.notes,
				estimatedDeliveryTime: order.estimated_delivery_time,
				actualDeliveryTime: order.actual_delivery_time,
				createdAt: order.created_at,
				updatedAt: order.updated_at,
				customer: {
					name: order.customer_name,
					email: order.customer_email,
					phone: order.customer_phone,
				},
				deliveryAddress: order.delivery_address,
				itemCount: parseInt(order.item_count),
				items: order.items.filter((item) => item.id), // Remove nulls from LEFT JOIN
			})),
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total,
				totalPages: Math.ceil(total / parseInt(limit)),
			},
		});
	} catch (error) {
		console.error("Orders fetch error:", error);
		return c.json({ error: "Failed to fetch orders" }, 500);
	}
});

// Get single order details
orders.get("/:id", requireStaff, async (c: AdminContext) => {
	try {
		const orderId = c.req.param("id");

		const result = await pool.query(
			`
      SELECT 
        o.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        a.street,
        a.apartment,
        a.city,
        a.state,
        a.zip_code,
        pm.type as payment_type,
        pm.last4,
        pm.brand
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN addresses a ON o.delivery_address_id = a.id
      LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
      WHERE o.id = $1
    `,
			[orderId],
		);

		if (result.rows.length === 0) {
			return c.json({ error: "Order not found" }, 404);
		}

		const order = result.rows[0];

		// Get order items
		const itemsResult = await pool.query(
			`
      SELECT 
        oi.*,
        mi.name,
        mi.description,
        mi.image_url
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at
    `,
			[orderId],
		);

		return c.json({
			order: {
				id: order.id,
				status: order.status,
				subtotal: parseFloat(order.subtotal),
				tax: parseFloat(order.tax),
				deliveryFee: parseFloat(order.delivery_fee),
				total: parseFloat(order.total),
				notes: order.notes,
				estimatedDeliveryTime: order.estimated_delivery_time,
				actualDeliveryTime: order.actual_delivery_time,
				cancelledAt: order.cancelled_at,
				cancellationReason: order.cancellation_reason,
				createdAt: order.created_at,
				updatedAt: order.updated_at,
				customer: {
					name: `${order.first_name} ${order.last_name}`,
					email: order.email,
					phone: order.phone,
				},
				deliveryAddress: order.delivery_address_id
					? {
							street: order.street,
							apartment: order.apartment,
							city: order.city,
							state: order.state,
							zipCode: order.zip_code,
						}
					: null,
				paymentMethod: order.payment_method_id
					? {
							type: order.payment_type,
							last4: order.last4,
							brand: order.brand,
						}
					: null,
				items: itemsResult.rows.map((item) => ({
					id: item.id,
					menuItemId: item.menu_item_id,
					name: item.name,
					description: item.description,
					imageUrl: item.image_url,
					quantity: item.quantity,
					unitPrice: parseFloat(item.unit_price),
					subtotal: parseFloat(item.subtotal),
					selectedOptions: item.selected_options,
					specialInstructions: item.special_instructions,
				})),
			},
		});
	} catch (error) {
		console.error("Order fetch error:", error);
		return c.json({ error: "Failed to fetch order" }, 500);
	}
});

// Update order status
orders.patch("/:id/status", requireStaff, async (c: AdminContext) => {
	try {
		const orderId = c.req.param("id");
		const { status, estimatedDeliveryTime, cancellationReason } = await c.req.json();

		const validStatuses = [
			"pending",
			"confirmed",
			"preparing",
			"ready",
			"out_for_delivery",
			"delivered",
			"cancelled",
		];
		if (!validStatuses.includes(status)) {
			return c.json({ error: "Invalid status" }, 400);
		}

		// Get current order for audit
		const currentOrder = await pool.query("SELECT * FROM orders WHERE id = $1", [orderId]);
		if (currentOrder.rows.length === 0) {
			return c.json({ error: "Order not found" }, 404);
		}

		const updateFields = ["status = $2", "updated_at = CURRENT_TIMESTAMP"];
		const params = [orderId, status];
		let paramIndex = 3;

		if (estimatedDeliveryTime) {
			updateFields.push(`estimated_delivery_time = $${paramIndex}`);
			params.push(new Date(estimatedDeliveryTime));
			paramIndex++;
		}

		if (status === "delivered") {
			updateFields.push(`actual_delivery_time = $${paramIndex}`);
			params.push(new Date());
			paramIndex++;
		}

		if (status === "cancelled" && cancellationReason) {
			updateFields.push(
				`cancelled_at = $${paramIndex}`,
				`cancellation_reason = $${paramIndex + 1}`,
			);
			params.push(new Date(), cancellationReason);
			paramIndex += 2;
		}

		const result = await pool.query(
			`
      UPDATE orders 
      SET ${updateFields.join(", ")}
      WHERE id = $1
      RETURNING *
    `,
			params,
		);

		// Log the status change
		await pool.query(
			`
      INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
      VALUES ($1, 'status_update', 'orders', $2, $3, $4)
    `,
			[
				c.user.id,
				orderId,
				JSON.stringify({ status: currentOrder.rows[0].status }),
				JSON.stringify({ status, updatedBy: c.user.email }),
			],
		);

		return c.json({
			message: "Order status updated successfully",
			order: result.rows[0],
		});
	} catch (error) {
		console.error("Order status update error:", error);
		return c.json({ error: "Failed to update order status" }, 500);
	}
});

// Get order statistics
orders.get("/stats/summary", requireStaff, async (c: AdminContext) => {
	try {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Get status breakdown
		const statusStats = await pool.query(
			`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders
      WHERE created_at >= $1
      GROUP BY status
    `,
			[today],
		);

		// Get hourly orders for today
		const hourlyStats = await pool.query(
			`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as orders
      FROM orders
      WHERE created_at >= $1
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `,
			[today],
		);

		// Get average preparation time by status
		const prepTimeStats = await pool.query(
			`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_minutes
      FROM orders
      WHERE status = 'delivered' AND created_at >= $1
    `,
			[today],
		);

		return c.json({
			statusBreakdown: statusStats.rows.reduce((acc, row) => {
				acc[row.status] = parseInt(row.count);
				return acc;
			}, {}),
			hourlyOrders: hourlyStats.rows.map((row) => ({
				hour: parseInt(row.hour),
				orders: parseInt(row.orders),
			})),
			averagePreparationTime: prepTimeStats.rows[0].avg_minutes
				? Math.round(parseFloat(prepTimeStats.rows[0].avg_minutes))
				: null,
		});
	} catch (error) {
		console.error("Order stats error:", error);
		return c.json({ error: "Failed to fetch order statistics" }, 500);
	}
});

export default orders;
