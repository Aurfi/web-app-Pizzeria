import type { Context, Next } from "hono";

export function securityHeaders() {
	return async (c: Context, next: Next) => {
		await next();

		// Security headers (basic helmet.js equivalent)
		c.header("X-Content-Type-Options", "nosniff");
		c.header("X-Frame-Options", "DENY");
		c.header("X-XSS-Protection", "1; mode=block");
		c.header("Referrer-Policy", "strict-origin-when-cross-origin");
		c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

		// Content Security Policy for demo
		c.header(
			"Content-Security-Policy",
			"default-src 'self'; " +
				"script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
				"style-src 'self' 'unsafe-inline'; " +
				"img-src 'self' data: https:; " +
				"connect-src 'self' ws: wss:; " +
				"font-src 'self' data:; " +
				"object-src 'none'; " +
				"base-uri 'self'; " +
				"form-action 'self';",
		);

		// Remove server identification
		c.header("Server", "PWA Demo Server");

		// Prevent caching of sensitive endpoints
		if (c.req.path.startsWith("/auth") || c.req.path.startsWith("/api/user")) {
			c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
			c.header("Pragma", "no-cache");
			c.header("Expires", "0");
			c.header("Surrogate-Control", "no-store");
		}
	};
}
