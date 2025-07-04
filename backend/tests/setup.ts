import path from "node:path";
import { config } from "dotenv";

// Load test environment variables
config({ path: path.resolve(__dirname, "../.env.test") });

// Set test environment
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key";
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/foodflow_test";
process.env.REDIS_URL = "redis://localhost:6379/1";
