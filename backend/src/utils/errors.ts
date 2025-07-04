export class AppError extends Error {
	public readonly statusCode: number;
	public readonly isOperational: boolean;
	public readonly code?: string;
	public readonly details?: any;

	constructor(
		message: string,
		statusCode: number = 500,
		code?: string,
		details?: any,
		isOperational: boolean = true,
	) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
		this.details = details;
		this.isOperational = isOperational;

		Object.setPrototypeOf(this, AppError.prototype);
		Error.captureStackTrace(this, this.constructor);
	}
}

export class ValidationError extends AppError {
	constructor(message: string, details?: any) {
		super(message, 400, "VALIDATION_ERROR", details);
	}
}

export class AuthenticationError extends AppError {
	constructor(message: string = "Authentication failed") {
		super(message, 401, "AUTHENTICATION_ERROR");
	}
}

export class AuthorizationError extends AppError {
	constructor(message: string = "Insufficient permissions") {
		super(message, 403, "AUTHORIZATION_ERROR");
	}
}

export class NotFoundError extends AppError {
	constructor(resource: string, id?: string) {
		const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
		super(message, 404, "NOT_FOUND");
	}
}

export class ConflictError extends AppError {
	constructor(message: string, details?: any) {
		super(message, 409, "CONFLICT", details);
	}
}

export class RateLimitError extends AppError {
	constructor(retryAfter?: number) {
		super("Too many requests", 429, "RATE_LIMIT_EXCEEDED", { retryAfter });
	}
}

export class ExternalServiceError extends AppError {
	constructor(service: string, originalError?: any) {
		super(`External service error: ${service}`, 503, "EXTERNAL_SERVICE_ERROR", {
			service,
			originalError,
		});
	}
}

export class DatabaseError extends AppError {
	constructor(operation: string, originalError?: any) {
		super(
			`Database operation failed: ${operation}`,
			500,
			"DATABASE_ERROR",
			{ operation, originalError },
			false,
		);
	}
}

export interface ErrorResponse {
	error: {
		message: string;
		code?: string;
		statusCode: number;
		details?: any;
		timestamp: string;
		path?: string;
		requestId?: string;
	};
}
