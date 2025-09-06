import { Hono } from "hono";
import dashboard from "./dashboard";
import inventory from "./inventory";
import menu from "./menu";
import orders from "./orders";
import reset from "./reset";
import settings from "./settings";

const admin = new Hono();

// Mount all admin subroutes
admin.route("/dashboard", dashboard);
admin.route("/menu", menu);
admin.route("/orders", orders);
admin.route("/inventory", inventory);
admin.route("/settings", settings);
admin.route("/", reset);

// Admin user info endpoint
admin.get("/me", async (c) => {
	// This will be protected by RBAC middleware at the parent level
	return c.json({
		user: (c as any).user,
	});
});

export default admin;
