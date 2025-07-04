import type Redis from "ioredis";
import { logger } from "../utils/logger";

export interface CacheOptions {
	ttl?: number; // Time to live in seconds
	tags?: string[]; // Tags for cache invalidation
	version?: string; // Cache version for automatic invalidation
}

export class CacheService {
	private redis: Redis;
	private defaultTTL: number;
	private keyPrefix: string;
	private isConnected: boolean = false;

	constructor(redis: Redis, keyPrefix: string = "cache:", defaultTTL: number = 3600) {
		this.redis = redis;
		this.keyPrefix = keyPrefix;
		this.defaultTTL = defaultTTL;

		// Monitor Redis connection
		this.redis.on("connect", () => {
			this.isConnected = true;
			logger.info("Redis cache connected");
		});

		this.redis.on("error", (error) => {
			this.isConnected = false;
			logger.error("Redis cache error", { error: error.message });
		});

		this.redis.on("close", () => {
			this.isConnected = false;
			logger.warn("Redis cache connection closed");
		});
	}

	// Get from cache with fallback
	async get<T>(
		key: string,
		fallback?: () => Promise<T>,
		options?: CacheOptions,
	): Promise<T | null> {
		const startTime = Date.now();
		const fullKey = this.getFullKey(key);

		try {
			if (!this.isConnected) {
				logger.warn("Cache unavailable, using fallback", { key });
				return fallback ? await fallback() : null;
			}

			const cached = await this.redis.get(fullKey);

			if (cached) {
				logger.debug("Cache hit", { key, duration: `${Date.now() - startTime}ms` });
				return JSON.parse(cached);
			}

			logger.debug("Cache miss", { key, duration: `${Date.now() - startTime}ms` });

			// If cache miss and fallback provided, fetch and cache
			if (fallback) {
				const data = await fallback();
				await this.set(key, data, options);
				return data;
			}

			return null;
		} catch (error) {
			logger.error("Cache get error", { key, error });

			// Fallback on error
			if (fallback) {
				return await fallback();
			}

			return null;
		}
	}

	// Set cache with options
	async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
		const startTime = Date.now();
		const fullKey = this.getFullKey(key);
		const ttl = options?.ttl || this.defaultTTL;

