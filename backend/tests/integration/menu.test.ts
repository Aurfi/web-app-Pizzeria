import { Hono } from "hono";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "../../src/config/database";
import menuRoutes from "../../src/routes/menu";

const app = new Hono();
app.route("/menu", menuRoutes);

describe("Menu API Integration Tests", () => {
	beforeAll(async () => {
		// Setup test database
		await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        image VARCHAR(500),
        allergies TEXT[],
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
	});

	afterAll(async () => {
		// Cleanup test database
		await pool.query("DROP TABLE IF EXISTS menu_items");
		await pool.end();
	});

	beforeEach(async () => {
		// Clear and seed menu items before each test
		await pool.query("DELETE FROM menu_items");

		const menuItems = [
			{
				name: "Margherita Pizza",
				description: "Classic pizza with tomato sauce, mozzarella, and basil",
				price: 12.99,
				category: "pizza",
				image: "margherita.jpg",
				allergies: ["gluten", "dairy"],
				is_available: true,
			},
			{
				name: "Pepperoni Pizza",
				description: "Pizza with pepperoni and mozzarella cheese",
				price: 14.99,
				category: "pizza",
				image: "pepperoni.jpg",
				allergies: ["gluten", "dairy"],
				is_available: true,
			},
			{
				name: "Caesar Salad",
				description: "Fresh romaine lettuce with caesar dressing",
				price: 8.99,
				category: "salad",
				image: "caesar.jpg",
				allergies: ["dairy"],
				is_available: true,
			},
			{
				name: "Unavailable Item",
				description: "This item is not available",
				price: 10.99,
				category: "other",
				image: "unavailable.jpg",
				allergies: [],
				is_available: false,
			},
		];

		for (const item of menuItems) {
			await pool.query(
				`
        INSERT INTO menu_items (name, description, price, category, image, allergies, is_available)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
				[
					item.name,
					item.description,
					item.price,
					item.category,
					item.image,
					item.allergies,
					item.is_available,
				],
			);
		}
	});

	describe("GET /menu", () => {
		it("should return all available menu items", async () => {
			const response = await request(app.fetch).get("/menu").expect(200);

			expect(response.body).toHaveProperty("items");
			expect(Array.isArray(response.body.items)).toBe(true);
			expect(response.body.items).toHaveLength(3); // Only available items

			// Check that unavailable items are not included
			const unavailableItem = response.body.items.find(
				(item: any) => item.name === "Unavailable Item",
			);
			expect(unavailableItem).toBeUndefined();
		});

		it("should return items sorted by category and name", async () => {
			const response = await request(app.fetch).get("/menu").expect(200);

			const items = response.body.items;
			expect(items[0].category).toBe("pizza");
			expect(items[1].category).toBe("pizza");
			expect(items[2].category).toBe("salad");
		});
	});

	describe("GET /menu/categories", () => {
		it("should return all available categories", async () => {
			const response = await request(app.fetch).get("/menu/categories").expect(200);

			expect(response.body).toHaveProperty("categories");
			expect(Array.isArray(response.body.categories)).toBe(true);
			expect(response.body.categories).toContain("pizza");
			expect(response.body.categories).toContain("salad");
			expect(response.body.categories).not.toContain("other"); // Category with no available items
		});
	});

	describe("GET /menu/category/:category", () => {
		it("should return items for specific category", async () => {
			const response = await request(app.fetch).get("/menu/category/pizza").expect(200);

			expect(response.body).toHaveProperty("items");
			expect(response.body.items).toHaveLength(2);
			expect(response.body.items[0].category).toBe("pizza");
			expect(response.body.items[1].category).toBe("pizza");
		});

		it("should return empty array for non-existent category", async () => {
			const response = await request(app.fetch).get("/menu/category/nonexistent").expect(200);

			expect(response.body.items).toHaveLength(0);
		});

		it("should return empty array for category with no available items", async () => {
			const response = await request(app.fetch).get("/menu/category/other").expect(200);

			expect(response.body.items).toHaveLength(0);
		});
	});

	describe("GET /menu/item/:id", () => {
		it("should return specific menu item by id", async () => {
			// First get all items to find a valid ID
			const allItemsResponse = await request(app.fetch).get("/menu");
			const firstItem = allItemsResponse.body.items[0];

			const response = await request(app.fetch).get(`/menu/item/${firstItem.id}`).expect(200);

			expect(response.body).toHaveProperty("item");
			expect(response.body.item.id).toBe(firstItem.id);
			expect(response.body.item.name).toBe(firstItem.name);
		});

		it("should return 404 for non-existent item", async () => {
			const response = await request(app.fetch).get("/menu/item/99999").expect(404);

			expect(response.body).toHaveProperty("error");
		});

		it("should return 404 for unavailable item", async () => {
			// Get the unavailable item ID
			const unavailableItemResult = await pool.query(
				"SELECT id FROM menu_items WHERE is_available = false LIMIT 1",
			);
			const unavailableItemId = unavailableItemResult.rows[0].id;

			const response = await request(app.fetch).get(`/menu/item/${unavailableItemId}`).expect(404);

			expect(response.body).toHaveProperty("error");
		});
	});

	describe("GET /menu/search", () => {
		it("should search items by name", async () => {
			const response = await request(app.fetch).get("/menu/search?q=pizza").expect(200);

			expect(response.body).toHaveProperty("items");
			expect(response.body.items).toHaveLength(2);
			expect(response.body.items[0].name).toContain("Pizza");
			expect(response.body.items[1].name).toContain("Pizza");
		});

		it("should search items by description", async () => {
			const response = await request(app.fetch).get("/menu/search?q=romaine").expect(200);

			expect(response.body.items).toHaveLength(1);
			expect(response.body.items[0].name).toBe("Caesar Salad");
		});

		it("should return empty array for no matches", async () => {
			const response = await request(app.fetch).get("/menu/search?q=nonexistent").expect(200);

			expect(response.body.items).toHaveLength(0);
		});

		it("should return 400 for missing search query", async () => {
			const response = await request(app.fetch).get("/menu/search").expect(400);

			expect(response.body).toHaveProperty("error");
		});

		it("should be case insensitive", async () => {
			const response = await request(app.fetch).get("/menu/search?q=PIZZA").expect(200);

			expect(response.body.items).toHaveLength(2);
		});
	});

	describe("GET /menu/featured", () => {
		it("should return featured menu items", async () => {
			const response = await request(app.fetch).get("/menu/featured").expect(200);

			expect(response.body).toHaveProperty("items");
			expect(Array.isArray(response.body.items)).toBe(true);
			// Featured items should be a subset of all available items
			expect(response.body.items.length).toBeLessThanOrEqual(3);
		});
	});
});
