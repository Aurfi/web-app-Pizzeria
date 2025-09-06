import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { errorHandler } from "../../src/middleware/errorHandler";
import { securityHeaders } from "../../src/middleware/security";
import healthRoutes from "../../src/routes/health";

// Mock database connections
jest.mock("../../src/config/database", () => ({
	pool: {
		query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
	},
	redis: {
		setex: jest.fn().mockResolvedValue("OK"),
		get: jest.fn().mockResolvedValue(null),
		del: jest.fn().mockResolvedValue(1),
		ping: jest.fn().mockResolvedValue("PONG"),
	},
}));

describe("Health API Integration Tests", () => {
	let app: Hono;

	beforeAll(() => {
		// Create test app with health routes only
		app = new Hono();

		// Security middleware
		app.use("*", securityHeaders());

		// Basic middleware
		app.use("*", logger());
		app.use("*", prettyJSON());

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

		// Health routes
		app.route("/health", healthRoutes);

		app.notFound((c) => {
			return c.json({ error: "Not Found" }, 404);
		});
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("GET /", () => {
		it("should return API status", async () => {
			const req = new Request("http://localhost/");
			const response = await app.fetch(req);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body).toEqual({
				message: "FoodFlow API Server",
				version: "1.0.0",
				status: "running",
			});
		});
	});

	describe("Health Endpoints", () => {
		it("should return health status", async () => {
			const req = new Request("http://localhost/health");
			const response = await app.fetch(req);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body).toHaveProperty("status");
			expect(body).toHaveProperty("timestamp");
			expect(body).toHaveProperty("uptime");
		});

		it("should return detailed health check", async () => {
			const req = new Request("http://localhost/health/detailed");
			const response = await app.fetch(req);

			expect(response.status).toBe(200);
			const body = (await response.json()) as any;
			expect(body).toHaveProperty("status");
			expect(body).toHaveProperty("checks");
			expect(body.checks).toHaveProperty("database");
			expect(body.checks).toHaveProperty("redis");
		});
	});

	describe("404 Handling", () => {
		it("should return 404 for non-existent endpoints", async () => {
			const req = new Request("http://localhost/non-existent");
			const response = await app.fetch(req);

			expect(response.status).toBe(404);
			const body = (await response.json()) as any;
			expect(body.error).toBe("Not Found");
		});
	});

	describe("CORS Headers", () => {
		it("should include proper CORS headers", async () => {
			const req = new Request("http://localhost/", {
				method: "OPTIONS",
				headers: {
					Origin: "http://localhost:3000",
					"Access-Control-Request-Method": "GET",
				},
			});
			const response = await app.fetch(req);

			expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
			expect(response.headers.get("access-control-allow-methods")).toContain("GET");
			expect(response.headers.get("access-control-allow-credentials")).toBe("true");
		});
	});

	describe("Security Headers", () => {
		it("should include security headers", async () => {
			const req = new Request("http://localhost/");
			const response = await app.fetch(req);

			expect(response.headers.get("x-content-type-options")).toBe("nosniff");
			expect(response.headers.get("x-frame-options")).toBe("DENY");
			expect(response.headers.get("x-xss-protection")).toBe("1; mode=block");
			// STS header might not be set in test environment
			const stsHeader = response.headers.get("strict-transport-security");
			if (stsHeader) {
				expect(stsHeader).toContain("max-age=");
			}
		});
	});
});
