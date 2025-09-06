import bcrypt from "bcrypt";
import { Hono } from "hono";
import jwt from "jsonwebtoken";
import { pool, redis } from "../config/database";
import { generateTokens } from "../middleware/auth";
import { getValidatedData, validate } from "../middleware/validation";
import {
	type LoginInput,
	loginSchema,
	type RegisterInput,
	registerSchema,
} from "../schemas/validation";
import type { AppContext } from "../types/index";

const auth = new Hono();

auth.post("/register", validate(registerSchema), async (c: AppContext) => {
	try {
		const { email, password, name, phone } = getValidatedData<RegisterInput>(c);

		const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email]);

		if (existingUser.rows.length > 0) {
			return c.json({ error: "Email already exists" }, 409);
		}

		const passwordHash = await bcrypt.hash(password, 10);

		// Split name into first and last name
		const nameParts = name.split(" ");
		const firstName = nameParts[0];
		const lastName = nameParts.slice(1).join(" ") || "";

		const result = await pool.query(
			`INSERT INTO users (email, password_hash, first_name, last_name, phone) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, first_name, last_name, phone, created_at`,
			[email, passwordHash, firstName, lastName, phone || null],
		);

		const user = result.rows[0];
		const { accessToken, refreshToken } = generateTokens(user.id, user.email);

		await redis.setex(`refresh_${user.id}`, 7 * 24 * 60 * 60, refreshToken);

		return c.json(
			{
				user: {
					id: user.id,
					email: user.email,
					firstName: user.first_name,
					lastName: user.last_name,
					phone: user.phone,
				},
				accessToken,
				refreshToken,
			},
			201,
		);
	} catch (error) {
		console.error("Registration error:", error);
		return c.json({ error: "Registration failed" }, 500);
	}
});

auth.post("/login", validate(loginSchema), async (c: AppContext) => {
	try {
		const { email, password } = getValidatedData<LoginInput>(c);

		const result = await pool.query(
			"SELECT id, email, password_hash, first_name, last_name, phone FROM users WHERE email = $1",
			[email],
		);

		if (result.rows.length === 0) {
			return c.json({ error: "Invalid credentials" }, 401);
		}

		const user = result.rows[0];
		const validPassword = await bcrypt.compare(password, user.password_hash);

		if (!validPassword) {
			return c.json({ error: "Invalid credentials" }, 401);
		}

		const { accessToken, refreshToken } = generateTokens(user.id, user.email);

		await redis.setex(`refresh_${user.id}`, 7 * 24 * 60 * 60, refreshToken);

		return c.json({
			user: {
				id: user.id,
				email: user.email,
				firstName: user.first_name,
				lastName: user.last_name,
				phone: user.phone,
				role: "admin",
			},
			accessToken,
			refreshToken,
		});
	} catch (error) {
		console.error("Login error:", error);
		return c.json({ error: "Login failed" }, 500);
	}
});

auth.post("/refresh", async (c: AppContext) => {
	try {
		const { refreshToken } = await c.req.json();

		if (!refreshToken) {
			return c.json({ error: "Refresh token is required" }, 400);
		}

		const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

		const storedToken = await redis.get(`refresh_${payload.userId}`);

		if (storedToken !== refreshToken) {
			return c.json({ error: "Invalid refresh token" }, 401);
		}

		const { accessToken, refreshToken: newRefreshToken } = generateTokens(
			payload.userId,
			payload.email,
		);

		await redis.setex(`refresh_${payload.userId}`, 7 * 24 * 60 * 60, newRefreshToken);

		return c.json({
			accessToken,
			refreshToken: newRefreshToken,
		});
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError) {
			return c.json({ error: "Refresh token expired" }, 401);
		}
		return c.json({ error: "Invalid refresh token" }, 401);
	}
});

auth.post("/logout", async (c: AppContext) => {
	try {
		const authHeader = c.req.header("Authorization");

		if (authHeader?.startsWith("Bearer ")) {
			const token = authHeader.substring(7);
			const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

			await redis.setex(`blacklist_${token}`, 60 * 60 * 24, "true");

			await redis.del(`refresh_${payload.userId}`);
		}

		return c.json({ message: "Logged out successfully" });
	} catch (_error) {
		return c.json({ message: "Logged out successfully" });
	}
});

export default auth;
