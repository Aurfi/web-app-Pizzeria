import { Hono } from "hono";
import { pool } from "../../config/database";
import { requireAdmin, type AdminContext } from "../../middleware/rbac";

const menu = new Hono();

// Get all menu items for admin (with additional details)
menu.get("/items", requireAdmin, async (c: AdminContext) => {
  try {
    const { category, search, available } = c.req.query();
    
    let whereConditions = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (category) {
      whereConditions.push(`mc.id = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(mi.name ILIKE $${paramIndex} OR mi.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (available !== undefined) {
      whereConditions.push(`mi.is_available = $${paramIndex}`);
      params.push(available === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT 
        mi.id,
        mi.name,
        mi.description,
        mi.price,
        mi.cost_price,
        mi.profit_margin,
        mi.image_url,
        mi.is_available,
        mi.is_vegetarian,
        mi.is_vegan,
        mi.is_gluten_free,
        mi.calories,
        mi.preparation_time,
        mi.sort_order,
        mi.created_at,
        mi.updated_at,
        mc.name as category_name,
        mc.id as category_id,
        i.current_stock,
        i.minimum_stock,
        i.maximum_stock,
        COALESCE(sales.total_sold, 0) as total_sold,
        COALESCE(sales.total_revenue, 0) as total_revenue
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      LEFT JOIN inventory i ON mi.id = i.menu_item_id
      LEFT JOIN (
        SELECT 
          menu_item_id,
          SUM(quantity) as total_sold,
          SUM(subtotal) as total_revenue
        FROM order_items
        GROUP BY menu_item_id
      ) sales ON mi.id = sales.menu_item_id
      ${whereClause}
      ORDER BY mc.sort_order, mi.sort_order, mi.name
    `, params);

    return c.json({
      items: result.rows.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: parseFloat(item.price),
        costPrice: item.cost_price ? parseFloat(item.cost_price) : null,
        profitMargin: item.profit_margin ? parseFloat(item.profit_margin) : null,
        imageUrl: item.image_url,
        available: item.is_available,
        isVegetarian: item.is_vegetarian,
        isVegan: item.is_vegan,
        isGlutenFree: item.is_gluten_free,
        calories: item.calories,
        preparationTime: item.preparation_time,
        sortOrder: item.sort_order,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        category: {
          id: item.category_id,
          name: item.category_name
        },
        inventory: {
          currentStock: item.current_stock || 0,
          minimumStock: item.minimum_stock || 0,
          maximumStock: item.maximum_stock || null
        },
        sales: {
          totalSold: parseInt(item.total_sold),
          totalRevenue: parseFloat(item.total_revenue)
        }
      }))
    });

  } catch (error) {
    console.error("Menu items fetch error:", error);
    return c.json({ error: "Failed to fetch menu items" }, 500);
  }
});

