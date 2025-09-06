import { Hono } from "hono";
import { pool } from "../config/database";
import { authMiddleware } from "../middleware/auth";
import type { AppContext } from "../types/index";

const orders = new Hono();

orders.use("*", authMiddleware);

orders.post("/", async (c: AppContext) => {
	try {
		const userId = c.get("userId");
		const body = await c.req.json();
		const { deliveryAddressId, items, specialInstructions, promoCode } = body;

		if (!deliveryAddressId || !items || items.length === 0) {
			return c.json({ error: "Missing required fields" }, 400);
		}

		// Enforce business hours
		try {
			const res = await pool.query(
				`SELECT value FROM business_settings WHERE key = 'business_hours'`,
			);
			const hours =
				res.rows.length > 0
					? res.rows[0].value
					: {
							monday: { open: "11:00", close: "22:00", closed: false },
							tuesday: { open: "11:00", close: "22:00", closed: false },
							wednesday: { open: "11:00", close: "22:00", closed: false },
							thursday: { open: "11:00", close: "22:00", closed: false },
							friday: { open: "11:00", close: "23:00", closed: false },
							saturday: { open: "11:00", close: "23:00", closed: false },
							sunday: { open: "12:00", close: "21:00", closed: false },
						};

			const now = new Date();
			const jsDay = now.getDay(); // 0=Sun..6=Sat
			const dayKeys = [
				"monday",
				"tuesday",
				"wednesday",
				"thursday",
				"friday",
				"saturday",
				"sunday",
			];
			const todayKey = dayKeys[(jsDay + 6) % 7];
			const today = hours[todayKey] || { closed: true };

			const within = (() => {
				const minutesNow = now.getHours() * 60 + now.getMinutes();
				if (today.closed) return false;
				if (Array.isArray(today.intervals)) {
					return today.intervals.some((i: any) => {
						const [oh, om] = (i.open || "00:00").split(":").map(Number);
						const [ch, cm] = (i.close || "00:00").split(":").map(Number);
						const openM = oh * 60 + om;
						const closeM = ch * 60 + cm;
						return minutesNow >= openM && minutesNow < closeM;
					});
				}
				// legacy single window
				const [oh, om] = (today.open || "00:00").split(":").map(Number);
				const [ch, cm] = (today.close || "00:00").split(":").map(Number);
				const openM = oh * 60 + om;
				const closeM = ch * 60 + cm;
				return minutesNow >= openM && minutesNow < closeM;
			})();

			if (!within) {
				const window = today.closed
					? "Fermé"
					: Array.isArray(today.intervals)
						? today.intervals.map((i: any) => `${i.open} - ${i.close}`).join(", ")
						: `${today.open || ""} - ${today.close || ""}`;
				return c.json({ error: `Ordering is closed now. Today's hours: ${window}` }, 403);
			}
		} catch (e) {
			// If hours check fails unexpectedly, proceed (fails open) but log
			console.error("Business hours check failed:", e);
		}

		const client = await pool.connect();

		try {
			await client.query("BEGIN");

			let subtotal = 0;
			const itemsWithPrices = [];

			for (const item of items) {
				const menuItemResult = await client.query(
					"SELECT price FROM menu_items WHERE id = $1 AND is_available = true",
					[item.menuItemId],
				);

				if (menuItemResult.rows.length === 0) {
					throw new Error(`Menu item ${item.menuItemId} not available`);
				}

				let itemPrice = parseFloat(menuItemResult.rows[0].price);

				if (item.selectedOptions && item.selectedOptions.length > 0) {
					for (const option of item.selectedOptions) {
						const optionResult = await client.query(
							"SELECT price_modifier FROM item_option_values WHERE id = $1",
							[option.valueId],
						);

						if (optionResult.rows.length > 0) {
							itemPrice += parseFloat(optionResult.rows[0].price_modifier);
						}
					}
				}

				const totalPrice = itemPrice * item.quantity;
				subtotal += totalPrice;

				itemsWithPrices.push({
					...item,
					unitPrice: itemPrice,
					totalPrice,
				});
			}

			const deliveryFee = 5.99;
			const taxRate = 0.08;

			// Promo: 20% off for new customers with WELCOME20
			let discountAmount = 0;
			let promoApplied = false;
			const normalizedCode = typeof promoCode === "string" ? promoCode.trim().toUpperCase() : "";
			if (normalizedCode === "WELCOME20") {
				const countRes = await client.query(
					"SELECT COUNT(*)::int AS cnt FROM orders WHERE user_id = $1",
					[userId],
				);
				const orderCount = countRes.rows[0]?.cnt ?? 0;
				if (orderCount === 0) {
					discountAmount = parseFloat((subtotal * 0.2).toFixed(2));
					promoApplied = true;
				}
			}

			const taxableSubtotal = Math.max(0, subtotal - discountAmount);
			const taxAmount = parseFloat((taxableSubtotal * taxRate).toFixed(2));
			const totalAmount = parseFloat((taxableSubtotal + deliveryFee + taxAmount).toFixed(2));

			const orderResult = await client.query(
				`INSERT INTO orders (
          user_id, delivery_address_id, status, subtotal, 
          delivery_fee, tax_amount, total_amount, 
          special_instructions, estimated_delivery_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, status, created_at`,
				[
					userId,
					deliveryAddressId,
					"pending",
					subtotal,
					deliveryFee,
					taxAmount,
					totalAmount,
					specialInstructions,
					new Date(Date.now() + 45 * 60 * 1000),
				],
			);

			const orderId = orderResult.rows[0].id;

			for (const item of itemsWithPrices) {
				const orderItemResult = await client.query(
					`INSERT INTO order_items (
            order_id, menu_item_id, quantity, 
            unit_price, total_price, special_instructions
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id`,
					[
						orderId,
						item.menuItemId,
						item.quantity,
						item.unitPrice,
						item.totalPrice,
						item.specialInstructions,
					],
				);

				const orderItemId = orderItemResult.rows[0].id;

				if (item.selectedOptions && item.selectedOptions.length > 0) {
					for (const option of item.selectedOptions) {
						await client.query(
							`INSERT INTO order_item_options (
                order_item_id, option_id, option_value_id, price_modifier
              ) VALUES ($1, $2, $3, $4)`,
							[orderItemId, option.optionId, option.valueId, option.priceModifier || 0],
						);
					}
				}
			}

			await client.query("COMMIT");

			return c.json(
				{
					orderId,
					status: orderResult.rows[0].status,
					subtotal,
					deliveryFee,
					taxAmount,
					totalAmount,
					discountAmount,
					promoApplied,
					promoCode: promoApplied ? normalizedCode : null,
					estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000),
					createdAt: orderResult.rows[0].created_at,
				},
				201,
			);
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	} catch (error) {
		console.error("Error creating order:", error);
		return c.json({ error: "Failed to create order" }, 500);
	}
});

