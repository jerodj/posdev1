-- pos_users
CREATE TABLE pos_users (
  id UUID PRIMARY KEY,
  staff_id VARCHAR(50) UNIQUE NOT NULL,
  pin VARCHAR(10) NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20) NOT NULL,
  avatar_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP
);

-- business_settings
CREATE TABLE business_settings (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(100),
  currency VARCHAR(3) DEFAULT 'USD',
  tax_rate DECIMAL(5,2) DEFAULT 10.00,
  receipt_footer TEXT
);

-- orders
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  order_number VARCHAR(20) UNIQUE NOT NULL,
  table_id UUID,
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  customer_count INTEGER DEFAULT 1,
  order_type VARCHAR(20) DEFAULT 'dine_in',
  status VARCHAR(20) DEFAULT 'open',
  subtotal DECIMAL(10,2),
  tax_amount DECIMAL(10,2),
  discount_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  tip_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  special_requests TEXT,
  estimated_time INTEGER,
  server_id UUID,
  priority VARCHAR(20) DEFAULT 'normal',
  kitchen_notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- tables
CREATE TABLE tables (
  id UUID PRIMARY KEY,
  number INTEGER NOT NULL,
  name VARCHAR(50),
  status VARCHAR(20) DEFAULT 'available'
);

-- order_items
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  menu_item_id UUID,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  modifiers JSONB,
  special_instructions TEXT
);

-- menu_items
CREATE TABLE menu_items (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2),
  category_id UUID,
  is_available BOOLEAN DEFAULT TRUE
);

-- menu_categories
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20),
  icon VARCHAR(50),
  business_type VARCHAR(50),
  sort_order INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);

-- payments
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  payment_method VARCHAR(20),
  amount DECIMAL(10,2),
  tip_amount DECIMAL(10,2),
  change_amount DECIMAL(10,2),
  reference_number VARCHAR(50),
  card_last_four VARCHAR(4),
  status VARCHAR(20),
  processed_by UUID,
  processed_at TIMESTAMP,
  created_at TIMESTAMP
);

-- receipts
CREATE TABLE receipts (
  id UUID PRIMARY KEY,
  receipt_number VARCHAR(20) UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id),
  receipt_data JSONB,
  receipt_type VARCHAR(20),
  created_at TIMESTAMP
);

-- shifts
CREATE TABLE shifts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES pos_users(id),
  starting_cash DECIMAL(10,2),
  ending_cash DECIMAL(10,2),
  total_sales DECIMAL(10,2),
  total_tips DECIMAL(10,2),
  total_orders INTEGER,
  cash_sales DECIMAL(10,2),
  card_sales DECIMAL(10,2),
  mobile_sales DECIMAL(10,2),
  status VARCHAR(20),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  notes TEXT
);

-- audit_trails
CREATE TABLE audit_trails (
  id UUID PRIMARY KEY,
  user_id UUID,
  action VARCHAR(50),
  description TEXT,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMP
);

-- Function for order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
BEGIN
  RETURN 'ORD-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(nextval('order_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function for receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS VARCHAR AS $$
BEGIN
  RETURN 'REC-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(nextval('receipt_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Sequence for order numbers
CREATE SEQUENCE order_seq;

-- Sequence for receipt numbers
CREATE SEQUENCE receipt_seq;