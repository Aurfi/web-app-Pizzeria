import bcrypt from "bcrypt";
import { Hono } from "hono";
import { pool } from "../config/database";
import { authMiddleware } from "../middleware/auth";
import type { AppContext } from "../types/index";

const users = new Hono();

users.use("*", authMiddleware);

users.get("/profile", async (c: AppContext) => {
	try {
		const userId = c.get("userId");

		const result = await pool.query(
			`SELECT id, email, first_name, last_name, phone, email_verified, created_at
       FROM users WHERE id = $1`,
			[userId],
		);

		if (result.rows.length === 0) {
			return c.json({ error: "User not found" }, 404);
		}

		const user = result.rows[0];

		return c.json({
			id: user.id,
			email: user.email,
			firstName: user.first_name,
			lastName: user.last_name,
			phone: user.phone,
			emailVerified: user.email_verified,
			createdAt: user.created_at,
		});
	} catch (error) {
		console.error("Error fetching profile:", error);
		return c.json({ error: "Failed to fetch profile" }, 500);
	}
});

users.put("/profile", async (c: AppContext) => {
	try {
		const userId = c.get("userId");
		const { firstName, lastName, phone } = await c.req.json();

		const updates = [];
		const values = [];
		let paramCount = 0;

		if (firstName !== undefined) {
			paramCount++;
			updates.push(`first_name = $${paramCount}`);
			values.push(firstName);
		}

		if (lastName !== undefined) {
			paramCount++;
			updates.push(`last_name = $${paramCount}`);
			values.push(lastName);
		}

		if (phone !== undefined) {
			paramCount++;
			updates.push(`phone = $${paramCount}`);
			values.push(phone);
		}

		if (updates.length === 0) {
			return c.json({ error: "No fields to update" }, 400);
		}

		paramCount++;
		values.push(userId);

		const query = `
      UPDATE users 
      SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, phone
    `;

		const result = await pool.query(query, values);

		const user = result.rows[0];

		return c.json({
			id: user.id,
			email: user.email,
			firstName: user.first_name,
			lastName: user.last_name,
			phone: user.phone,
		});
	} catch (error) {
		console.error("Error updating profile:", error);
		return c.json({ error: "Failed to update profile" }, 500);
	}
});

users.put("/password", async (c: AppContext) => {
	try {
		const userId = c.get("userId");
		const { currentPassword, newPassword } = await c.req.json();

		if (!currentPassword || !newPassword) {
			return c.json({ error: "Current and new passwords are required" }, 400);
		}

		const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);

		if (result.rows.length === 0) {
			return c.json({ error: "User not found" }, 404);
		}

		const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

		if (!validPassword) {
			return c.json({ error: "Current password is incorrect" }, 401);
		}

		const newPasswordHash = await bcrypt.hash(newPassword, 10);

		await pool.query(
			"UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
			[newPasswordHash, userId],
		);

		return c.json({ message: "Password updated successfully" });
	} catch (error) {
		console.error("Error updating password:", error);
		return c.json({ error: "Failed to update password" }, 500);
	}
});