		try {
			if (!this.isConnected) {
				logger.warn("Cache unavailable, skipping set", { key });
				return;
			}

			const serialized = JSON.stringify(value);

			// Set with TTL
			await this.redis.setex(fullKey, ttl, serialized);

			// Add to tags for group invalidation
			if (options?.tags) {
				await this.addToTags(key, options.tags);
			}

			logger.debug("Cache set", { key, ttl, duration: `${Date.now() - startTime}ms` });
		} catch (error) {
			logger.error("Cache set error", { key, error });
			// Don't throw - caching should not break the application
		}
	}

	// Delete from cache
	async del(key: string | string[]): Promise<void> {
		const keys = Array.isArray(key) ? key : [key];
		const fullKeys = keys.map((k) => this.getFullKey(k));

		try {
			if (!this.isConnected) {
				logger.warn("Cache unavailable, skipping delete", { keys });
				return;
			}

			await this.redis.del(...fullKeys);
			logger.debug("Cache deleted", { keys });
		} catch (error) {
			logger.error("Cache delete error", { keys, error });
		}
	}

	// Invalidate by tag
	async invalidateTag(tag: string): Promise<void> {
		const startTime = Date.now();

		try {
			if (!this.isConnected) {
				logger.warn("Cache unavailable, skipping tag invalidation", { tag });
				return;
			}

			const tagKey = `${this.keyPrefix}tag:${tag}`;
			const keys = await this.redis.smembers(tagKey);

			if (keys.length > 0) {
				const fullKeys = keys.map((k) => this.getFullKey(k));
				await this.redis.del(...fullKeys);
				await this.redis.del(tagKey);

				logger.info("Cache tag invalidated", {
					tag,
					keysInvalidated: keys.length,
					duration: Date.now() - startTime,
				});
			}
		} catch (error) {
			logger.error("Cache tag invalidation error", { tag, error });
		}
	}

	// Clear all cache (use with caution)
	async flush(): Promise<void> {
		try {
			if (!this.isConnected) {
				logger.warn("Cache unavailable, skipping flush");
				return;
			}

			// Get all keys with our prefix
			const keys = await this.redis.keys(`${this.keyPrefix}*`);

			if (keys.length > 0) {
				await this.redis.del(...keys);
				logger.info("Cache flushed", { keysDeleted: keys.length });
			}
		} catch (error) {
			logger.error("Cache flush error", { error });
		}
	}

	// Warm up cache
	async warmUp(items: Array<{ key: string; value: any; options?: CacheOptions }>): Promise<void> {
		logger.info("Cache warm-up started", { itemCount: items.length });

		const results = await Promise.allSettled(
			items.map((item) => this.set(item.key, item.value, item.options)),
		);

		const succeeded = results.filter((r) => r.status === "fulfilled").length;
		const failed = results.filter((r) => r.status === "rejected").length;

		logger.info("Cache warm-up completed", { succeeded, failed });
	}

	// Get multiple keys at once
	async mget<T>(keys: string[]): Promise<(T | null)[]> {
		const startTime = Date.now();
		const fullKeys = keys.map((k) => this.getFullKey(k));

		try {
			if (!this.isConnected) {
				logger.warn("Cache unavailable for mget", { keys });
				return keys.map(() => null);
			}

			const values = await this.redis.mget(...fullKeys);

			const results = values.map((value, index) => {
				if (value) {
					try {
						return JSON.parse(value);
					} catch {
						logger.error("Cache parse error", { key: keys[index] });
						return null;
					}
				}
				return null;
			});

			const hits = results.filter((r) => r !== null).length;
			logger.debug("Cache mget completed", {
				requested: keys.length,
				hits,
				duration: Date.now() - startTime,
			});

			return results;
		} catch (error) {
			logger.error("Cache mget error", { keys, error });
			return keys.map(() => null);
		}
	}

	// Set multiple keys at once
	async mset<T>(items: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
		const pipeline = this.redis.pipeline();

		try {
			if (!this.isConnected) {
				logger.warn("Cache unavailable for mset");
				return;
			}

			for (const item of items) {
				const fullKey = this.getFullKey(item.key);
				const ttl = item.ttl || this.defaultTTL;
				const serialized = JSON.stringify(item.value);
				pipeline.setex(fullKey, ttl, serialized);
			}

			await pipeline.exec();
			logger.debug("Cache mset completed", { count: items.length });
		} catch (error) {
			logger.error("Cache mset error", { error });
		}
	}

	// Cache decorator for methods
	cacheMethod(ttl?: number) {
		const service = this;
		return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
			const originalMethod = descriptor.value;

			descriptor.value = async function (...args: any[]) {
				const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;

				// Try to get from cache
				const cached = await service.get(cacheKey);
				if (cached !== null) {
					return cached;
				}

				// Execute method and cache result
				const result = await originalMethod.apply(this, args);
				await service.set(cacheKey, result, { ttl });

				return result;
			};

			return descriptor;
		};
	}

	// Helper methods
	private getFullKey(key: string): string {
		return `${this.keyPrefix}${key}`;
	}

	private async addToTags(key: string, tags: string[]): Promise<void> {
		const pipeline = this.redis.pipeline();

		for (const tag of tags) {
			const tagKey = `${this.keyPrefix}tag:${tag}`;
			pipeline.sadd(tagKey, key);
			pipeline.expire(tagKey, this.defaultTTL);
		}

		await pipeline.exec();
	}

	// Health check
	async healthCheck(): Promise<boolean> {
		try {
			if (!this.isConnected) {
				return false;
			}

			const testKey = `${this.keyPrefix}health:${Date.now()}`;
			await this.redis.setex(testKey, 10, "ok");
			const result = await this.redis.get(testKey);
			await this.redis.del(testKey);

			return result === "ok";
		} catch {
			return false;
		}
	}

	// Get cache statistics
	async getStats(): Promise<{
		connected: boolean;
		memoryUsage?: string;
		keyCount?: number;
	}> {
		try {
			if (!this.isConnected) {
				return { connected: false };
			}

			const info = await this.redis.info("memory");
			const memoryMatch = info.match(/used_memory_human:(.+)/);
			const keys = await this.redis.keys(`${this.keyPrefix}*`);

			return {
				connected: true,
				memoryUsage: memoryMatch ? memoryMatch[1].trim() : undefined,
				keyCount: keys.length,
			};
		} catch (error) {
			logger.error("Failed to get cache stats", { error });
			return { connected: this.isConnected };
		}
	}
}
