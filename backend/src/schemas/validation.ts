import { z } from "zod";

// User schemas
export const registerSchema = z.object({
	email: z.string().email("Invalid email format"),
	password: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
		.regex(/[a-z]/, "Password must contain at least one lowercase letter")
		.regex(/[0-9]/, "Password must contain at least one number"),
	name: z.string().min(2, "Name must be at least 2 characters").max(100),
	phone: z
		.string()
		.regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number")
		.optional(),
});

export const loginSchema = z.object({
	email: z.string().email("Invalid email format"),
	password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
	name: z.string().min(2).max(100).optional(),
	phone: z
		.string()
		.regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number")
		.optional(),
	email: z.string().email().optional(),
});

// Order schemas
export const createOrderSchema = z.object({
	items: z
		.array(
			z.object({
				menuItemId: z.string().uuid(),
				quantity: z.number().int().positive(),
				selectedOptions: z.array(z.any()).optional(),
				specialInstructions: z.string().max(500).optional(),
			}),
		)
		.min(1, "Order must contain at least one item"),
	deliveryAddressId: z.string().uuid().optional(),
	deliveryAddress: z
		.object({
			street: z.string().min(1),
			city: z.string().min(1),
			state: z.string().min(1),
			zipCode: z.string().min(1),
			country: z.string().min(1),
			instructions: z.string().optional(),
		})
		.optional(),
	paymentMethodId: z.string().optional(),
	notes: z.string().max(500).optional(),
	scheduledFor: z.string().datetime().optional(),
});

export const updateOrderStatusSchema = z.object({
	status: z.enum([
		"pending",
		"confirmed",
		"preparing",
		"ready",
		"out_for_delivery",
		"delivered",
		"cancelled",
	]),
	cancellationReason: z.string().max(500).optional(),
});

// Menu schemas
export const createMenuItemSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500),
	price: z.number().positive(),
	category: z.string(),
	image: z.string().url().optional(),
	available: z.boolean().default(true),
	isVegetarian: z.boolean().default(false),
	isVegan: z.boolean().default(false),
	isGlutenFree: z.boolean().default(false),
	calories: z.number().int().positive().optional(),
	preparationTime: z.number().int().positive().optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

// Payment schemas
export const createPaymentIntentSchema = z.object({
	amount: z.number().positive(),
	currency: z.string().length(3).default("USD"),
	orderId: z.string().uuid(),
});

export const confirmPaymentSchema = z.object({
	paymentIntentId: z.string(),
	paymentMethodId: z.string().optional(),
});

// Address schemas
export const addressSchema = z.object({
	street: z.string().min(1).max(200),
	apartment: z.string().max(50).optional(),
	city: z.string().min(1).max(100),
	state: z.string().min(1).max(100),
	zipCode: z.string().min(1).max(20),
	country: z.string().min(1).max(100),
	latitude: z.number().optional(),
	longitude: z.number().optional(),
	isDefault: z.boolean().default(false),
	label: z.string().max(50).optional(),
});

// Review schemas
export const createReviewSchema = z.object({
	orderId: z.string().uuid(),
	rating: z.number().int().min(1).max(5),
	comment: z.string().max(1000).optional(),
	menuItemRatings: z
		.array(
			z.object({
				menuItemId: z.string().uuid(),
				rating: z.number().int().min(1).max(5),
			}),
		)
		.optional(),
});

// Pagination schemas
export const paginationSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	sortBy: z.string().optional(),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Query schemas
export const menuQuerySchema = z
	.object({
		categoryId: z.string().uuid().optional(),
		search: z.string().max(100).optional(),
		dietary: z.string().optional(),
		minPrice: z.coerce.number().positive().optional(),
		maxPrice: z.coerce.number().positive().optional(),
		available: z.coerce.boolean().optional(),
	})
	.merge(paginationSchema);

export const orderQuerySchema = z
	.object({
		status: z
			.enum([
				"pending",
				"confirmed",
				"preparing",
				"ready",
				"out_for_delivery",
				"delivered",
				"cancelled",
			])
			.optional(),
		startDate: z.string().datetime().optional(),
		endDate: z.string().datetime().optional(),
	})
	.merge(paginationSchema);

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
