import crypto from "node:crypto";
import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { logger } from "../utils/logger";

const CSRF_HEADER = "x-csrf-token";
const CSRF_COOKIE = "csrf-token";
const TOKEN_LENGTH = 32;

/**
 * Generate a CSRF token
 */
function generateToken(): string {
	return crypto.randomBytes(TOKEN_LENGTH).toString("hex");
}

/**
 * CSRF protection middleware
 * Implements Double Submit Cookie pattern
 */
export function csrfProtection(options: { excludePaths?: string[]; cookieOptions?: any } = {}) {
	const { excludePaths = ["/auth/login", "/auth/register", "/auth/refresh"] } = options;

	return async (c: Context, next: Next) => {
		const path = c.req.path;
		const method = c.req.method;

		// Skip CSRF check for excluded paths
		if (excludePaths.some((p) => path.startsWith(p))) {
			return next();
		}

		// Skip CSRF for safe methods
		if (["GET", "HEAD", "OPTIONS"].includes(method)) {
			// Generate and set token for subsequent requests
			const token = getCookie(c, CSRF_COOKIE) || generateToken();
			setCookie(c, CSRF_COOKIE, token, {
				path: "/",
				httpOnly: true,
				sameSite: "Strict",
				secure: process.env.NODE_ENV === "production",
			});
			c.header("X-CSRF-Token", token);
			return next();
		}

		// For state-changing methods, verify CSRF token
		const cookieToken = getCookie(c, CSRF_COOKIE);
		const headerToken = c.req.header(CSRF_HEADER);

		if (!cookieToken || !headerToken) {
			logger.warn("CSRF token missing", {
				path,
				method,
				hasCookie: !!cookieToken,
				hasHeader: !!headerToken,
				ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
			});

			return c.json({ error: "CSRF token missing" }, 403);
		}

		if (cookieToken !== headerToken) {
			logger.warn("CSRF token mismatch", {
				path,
				method,
				ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
			});

			return c.json({ error: "CSRF token invalid" }, 403);
		}

		// Token is valid, continue
		await next();
	};
}

/**
 * Generate CSRF token endpoint
 * Clients should call this to get a token before making state-changing requests
 */
export function csrfTokenEndpoint() {
	return async (c: Context) => {
		const token = generateToken();

		// Set cookie
		setCookie(c, CSRF_COOKIE, token, {
			path: "/",
			httpOnly: true,
			sameSite: "Strict",
			secure: process.env.NODE_ENV === "production",
		});

		// Return token in response
		return c.json({ csrfToken: token });
	};
}

/**
 * Helper to get CSRF token from request
 */
export function getCSRFToken(c: Context): string | undefined {
	return getCookie(c, CSRF_COOKIE);
}
