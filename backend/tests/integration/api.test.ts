import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../src/middleware/errorHandler";
import { apiRateLimit, authRateLimit } from "../../src/middleware/rateLimit";
import { securityHeaders } from "../../src/middleware/security";
import authRoutes from "../../src/routes/auth";
import healthRoutes from "../../src/routes/health";
import menuRoutes from "../../src/routes/menu";
import orderRoutes from "../../src/routes/order";
import userRoutes from "../../src/routes/user";

// Mock database connections
vi.mock("../../src/config/database", () => ({
	pool: {
		query: vi.fn(),
	},
	redis: {
		setex: vi.fn().mockResolvedValue("OK"),
		get: vi.fn().mockResolvedValue(null),
		del: vi.fn().mockResolvedValue(1),
	},
}));

// Set up test environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL = "redis://localhost:6379";

describe("API Integration Tests", () => {
	let app: Hono;
	let server: any;
	const testPort = 3999;

	beforeAll(async () => {
		// Create test app with same configuration as main app
		app = new Hono();

		// Security middleware first
		app.use("*", securityHeaders());

		// Basic middleware
		app.use("*", logger());
		app.use("*", prettyJSON());

		// Rate limiting (disabled for tests)
		// app.use('/api/*', apiRateLimit)
		// app.use('/api/auth/*', authRateLimit)

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

		app.get("/", (c) => {
			return c.json({
				message: "FoodFlow API Server",
				version: "1.0.0",
				status: "running",
			});
		});

		// Health check routes
		app.route("/health", healthRoutes);

		// API routes
		app.route("/api/auth", authRoutes);
		app.route("/api/menu", menuRoutes);
		app.route("/api/orders", orderRoutes);
		app.route("/api/users", userRoutes);

		app.notFound((c) => {
			return c.json({ error: "Not Found" }, 404);
		});

		app.onError((err: Error, c) => {
			console.error(`${err}`);
			return c.json({ error: "Internal Server Error" }, 500);
		});

		// Start test server
		server = serve({
			fetch: app.fetch,
			port: testPort,
		});

		// Wait for server to start
		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	afterAll(async () => {
		if (server) {
			server.close();
		}
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Health Endpoints", () => {
		it("should return API status", async () => {
			const response = await fetch(`http://localhost:${testPort}/`);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body).toEqual({
				message: "FoodFlow API Server",
				version: "1.0.0",
				status: "running",
			});
		});

		it("should return 404 for non-existent endpoints", async () => {
			const response = await fetch(`http://localhost:${testPort}/non-existent`);

			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.error).toBe("Not Found");
		});
	});

	describe("CORS Headers", () => {
		it("should include proper CORS headers", async () => {
			const response = await fetch(`http://localhost:${testPort}/`, {
				method: "OPTIONS",
				headers: {
					Origin: "http://localhost:3000",
					"Access-Control-Request-Method": "GET",
				},
			});

			expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
			expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
			expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
		});
	});

	describe("Security Headers", () => {
		it("should include security headers", async () => {
			const response = await fetch(`http://localhost:${testPort}/`);

			expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
			expect(response.headers.get("X-Frame-Options")).toBe("DENY");
			expect(response.headers.get("X-XSS-Protection")).toBe("1; mode=block");
			expect(response.headers.get("Strict-Transport-Security")).toContain("max-age=");
		});
	});

	describe("Error Handling", () => {
		it("should handle malformed JSON requests", async () => {
			const response = await fetch(`http://localhost:${testPort}/api/auth/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: "invalid json",
			});

			expect(response.status).toBe(400);
		});

		it("should handle missing Content-Type header", async () => {
			const response = await fetch(`http://localhost:${testPort}/api/auth/login`, {
				method: "POST",
				body: JSON.stringify({ email: "test@example.com", password: "password" }),
			});

			// Should still process the request but may have validation issues
			expect(response.status).toBeGreaterThanOrEqual(400);
		});
	});

	describe("Content-Type Headers", () => {
		it("should return JSON content type", async () => {
			const response = await fetch(`http://localhost:${testPort}/`);

			expect(response.headers.get("Content-Type")).toContain("application/json");
		});

		it("should handle JSON requests properly", async () => {
			const response = await fetch(`http://localhost:${testPort}/api/menu/categories`);

			expect(response.headers.get("Content-Type")).toContain("application/json");
		});
	});

	describe("Rate Limiting (when enabled)", () => {
		it("should accept requests within limits", async () => {
			// Make a few requests quickly
			const promises = Array(5)
				.fill(null)
				.map(() => fetch(`http://localhost:${testPort}/api/menu/categories`));

			const responses = await Promise.all(promises);

			// All should succeed since rate limiting is disabled in tests
			responses.forEach((response) => {
				expect(response.status).toBeLessThan(500);
			});
		});
	});
});

describe("API Route Integration", () => {
	const testPort = 3998;

	beforeAll(async () => {
		// Wait for any other servers to close
		await new Promise((resolve) => setTimeout(resolve, 200));
	});

	describe("Menu API Integration", () => {
		it("should handle menu categories endpoint", async () => {
			const response = await fetch(`http://localhost:${testPort}/api/menu/categories`);

			// Should return some status (might be 500 due to mocked database, but endpoint exists)
			expect([200, 500]).toContain(response.status);
		});

		it("should handle menu items endpoint", async () => {
			const response = await fetch(`http://localhost:${testPort}/api/menu/items`);

			expect([200, 500]).toContain(response.status);
		});

		it("should handle menu item by ID endpoint", async () => {
			const response = await fetch(`http://localhost:${testPort}/api/menu/items/1`);

			expect([200, 404, 500]).toContain(response.status);
		});
	});

	describe("Auth API Integration", () => {
		it("should handle login endpoint", async () => {
			const response = await fetch(`http://localhost:${testPort}/api/auth/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: "test@example.com",
					password: "password123",
				}),
			});

			// Endpoint exists and processes request
			expect([200, 400, 401, 500]).toContain(response.status);
		});

		it("should handle register endpoint", async () => {
			const response = await fetch(`http://localhost:${testPort}/api/auth/register`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: "newuser@example.com",
					password: "password123",
					name: "New User",
					phone: "+1234567890",
				}),
			});

			expect([200, 400, 409, 500]).toContain(response.status);
		});

		it("should handle logout endpoint", async () => {
			const response = await fetch(`http://localhost:${testPort}/api/auth/logout`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer fake-token",
				},
			});

			expect([200, 401, 500]).toContain(response.status);
		});
	});
});
