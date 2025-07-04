-- Admin Schema Extensions for FoodFlow
-- Run after 01-schema.sql

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin', 'owner'));

-- Create business_settings table
CREATE TABLE IF NOT EXISTS business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create inventory table for stock tracking
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    minimum_stock INTEGER NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
    maximum_stock INTEGER DEFAULT NULL CHECK (maximum_stock IS NULL OR maximum_stock >= minimum_stock),
    unit VARCHAR(20) DEFAULT 'pieces', -- pieces, kg, liters, etc.
    cost_per_unit DECIMAL(10, 2) DEFAULT 0,
    supplier_info JSONB,
    auto_disable_when_empty BOOLEAN DEFAULT true,
    last_restocked_at TIMESTAMP WITH TIME ZONE,
    last_restocked_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(menu_item_id)
);

-- Create analytics tables
CREATE TABLE IF NOT EXISTS daily_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    total_items_sold INTEGER DEFAULT 0,
    average_order_value DECIMAL(10, 2) DEFAULT 0,
    top_selling_item_id UUID REFERENCES menu_items(id),
    peak_hour INTEGER, -- 0-23
    cancellation_rate DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- Create item performance analytics
CREATE TABLE IF NOT EXISTS item_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    times_ordered INTEGER DEFAULT 0,
    revenue_generated DECIMAL(10, 2) DEFAULT 0,
    average_rating DECIMAL(3, 2),
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(menu_item_id, date)
);

-- Create audit log for tracking changes
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'login', etc.
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add image columns to menu_categories (for better admin management)
ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Add cost tracking to menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5, 2) DEFAULT 0;

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    new_order_email BOOLEAN DEFAULT true,
    new_order_push BOOLEAN DEFAULT true,
    low_stock_email BOOLEAN DEFAULT true,
    low_stock_push BOOLEAN DEFAULT true,
    daily_report_email BOOLEAN DEFAULT false,
    sound_alerts BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_business_settings_key ON business_settings(key);
CREATE INDEX IF NOT EXISTS idx_inventory_menu_item ON inventory(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(current_stock, minimum_stock) 
    WHERE current_stock <= minimum_stock;
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales(date DESC);
CREATE INDEX IF NOT EXISTS idx_item_analytics_date ON item_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_item_analytics_menu_item ON item_analytics(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON business_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default business settings
INSERT INTO business_settings (key, value, description) VALUES
('business_hours', '{
    "monday": {"open": "11:00", "close": "22:00", "closed": false},
    "tuesday": {"open": "11:00", "close": "22:00", "closed": false},
    "wednesday": {"open": "11:00", "close": "22:00", "closed": false},
    "thursday": {"open": "11:00", "close": "22:00", "closed": false},
    "friday": {"open": "11:00", "close": "23:00", "closed": false},
    "saturday": {"open": "11:00", "close": "23:00", "closed": false},
    "sunday": {"open": "12:00", "close": "21:00", "closed": false}
}', 'Weekly business operating hours'),
('delivery_zones', '[
    {"name": "Zone 1", "radius": 2, "fee": 2.99, "minimum_order": 15.00},
    {"name": "Zone 2", "radius": 5, "fee": 4.99, "minimum_order": 20.00}
]', 'Delivery zones with fees and minimum orders'),
('tax_settings', '{
    "tax_rate": 8.25,
    "tax_name": "Sales Tax",
    "include_delivery_fee_in_tax": false
}', 'Tax calculation settings'),
('notification_settings', '{
    "new_order_sound": true,
    "email_notifications": true,
    "order_ready_reminder": 300
}', 'Global notification preferences'),
('payment_settings', '{
    "stripe_enabled": true,
    "cash_on_delivery": true,
    "minimum_card_amount": 5.00
}', 'Payment method configuration')
ON CONFLICT (key) DO NOTHING;
