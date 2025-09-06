import { serve } from "@hono/node-server";
import * as dotenv from "dotenv";
import type { Context } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { errorHandler } from "./middleware/errorHandler";
import { apiRateLimit, authRateLimit } from "./middleware/rateLimit";
import { securityHeaders } from "./middleware/security";
import adminRoutes from "./routes/admin/index";
import authRoutes from "./routes/auth";
import healthRoutes from "./routes/health";
import menuRoutes from "./routes/menu";
import orderRoutes from "./routes/order";
import paymentRoutes from "./routes/payment";
import restaurantRoutes from "./routes/restaurant";
import userRoutes from "./routes/user";

dotenv.config();

const app = new Hono();

// Security middleware first
app.use("*", securityHeaders());

// Basic middleware
app.use("*", logger());
app.use("*", prettyJSON());

// Rate limiting
app.use("/api/*", apiRateLimit);
app.use("/api/auth/*", authRateLimit);

// CORS
app.use(
	"*",
	cors({
		origin: process.env.FRONTEND_URL || "http://localhost:3000",
		credentials: true,
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
	}),
);

// Error handling
app.use("*", errorHandler);

app.get("/", (c: Context) => {
	return c.json({
		message: "FoodFlow API Server",
		version: "1.0.0",
		status: "running",
	});
});

// Health check routes
app.route("/health", healthRoutes);

// Public routes (no auth required)
app.route("/api/restaurant", restaurantRoutes);

// Protected API routes
app.route("/api/auth", authRoutes);
app.route("/api/menu", menuRoutes);
app.route("/api/orders", orderRoutes);
app.route("/api/users", userRoutes);
app.route("/api/payments", paymentRoutes);
app.route("/api/admin", adminRoutes);

app.notFound((c: Context) => {
	return c.json({ error: "Not Found" }, 404);
});

app.onError((err: Error, c: Context) => {
	console.error(`${err}`);
	return c.json({ error: "Internal Server Error" }, 500);
});

const port = parseInt(process.env.PORT || "5000", 10);

serve({
	fetch: app.fetch,
	port,
});

console.log(`Server is running on port ${port}`);
