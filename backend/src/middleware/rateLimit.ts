import type { Context, Next } from "hono";
import { redis } from "../config/database";
import { logger } from "../utils/logger";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (c: Context) => string;
  skipSuccessfulRequests?: boolean;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
  keyGenerator: (c: Context) => {
    return c.req.header("x-forwarded-for") || 
           c.req.header("x-real-ip") || 
           "unknown";
  },
  skipSuccessfulRequests: false,
};

export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };
  
  return async (c: Context, next: Next) => {
    try {
      const key = `rate_limit:${finalConfig.keyGenerator!(c)}`;
      const window = Math.floor(Date.now() / finalConfig.windowMs);
      const windowKey = `${key}:${window}`;
      
      // Get current request count for this window
      const currentCount = await redis.get(windowKey);
      const requestCount = currentCount ? parseInt(currentCount, 10) : 0;
      
      if (requestCount >= finalConfig.maxRequests) {
        logger.warn("Rate limit exceeded", {
          ip: finalConfig.keyGenerator!(c),
          count: requestCount,
          limit: finalConfig.maxRequests
        });
        
        return c.json(
          { 
            error: "Too many requests", 
            retryAfter: finalConfig.windowMs / 1000 
          }, 
          429
        );
      }
      
      // Increment counter
      if ('pipeline' in redis) {
        const pipeline = redis.pipeline();
        pipeline.incr(windowKey);
        pipeline.expire(windowKey, Math.ceil(finalConfig.windowMs / 1000));
        await pipeline.exec();
      } else {
        // Mock redis fallback
        await (redis as any).incr(windowKey);
      }
      
      // Set rate limit headers
      c.header("X-RateLimit-Limit", finalConfig.maxRequests.toString());
      c.header("X-RateLimit-Remaining", (finalConfig.maxRequests - requestCount - 1).toString());
      c.header("X-RateLimit-Reset", (window * finalConfig.windowMs + finalConfig.windowMs).toString());
      
      await next();
    } catch (error) {
      logger.error("Rate limit middleware error", { error });
      // If Redis fails, don't block requests (fail open)
      await next();
    }
  };
}

// Specific rate limiters for different endpoints
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
});

export const authRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes  
  maxRequests: 10, // 10 auth attempts per 5 minutes
});

export const strictRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute for demo protection
});