import { Hono } from "hono";
import { pool, redis } from "../config/database";
import type { Context } from "hono";

const health = new Hono();

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: "up" | "down";
      latency?: number;
      error?: string;
    };
    redis: {
      status: "up" | "down";
      latency?: number;
      error?: string;
    };
    memory: {
      status: "ok" | "warning" | "critical";
      usage: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
      };
      percentage: number;
    };
  };
  version: string;
  environment: string;
}

// Basic health check
health.get("/", async (c: Context) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Liveness probe - checks if the service is alive
health.get("/live", (c: Context) => {
  return c.json({
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe - checks if the service is ready to accept traffic
health.get("/ready", async (c: Context) => {
  try {
    // Quick database check
    const dbStart = Date.now();
    await pool.query("SELECT 1");
    const dbLatency = Date.now() - dbStart;

    // Quick Redis check
    const redisStart = Date.now();
    await redis.ping();
    const redisLatency = Date.now() - redisStart;

    // If both checks pass, service is ready
    return c.json({
      status: "ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: "up", latency: dbLatency },
        redis: { status: "up", latency: redisLatency },
      },
    });
  } catch (error) {
    // Service is not ready
    return c.json(
      {
        status: "not_ready",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      503
    );
  }
});

// Detailed health check
health.get("/detailed", async (c: Context) => {
  const startTime = Date.now();
  const memUsage = process.memoryUsage();
  const totalMem = memUsage.heapTotal;
  const usedMem = memUsage.heapUsed;
  const memPercentage = Math.round((usedMem / totalMem) * 100);

  const response: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    checks: {
      database: { status: "down" },
      redis: { status: "down" },
      memory: {
        status: memPercentage > 90 ? "critical" : memPercentage > 75 ? "warning" : "ok",
        usage: {
          rss: memUsage.rss,
          heapTotal: totalMem,
          heapUsed: usedMem,
          external: memUsage.external,
        },
        percentage: memPercentage,
      },
    },
  };

  // Check database
  try {
    const dbStart = Date.now();
    const result = await pool.query("SELECT COUNT(*) FROM users");
    const dbLatency = Date.now() - dbStart;
    response.checks.database = {
      status: "up",
      latency: dbLatency,
    };
  } catch (error) {
    response.checks.database = {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    response.status = "degraded";
  }

  // Check Redis
  try {
    const redisStart = Date.now();
    await redis.ping();
    const redisLatency = Date.now() - redisStart;
    response.checks.redis = {
      status: "up",
      latency: redisLatency,
    };
  } catch (error) {
    response.checks.redis = {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    response.status = response.status === "degraded" ? "unhealthy" : "degraded";
  }

  // Set appropriate HTTP status code
  const statusCode = response.status === "healthy" ? 200 : response.status === "degraded" ? 200 : 503;

  return c.json(response, statusCode);
});

// Metrics endpoint (Prometheus format)
health.get("/metrics", (c: Context) => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  const metrics = `# HELP nodejs_heap_size_total_bytes Process heap size from Node.js in bytes.
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes ${memUsage.heapTotal}

# HELP nodejs_heap_size_used_bytes Process heap size used from Node.js in bytes.
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes ${memUsage.heapUsed}

# HELP nodejs_external_memory_bytes Process external memory from Node.js in bytes.
# TYPE nodejs_external_memory_bytes gauge
nodejs_external_memory_bytes ${memUsage.external}

# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total ${cpuUsage.user / 1000000}

# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds.
# TYPE process_cpu_system_seconds_total counter
process_cpu_system_seconds_total ${cpuUsage.system / 1000000}

# HELP process_uptime_seconds Process uptime in seconds.
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${process.uptime()}

# HELP nodejs_version_info Node.js version info.
# TYPE nodejs_version_info gauge
nodejs_version_info{version="${process.version}",major="${process.versions.node.split('.')[0]}"} 1
`;

  c.header("Content-Type", "text/plain; version=0.0.4");
  return c.text(metrics);
});

export default health;