import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cartService from "../../src/services/cart";

describe("Cart Service", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	describe("getCart", () => {
		it("should return empty cart if none exists", () => {
			localStorage.getItem.mockReturnValueOnce(null);

			const cart = cartService.getCart();

			expect(cart).toEqual({
				items: [],
				totalAmount: 0,
				totalItems: 0,
			});
		});

		it("should return existing cart from storage", () => {
			const mockCart = {
				items: [{ id: "1", name: "Pizza", price: 10, quantity: 2 }],
				totalAmount: 20,
				totalItems: 2,
			};

			localStorage.getItem.mockReturnValueOnce(JSON.stringify(mockCart));

			const cart = cartService.getCart();

			expect(cart).toEqual(mockCart);
		});
	});

	describe("addToCart", () => {
		it("should add new item to empty cart", () => {
			localStorage.getItem.mockReturnValueOnce(null);

			const item = {
				id: "1",
				name: "Burger",
				price: 8.99,
				description: "Delicious burger",
				image: "burger.jpg",
			};

			cartService.addToCart(item);

			expect(localStorage.setItem).toHaveBeenCalledWith(
				"cart",
				expect.stringContaining('"id":"1"'),
			);
		});

		it("should increment quantity for existing item", () => {
			const existingCart = {
				items: [
					{
						id: "1",
						name: "Burger",
						price: 8.99,
						quantity: 1,
						description: "Delicious burger",
						image: "burger.jpg",
					},
				],
				totalAmount: 8.99,
				totalItems: 1,
			};

			localStorage.getItem.mockReturnValueOnce(JSON.stringify(existingCart));

			const item = {
				id: "1",
				name: "Burger",
				price: 8.99,
				description: "Delicious burger",
				image: "burger.jpg",
			};

			cartService.addToCart(item, 2);

			const savedCart = JSON.parse((localStorage.setItem as any).mock.calls[0][1]);

			expect(savedCart.items[0].quantity).toBe(3);
			expect(savedCart.totalItems).toBe(3);
			expect(savedCart.totalAmount).toBeCloseTo(26.97);
		});
	});

	describe("removeFromCart", () => {
		it("should remove item from cart", () => {
			const cart = {
				items: [
					{ id: "1", name: "Burger", price: 8.99, quantity: 2 },
					{ id: "2", name: "Pizza", price: 12.99, quantity: 1 },
				],
				totalAmount: 30.97,
				totalItems: 3,
			};

			localStorage.getItem.mockReturnValueOnce(JSON.stringify(cart));

			cartService.removeFromCart("1");

			const savedCart = JSON.parse((localStorage.setItem as any).mock.calls[0][1]);

			expect(savedCart.items).toHaveLength(1);
			expect(savedCart.items[0].id).toBe("2");
			expect(savedCart.totalItems).toBe(1);
			expect(savedCart.totalAmount).toBeCloseTo(12.99);
		});

		it("should handle removing non-existent item", () => {
			const cart = {
				items: [{ id: "1", name: "Burger", price: 8.99, quantity: 1 }],
				totalAmount: 8.99,
				totalItems: 1,
			};

			localStorage.getItem.mockReturnValueOnce(JSON.stringify(cart));

			cartService.removeFromCart("999");

			const savedCart = JSON.parse((localStorage.setItem as any).mock.calls[0][1]);

			expect(savedCart.items).toHaveLength(1);
			expect(savedCart.totalItems).toBe(1);
		});
	});

	describe("updateQuantity", () => {
		it("should update item quantity", () => {
			const cart = {
				items: [{ id: "1", name: "Burger", price: 8.99, quantity: 2 }],
				totalAmount: 17.98,
				totalItems: 2,
			};

			localStorage.getItem.mockReturnValueOnce(JSON.stringify(cart));

			cartService.updateQuantity("1", 5);

			const savedCart = JSON.parse((localStorage.setItem as any).mock.calls[0][1]);

			expect(savedCart.items[0].quantity).toBe(5);
			expect(savedCart.totalItems).toBe(5);
			expect(savedCart.totalAmount).toBeCloseTo(44.95);
		});

		it("should remove item when quantity is 0", () => {
			const cart = {
				items: [
					{ id: "1", name: "Burger", price: 8.99, quantity: 2 },
					{ id: "2", name: "Pizza", price: 12.99, quantity: 1 },
				],
				totalAmount: 30.97,
				totalItems: 3,
			};

			localStorage.getItem.mockReturnValueOnce(JSON.stringify(cart));

			cartService.updateQuantity("1", 0);

			const savedCart = JSON.parse((localStorage.setItem as any).mock.calls[0][1]);

			expect(savedCart.items).toHaveLength(1);
			expect(savedCart.items[0].id).toBe("2");
		});
	});

	describe("clearCart", () => {
		it("should clear the cart", () => {
			const cart = {
				items: [{ id: "1", name: "Burger", price: 8.99, quantity: 2 }],
				totalAmount: 17.98,
				totalItems: 2,
			};

			localStorage.getItem.mockReturnValueOnce(JSON.stringify(cart));

			cartService.clearCart();

			expect(localStorage.removeItem).toHaveBeenCalledWith("cart");
		});
	});

	describe("getCartItemCount", () => {
		it("should return total item count", () => {
			const cart = {
				items: [
					{ id: "1", name: "Burger", price: 8.99, quantity: 2 },
					{ id: "2", name: "Pizza", price: 12.99, quantity: 3 },
				],
				totalAmount: 56.95,
				totalItems: 5,
			};

			localStorage.getItem.mockReturnValueOnce(JSON.stringify(cart));

			const count = cartService.getCartItemCount();

			expect(count).toBe(5);
		});

		it("should return 0 for empty cart", () => {
			localStorage.getItem.mockReturnValueOnce(null);

			const count = cartService.getCartItemCount();

			expect(count).toBe(0);
		});
	});

	describe("getCartTotal", () => {
		it("should return total amount", () => {
			const cart = {
				items: [{ id: "1", name: "Burger", price: 8.99, quantity: 2 }],
				totalAmount: 17.98,
				totalItems: 2,
			};

			localStorage.getItem.mockReturnValueOnce(JSON.stringify(cart));

			const total = cartService.getCartTotal();

			expect(total).toBe(17.98);
		});

		it("should return 0 for empty cart", () => {
			localStorage.getItem.mockReturnValueOnce(null);

			const total = cartService.getCartTotal();

			expect(total).toBe(0);
		});
	});
});
