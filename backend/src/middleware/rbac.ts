import type { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { pool } from "../config/database";
import type { AppContext } from "../types/index";

export interface UserWithRole {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	phone?: string;
	role: "customer" | "staff" | "admin" | "owner";
}

// Extend the AppContext to include user with role
export interface AdminContext extends AppContext {
	user: UserWithRole;
}

/**
 * Middleware to authenticate and authorize users based on roles
 */
export function requireRole(...allowedRoles: Array<"customer" | "staff" | "admin" | "owner">) {
	return async (c: AppContext, next: Next) => {
		try {
			const authHeader = c.req.header("Authorization");

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return c.json({ error: "Authentication required" }, 401);
			}

			const token = authHeader.substring(7);

			// Verify JWT token
			const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

			// Fetch user with role from database
			const userResult = await pool.query(
				`SELECT id, email, first_name, last_name, phone, role 
         FROM users 
         WHERE id = $1 AND is_active = true`,
				[payload.userId],
			);

			if (userResult.rows.length === 0) {
				return c.json({ error: "User not found" }, 401);
			}

			const user = userResult.rows[0];
			const userWithRole: UserWithRole = {
				id: user.id,
				email: user.email,
				firstName: user.first_name,
				lastName: user.last_name,
				phone: user.phone,
				role: user.role,
			};

			// Check if user has required role
			if (!allowedRoles.includes(userWithRole.role)) {
				return c.json(
					{
						error: "Insufficient privileges",
						required: allowedRoles,
						current: userWithRole.role,
					},
					403,
				);
			}

			// Attach user to context
			(c as AdminContext).user = userWithRole;

			await next();
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				return c.json({ error: "Token expired" }, 401);
			}
			if (error instanceof jwt.JsonWebTokenError) {
				return c.json({ error: "Invalid token" }, 401);
			}
			console.error("RBAC middleware error:", error);
			return c.json({ error: "Authentication failed" }, 401);
		}
	};
}

/**
 * Shorthand middlewares for common role requirements
 */
export const requireAuth = requireRole("customer", "staff", "admin", "owner");
export const requireStaff = requireRole("staff", "admin", "owner");
export const requireAdmin = requireRole("admin", "owner");
export const requireOwner = requireRole("owner");

/**
 * Helper function to check if user has specific role
 */
export function hasRole(
	user: UserWithRole,
	...roles: Array<"customer" | "staff" | "admin" | "owner">
): boolean {
	return roles.includes(user.role);
}

/**
 * Helper function to get role hierarchy level (higher number = more privileges)
 */
export function getRoleLevel(role: string): number {
	switch (role) {
		case "customer":
			return 1;
		case "staff":
			return 2;
		case "admin":
			return 3;
		case "owner":
			return 4;
		default:
			return 0;
	}
}

/**
 * Check if user has at least the specified role level
 */
export function hasMinimumRole(
	user: UserWithRole,
	minimumRole: "customer" | "staff" | "admin" | "owner",
): boolean {
	return getRoleLevel(user.role) >= getRoleLevel(minimumRole);
}
