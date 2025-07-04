import { Hono } from "hono";
import { pool } from "../config/database";
import { authMiddleware } from "../middleware/auth";
import type { AppContext } from "../types/index";

const payments = new Hono();

payments.use("*", authMiddleware);

payments.post("/intent", async (c: AppContext) => {
	try {
		const userId = c.get("userId");
		const { orderId, amount } = await c.req.json();

		if (!orderId || !amount) {
			return c.json({ error: "Order ID and amount are required" }, 400);
		}

		const orderResult = await pool.query(
			"SELECT id, total_amount, payment_status FROM orders WHERE id = $1 AND user_id = $2",
			[orderId, userId],
		);

		if (orderResult.rows.length === 0) {
			return c.json({ error: "Order not found" }, 404);
		}

		if (orderResult.rows[0].payment_status === "succeeded") {
			return c.json({ error: "Order already paid" }, 400);
		}

		const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const clientSecret = `${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 9)}`;

		await pool.query(
			"UPDATE orders SET payment_intent_id = $1, payment_status = $2 WHERE id = $3",
			[paymentIntentId, "processing", orderId],
		);

		return c.json({
			paymentIntentId,
			clientSecret,
			amount: parseFloat(orderResult.rows[0].total_amount),
		});
	} catch (error) {
		console.error("Error creating payment intent:", error);
		return c.json({ error: "Failed to create payment intent" }, 500);
	}
});

payments.post("/confirm", async (c: AppContext) => {
	try {
		const userId = c.get("userId");
		const { paymentIntentId, orderId } = await c.req.json();

		if (!paymentIntentId || !orderId) {
			return c.json({ error: "Payment intent ID and order ID are required" }, 400);
		}

		const orderResult = await pool.query(
			"SELECT id, payment_intent_id FROM orders WHERE id = $1 AND user_id = $2",
			[orderId, userId],
		);

		if (orderResult.rows.length === 0) {
			return c.json({ error: "Order not found" }, 404);
		}

		if (orderResult.rows[0].payment_intent_id !== paymentIntentId) {
			return c.json({ error: "Payment intent mismatch" }, 400);
		}

		await pool.query(
			`UPDATE orders 
       SET payment_status = $1, status = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
			["succeeded", "confirmed", orderId],
		);

		return c.json({
			status: "succeeded",
			orderId,
			message: "Payment confirmed successfully",
		});
	} catch (error) {
		console.error("Error confirming payment:", error);
		return c.json({ error: "Failed to confirm payment" }, 500);
	}
});

payments.post("/webhook", async (c: AppContext) => {
	try {
		const signature = c.req.header("stripe-signature");
		const body = await c.req.text();

		console.log("Webhook received:", { signature, body });

		return c.json({ received: true });
	} catch (error) {
		console.error("Webhook error:", error);
		return c.json({ error: "Webhook processing failed" }, 400);
	}
});

payments.get("/methods", async (c: AppContext) => {
	try {
		// Note: userId is available but not currently used in this endpoint
		// const userId = c.get("userId");

		return c.json([
			{
				id: "pm_card_visa",
				type: "card",
				card: {
					brand: "visa",
					last4: "4242",
					expMonth: 12,
					expYear: 2025,
				},
				isDefault: true,
			},
		]);
	} catch (error) {
		console.error("Error fetching payment methods:", error);
		return c.json({ error: "Failed to fetch payment methods" }, 500);
	}
});

export default payments;
