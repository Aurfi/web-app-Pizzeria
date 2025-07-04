import type { Context, Next } from "hono";
import { AppError, type ErrorResponse } from "../utils/errors";
import { logger } from "../utils/logger";

export async function errorHandler(c: Context, next: Next) {
	try {
		await next();
	} catch (error) {
		return handleError(error, c);
	}
	return;
}

function handleError(error: unknown, c: Context) {
	const requestId = c.get("requestId") || generateRequestId();
	const path = c.req.path;

	let appError: AppError;

	if (error instanceof AppError) {
		appError = error;
	} else if (error instanceof Error) {
		// Handle known error types
		if (error.message.includes("duplicate key")) {
			appError = new AppError("Resource already exists", 409, "DUPLICATE_RESOURCE");
		} else if (error.message.includes("violates foreign key constraint")) {
			appError = new AppError("Invalid reference", 400, "INVALID_REFERENCE");
		} else if (error.message.includes("JWT")) {
			appError = new AppError("Authentication failed", 401, "JWT_ERROR");
		} else {
			appError = new AppError(
				process.env.NODE_ENV === "production" ? "Internal server error" : error.message,
				500,
				"INTERNAL_ERROR",
				process.env.NODE_ENV === "production" ? undefined : { originalError: error.message },
			);
		}
	} else {
		appError = new AppError("Unknown error occurred", 500, "UNKNOWN_ERROR");
	}

	// Log error
	const logLevel = appError.statusCode >= 500 ? "error" : "warn";
	logger[logLevel]("Request error", {
		requestId,
		path,
		method: c.req.method,
		statusCode: appError.statusCode,
		code: appError.code,
		message: appError.message,
		details: appError.details,
		stack: appError.statusCode >= 500 ? appError.stack : undefined,
		isOperational: appError.isOperational,
	});

	// Send error response
	const errorResponse: ErrorResponse = {
		error: {
			message: appError.message,
			code: appError.code,
			statusCode: appError.statusCode,
			details: process.env.NODE_ENV === "production" ? undefined : appError.details,
			timestamp: new Date().toISOString(),
			path,
			requestId,
		},
	};

	return c.json(errorResponse, appError.statusCode as any);
}

function generateRequestId(): string {
	return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Async error wrapper for route handlers
export function asyncHandler(fn: Function) {
	return async (c: Context, next: Next) => {
		try {
			return await fn(c, next);
		} catch (error) {
			return handleError(error, c);
		}
	};
}
