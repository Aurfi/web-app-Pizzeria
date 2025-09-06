import { beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "../../src/config/database";
import { menuService } from "../../src/services/menu";

// Mock dependencies
vi.mock("../../src/config/database");

const mockPool = vi.mocked(pool);

describe("Menu Service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAllMenuItems", () => {
		it("should return all menu items", async () => {
			const mockMenuItems = [
				{
					id: "1",
					name: "Pizza",
					description: "Delicious pizza",
					price: 12.99,
					category: "main",
					isAvailable: true,
				},
				{
					id: "2",
					name: "Burger",
					description: "Tasty burger",
					price: 8.99,
					category: "main",
					isAvailable: true,
				},
			];

			mockPool.query.mockResolvedValue({
				rows: mockMenuItems,
				rowCount: 2,
			} as never);

			const result = await menuService.getAllMenuItems();

			expect(mockPool.query).toHaveBeenCalledWith(
				"SELECT * FROM menu_items WHERE is_available = true ORDER BY category, name",
			);
			expect(result).toEqual(mockMenuItems);
		});

		it("should handle database errors", async () => {
			const error = new Error("Database connection failed");
			mockPool.query.mockRejectedValue(error);

			await expect(menuService.getAllMenuItems()).rejects.toThrow("Database connection failed");
		});
	});

	describe("getMenuItemById", () => {
		it("should return menu item by id", async () => {
			const mockMenuItem = {
				id: "1",
				name: "Pizza",
				description: "Delicious pizza",
				price: 12.99,
				category: "main",
				isAvailable: true,
			};

			mockPool.query.mockResolvedValue({
				rows: [mockMenuItem],
				rowCount: 1,
			} as never);

			const result = await menuService.getMenuItemById("1");

			expect(mockPool.query).toHaveBeenCalledWith("SELECT * FROM menu_items WHERE id = $1", ["1"]);
			expect(result).toEqual(mockMenuItem);
		});

		it("should return null for non-existent item", async () => {
			mockPool.query.mockResolvedValue({
				rows: [],
				rowCount: 0,
			} as never);

			const result = await menuService.getMenuItemById("999");

			expect(result).toBeNull();
		});
	});

	describe("getMenuItemsByCategory", () => {
		it("should return menu items by category", async () => {
			const mockMenuItems = [
				{
					id: "1",
					name: "Pizza",
					description: "Delicious pizza",
					price: 12.99,
					category: "main",
					isAvailable: true,
				},
			];

			mockPool.query.mockResolvedValue({
				rows: mockMenuItems,
				rowCount: 1,
			} as never);

			const result = await menuService.getMenuItemsByCategory("main");

			expect(mockPool.query).toHaveBeenCalledWith(
				"SELECT * FROM menu_items WHERE category = $1 AND is_available = true ORDER BY name",
				["main"],
			);
			expect(result).toEqual(mockMenuItems);
		});
	});

	describe("searchMenuItems", () => {
		it("should search menu items by name", async () => {
			const mockMenuItems = [
				{
					id: "1",
					name: "Pizza Margherita",
					description: "Classic pizza",
					price: 12.99,
					category: "main",
					isAvailable: true,
				},
			];

			mockPool.query.mockResolvedValue({
				rows: mockMenuItems,
				rowCount: 1,
			} as never);

			const result = await menuService.searchMenuItems("pizza");

			expect(mockPool.query).toHaveBeenCalledWith(
				"SELECT * FROM menu_items WHERE (name ILIKE $1 OR description ILIKE $1) AND is_available = true ORDER BY name",
				["%pizza%"],
			);
			expect(result).toEqual(mockMenuItems);
		});

		it("should return empty array for no matches", async () => {
			mockPool.query.mockResolvedValue({
				rows: [],
				rowCount: 0,
			} as never);

			const result = await menuService.searchMenuItems("nonexistent");

			expect(result).toEqual([]);
		});
	});
});
