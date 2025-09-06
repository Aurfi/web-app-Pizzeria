import bcrypt from "bcrypt";
import { Hono } from "hono";
import jwt from "jsonwebtoken";
import authRoutes from "../../src/routes/auth";

// Mock dependencies
jest.mock("bcrypt");
jest.mock("jsonwebtoken");
jest.mock("../../src/config/database", () => ({
	pool: {
		query: jest.fn(),
	},
	redis: {
		setex: jest.fn(),
		get: jest.fn(),
		del: jest.fn(),
	},
}));

jest.mock("../../src/middleware/auth", () => ({
	generateTokens: jest.fn().mockReturnValue({
		accessToken: "mock-access-token",
		refreshToken: "mock-refresh-token",
	}),
}));

jest.mock("../../src/middleware/validation", () => ({
	validate: (schema: any) => (c: any, next: any) => next(),
	getValidatedData: jest.fn(),
}));

import { pool, redis } from "../../src/config/database";
import { generateTokens } from "../../src/middleware/auth";
import { getValidatedData } from "../../src/middleware/validation";

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockPool = pool as jest.Mocked<typeof pool>;
const mockRedis = redis as jest.Mocked<typeof redis>;
const mockGenerateTokens = generateTokens as jest.MockedFunction<typeof generateTokens>;
const mockGetValidatedData = getValidatedData as jest.MockedFunction<typeof getValidatedData>;

