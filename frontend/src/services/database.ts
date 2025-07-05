import type { Table } from "dexie";
import Dexie from "dexie";
import type { MenuItem, CartItem, Order, User } from "../types";

class AppDatabase extends Dexie {
	menuItems!: Table<MenuItem>;
	cartItems!: Table<CartItem>;
	orders!: Table<Order>;
	users!: Table<User>;

	constructor() {
		super("FoodFlowDB");

		this.version(1).stores({
			menuItems: "id, categoryId, timestamp",
			cartItems: "++id, menuItemId",
			orders: "id, status, createdAt",
			users: "id, email",
		});
	}

	async clearOldCache(maxAge: number = 24 * 60 * 60 * 1000) {
		const cutoff = Date.now() - maxAge;
		await this.menuItems.where("timestamp").below(cutoff).delete();
	}
}

export const db = new AppDatabase();

export async function initializeDB() {
	try {
		await db.open();
		console.log("Database initialized");

		await db.clearOldCache();
	} catch (error) {
		console.error("Failed to initialize database:", error);
		throw error;
	}
}

export async function saveMenuItems(items: MenuItem[]) {
	const timestamp = Date.now();
	const itemsWithTimestamp = items.map((item) => ({ ...item, timestamp }));
	await db.menuItems.bulkPut(itemsWithTimestamp);
}

export async function getMenuItems(categoryId?: string): Promise<MenuItem[]> {
	if (categoryId) {
		return await db.menuItems.where("categoryId").equals(categoryId).toArray();
	}
	return await db.menuItems.toArray();
}

export async function addToCart(item: CartItem) {
	return await db.cartItems.add(item);
}

export async function getCartItems(): Promise<CartItem[]> {
	return await db.cartItems.toArray();
}

export async function updateCartItem(id: number, updates: Partial<CartItem>) {
	return await db.cartItems.update(id, updates);
}

export async function removeFromCart(id: number) {
	return await db.cartItems.delete(id);
}

export async function clearCart() {
	return await db.cartItems.clear();
}

export async function saveOrder(order: Order) {
	return await db.orders.add(order);
}

export async function getOrders(): Promise<Order[]> {
	return await db.orders.orderBy("createdAt").reverse().toArray();
}

export async function getOrder(id: string): Promise<Order | undefined> {
	return await db.orders.get(id);
}
