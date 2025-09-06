import { Hono } from "hono";
import { pool } from "../../config/database";
import { type AdminContext, requireAdmin } from "../../middleware/rbac";

const dashboard = new Hono();

// Get dashboard overview stats
dashboard.get("/", requireAdmin, async (c: AdminContext) => {
	try {
		const today = new Date();
		const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const startOfWeek = new Date(today);
		startOfWeek.setDate(today.getDate() - 7);
		const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

		// Get today's stats
		const todayStats = await pool.query(
			`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as average_order_value
      FROM orders 
      WHERE created_at >= $1 AND created_at < $2
    `,
			[startOfDay, new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)],
		);

		// Get this week's stats
		const weekStats = await pool.query(
			`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue
      FROM orders 
      WHERE created_at >= $1
    `,
			[startOfWeek],
		);

		// Get this month's stats
		const monthStats = await pool.query(
			`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue
      FROM orders 
      WHERE created_at >= $1
    `,
			[startOfMonth],
		);

		// Get pending orders count
		const pendingOrders = await pool.query(`
      SELECT COUNT(*) as pending_count
      FROM orders 
      WHERE status IN ('pending', 'confirmed', 'preparing')
    `);

		// Get low stock items count - simplified for now
		const lowStockItems = { rows: [{ low_stock_count: 0 }] };

		// Get top selling items today
		const topItems = await pool.query(
			`
      SELECT 
        mi.name,
        mi.id,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.subtotal) as revenue
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= $1
      GROUP BY mi.id, mi.name
      ORDER BY quantity_sold DESC
      LIMIT 5
    `,
			[startOfDay],
		);

		// Get recent orders: last 4 hours, max 10, newest first
		const recentOrders = await pool.query(`
      SELECT 
        o.id,
        o.status,
        o.total,
        o.created_at,
        u.first_name || ' ' || u.last_name as customer_name,
        COUNT(oi.id) as item_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.created_at >= NOW() - INTERVAL '4 hours'
      GROUP BY o.id, u.first_name, u.last_name
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

		// Get hourly sales for today (for chart)
		const hourlySales = await pool.query(
			`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as orders,
        COALESCE(SUM(total), 0) as revenue
      FROM orders
      WHERE created_at >= $1
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `,
			[startOfDay],
		);

		return c.json({
			stats: {
				today: {
					orders: parseInt(todayStats.rows[0].total_orders),
					revenue: parseFloat(todayStats.rows[0].total_revenue),
					averageOrderValue: parseFloat(todayStats.rows[0].average_order_value),
				},
				week: {
					orders: parseInt(weekStats.rows[0].total_orders),
					revenue: parseFloat(weekStats.rows[0].total_revenue),
				},
				month: {
					orders: parseInt(monthStats.rows[0].total_orders),
					revenue: parseFloat(monthStats.rows[0].total_revenue),
				},
				pending_orders: parseInt(String(pendingOrders.rows[0]?.pending_count || "0")),
				low_stock_items: parseInt(String(lowStockItems.rows[0]?.low_stock_count || "0")),
			},
			topItems: topItems.rows.map((item) => ({
				id: item.id,
				name: item.name,
				quantitySold: parseInt(item.quantity_sold),
				revenue: parseFloat(item.revenue),
			})),
			recentOrders: recentOrders.rows.map((order) => ({
				id: order.id,
				status: order.status,
				total: parseFloat(order.total),
				customerName: order.customer_name,
				itemCount: parseInt(order.item_count),
				createdAt: order.created_at,
			})),
			hourlySales: hourlySales.rows.map((hour) => ({
				hour: parseInt(hour.hour),
				orders: parseInt(hour.orders),
				revenue: parseFloat(hour.revenue),
			})),
		});
	} catch (error) {
		console.error("Dashboard error:", error);
		return c.json({ error: "Failed to fetch dashboard data" }, 500);
	}
});

// Get sales analytics for a specific period
dashboard.get("/analytics/sales", requireAdmin, async (c: AdminContext) => {
	try {
		const { period = "7days", startDate, endDate } = c.req.query();

		let dateFilter: string;
		let params: any[];

		if (startDate && endDate) {
			dateFilter = "WHERE created_at >= $1 AND created_at <= $2";
			params = [startDate, endDate];
		} else {
			const days = period === "30days" ? 30 : period === "7days" ? 7 : 1;
			const start = new Date();
			start.setDate(start.getDate() - days);
			dateFilter = "WHERE created_at >= $1";
			params = [start];
		}

		// Daily sales breakdown
		const dailySales = await pool.query(
			`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        COALESCE(SUM(total), 0) as revenue,
        COALESCE(AVG(total), 0) as average_order_value
      FROM orders
      ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `,
			params,
		);

		// Order status breakdown
		const statusBreakdown = await pool.query(
			`
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as revenue
      FROM orders
      ${dateFilter}
      GROUP BY status
      ORDER BY count DESC
    `,
			params,
		);

		// Top selling items in period
		const topItems = await pool.query(
			`
      SELECT mi.id, mi.name, SUM(oi.quantity) as quantity_sold, SUM(oi.subtotal) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      ${dateFilter.replace(/created_at/g, "o.created_at")}
      GROUP BY mi.id, mi.name
      ORDER BY quantity_sold DESC
      LIMIT 10
    `,
			params,
		);

		// Hourly distribution across the period
		const hourly = await pool.query(
			`
      SELECT EXTRACT(HOUR FROM o.created_at) as hour,
             COUNT(*) as orders,
             COALESCE(SUM(o.total), 0) as revenue
      FROM orders o
      ${dateFilter.replace(/created_at/g, "o.created_at")}
      GROUP BY EXTRACT(HOUR FROM o.created_at)
      ORDER BY hour
    `,
			params,
		);

		// Summary metrics for the period
		const summary = await pool.query(
			`
      SELECT COUNT(*) as total_orders,
             COALESCE(SUM(total), 0) as total_revenue,
             COALESCE(AVG(total), 0) as average_order_value
      FROM orders
      ${dateFilter}
    `,
			params,
		);

		return c.json({
			dailySales: dailySales.rows.map((day) => ({
				date: day.date,
				orders: parseInt(day.orders),
				revenue: parseFloat(day.revenue),
				averageOrderValue: parseFloat(day.average_order_value),
			})),
			statusBreakdown: statusBreakdown.rows.map((status) => ({
				status: status.status,
				count: parseInt(status.count),
				revenue: parseFloat(status.revenue),
			})),
			topItems: topItems.rows.map((row) => ({
				id: row.id,
				name: row.name,
				quantitySold: parseInt(row.quantity_sold),
				revenue: parseFloat(row.revenue),
			})),
			hourlyDistribution: hourly.rows.map((h) => ({
				hour: parseInt(h.hour),
				orders: parseInt(h.orders),
				revenue: parseFloat(h.revenue),
			})),
			summary: {
				totalOrders: parseInt(summary.rows[0].total_orders),
				totalRevenue: parseFloat(summary.rows[0].total_revenue),
				averageOrderValue: parseFloat(summary.rows[0].average_order_value),
			},
		});
	} catch (error) {
		console.error("Sales analytics error:", error);
		return c.json({ error: "Failed to fetch sales analytics" }, 500);
	}
});

export default dashboard;
