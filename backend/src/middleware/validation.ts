import type { Context, Next } from "hono";
import { z } from "zod";
import { ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

/**
 * Validation middleware factory
 * @param schema - Zod schema to validate against
 * @param source - Where to get the data from ('body', 'query', 'params')
 */
export function validate(schema: z.ZodSchema, source: "body" | "query" | "params" = "body") {
	return async (c: Context, next: Next) => {
		try {
			let data;

			switch (source) {
				case "body":
					data = await c.req.json().catch(() => ({}));
					break;
				case "query":
					data = c.req.query();
					break;
				case "params":
					data = c.req.param();
					break;
				default:
					data = {};
			}

			// Validate data against schema
			const validated = schema.parse(data);

			// Store validated data for use in route handlers
			c.set(`validated${source.charAt(0).toUpperCase() + source.slice(1)}`, validated);

			await next();
		} catch (error) {
			if (error instanceof z.ZodError) {
				logger.warn("Validation failed", {
					source,
					errors: error.errors,
					path: c.req.path,
					method: c.req.method,
				});

				// Format validation errors
				const formattedErrors = error.errors.map((err) => ({
					field: err.path.join("."),
					message: err.message,
					code: err.code,
				}));

				throw new ValidationError("Validation failed", formattedErrors);
			}

			throw error;
		}
	};
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: any): any {
	if (typeof input === "string") {
		// Basic HTML entity encoding
		return input
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#x27;")
			.replace(/\//g, "&#x2F;");
	}

	if (Array.isArray(input)) {
		return input.map(sanitizeInput);
	}

	if (input && typeof input === "object") {
		const sanitized: any = {};
		for (const key in input) {
			if (Object.hasOwn(input, key)) {
				sanitized[key] = sanitizeInput(input[key]);
			}
		}
		return sanitized;
	}

	return input;
}

/**
 * Rate limiting validation
 */
export function validateRateLimit(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
	const requests = new Map<string, { count: number; resetTime: number }>();

	return async (c: Context, next: Next) => {
		const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
		const now = Date.now();

		const userRequests = requests.get(ip);

		if (userRequests) {
			if (now > userRequests.resetTime) {
				// Reset window
				userRequests.count = 1;
				userRequests.resetTime = now + windowMs;
			} else {
				userRequests.count++;

				if (userRequests.count > maxRequests) {
					logger.warn("Rate limit exceeded", { ip, count: userRequests.count });

					return c.json(
						{
							error: "Too many requests",
							retryAfter: Math.ceil((userRequests.resetTime - now) / 1000),
						},
						429,
						{
							"Retry-After": Math.ceil((userRequests.resetTime - now) / 1000).toString(),
						},
					);
				}
			}
		} else {
			requests.set(ip, { count: 1, resetTime: now + windowMs });
		}

		// Clean up old entries
		if (requests.size > 10000) {
			const expired = [];
			for (const [key, value] of requests.entries()) {
				if (now > value.resetTime) {
					expired.push(key);
				}
			}
			expired.forEach((key) => requests.delete(key));
		}

		await next();
	};
}

/**
 * Validate content type
 */
export function validateContentType(expected: string = "application/json") {
	return async (c: Context, next: Next) => {
		const contentType = c.req.header("content-type");

		if (c.req.method !== "GET" && c.req.method !== "DELETE") {
			if (!contentType || !contentType.includes(expected)) {
				logger.warn("Invalid content type", {
					expected,
					received: contentType,
					path: c.req.path,
				});

				return c.json({ error: `Content-Type must be ${expected}` }, 415);
			}
		}

		await next();
	};
}

/**
 * Get validated data from context
 */
export function getValidatedData<T>(c: Context, source: "body" | "query" | "params" = "body"): T {
	const key = `validated${source.charAt(0).toUpperCase() + source.slice(1)}`;
	return c.get(key) as T;
}
