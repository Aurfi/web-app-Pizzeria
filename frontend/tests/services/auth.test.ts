import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authService from "../../src/services/auth";

vi.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Auth Service", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	describe("login", () => {
		it("should login successfully and store tokens", async () => {
			const mockResponse = {
				data: {
					user: { id: "1", email: "test@example.com", name: "Test User" },
					accessToken: "access-token-123",
					refreshToken: "refresh-token-123",
				},
			};

			mockedAxios.post.mockResolvedValueOnce(mockResponse);

			const result = await authService.login("test@example.com", "password123");

			expect(mockedAxios.post).toHaveBeenCalledWith("/api/auth/login", {
				email: "test@example.com",
				password: "password123",
			});

			expect(localStorage.setItem).toHaveBeenCalledWith(
				"user",
				JSON.stringify(mockResponse.data.user),
			);
			expect(localStorage.setItem).toHaveBeenCalledWith("accessToken", "access-token-123");
			expect(localStorage.setItem).toHaveBeenCalledWith("refreshToken", "refresh-token-123");

			expect(result).toEqual(mockResponse.data);
		});

		it("should handle login failure", async () => {
			mockedAxios.post.mockRejectedValueOnce(new Error("Invalid credentials"));

			await expect(authService.login("test@example.com", "wrong-password")).rejects.toThrow(
				"Invalid credentials",
			);

			expect(localStorage.setItem).not.toHaveBeenCalled();
		});
	});

	describe("register", () => {
		it("should register successfully", async () => {
			const mockResponse = {
				data: {
					user: { id: "1", email: "new@example.com", name: "New User" },
					accessToken: "access-token-new",
					refreshToken: "refresh-token-new",
				},
			};

			mockedAxios.post.mockResolvedValueOnce(mockResponse);

			const result = await authService.register("new@example.com", "password123", "New User");

			expect(mockedAxios.post).toHaveBeenCalledWith("/api/auth/register", {
				email: "new@example.com",
				password: "password123",
				name: "New User",
			});

			expect(localStorage.setItem).toHaveBeenCalledWith(
				"user",
				JSON.stringify(mockResponse.data.user),
			);
			expect(result).toEqual(mockResponse.data);
		});
	});

	describe("logout", () => {
		it("should logout and clear storage", async () => {
			localStorage.setItem("accessToken", "token-123");
			mockedAxios.post.mockResolvedValueOnce({ data: { message: "Logged out" } });

			await authService.logout();

			expect(mockedAxios.post).toHaveBeenCalledWith("/api/auth/logout");
			expect(localStorage.removeItem).toHaveBeenCalledWith("user");
			expect(localStorage.removeItem).toHaveBeenCalledWith("accessToken");
			expect(localStorage.removeItem).toHaveBeenCalledWith("refreshToken");
		});

		it("should clear storage even if API call fails", async () => {
			mockedAxios.post.mockRejectedValueOnce(new Error("Network error"));

			await authService.logout();

			expect(localStorage.removeItem).toHaveBeenCalledWith("user");
			expect(localStorage.removeItem).toHaveBeenCalledWith("accessToken");
			expect(localStorage.removeItem).toHaveBeenCalledWith("refreshToken");
		});
	});

	describe("getCurrentUser", () => {
		it("should return current user from storage", () => {
			const user = { id: "1", email: "test@example.com", name: "Test User" };
			localStorage.getItem.mockReturnValueOnce(JSON.stringify(user));

			const result = authService.getCurrentUser();

			expect(localStorage.getItem).toHaveBeenCalledWith("user");
			expect(result).toEqual(user);
		});

		it("should return null if no user in storage", () => {
			localStorage.getItem.mockReturnValueOnce(null);

			const result = authService.getCurrentUser();

			expect(result).toBeNull();
		});
	});

	describe("getAccessToken", () => {
		it("should return access token from storage", () => {
			localStorage.getItem.mockReturnValueOnce("access-token-123");

			const result = authService.getAccessToken();

			expect(localStorage.getItem).toHaveBeenCalledWith("accessToken");
			expect(result).toBe("access-token-123");
		});
	});

	describe("isAuthenticated", () => {
		it("should return true if access token exists", () => {
			localStorage.getItem.mockReturnValueOnce("access-token-123");

			const result = authService.isAuthenticated();

			expect(result).toBe(true);
		});

		it("should return false if no access token", () => {
			localStorage.getItem.mockReturnValueOnce(null);

			const result = authService.isAuthenticated();

			expect(result).toBe(false);
		});
	});

	describe("refreshToken", () => {
		it("should refresh tokens successfully", async () => {
			localStorage.getItem.mockReturnValueOnce("refresh-token-old");

			const mockResponse = {
				data: {
					accessToken: "access-token-new",
					refreshToken: "refresh-token-new",
				},
			};

			mockedAxios.post.mockResolvedValueOnce(mockResponse);

			const result = await authService.refreshToken();

			expect(mockedAxios.post).toHaveBeenCalledWith("/api/auth/refresh", {
				refreshToken: "refresh-token-old",
			});

			expect(localStorage.setItem).toHaveBeenCalledWith("accessToken", "access-token-new");
			expect(localStorage.setItem).toHaveBeenCalledWith("refreshToken", "refresh-token-new");

			expect(result).toEqual(mockResponse.data);
		});

		it("should throw error if no refresh token", async () => {
			localStorage.getItem.mockReturnValueOnce(null);

			await expect(authService.refreshToken()).rejects.toThrow("No refresh token available");
		});
	});

	describe("setupAxiosInterceptors", () => {
		it("should add auth header to requests", () => {
			const mockInterceptor = vi.fn();
			mockedAxios.interceptors.request.use = mockInterceptor;

			localStorage.getItem.mockReturnValue("access-token-123");

			authService.setupAxiosInterceptors();

			expect(mockInterceptor).toHaveBeenCalled();
		});
	});
});
