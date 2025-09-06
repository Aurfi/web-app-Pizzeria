import type Redis from "ioredis";
import { CacheService } from "../../../src/services/cache.service";

jest.mock("ioredis");
jest.mock("../../../src/utils/logger");

describe("CacheService", () => {
	let cacheService: CacheService;
	let mockRedis: jest.Mocked<Redis>;

	beforeEach(() => {
		mockRedis = {
			get: jest.fn().mockResolvedValue(null),
			setex: jest.fn().mockResolvedValue("OK"),
			del: jest.fn().mockResolvedValue(1),
			mget: jest.fn().mockResolvedValue([]),
			pipeline: jest.fn().mockReturnValue({
				setex: jest.fn().mockReturnThis(),
				sadd: jest.fn().mockReturnThis(),
				expire: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue([]),
			}),
			smembers: jest.fn().mockResolvedValue([]),
			keys: jest.fn().mockResolvedValue([]),
			info: jest.fn().mockResolvedValue("used_memory_human:1M"),
			on: jest.fn().mockImplementation((event, handler) => {
				if (event === "connect") {
					// Simulate immediate connection
					setTimeout(() => handler(), 0);
				}
				return mockRedis;
			}),
		} as unknown as typeof redis;

		cacheService = new CacheService(mockRedis as unknown as typeof redis, "test:", 3600);

		// Wait for connection event
		return new Promise((resolve) => setTimeout(resolve, 10));
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("get", () => {
		it("should return cached value when exists", async () => {
			const cachedData = { id: 1, name: "Test" };
			mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedData));

			const result = await cacheService.get("test-key");

			expect(result).toEqual(cachedData);
			expect(mockRedis.get).toHaveBeenCalledWith("test:test-key");
		});

		it("should return null when cache miss and no fallback", async () => {
			mockRedis.get.mockResolvedValueOnce(null);

			const result = await cacheService.get("test-key");

			expect(result).toBeNull();
		});

		it("should fetch and cache when cache miss with fallback", async () => {
			const fallbackData = { id: 1, name: "Fallback" };
			mockRedis.get.mockResolvedValueOnce(null);

			const fallback = jest.fn().mockResolvedValue(fallbackData);
			const result = await cacheService.get("test-key", fallback);

			expect(result).toEqual(fallbackData);
			expect(fallback).toHaveBeenCalled();
			expect(mockRedis.setex).toHaveBeenCalledWith(
				"test:test-key",
				3600,
				JSON.stringify(fallbackData),
			);
		});

		it("should use fallback when Redis is disconnected", async () => {
			// Simulate disconnected state
			Object.defineProperty(cacheService, "isConnected", {
				value: false,
				writable: true,
			});

			const fallbackData = { id: 1, name: "Fallback" };
			const fallback = jest.fn().mockResolvedValue(fallbackData);

			const result = await cacheService.get("test-key", fallback);

			expect(result).toEqual(fallbackData);
			expect(fallback).toHaveBeenCalled();
			expect(mockRedis.get).not.toHaveBeenCalled();
		});
	});

	describe("set", () => {
		it("should set value with default TTL", async () => {
			const data = { id: 1, name: "Test" };

			await cacheService.set("test-key", data);

			expect(mockRedis.setex).toHaveBeenCalledWith("test:test-key", 3600, JSON.stringify(data));
		});

		it("should set value with custom TTL", async () => {
			const data = { id: 1, name: "Test" };

			await cacheService.set("test-key", data, { ttl: 7200 });

			expect(mockRedis.setex).toHaveBeenCalledWith("test:test-key", 7200, JSON.stringify(data));
		});

		it("should add to tags when specified", async () => {
			const data = { id: 1, name: "Test" };
			const pipeline = mockRedis.pipeline();

			await cacheService.set("test-key", data, { tags: ["users", "active"] });

			expect(mockRedis.setex).toHaveBeenCalled();
			expect(pipeline.sadd).toHaveBeenCalledTimes(2);
			expect(pipeline.expire).toHaveBeenCalledTimes(2);
		});
	});

	describe("del", () => {
		it("should delete single key", async () => {
			await cacheService.del("test-key");

			expect(mockRedis.del).toHaveBeenCalledWith("test:test-key");
		});

		it("should delete multiple keys", async () => {
			await cacheService.del(["key1", "key2", "key3"]);

			expect(mockRedis.del).toHaveBeenCalledWith("test:key1", "test:key2", "test:key3");
		});
	});

	describe("invalidateTag", () => {
		it("should invalidate all keys with tag", async () => {
			const taggedKeys = ["key1", "key2"];
			mockRedis.smembers.mockResolvedValueOnce(taggedKeys);

			await cacheService.invalidateTag("users");

			expect(mockRedis.smembers).toHaveBeenCalledWith("test:tag:users");
			expect(mockRedis.del).toHaveBeenCalledWith("test:key1", "test:key2", "test:tag:users");
		});

		it("should handle empty tag gracefully", async () => {
			mockRedis.smembers.mockResolvedValueOnce([]);

			await cacheService.invalidateTag("empty-tag");

			expect(mockRedis.del).not.toHaveBeenCalled();
		});
	});

	describe("mget", () => {
		it("should get multiple values at once", async () => {
			const values = [JSON.stringify({ id: 1 }), null, JSON.stringify({ id: 2 })];
			mockRedis.mget.mockResolvedValueOnce(values);

			const result = await cacheService.mget(["key1", "key2", "key3"]);

			expect(result).toEqual([{ id: 1 }, null, { id: 2 }]);
			expect(mockRedis.mget).toHaveBeenCalledWith("test:key1", "test:key2", "test:key3");
		});
	});

	describe("mset", () => {
		it("should set multiple values at once", async () => {
			const items = [
				{ key: "key1", value: { id: 1 }, ttl: 3600 },
				{ key: "key2", value: { id: 2 } },
			];

			await cacheService.mset(items);

			const pipeline = mockRedis.pipeline();
			expect(pipeline.setex).toHaveBeenCalledTimes(2);
			expect(pipeline.exec).toHaveBeenCalled();
		});
	});

	describe("flush", () => {
		it("should delete all cache keys with prefix", async () => {
			const keys = ["test:key1", "test:key2", "test:tag:users"];
			mockRedis.keys.mockResolvedValueOnce(keys);

			await cacheService.flush();

			expect(mockRedis.keys).toHaveBeenCalledWith("test:*");
			expect(mockRedis.del).toHaveBeenCalledWith(...keys);
		});
	});

	describe("warmUp", () => {
		it("should set multiple cache entries", async () => {
			const items = [
				{ key: "key1", value: { id: 1 } },
				{ key: "key2", value: { id: 2 }, options: { ttl: 7200 } },
			];

			await cacheService.warmUp(items);

			expect(mockRedis.setex).toHaveBeenCalledTimes(2);
		});
	});

	describe("healthCheck", () => {
		it("should return true when Redis is healthy", async () => {
			mockRedis.setex.mockResolvedValueOnce("OK");
			mockRedis.get.mockResolvedValueOnce("ok");
			mockRedis.del.mockResolvedValueOnce(1);

			const result = await cacheService.healthCheck();

			expect(result).toBe(true);
		});

		it("should return false when Redis operations fail", async () => {
			mockRedis.setex.mockRejectedValueOnce(new Error("Connection failed"));

			const result = await cacheService.healthCheck();

			expect(result).toBe(false);
		});
	});

	describe("getStats", () => {
		it("should return cache statistics", async () => {
			mockRedis.info.mockResolvedValueOnce("used_memory_human:2.5M\nother_info:value");
			mockRedis.keys.mockResolvedValueOnce(["key1", "key2", "key3"]);

			const stats = await cacheService.getStats();

			expect(stats).toEqual({
				connected: true,
				memoryUsage: "2.5M",
				keyCount: 3,
			});
		});
	});
});