orders.get("/", async (c: AppContext) => {
	try {
		const userId = c.get("userId");
		const status = c.req.query("status");
		const limit = parseInt(c.req.query("limit") || "10", 10);
		const offset = parseInt(c.req.query("offset") || "0", 10);

		let query = `
      SELECT 
        o.id, o.status, o.subtotal, o.delivery_fee, 
        o.tax_amount, o.total_amount, o.special_instructions,
        o.estimated_delivery_time, o.actual_delivery_time,
        o.created_at, o.updated_at,
        json_build_object(
          'id', a.id,
          'streetAddress', a.street_address,
          'city', a.city,
          'state', a.state,
          'postalCode', a.postal_code
        ) as delivery_address,
        COUNT(*) OVER() as total_count
      FROM orders o
      LEFT JOIN addresses a ON o.delivery_address_id = a.id
      WHERE o.user_id = $1
    `;

		const params: any[] = [userId];
		let paramCount = 1;

		if (status) {
			paramCount++;
			query += ` AND o.status = $${paramCount}`;
			params.push(status);
		}

		paramCount++;
		query += ` ORDER BY o.created_at DESC LIMIT $${paramCount}`;
		params.push(limit);

		paramCount++;
		query += ` OFFSET $${paramCount}`;
		params.push(offset);

		const result = await pool.query(query, params);

		const orders = result.rows.map((row) => ({
			id: row.id,
			status: row.status,
			subtotal: parseFloat(row.subtotal),
			deliveryFee: parseFloat(row.delivery_fee),
			taxAmount: parseFloat(row.tax_amount),
			totalAmount: parseFloat(row.total_amount),
			specialInstructions: row.special_instructions,
			estimatedDeliveryTime: row.estimated_delivery_time,
			actualDeliveryTime: row.actual_delivery_time,
			deliveryAddress: row.delivery_address,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		}));

		const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;

		return c.json({
			orders,
			pagination: {
				total: totalCount,
				limit,
				offset,
				hasMore: offset + limit < totalCount,
			},
		});
	} catch (error) {
		console.error("Error fetching orders:", error);
		return c.json({ error: "Failed to fetch orders" }, 500);
	}
});

