import path from "node:path";
import winston from "winston";

const logLevel = process.env.LOG_LEVEL || "info";
const logFormat = process.env.LOG_FORMAT || "json";
const nodeEnv = process.env.NODE_ENV || "development";

// Custom format for development
const devFormat = winston.format.combine(
	winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
	winston.format.colorize(),
	winston.format.printf(({ timestamp, level, message, ...meta }) => {
		const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
		return `${timestamp} [${level}]: ${message} ${metaStr}`;
	}),
);

// JSON format for production
const prodFormat = winston.format.combine(
	winston.format.timestamp(),
	winston.format.errors({ stack: true }),
	winston.format.json(),
);

// Create logger instance
export const logger = winston.createLogger({
	level: logLevel,
	format: logFormat === "json" || nodeEnv === "production" ? prodFormat : devFormat,
	defaultMeta: {
		service: "foodflow-backend",
		environment: nodeEnv,
	},
	transports: [
		// Console transport
		new winston.transports.Console({
			handleExceptions: true,
		}),
	],
});

// Add file transport in production
if (nodeEnv === "production") {
	logger.add(
		new winston.transports.File({
			filename: path.join("logs", "error.log"),
			level: "error",
			maxsize: 5242880, // 5MB
			maxFiles: 5,
		}),
	);

	logger.add(
		new winston.transports.File({
			filename: path.join("logs", "combined.log"),
			maxsize: 5242880, // 5MB
			maxFiles: 5,
		}),
	);
}

// HTTP request logger middleware
export function requestLogger(c: any, next: any) {
	const start = Date.now();
	const requestId = generateRequestId();

	// Store request ID in context
	c.set("requestId", requestId);

	// Log request
	logger.info("Incoming request", {
		requestId,
		method: c.req.method,
		path: c.req.path,
		query: c.req.query,
		ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
		userAgent: c.req.header("user-agent"),
	});

	return next().then(() => {
		const duration = Date.now() - start;

		// Log response
		logger.info("Request completed", {
			requestId,
			method: c.req.method,
			path: c.req.path,
			statusCode: c.res.status,
			duration: `${duration}ms`,
		});
	});
}

// Performance logger
export function perfLog(operation: string, startTime: number, metadata?: any) {
	const duration = Date.now() - startTime;
	logger.debug("Performance metric", {
		operation,
		duration: `${duration}ms`,
		...metadata,
	});
}

// Database query logger
export function queryLog(query: string, params?: any[], duration?: number) {
	logger.debug("Database query", {
		query: query.substring(0, 200), // Truncate long queries
		params: params?.length ? `[${params.length} params]` : undefined,
		duration: duration ? `${duration}ms` : undefined,
	});
}

// Cache operation logger
export function cacheLog(operation: string, key: string, hit: boolean, duration?: number) {
	logger.debug("Cache operation", {
		operation,
		key,
		hit,
		duration: duration ? `${duration}ms` : undefined,
	});
}

// Audit logger for sensitive operations
export function auditLog(action: string, userId: string, details?: any) {
	logger.info("Audit log", {
		action,
		userId,
		timestamp: new Date().toISOString(),
		details,
	});
}

// Security event logger
export function securityLog(event: string, details: any) {
	logger.warn("Security event", {
		event,
		timestamp: new Date().toISOString(),
		...details,
	});
}

function generateRequestId(): string {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Export log levels for external use
export const LogLevel = {
	ERROR: "error",
	WARN: "warn",
	INFO: "info",
	DEBUG: "debug",
} as const;
