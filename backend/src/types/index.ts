import type { Context } from "hono";

export interface Variables {
	userId: string;
	userEmail: string;
}

export type AppContext = Context<{ Variables: Variables }>;

export interface JWTPayload {
	userId: string;
	email: string;
}

export interface User {
	id: string;
	email: string;
	name: string;
	phone?: string;
	created_at: Date;
	updated_at: Date;
}

export interface MenuItem {
	id: string;
	category_id: string;
	name: string;
	description: string;
	price: number;
	image_url?: string;
	is_available: boolean;
	is_vegetarian: boolean;
	is_vegan: boolean;
	is_gluten_free: boolean;
	options?: Array<{
		name: string;
		choices: Array<{
			name: string;
			price: number;
		}>;
	}>;
}

export interface OrderItem {
	menu_item_id: string;
	quantity: number;
	selected_options?: Array<{
		option_name: string;
		choice_name: string;
	}>;
	special_instructions?: string;
}

export interface Order {
	id: string;
	user_id: string;
	total: number;
	status: string;
	created_at: Date;
	estimated_delivery_time?: Date;
	delivery_address_id: string;
}