describe("Auth Routes", () => {
	let app: Hono;

	beforeEach(() => {
		app = new Hono();
		app.route("/api/auth", authRoutes);
		jest.clearAllMocks();
	});

	describe("POST /register", () => {
		const mockUserData = {
			email: "test@example.com",
			password: "password123",
			name: "John Doe",
			phone: "+1234567890",
		};

		it("should register a new user successfully", async () => {
			mockGetValidatedData.mockReturnValue(mockUserData);
			mockPool.query
				.mockResolvedValueOnce({ rows: [] }) // No existing user
				.mockResolvedValueOnce({
					rows: [
						{
							id: 1,
							email: "test@example.com",
							first_name: "John",
							last_name: "Doe",
							phone: "+1234567890",
							created_at: new Date(),
						},
					],
				});

			mockBcrypt.hash.mockResolvedValue("hashed-password" as never);
			mockRedis.setex.mockResolvedValue("OK" as never);

			const res = await app.request("/api/auth/register", {
				method: "POST",
				body: JSON.stringify(mockUserData),
				headers: { "Content-Type": "application/json" },
			});

			expect(res.status).toBe(201);
			const body = await res.json();
			expect(body).toHaveProperty("user");
			expect(body).toHaveProperty("accessToken");
			expect(body).toHaveProperty("refreshToken");
			expect(body.user.email).toBe(mockUserData.email);
		});

		it("should return 409 if email already exists", async () => {
			mockGetValidatedData.mockReturnValue(mockUserData);
			mockPool.query.mockResolvedValue({
				rows: [{ id: 1 }],
			});

			const res = await app.request("/api/auth/register", {
				method: "POST",
				body: JSON.stringify(mockUserData),
				headers: { "Content-Type": "application/json" },
			});

			expect(res.status).toBe(409);
			const body = await res.json();
			expect(body.error).toBe("Email already exists");
		});

		it("should handle registration errors", async () => {
			mockGetValidatedData.mockReturnValue(mockUserData);
			mockPool.query.mockRejectedValue(new Error("Database error"));

			const res = await app.request("/api/auth/register", {
				method: "POST",
				body: JSON.stringify(mockUserData),
				headers: { "Content-Type": "application/json" },
			});

			expect(res.status).toBe(500);
			const body = await res.json();
			expect(body.error).toBe("Registration failed");
		});
	});

	describe("POST /login", () => {
		const mockLoginData = {
			email: "test@example.com",
			password: "password123",
		};

		const mockUser = {
			id: 1,
			email: "test@example.com",
			password_hash: "hashed-password",
			first_name: "John",
			last_name: "Doe",
			phone: "+1234567890",
			role: "customer",
		};

		it("should login user successfully", async () => {
			mockGetValidatedData.mockReturnValue(mockLoginData);
			mockPool.query.mockResolvedValue({
				rows: [mockUser],
			});
			mockBcrypt.compare.mockResolvedValue(true as never);
			mockRedis.setex.mockResolvedValue("OK" as never);

			const res = await app.request("/api/auth/login", {
				method: "POST",
				body: JSON.stringify(mockLoginData),
				headers: { "Content-Type": "application/json" },
			});

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body).toHaveProperty("user");
			expect(body).toHaveProperty("accessToken");
			expect(body).toHaveProperty("refreshToken");
			expect(body.user.email).toBe(mockLoginData.email);
		});

		it("should return 401 if user not found", async () => {
			mockGetValidatedData.mockReturnValue(mockLoginData);
			mockPool.query.mockResolvedValue({ rows: [] });

			const res = await app.request("/api/auth/login", {
				method: "POST",
				body: JSON.stringify(mockLoginData),
				headers: { "Content-Type": "application/json" },
			});

			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("Invalid credentials");
		});

		it("should return 401 if password is invalid", async () => {
			mockGetValidatedData.mockReturnValue(mockLoginData);
			mockPool.query.mockResolvedValue({
				rows: [mockUser],
			});
			mockBcrypt.compare.mockResolvedValue(false as never);

			const res = await app.request("/api/auth/login", {
				method: "POST",
				body: JSON.stringify(mockLoginData),
				headers: { "Content-Type": "application/json" },
			});

			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("Invalid credentials");
		});
	});

	describe("POST /refresh", () => {
		const mockRefreshToken = "valid-refresh-token";
		const mockPayload = { userId: 1, email: "test@example.com" };

		beforeEach(() => {
			process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
		});

		it("should refresh tokens successfully", async () => {
			mockJwt.verify.mockReturnValue(mockPayload as any);
			mockRedis.get.mockResolvedValue(mockRefreshToken);
			mockRedis.setex.mockResolvedValue("OK" as never);

			const res = await app.request("/api/auth/refresh", {
				method: "POST",
				body: JSON.stringify({ refreshToken: mockRefreshToken }),
				headers: { "Content-Type": "application/json" },
			});

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body).toHaveProperty("accessToken");
			expect(body).toHaveProperty("refreshToken");
		});

		it("should return 400 if refresh token is missing", async () => {
			const res = await app.request("/api/auth/refresh", {
				method: "POST",
				body: JSON.stringify({}),
				headers: { "Content-Type": "application/json" },
			});

			expect(res.status).toBe(400);
			const body = await res.json();
			expect(body.error).toBe("Refresh token is required");
		});

		it("should return 401 if refresh token is invalid", async () => {
			mockJwt.verify.mockImplementation(() => {
				throw new jwt.JsonWebTokenError("Invalid token");
			});

			const res = await app.request("/api/auth/refresh", {
				method: "POST",
				body: JSON.stringify({ refreshToken: "invalid-token" }),
				headers: { "Content-Type": "application/json" },
			});

			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("Invalid refresh token");
		});

		it("should return 401 if stored token does not match", async () => {
			mockJwt.verify.mockReturnValue(mockPayload as any);
			mockRedis.get.mockResolvedValue("different-token");

			const res = await app.request("/api/auth/refresh", {
				method: "POST",
				body: JSON.stringify({ refreshToken: mockRefreshToken }),
				headers: { "Content-Type": "application/json" },
			});

			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("Invalid refresh token");
		});
	});

	describe("POST /logout", () => {
		const mockToken = "valid-access-token";
		const mockPayload = { userId: 1, email: "test@example.com" };

		beforeEach(() => {
			process.env.JWT_SECRET = "test-secret";
		});

		it("should logout successfully with valid token", async () => {
			mockJwt.verify.mockReturnValue(mockPayload as any);
			mockRedis.setex.mockResolvedValue("OK" as never);
			mockRedis.del.mockResolvedValue(1);

			const res = await app.request("/api/auth/logout", {
				method: "POST",
				headers: { Authorization: `Bearer ${mockToken}` },
			});

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.message).toBe("Logged out successfully");
			expect(mockRedis.setex).toHaveBeenCalledWith(`blacklist_${mockToken}`, 60 * 60 * 24, "true");
			expect(mockRedis.del).toHaveBeenCalledWith(`refresh_${mockPayload.userId}`);
		});

		it("should logout successfully without token", async () => {
			const res = await app.request("/api/auth/logout", {
				method: "POST",
			});

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.message).toBe("Logged out successfully");
		});

		it("should logout successfully even with invalid token", async () => {
			mockJwt.verify.mockImplementation(() => {
				throw new jwt.JsonWebTokenError("Invalid token");
			});

			const res = await app.request("/api/auth/logout", {
				method: "POST",
				headers: { Authorization: "Bearer invalid-token" },
			});

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.message).toBe("Logged out successfully");
		});
	});
});