orders.get("/:id", async (c: AppContext) => {
	try {
		const userId = c.get("userId");
		const orderId = c.req.param("id");

		const orderResult = await pool.query(
			`SELECT 
        o.id, o.status, o.subtotal, o.delivery_fee, 
        o.tax_amount, o.total_amount, o.special_instructions,
        o.estimated_delivery_time, o.actual_delivery_time,
        o.created_at, o.updated_at,
        json_build_object(
          'id', a.id,
          'streetAddress', a.street_address,
          'city', a.city,
          'state', a.state,
          'postalCode', a.postal_code,
          'latitude', a.latitude,
          'longitude', a.longitude
        ) as delivery_address
      FROM orders o
      LEFT JOIN addresses a ON o.delivery_address_id = a.id
      WHERE o.id = $1 AND o.user_id = $2`,
			[orderId, userId],
		);

		if (orderResult.rows.length === 0) {
			return c.json({ error: "Order not found" }, 404);
		}

		const itemsResult = await pool.query(
			`SELECT 
        oi.id, oi.quantity, oi.unit_price, oi.total_price,
        oi.special_instructions,
        json_build_object(
          'id', mi.id,
          'name', mi.name,
          'description', mi.description,
          'imageUrl', mi.image_url
        ) as menu_item,
        json_agg(
          json_build_object(
            'optionName', io.name,
            'selectedValue', iov.value,
            'priceModifier', oio.price_modifier
          )
        ) FILTER (WHERE oio.id IS NOT NULL) as selected_options
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN order_item_options oio ON oio.order_item_id = oi.id
      LEFT JOIN item_options io ON oio.option_id = io.id
      LEFT JOIN item_option_values iov ON oio.option_value_id = iov.id
      WHERE oi.order_id = $1
      GROUP BY oi.id, mi.id`,
			[orderId],
		);

		const order = orderResult.rows[0];

		return c.json({
			id: order.id,
			status: order.status,
			subtotal: parseFloat(order.subtotal),
			deliveryFee: parseFloat(order.delivery_fee),
			taxAmount: parseFloat(order.tax_amount),
			totalAmount: parseFloat(order.total_amount),
			specialInstructions: order.special_instructions,
			estimatedDeliveryTime: order.estimated_delivery_time,
			actualDeliveryTime: order.actual_delivery_time,
			deliveryAddress: order.delivery_address,
			items: itemsResult.rows.map((item) => ({
				id: item.id,
				menuItem: item.menu_item,
				quantity: item.quantity,
				unitPrice: parseFloat(item.unit_price),
				totalPrice: parseFloat(item.total_price),
				specialInstructions: item.special_instructions,
				selectedOptions: item.selected_options || [],
			})),
			createdAt: order.created_at,
			updatedAt: order.updated_at,
		});
	} catch (error) {
		console.error("Error fetching order:", error);
		return c.json({ error: "Failed to fetch order" }, 500);
	}
});

export default orders;