// Create new menu item
menu.post("/items", requireAdmin, async (c: AdminContext) => {
  try {
    const {
      name,
      description,
      price,
      costPrice,
      categoryId,
      imageUrl,
      isVegetarian = false,
      isVegan = false,
      isGlutenFree = false,
      calories,
      preparationTime,
      sortOrder = 0,
      available = true,
      initialStock = 0,
      minimumStock = 5
    } = await c.req.json();

    // Validate required fields
    if (!name || !price || !categoryId) {
      return c.json({ error: "Name, price, and category are required" }, 400);
    }

    // Calculate profit margin if cost price is provided
    const profitMargin = costPrice ? ((price - costPrice) / price * 100) : null;

    const result = await pool.query(`
      INSERT INTO menu_items 
      (name, description, price, cost_price, profit_margin, category_id, image_url, 
       is_vegetarian, is_vegan, is_gluten_free, calories, preparation_time, 
        sort_order, is_available)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      name, description, price, costPrice, profitMargin, categoryId, imageUrl,
      isVegetarian, isVegan, isGlutenFree, calories, preparationTime, sortOrder, available
    ]);

    const menuItem = result.rows[0];

    // Create inventory record
    if (initialStock > 0 || minimumStock > 0) {
      await pool.query(`
        INSERT INTO inventory (menu_item_id, current_stock, minimum_stock, maximum_stock)
        VALUES ($1, $2, $3, $4)
      `, [menuItem.id, initialStock, minimumStock, initialStock * 2]);
    }

    // Log the creation
    await pool.query(`
      INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
      VALUES ($1, 'create', 'menu_items', $2, $3)
    `, [c.user.id, menuItem.id, JSON.stringify(menuItem)]);

    return c.json({ 
      message: "Menu item created successfully",
      item: menuItem 
    }, 201);

  } catch (error) {
    console.error("Menu item creation error:", error);
    return c.json({ error: "Failed to create menu item" }, 500);
  }
});

// Update menu item
menu.put("/items/:id", requireAdmin, async (c: AdminContext) => {
  try {
    const itemId = c.req.param("id");
    const updates = await c.req.json();

    // Get current item for audit log
    const currentItem = await pool.query('SELECT * FROM menu_items WHERE id = $1', [itemId]);
    if (currentItem.rows.length === 0) {
      return c.json({ error: "Menu item not found" }, 404);
    }

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'description', 'price', 'cost_price', 'category_id', 'image_url',
      'is_available', 'is_vegetarian', 'is_vegan', 'is_gluten_free', 'calories',
      'preparation_time', 'sort_order'
    ];

    Object.entries(updates).forEach(([key, value]) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        fields.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    // Calculate profit margin if price or cost_price changed
    if (updates.price !== undefined || updates.costPrice !== undefined) {
      const price = updates.price || currentItem.rows[0].price;
      const costPrice = updates.costPrice || currentItem.rows[0].cost_price;
      if (costPrice) {
        const profitMargin = ((price - costPrice) / price * 100);
        fields.push(`profit_margin = $${paramIndex}`);
        values.push(profitMargin);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(itemId);

    const result = await pool.query(`
      UPDATE menu_items 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    // Log the update
    await pool.query(`
      INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
      VALUES ($1, 'update', 'menu_items', $2, $3, $4)
    `, [c.user.id, itemId, JSON.stringify(currentItem.rows[0]), JSON.stringify(result.rows[0])]);

    return c.json({
      message: "Menu item updated successfully",
      item: result.rows[0]
    });

  } catch (error) {
    console.error("Menu item update error:", error);
    return c.json({ error: "Failed to update menu item" }, 500);
  }
});

// Delete menu item
menu.delete("/items/:id", requireAdmin, async (c: AdminContext) => {
  try {
    const itemId = c.req.param("id");

    // Get current item for audit log
    const currentItem = await pool.query('SELECT * FROM menu_items WHERE id = $1', [itemId]);
    if (currentItem.rows.length === 0) {
      return c.json({ error: "Menu item not found" }, 404);
    }

    // Check if item has been ordered (prevent deletion)
    const orderCount = await pool.query('SELECT COUNT(*) FROM order_items WHERE menu_item_id = $1', [itemId]);
    if (parseInt(orderCount.rows[0].count) > 0) {
      return c.json({ 
        error: "Cannot delete item that has been ordered. Set it as unavailable instead." 
      }, 400);
    }

    // Delete the item (inventory will be deleted by CASCADE)
    await pool.query('DELETE FROM menu_items WHERE id = $1', [itemId]);

    // Log the deletion
    await pool.query(`
      INSERT INTO audit_log (user_id, action, table_name, record_id, old_values)
      VALUES ($1, 'delete', 'menu_items', $2, $3)
    `, [c.user.id, itemId, JSON.stringify(currentItem.rows[0])]);

    return c.json({ message: "Menu item deleted successfully" });

  } catch (error) {
    console.error("Menu item deletion error:", error);
    return c.json({ error: "Failed to delete menu item" }, 500);
  }
});

// Bulk update menu items (useful for price changes, availability)
menu.patch("/items/bulk", requireAdmin, async (c: AdminContext) => {
  try {
    const { items, updates } = await c.req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: "Items array is required" }, 400);
    }

    const placeholders = items.map((_, index) => `$${index + 2}`).join(',');
    const setClause: string[] = [];
    const values: any[] = [JSON.stringify(updates)];
    let paramIndex = items.length + 2;

    // Build SET clause dynamically
    Object.entries(updates).forEach(([key, value]) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setClause.push(`${snakeKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    if (setClause.length === 0) {
      return c.json({ error: "No updates provided" }, 400);
    }

    // Add item IDs to values array
    values.splice(1, 0, ...items);

    const result = await pool.query(`
      UPDATE menu_items 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
      RETURNING id, name
    `, values);

    // Log bulk update
    await pool.query(`
      INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
      VALUES ($1, 'bulk_update', 'menu_items', $2, $3)
    `, [c.user.id, null, JSON.stringify({ items, updates })]);

    return c.json({
      message: `Successfully updated ${result.rows.length} menu items`,
      updatedItems: result.rows
    });

  } catch (error) {
    console.error("Bulk update error:", error);
    return c.json({ error: "Failed to bulk update menu items" }, 500);
  }
});

// Get menu categories for admin
menu.get("/categories", requireAdmin, async (c: AdminContext) => {
  try {
    const result = await pool.query(`
      SELECT 
        mc.*,
        COUNT(mi.id) as item_count,
        SUM(CASE WHEN mi.is_available = true THEN 1 ELSE 0 END) as available_items
      FROM menu_categories mc
      LEFT JOIN menu_items mi ON mc.id = mi.category_id
      GROUP BY mc.id
      ORDER BY mc.sort_order, mc.name
    `);

    return c.json({
      categories: result.rows.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        imageUrl: cat.image_url,
        sortOrder: cat.sort_order,
        isActive: cat.is_active,
        itemCount: parseInt(cat.item_count),
        availableItems: parseInt(cat.available_items),
        createdAt: cat.created_at,
        updatedAt: cat.updated_at
      }))
    });

  } catch (error) {
    console.error("Categories fetch error:", error);
    return c.json({ error: "Failed to fetch categories" }, 500);
  }
});

export default menu;
