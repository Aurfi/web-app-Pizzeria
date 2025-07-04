import { Hono } from "hono";
import { pool } from "../../config/database";
import { requireAdmin, requireOwner, type AdminContext } from "../../middleware/rbac";

const settings = new Hono();

// Get all business settings
settings.get("/", requireAdmin, async (c: AdminContext) => {
  try {
    const result = await pool.query(`
      SELECT key, value, description, updated_at
      FROM business_settings
      ORDER BY key
    `);

    const settingsMap = result.rows.reduce((acc, row) => {
      acc[row.key] = {
        value: row.value,
        description: row.description,
        updatedAt: row.updated_at
      };
      return acc;
    }, {});

    return c.json({ settings: settingsMap });

  } catch (error) {
    console.error("Settings fetch error:", error);
    return c.json({ error: "Failed to fetch settings" }, 500);
  }
});

// Update business settings
settings.put("/", requireOwner, async (c: AdminContext) => {
  try {
    const updates = await c.req.json();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const [key, value] of Object.entries(updates)) {
        await client.query(`
          INSERT INTO business_settings (key, value, updated_by)
          VALUES ($1, $2, $3)
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP
        `, [key, JSON.stringify(value), c.user.id]);
      }

      await client.query('COMMIT');

      // Log the settings update
      await pool.query(`
        INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
        VALUES ($1, 'settings_update', 'business_settings', $2, $3)
      `, [c.user.id, null, JSON.stringify(updates)]);

      return c.json({ message: "Settings updated successfully" });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("Settings update error:", error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

// Get business hours (standardized to {closed:boolean, intervals:[{open,close}]})
settings.get("/hours", requireAdmin, async (c: AdminContext) => {
  try {
    const result = await pool.query(`
      SELECT value FROM business_settings WHERE key = 'business_hours'
    `);

    const defaultHours: any = {
      monday: { closed: false, intervals: [{ open: '11:00', close: '14:00' }, { open: '18:00', close: '22:00' }] },
      tuesday: { closed: false, intervals: [{ open: '11:00', close: '14:00' }, { open: '18:00', close: '22:00' }] },
      wednesday: { closed: false, intervals: [{ open: '11:00', close: '14:00' }, { open: '18:00', close: '22:00' }] },
      thursday: { closed: false, intervals: [{ open: '11:00', close: '14:00' }, { open: '18:00', close: '22:00' }] },
      friday: { closed: false, intervals: [{ open: '11:00', close: '14:30' }, { open: '18:00', close: '23:00' }] },
      saturday: { closed: false, intervals: [{ open: '11:00', close: '15:00' }, { open: '18:00', close: '23:00' }] },
      sunday: { closed: true, intervals: [] }
    };

    const raw = result.rows.length > 0 ? result.rows[0].value : defaultHours;

    const normalize = (day: any) => {
      if (!day) return { closed: true, intervals: [] };
      if (Array.isArray(day.intervals)) {
        return { closed: !!day.closed, intervals: day.intervals.map((i: any) => ({ open: i.open, close: i.close })) };
      }
      // fallback from legacy single open/close
      if (day.closed) return { closed: true, intervals: [] };
      if (day.open && day.close) return { closed: false, intervals: [{ open: day.open, close: day.close }] };
      return { closed: true, intervals: [] };
    };

    const keys = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const hours: any = {};
    keys.forEach(k => hours[k] = normalize(raw[k]));

    return c.json({ hours });

  } catch (error) {
    console.error("Hours fetch error:", error);
    return c.json({ error: "Failed to fetch business hours" }, 500);
  }
});

// Update business hours (expects { day: { closed:boolean, intervals:[{open,close}] } })
settings.put("/hours", requireAdmin, async (c: AdminContext) => {
  try {
    const { hours } = await c.req.json();

    // Validate and normalize
    const keys = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const timeRe = /^\d{2}:\d{2}$/;
    const norm: any = {};
    for (const k of keys) {
      const d = hours?.[k];
      if (!d) { norm[k] = { closed: true, intervals: [] }; continue; }
      const closed = !!d.closed;
      const intervals = Array.isArray(d.intervals) ? d.intervals : [];
      const clean: Array<{open:string,close:string}> = [];
      for (const it of intervals) {
        if (!timeRe.test(it.open || '') || !timeRe.test(it.close || '')) continue;
        // ensure open < close
        const [oh, om] = it.open.split(':').map(Number);
        const [ch, cm] = it.close.split(':').map(Number);
        if (oh*60+om >= ch*60+cm) continue;
        clean.push({ open: it.open, close: it.close });
      }
      // Optional: sort intervals by start
      clean.sort((a,b) => (a.open>a.close?0: (a.open < b.open ? -1 : (a.open>b.open?1:0))));
      norm[k] = { closed, intervals: closed ? [] : clean };
    }

    await pool.query(`
      INSERT INTO business_settings (key, value, updated_by)
      VALUES ('business_hours', $1, $2)
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `, [JSON.stringify(norm), c.user.id]);

    // Log the hours update
    await pool.query(`
      INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
      VALUES ($1, 'hours_update', 'business_settings', $2, $3)
    `, [c.user.id, null, JSON.stringify({ hours, updatedBy: c.user.email })]);

    return c.json({ message: "Business hours updated successfully" });

  } catch (error) {
    console.error("Hours update error:", error);
    return c.json({ error: "Failed to update business hours" }, 500);
  }
});

// Get delivery settings
settings.get("/delivery", requireAdmin, async (c: AdminContext) => {
  try {
    const result = await pool.query(`
      SELECT value FROM business_settings WHERE key = 'delivery_zones'
    `);

    const zones = result.rows.length > 0 ? result.rows[0].value : [
      { name: "Zone 1", radius: 2, fee: 2.99, minimum_order: 15.00 },
      { name: "Zone 2", radius: 5, fee: 4.99, minimum_order: 20.00 }
    ];

    return c.json({ deliveryZones: zones });

  } catch (error) {
    console.error("Delivery settings fetch error:", error);
    return c.json({ error: "Failed to fetch delivery settings" }, 500);
  }
});

// Update delivery settings
settings.put("/delivery", requireAdmin, async (c: AdminContext) => {
  try {
    const { deliveryZones } = await c.req.json();

    await pool.query(`
      INSERT INTO business_settings (key, value, updated_by)
      VALUES ('delivery_zones', $1, $2)
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `, [JSON.stringify(deliveryZones), c.user.id]);

    // Log the delivery settings update
    await pool.query(`
      INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
      VALUES ($1, 'delivery_update', 'business_settings', $2, $3)
    `, [c.user.id, null, JSON.stringify({ deliveryZones, updatedBy: c.user.email })]);

    return c.json({ message: "Delivery settings updated successfully" });

  } catch (error) {
    console.error("Delivery settings update error:", error);
    return c.json({ error: "Failed to update delivery settings" }, 500);
  }
});

// Get tax settings
settings.get("/taxes", requireAdmin, async (c: AdminContext) => {
  try {
    const result = await pool.query(`
      SELECT value FROM business_settings WHERE key = 'tax_settings'
    `);

    const taxes = result.rows.length > 0 ? result.rows[0].value : {
      tax_rate: 8.25,
      tax_name: "Sales Tax",
      include_delivery_fee_in_tax: false
    };

    return c.json({ taxes });

  } catch (error) {
    console.error("Tax settings fetch error:", error);
    return c.json({ error: "Failed to fetch tax settings" }, 500);
  }
});

// Update tax settings
settings.put("/taxes", requireAdmin, async (c: AdminContext) => {
  try {
    const { taxes } = await c.req.json();

    await pool.query(`
      INSERT INTO business_settings (key, value, updated_by)
      VALUES ('tax_settings', $1, $2)
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `, [JSON.stringify(taxes), c.user.id]);

    // Log the tax settings update
    await pool.query(`
      INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
      VALUES ($1, 'tax_update', 'business_settings', $2, $3)
    `, [c.user.id, null, JSON.stringify({ taxes, updatedBy: c.user.email })]);

    return c.json({ message: "Tax settings updated successfully" });

  } catch (error) {
    console.error("Tax settings update error:", error);
    return c.json({ error: "Failed to update tax settings" }, 500);
  }
});

// Get notification settings for current admin user
settings.get("/notifications", requireAdmin, async (c: AdminContext) => {
  try {
    const result = await pool.query(`
      SELECT * FROM notification_settings WHERE user_id = $1
    `, [c.user.id]);

    const notifications = result.rows.length > 0 ? result.rows[0] : {
      new_order_email: true,
      new_order_push: true,
      low_stock_email: true,
      low_stock_push: true,
      daily_report_email: false,
      sound_alerts: true
    };

    return c.json({
      notifications: {
        newOrderEmail: notifications.new_order_email,
        newOrderPush: notifications.new_order_push,
        lowStockEmail: notifications.low_stock_email,
        lowStockPush: notifications.low_stock_push,
        dailyReportEmail: notifications.daily_report_email,
        soundAlerts: notifications.sound_alerts
      }
    });

  } catch (error) {
    console.error("Notification settings fetch error:", error);
    return c.json({ error: "Failed to fetch notification settings" }, 500);
  }
});

// Update notification settings for current admin user
settings.put("/notifications", requireAdmin, async (c: AdminContext) => {
  try {
    const { notifications } = await c.req.json();

    await pool.query(`
      INSERT INTO notification_settings (
        user_id, new_order_email, new_order_push, low_stock_email, 
        low_stock_push, daily_report_email, sound_alerts
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE SET
        new_order_email = EXCLUDED.new_order_email,
        new_order_push = EXCLUDED.new_order_push,
        low_stock_email = EXCLUDED.low_stock_email,
        low_stock_push = EXCLUDED.low_stock_push,
        daily_report_email = EXCLUDED.daily_report_email,
        sound_alerts = EXCLUDED.sound_alerts,
        updated_at = CURRENT_TIMESTAMP
    `, [
      c.user.id,
      notifications.newOrderEmail,
      notifications.newOrderPush,
      notifications.lowStockEmail,
      notifications.lowStockPush,
      notifications.dailyReportEmail,
      notifications.soundAlerts
    ]);

    return c.json({ message: "Notification settings updated successfully" });

  } catch (error) {
    console.error("Notification settings update error:", error);
    return c.json({ error: "Failed to update notification settings" }, 500);
  }
});

// Get audit log (system activity)
settings.get("/audit", requireOwner, async (c: AdminContext) => {
  try {
    const { limit = '100', action, user, startDate, endDate } = c.req.query();

    const whereConditions: string[] = [];
    const params: any[] = [parseInt(limit as string)];
    let paramIndex = 2;

    if (action) {
      whereConditions.push(`al.action = $${paramIndex}`);
      params.push(action);
      paramIndex++;
    }

    if (user) {
      whereConditions.push(`u.email ILIKE $${paramIndex}`);
      params.push(`%${user}%`);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`al.created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`al.created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT 
        al.id,
        al.action,
        al.table_name,
        al.record_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.created_at,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email
      FROM audit_log al
      JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $1
    `, params);

    return c.json({
      auditLog: result.rows.map(log => ({
        id: log.id,
        action: log.action,
        tableName: log.table_name,
        recordId: log.record_id,
        oldValues: log.old_values,
        newValues: log.new_values,
        ipAddress: log.ip_address,
        createdAt: log.created_at,
        user: {
          name: log.user_name,
          email: log.user_email
        }
      }))
    });

  } catch (error) {
    console.error("Audit log fetch error:", error);
    return c.json({ error: "Failed to fetch audit log" }, 500);
  }
});

export default settings;
