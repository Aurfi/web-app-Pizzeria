import { Hono } from "hono";
import { pool } from "../config/database";
import { authMiddleware } from "../middleware/auth.js";

const admin = new Hono();

// Dashboard statistics
admin.get("/dashboard/stats", authMiddleware, async (c) => {
	try {
		// Get today's orders
		const todayOrdersResult = await pool.query(`
			SELECT COUNT(*) as count, 
				   COALESCE(SUM(total_amount), 0) as revenue
			FROM orders 
			WHERE DATE(created_at) = CURRENT_DATE
		`);

		// Get average preparation time (mock for now)
		const avgTimeResult = await pool.query(`
			SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_time
			FROM orders 
			WHERE status = 'completed' 
			AND DATE(created_at) = CURRENT_DATE
		`);

		// Get low stock items count (mock for now)
		const lowStockResult = await pool.query(`
			SELECT COUNT(*) as count 
			FROM menu_items 
			WHERE is_available = false
		`);

		// Get recent orders for the dashboard
		const recentOrdersResult = await pool.query(`
			SELECT 
				o.id,
				o.total_amount,
				o.status,
				o.created_at,
				u.first_name || ' ' || u.last_name as customer_name,
				COALESCE(
					json_agg(
						json_build_object(
							'name', mi.name,
							'quantity', oi.quantity,
							'price', oi.price
						)
					) FILTER (WHERE mi.id IS NOT NULL), 
					'[]'::json
				) as items
			FROM orders o
			LEFT JOIN users u ON o.user_id = u.id
			LEFT JOIN order_items oi ON o.id = oi.order_id
			LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
			WHERE DATE(o.created_at) = CURRENT_DATE
			GROUP BY o.id, o.total_amount, o.status, o.created_at, u.first_name, u.last_name
			ORDER BY o.created_at DESC
			LIMIT 5
		`);

		const todayStats = todayOrdersResult.rows[0];
		const avgTime = avgTimeResult.rows[0]?.avg_time || 23;
		const lowStock = lowStockResult.rows[0]?.count || 0;
		const recentOrders = recentOrdersResult.rows;

		return c.json({
			stats: {
				ordersToday: parseInt(todayStats.count) || 0,
				revenueToday: parseFloat(todayStats.revenue) || 0,
				avgPreparationTime: Math.round(avgTime),
				lowStockItems: parseInt(lowStock) || 0
			},
			recentOrders: recentOrders.map(order => ({
				id: order.id,
				customerName: order.customer_name || "Invité",
				items: Array.isArray(order.items) ? order.items : [],
				total: parseFloat(order.total_amount),
				status: order.status,
				time: new Date(order.created_at).toLocaleTimeString('fr-FR', { 
					hour: '2-digit', 
					minute: '2-digit' 
				})
			}))
		});
	} catch (error) {
		console.error("Error fetching dashboard stats:", error);
		return c.json({ 
			error: "Failed to fetch dashboard statistics" 
		}, 500);
	}
});

export { admin };
