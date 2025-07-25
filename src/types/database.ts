export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'accountant' | 'inventory_manager' | 'pos_user';
  is_pos_user: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
  stock_quantity: number;
  reorder_level: number;
  created_at: string;
  updated_at: string;
}

export interface SalesTransaction {
  id: string;
  transaction_date: string;
  customer_name: string;
  total_amount: number;
  status: 'draft' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SalesItem {
  id: string;
  sale_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface PurchaseTransaction {
  id: string;
  transaction_date: string;
  supplier_name: string;
  total_amount: number;
  status: 'draft' | 'completed' | 'cancelled';
  receipt_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Modifier {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  created_at: string;
}

export interface ModifierOption {
  id: string;
  modifier_id: string;
  name: string;
  price_adjustment: number;
  created_at: string;
}

export interface Table {
  id: string;
  number: string;
  name: string | null;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  x_position: number;
  y_position: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  table_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  order_type: 'dine_in' | 'takeaway' | 'delivery' | 'pickup';
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  modifiers: any[];
  special_instructions: string | null;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string | null;
  sale_id: string | null;
  payment_method: 'cash' | 'card' | 'mobile' | 'bank_transfer' | 'split';
  amount: number;
  reference_number: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  processed_by: string;
  created_at: string;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  order_id: string | null;
  sale_id: string | null;
  receipt_data: any;
  printed_at: string | null;
  emailed_to: string | null;
  created_at: string;
}

export interface BusinessSettings {
  id: string;
  business_name: string;
  business_type: 'restaurant' | 'bar' | 'cafe' | 'retail' | 'grocery' | 'pharmacy';
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_rate: number;
  currency: string;
  receipt_footer: string | null;
  logo_url: string | null;
  enable_tables: boolean;
  enable_modifiers: boolean;
  enable_kitchen_display: boolean;
  created_at: string;
  updated_at: string;
}