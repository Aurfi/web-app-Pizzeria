import * as dotenv from "dotenv";
import { Redis } from "ioredis";
import pg from "pg";
import { mockPool, mockRedis } from "./mock-database";

dotenv.config();

const { Pool } = pg;

// Check if we should use mock databases
const useMockDatabase = process.env.DATABASE_URL === "memory://" || process.env.MOCK_DATABASE === "true";
const useMockRedis = process.env.REDIS_URL === "memory://" || process.env.MOCK_REDIS === "true";

// Initialize database connection
export const pool = useMockDatabase 
  ? mockPool 
  : new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

// Initialize Redis connection
export const redis = useMockRedis 
  ? mockRedis 
  : new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

// Only add event listeners for real Redis connections
if (!useMockRedis && redis instanceof Redis) {
	redis.on("error", (err: Error) => {
		console.error("Redis connection error:", err);
	});

	redis.on("connect", () => {
		console.log("Redis connected successfully");
	});
} else if (useMockRedis) {
	console.log("Using mock Redis for local development");
}

export async function testDatabaseConnection() {
	try {
		if (useMockDatabase) {
			const result = await pool.query("SELECT 1");
			console.log("Mock database connected:", result.rows[0]);
			return true;
		} else {
			const client = await (pool as any).connect();
			const result = await client.query("SELECT NOW()");
			client.release();
			console.log("Database connected:", result.rows[0]);
			return true;
		}
	} catch (error) {
		console.error("Database connection error:", error);
		return false;
	}
}

export async function closeDatabaseConnections() {
	if ('end' in pool) {
		await pool.end();
	}
	if ('quit' in redis) {
		await redis.quit();
	}
}
