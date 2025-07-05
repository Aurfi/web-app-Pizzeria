import type { CartItem, MenuItem } from "../types";
import { generateCartItemId } from "../utils/uuid";

class CartServiceClass {
	private cartItems: CartItem[] = [];
	private listeners: Set<() => void> = new Set();

	async initialize() {
		// Initialize with empty cart for now
		this.cartItems = [];
		this.notifyListeners();
	}

	async addItem(
		menuItem: MenuItem,
		quantity: number = 1,
		selectedOptions: any[] = [],
	) {

		const existingItemIndex = this.cartItems.findIndex(
			(item) =>
				item.menuItemId === menuItem.id &&
				JSON.stringify(item.selectedOptions) === JSON.stringify(selectedOptions),
		);

		if (existingItemIndex >= 0) {
			const existingItem = this.cartItems[existingItemIndex];
			const newQuantity = existingItem.quantity + quantity;

			this.cartItems[existingItemIndex].quantity = newQuantity;
		} else {
			const cartItem: CartItem = {
				id: generateCartItemId(),
				menuItemId: menuItem.id,
				name: menuItem.name,
				price: menuItem.price,
				quantity,
				selectedOptions,
				image: menuItem.image,
			};

			this.cartItems.push(cartItem);
		}

		this.notifyListeners();
	}

	async updateItemQuantity(itemId: string, quantity: number) {
		const itemIndex = this.cartItems.findIndex((item) => item.id === itemId);

		if (itemIndex >= 0) {
			if (quantity <= 0) {
				await this.removeItem(itemId);
				return;
			}

			this.cartItems[itemIndex].quantity = quantity;

			this.notifyListeners();
		}
	}

	async removeItem(itemId: string) {
		this.cartItems = this.cartItems.filter((item) => item.id !== itemId);
		this.notifyListeners();
	}

	async clear() {
		this.cartItems = [];
		this.notifyListeners();
	}

	getItems(): CartItem[] {
		return this.cartItems;
	}

	getItemCount(): number {
		return this.cartItems.reduce((total, item) => total + item.quantity, 0);
	}

	getSubtotal(): number {
		return this.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
	}

	getDeliveryFee(): number {
		return this.cartItems.length > 0 ? 5.99 : 0;
	}

	getTaxAmount(): number {
		const subtotal = this.getSubtotal();
		return subtotal * 0.08;
	}

	getTotal(): number {
		return this.getSubtotal() + this.getDeliveryFee() + this.getTaxAmount();
	}



	onChange(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notifyListeners() {
		this.listeners.forEach((listener) => listener());
		this.updateCartBadge();
	}

	private updateCartBadge() {
		const badge = document.querySelector(".cart-badge");
		if (badge) {
			const count = this.getItemCount();
			badge.textContent = count > 0 ? count.toString() : "";
			badge.classList.toggle("hidden", count === 0);
		}
	}
}

export const CartService = new CartServiceClass();

// Export functions for compatibility with tests
export function getCart() {
	return {
		items: CartService.getItems().map((item) => ({
			id: item.menuItemId,
			name: item.menuItem?.name || "",
			price: item.menuItem?.price || 0,
			quantity: item.quantity,
			description: item.menuItem?.description,
			image: item.menuItem?.image,
		})),
		totalAmount: CartService.getTotal(),
		totalItems: CartService.getItemCount(),
	};
}

export function addToCart(item: any, quantity: number = 1) {
	return CartService.addItem(
		{
			id: item.id,
			name: item.name,
			price: item.price,
			description: item.description,
			image: item.image,
			categoryId: item.category || "default",
			isAvailable: true,
			allergies: [],
			isVegetarian: false,
			isVegan: false,
			isGlutenFree: false,
		},
		quantity,
	);
}

export function removeFromCart(itemId: string) {
	return CartService.removeItem(itemId);
}

export function updateQuantity(itemId: string, quantity: number) {
	return CartService.updateItemQuantity(itemId, quantity);
}

export function clearCart() {
	return CartService.clear();
}

export function getCartItemCount() {
	return CartService.getItemCount();
}

export function getCartTotal() {
	return CartService.getTotal();
}
