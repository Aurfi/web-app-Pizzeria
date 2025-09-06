import type { Next } from "hono";
import jwt from "jsonwebtoken";
import { redis } from "../config/database";
import type { AppContext } from "../types/index";

interface JWTPayload {
	userId: string;
	email: string;
	iat?: number;
	exp?: number;
}

export async function authMiddleware(c: AppContext, next: Next) {
	try {
		const authHeader = c.req.header("Authorization");

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const token = authHeader.substring(7);

		const blacklisted = await redis.get(`blacklist_${token}`);
		if (blacklisted) {
			return c.json({ error: "Token has been revoked" }, 401);
		}

		const jwtSecret = process.env.JWT_SECRET;
		if (!jwtSecret) {
			return c.json({ error: "Server configuration error" }, 500);
		}
		const payload = jwt.verify(token, jwtSecret) as JWTPayload;

		c.set("userId", payload.userId);
		c.set("userEmail", payload.email);

		return await next();
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError) {
			return c.json({ error: "Token expired" }, 401);
		}
		if (error instanceof jwt.JsonWebTokenError) {
			return c.json({ error: "Invalid token" }, 401);
		}
		return c.json({ error: "Authentication failed" }, 401);
	}
}

export async function optionalAuthMiddleware(c: AppContext, next: Next) {
	try {
		const authHeader = c.req.header("Authorization");

		if (authHeader?.startsWith("Bearer ")) {
			const token = authHeader.substring(7);

			const blacklisted = await redis.get(`blacklist_${token}`);
			if (!blacklisted) {
				const jwtSecret = process.env.JWT_SECRET;
				if (jwtSecret) {
					const payload = jwt.verify(token, jwtSecret) as JWTPayload;
					c.set("userId", payload.userId);
					c.set("userEmail", payload.email);
				}
			}
		}

		return await next();
	} catch (_error) {
		return await next();
	}
}

export function generateTokens(userId: string, email: string) {
	const jwtSecret = process.env.JWT_SECRET;
	const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

	if (!jwtSecret || !jwtRefreshSecret) {
		throw new Error("JWT secrets are not configured");
	}

	const accessToken = jwt.sign({ userId, email }, jwtSecret, {
		expiresIn: process.env.JWT_EXPIRES_IN || "15m",
	} as jwt.SignOptions);

	const refreshToken = jwt.sign({ userId, email }, jwtRefreshSecret, {
		expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
	} as jwt.SignOptions);

	return { accessToken, refreshToken };
}
