import axios from "axios";
import { db } from "./database";

interface AuthTokens {
	accessToken: string;
	refreshToken: string;
}

interface User {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	phone?: string;
}

class AuthServiceClass {
	private tokens: AuthTokens | null = null;
	private user: User | null = null;
	private refreshTimer: NodeJS.Timeout | null = null;

	initialize() {
		const storedTokens = localStorage.getItem("auth_tokens");
		const storedUser = localStorage.getItem("user");

		if (storedTokens) {
			this.tokens = JSON.parse(storedTokens);
			this.setupAxiosInterceptors();
			this.scheduleTokenRefresh();
		}

		if (storedUser) {
			this.user = JSON.parse(storedUser);
		}
	}

	private setupAxiosInterceptors() {
		axios.interceptors.request.use(
			(config) => {
				if (this.tokens?.accessToken) {
					config.headers.Authorization = `Bearer ${this.tokens.accessToken}`;
				}
				return config;
			},
			(error) => Promise.reject(error),
		);

		axios.interceptors.response.use(
			(response) => response,
			async (error) => {
				const originalRequest = error.config;

				if (error.response?.status === 401 && !originalRequest._retry) {
					originalRequest._retry = true;

					try {
						await this.refreshToken();
						originalRequest.headers.Authorization = `Bearer ${this.tokens?.accessToken}`;
						return axios(originalRequest);
					} catch (refreshError) {
						this.logout();
						window.location.href = "/login";
						return Promise.reject(refreshError);
					}
				}

				return Promise.reject(error);
			},
		);
	}

	async login(email: string, password: string): Promise<User> {
		try {
			const response = await axios.post("/api/auth/login", { email, password });
			const { user, accessToken, refreshToken } = response.data;

			this.tokens = { accessToken, refreshToken };
			this.user = user;

			localStorage.setItem("auth_tokens", JSON.stringify(this.tokens));
			localStorage.setItem("user", JSON.stringify(user));

			await db.users.put(user);

			this.setupAxiosInterceptors();
			this.scheduleTokenRefresh();
			this.notifyListeners();

			return user;
		} catch (error: any) {
			throw new Error(error.response?.data?.error || "Login failed");
		}
	}

    async register(userData: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        phone?: string;
    }): Promise<User> {
        try {
            // Backend expects a single 'name' field, not first/last
            const payload: any = {
                email: userData.email,
                password: userData.password,
                name: `${userData.firstName} ${userData.lastName}`.trim(),
            };
            if (userData.phone) payload.phone = userData.phone;

            const response = await axios.post("/api/auth/register", payload);
            const { user, accessToken, refreshToken } = response.data;

			this.tokens = { accessToken, refreshToken };
			this.user = user;

			localStorage.setItem("auth_tokens", JSON.stringify(this.tokens));
			localStorage.setItem("user", JSON.stringify(user));

			await db.users.put(user);

			this.setupAxiosInterceptors();
			this.scheduleTokenRefresh();
			this.notifyListeners();

            return user;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || "Registration failed");
        }
    }

	async refreshToken(): Promise<void> {
		if (!this.tokens?.refreshToken) {
			throw new Error("No refresh token available");
		}

		try {
			const response = await axios.post("/api/auth/refresh", {
				refreshToken: this.tokens.refreshToken,
			});

			const { accessToken, refreshToken } = response.data;

			this.tokens = { accessToken, refreshToken };
			localStorage.setItem("auth_tokens", JSON.stringify(this.tokens));

			this.scheduleTokenRefresh();
		} catch (error) {
			this.logout();
			throw error;
		}
	}

	private scheduleTokenRefresh() {
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
		}

		this.refreshTimer = setTimeout(
			() => {
				this.refreshToken().catch(() => {
					this.logout();
					window.location.href = "/login";
				});
			},
			14 * 60 * 1000,
		);
	}

	async logout(): Promise<void> {
		try {
			if (this.tokens?.accessToken) {
				await axios.post("/api/auth/logout");
			}
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			this.tokens = null;
			this.user = null;

			if (this.refreshTimer) {
				clearTimeout(this.refreshTimer);
				this.refreshTimer = null;
			}

			localStorage.removeItem("auth_tokens");
			localStorage.removeItem("user");

			this.notifyListeners();
		}
	}

	isAuthenticated(): boolean {
		return !!this.tokens?.accessToken;
	}

	getUser(): User | null {
		return this.user;
	}

	async updateProfile(updates: Partial<User>): Promise<User> {
		try {
			const response = await axios.put("/api/users/profile", updates);
			const updatedUser = response.data;

			this.user = updatedUser;
			localStorage.setItem("user", JSON.stringify(updatedUser));
			await db.users.put(updatedUser);

			return updatedUser;
		} catch (error: any) {
			throw new Error(error.response?.data?.error || "Failed to update profile");
		}
	}

	async changePassword(currentPassword: string, newPassword: string): Promise<void> {
		try {
			await axios.put("/api/users/password", {
				currentPassword,
				newPassword,
			});
		} catch (error: any) {
			throw new Error(error.response?.data?.error || "Failed to change password");
		}
	}

	private listeners: Set<() => void> = new Set();

	onChange(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notifyListeners() {
		this.listeners.forEach((listener) => listener());
	}
}

export const AuthService = new AuthServiceClass();