users.get("/addresses", async (c: AppContext) => {
	try {
		const userId = c.get("userId");

		const result = await pool.query(
			`SELECT id, label, street_address, city, state, postal_code, 
              country, latitude, longitude, is_default
       FROM addresses
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
			[userId],
		);

		const addresses = result.rows.map((row) => ({
			id: row.id,
			label: row.label,
			streetAddress: row.street_address,
			city: row.city,
			state: row.state,
			postalCode: row.postal_code,
			country: row.country,
			latitude: row.latitude,
			longitude: row.longitude,
			isDefault: row.is_default,
		}));

		return c.json(addresses);
	} catch (error) {
		console.error("Error fetching addresses:", error);
		return c.json({ error: "Failed to fetch addresses" }, 500);
	}
});

users.post("/addresses", async (c: AppContext) => {
	try {
		const userId = c.get("userId");
		const {
			label,
			streetAddress,
			city,
			state,
			postalCode,
			country = "US",
			latitude,
			longitude,
			isDefault = false,
		} = await c.req.json();

		if (!streetAddress || !city || !state || !postalCode) {
			return c.json({ error: "Missing required address fields" }, 400);
		}

		const client = await pool.connect();

		try {
			await client.query("BEGIN");

			if (isDefault) {
				await client.query("UPDATE addresses SET is_default = false WHERE user_id = $1", [userId]);
			}

			const result = await client.query(
				`INSERT INTO addresses (
          user_id, label, street_address, city, state, 
          postal_code, country, latitude, longitude, is_default
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, label, street_address, city, state, postal_code, 
                  country, latitude, longitude, is_default`,
				[
					userId,
					label,
					streetAddress,
					city,
					state,
					postalCode,
					country,
					latitude,
					longitude,
					isDefault,
				],
			);

			await client.query("COMMIT");

			const address = result.rows[0];

			return c.json(
				{
					id: address.id,
					label: address.label,
					streetAddress: address.street_address,
					city: address.city,
					state: address.state,
					postalCode: address.postal_code,
					country: address.country,
					latitude: address.latitude,
					longitude: address.longitude,
					isDefault: address.is_default,
				},
				201,
			);
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	} catch (error) {
		console.error("Error creating address:", error);
		return c.json({ error: "Failed to create address" }, 500);
	}
});

users.put("/addresses/:id", async (c: AppContext) => {
	try {
		const userId = c.get("userId");
		const addressId = c.req.param("id");
		const updates = await c.req.json();

		const allowedFields = [
			"label",
			"street_address",
			"city",
			"state",
			"postal_code",
			"country",
			"latitude",
			"longitude",
			"is_default",
		];

		const updateClauses = [];
		const values = [];
		let paramCount = 0;

		for (const [key, value] of Object.entries(updates)) {
			if (allowedFields.includes(key)) {
				paramCount++;
				const columnName =
					key === "streetAddress"
						? "street_address"
						: key === "postalCode"
							? "postal_code"
							: key === "isDefault"
								? "is_default"
								: key;
				updateClauses.push(`${columnName} = $${paramCount}`);
				values.push(value);
			}
		}

		if (updateClauses.length === 0) {
			return c.json({ error: "No valid fields to update" }, 400);
		}

		values.push(addressId, userId);

		const client = await pool.connect();

		try {
			await client.query("BEGIN");

			if (updates.isDefault) {
				await client.query("UPDATE addresses SET is_default = false WHERE user_id = $1", [userId]);
			}

			const query = `
        UPDATE addresses 
        SET ${updateClauses.join(", ")}
        WHERE id = $${paramCount + 1} AND user_id = $${paramCount + 2}
        RETURNING id, label, street_address, city, state, postal_code, 
                  country, latitude, longitude, is_default
      `;

			const result = await client.query(query, values);

			if (result.rows.length === 0) {
				await client.query("ROLLBACK");
				return c.json({ error: "Address not found" }, 404);
			}

			await client.query("COMMIT");

			const address = result.rows[0];

			return c.json({
				id: address.id,
				label: address.label,
				streetAddress: address.street_address,
				city: address.city,
				state: address.state,
				postalCode: address.postal_code,
				country: address.country,
				latitude: address.latitude,
				longitude: address.longitude,
				isDefault: address.is_default,
			});
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	} catch (error) {
		console.error("Error updating address:", error);
		return c.json({ error: "Failed to update address" }, 500);
	}
});

users.delete("/addresses/:id", async (c: AppContext) => {
	try {
		const userId = c.get("userId");
		const addressId = c.req.param("id");

		const result = await pool.query(
			"DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id",
			[addressId, userId],
		);

		if (result.rows.length === 0) {
			return c.json({ error: "Address not found" }, 404);
		}

		return c.json({ message: "Address deleted successfully" });
	} catch (error) {
		console.error("Error deleting address:", error);
		return c.json({ error: "Failed to delete address" }, 500);
	}
});

export default users;
