import Redis from "ioredis";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import { AuthService } from "../../../src/services/auth.service";

// Mock dependencies
jest.mock("pg");
jest.mock("ioredis");
jest.mock("axios");
jest.mock("../../../src/utils/logger");

describe("AuthService", () => {
	let authService: AuthService;
	let mockDb: jest.Mocked<Pool>;
	let mockRedis: jest.Mocked<Redis>;

	beforeEach(() => {
		// Create mock instances
		mockDb = new Pool() as jest.Mocked<Pool>;
		mockRedis = new Redis() as jest.Mocked<Redis>;

		// Setup Redis mock methods
		mockRedis.setex = jest.fn().mockResolvedValue("OK");
		mockRedis.get = jest.fn().mockResolvedValue(null);
		mockRedis.del = jest.fn().mockResolvedValue(1);

		// Create service instance
		authService = new AuthService(mockDb, mockRedis);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("generateTokens", () => {
		it("should generate access and refresh tokens", async () => {
			const userId = "user-123";
			const email = "test@example.com";
			const roles = ["user"];

			const { accessToken, refreshToken } = await authService.generateTokens(userId, email, roles);

			expect(accessToken).toBeDefined();
			expect(refreshToken).toBeDefined();

			// Verify token contents
			const decodedAccess = jwt.decode(accessToken) as any;
			expect(decodedAccess.userId).toBe(userId);
			expect(decodedAccess.email).toBe(email);
			expect(decodedAccess.roles).toEqual(roles);

			// Verify refresh token was stored in Redis
			expect(mockRedis.setex).toHaveBeenCalled();
		});

		it("should include SSO provider when specified", async () => {
			const { accessToken } = await authService.generateTokens(
				"user-123",
				"test@example.com",
				["user"],
				"authentik",
			);

			const decoded = jwt.decode(accessToken) as any;
			expect(decoded.ssoProvider).toBe("authentik");
		});
	});

	describe("verifyToken", () => {
		it("should verify a valid token", async () => {
			const payload = {
				userId: "user-123",
				email: "test@example.com",
				iss: "foodflow-api",
				aud: "foodflow-app",
			};

			const token = jwt.sign(payload, process.env.JWT_SECRET!, {
				expiresIn: "1h",
			});

			const result = await authService.verifyToken(token);

			expect(result.userId).toBe(payload.userId);
			expect(result.email).toBe(payload.email);
		});

		it("should throw error for invalid token", async () => {
			const invalidToken = "invalid.token.here";

			await expect(authService.verifyToken(invalidToken)).rejects.toThrow(
				"Invalid or expired token",
			);
		});

		it("should throw error for expired token", async () => {
			const payload = {
				userId: "user-123",
				email: "test@example.com",
				iss: "foodflow-api",
				aud: "foodflow-app",
			};

			const expiredToken = jwt.sign(payload, process.env.JWT_SECRET!, {
				expiresIn: "-1h", // Already expired
			});

			await expect(authService.verifyToken(expiredToken)).rejects.toThrow(
				"Invalid or expired token",
			);
		});
	});

	describe("refreshAccessToken", () => {
		it("should refresh a valid refresh token", async () => {
			const sessionId = "session-123";
			const userId = "user-123";
			const email = "test@example.com";

			const refreshToken = jwt.sign(
				{
					userId,
					email,
					sessionId,
					type: "refresh",
				},
				process.env.JWT_SECRET!,
				{ expiresIn: "7d" },
			);

			// Mock Redis to return stored refresh token
			mockRedis.get.mockResolvedValueOnce(JSON.stringify({ userId, email, refreshToken }));

			const result = await authService.refreshAccessToken(refreshToken);

			expect(result.accessToken).toBeDefined();
			expect(result.refreshToken).toBeDefined();
			expect(mockRedis.get).toHaveBeenCalledWith(`refresh_token:${sessionId}`);
		});

		it("should reject invalid refresh token", async () => {
			const invalidRefreshToken = jwt.sign(
				{
					userId: "user-123",
					email: "test@example.com",
					type: "access", // Wrong type
				},
				process.env.JWT_SECRET!,
			);

			await expect(authService.refreshAccessToken(invalidRefreshToken)).rejects.toThrow(
				"Invalid refresh token",
			);
		});

		it("should reject refresh token not in Redis", async () => {
			const refreshToken = jwt.sign(
				{
					userId: "user-123",
					email: "test@example.com",
					sessionId: "session-123",
					type: "refresh",
				},
				process.env.JWT_SECRET!,
			);

			// Mock Redis to return null (token not found)
			mockRedis.get.mockResolvedValueOnce(null);

			await expect(authService.refreshAccessToken(refreshToken)).rejects.toThrow(
				"Invalid refresh token",
			);
		});
	});

	describe("logout", () => {
		it("should delete refresh token from Redis", async () => {
			const sessionId = "session-123";

			await authService.logout(sessionId);

			expect(mockRedis.del).toHaveBeenCalledWith(`refresh_token:${sessionId}`);
		});
	});

	describe("getSSOAuthorizationUrl", () => {
		it("should generate correct SSO authorization URL", () => {
			// Enable SSO for this test
			process.env.SSO_ENABLED = "true";
			process.env.SSO_CLIENT_ID = "test-client";
			process.env.SSO_REDIRECT_URI = "http://localhost:3000/callback";
			process.env.SSO_AUTHORIZATION_ENDPOINT = "https://sso.example.com/authorize";

			// Recreate service with SSO enabled
			authService = new AuthService(mockDb, mockRedis);

			const state = "random-state-123";
			const url = authService.getSSOAuthorizationUrl(state);

			expect(url).toContain("https://sso.example.com/authorize");
			expect(url).toContain("client_id=test-client");
			expect(url).toContain(`state=${state}`);
			expect(url).toContain("response_type=code");
			expect(url).toContain("scope=openid+email+profile");
		});
	});
});
