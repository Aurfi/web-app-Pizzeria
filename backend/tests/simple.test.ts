// Simple test to verify Jest setup
describe("Simple Test Suite", () => {
	it("should pass a basic test", () => {
		expect(1 + 1).toBe(2);
	});

	it("should handle async operations", async () => {
		const promise = Promise.resolve("test");
		const result = await promise;
		expect(result).toBe("test");
	});

	it("should verify environment variables", () => {
		expect(process.env.NODE_ENV).toBe("test");
		expect(process.env.JWT_SECRET).toBe("test-secret-key");
	});
});
