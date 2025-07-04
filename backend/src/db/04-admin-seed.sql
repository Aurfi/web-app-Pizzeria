-- Admin User Seeding
-- Creates default admin and staff users for the system

-- Insert admin user (password: admin123)
-- Hash generated with bcrypt rounds=12
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, email_verified, is_active)
VALUES 
-- Single Admin
('11111111-1111-1111-1111-111111111111', 
 'admin@mariospizzeria.com', 
 '$2b$12$LQv3c1yqBwEHxHR8V0HzQua1CL7t1gXyZLhCwCcXcfGKBWoP4.ZOe', 
 'Admin', 'Mario', '+1555123ADMIN', 'owner', true, true)
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone;

-- Update demo user role to customer (ensure it's not admin)
UPDATE users SET role = 'customer' WHERE email = 'demo@mariospizzeria.com';

-- Insert default notification settings for admin user
INSERT INTO notification_settings (user_id, new_order_email, new_order_push, low_stock_email, low_stock_push, daily_report_email, sound_alerts)
VALUES 
('11111111-1111-1111-1111-111111111111', true, true, true, true, true, true)
ON CONFLICT (user_id) DO NOTHING;

-- Insert inventory records for existing menu items
INSERT INTO inventory (menu_item_id, current_stock, minimum_stock, maximum_stock, unit, cost_per_unit, auto_disable_when_empty)
SELECT 
    mi.id as menu_item_id,
    CASE 
        WHEN lower(mc.name) LIKE '%base tomate%' OR lower(mc.name) LIKE '%base crème%' THEN 50
        WHEN lower(mc.name) LIKE '%dessert%' THEN 20
        WHEN lower(mc.name) LIKE '%boisson%' THEN 100
        ELSE 25
    END as current_stock,
    CASE 
        WHEN lower(mc.name) LIKE '%base tomate%' OR lower(mc.name) LIKE '%base crème%' THEN 10
        WHEN lower(mc.name) LIKE '%dessert%' THEN 3
        WHEN lower(mc.name) LIKE '%boisson%' THEN 20
        ELSE 5
    END as minimum_stock,
    CASE 
        WHEN lower(mc.name) LIKE '%base tomate%' OR lower(mc.name) LIKE '%base crème%' THEN 100
        WHEN lower(mc.name) LIKE '%dessert%' THEN 40
        WHEN lower(mc.name) LIKE '%boisson%' THEN 200
        ELSE 50
    END as maximum_stock,
    'pieces' as unit,
    mi.price * 0.3 as cost_per_unit, -- Assume ~70% margin
    true as auto_disable_when_empty
FROM menu_items mi
LEFT JOIN menu_categories mc ON mc.id = mi.category_id
WHERE NOT EXISTS (
    SELECT 1 FROM inventory WHERE inventory.menu_item_id = mi.id
);

-- Update menu items with cost and profit margin
UPDATE menu_items SET 
    cost_price = price * 0.3,  -- 30% cost
    profit_margin = 70.00      -- 70% profit margin
WHERE cost_price IS NULL OR cost_price = 0;

-- Insert sample daily sales data for the past 30 days
INSERT INTO daily_sales (date, total_orders, total_revenue, total_items_sold, average_order_value, peak_hour)
SELECT 
    (CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 29)) as date,
    (random() * 50 + 10)::INTEGER as total_orders,
    (random() * 1000 + 200)::DECIMAL(12,2) as total_revenue,
    (random() * 150 + 30)::INTEGER as total_items_sold,
    (random() * 15 + 20)::DECIMAL(10,2) as average_order_value,
    (random() * 4 + 18)::INTEGER as peak_hour -- 18-22 (6-10 PM)
ON CONFLICT (date) DO NOTHING;
