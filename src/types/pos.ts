export interface POSUser {
  id: string;
  staff_id: string;
  pin: string;
  full_name: string;
  role: 'admin' | 'manager' | 'server' | 'bartender' | 'cashier' | 'kitchen';
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessSettings {
  id: string;
  business_name: string;
  business_type: 'restaurant' | 'bar' | 'cafe' | 'both';
  address?: string;
  phone?: string;
  email?: string;
  tax_rate: number;
  currency: string;
  receipt_footer?: string;
  logo_url?: string;
  enable_tables: boolean;
  enable_modifiers: boolean;
  enable_kitchen_display: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  image_url?: string;
  sort_order: number;
  is_active: boolean;
  business_type: 'restaurant' | 'bar' | 'both';
  created_at: string;
}

export interface Modifier {
  id: string;
  name: string;
  type: 'size' | 'extra' | 'option' | 'preparation';
  required: boolean;
  max_selections: number;
  options?: ModifierOption[];
  created_at: string;
}

export interface ModifierOption {
  id: string;
  modifier_id: string;
  name: string;
  price_adjustment: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id: string;
  image_url?: string;
  is_available: boolean;
  is_featured: boolean;
  preparation_time: number;
  allergens?: string[];
  is_alcoholic: boolean;
  abv?: number;
  calories?: number;
  spice_level: number;
  is_vegan: boolean;
  is_vegetarian: boolean;
  is_gluten_free: boolean;
  cost_price: number;
  profit_margin: number;
  barcode?: string;
  sku?: string;
  created_at: string;
  updated_at: string;
  category?: MenuCategory;
  modifiers?: Modifier[];
}

export interface Table {
  id: string;
  number: string;
  name?: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
  x_position: number;
  y_position: number;
  qr_code?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  table_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_count: number;
  order_type: 'dine_in' | 'takeaway' | 'delivery' | 'bar';
  status: 'open' | 'sent_to_kitchen' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  tip_amount: number;
  total_amount: number;
  notes?: string;
  special_requests?: string;
  estimated_time: number;
  server_id: string;
  kitchen_notes?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  table?: Table;
  items?: OrderItem[];
  server?: POSUser;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  modifiers: any[];
  special_instructions?: string;
  status: 'ordered' | 'preparing' | 'ready' | 'served' | 'cancelled';
  kitchen_notes?: string;
  created_at: string;
  menu_item?: MenuItem;
}

export interface Payment {
  id: string;
  order_id: string;
  payment_method: 'cash' | 'card' | 'mobile' | 'gift_card' | 'split';
  amount: number;
  tip_amount: number;
  change_amount: number;
  reference_number?: string;
  card_last_four?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  processed_by: string;
  processed_at: string;
  created_at: string;
}

export interface Shift {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  starting_cash: number;
  ending_cash?: number;
  total_sales: number;
  total_tips: number;
  total_orders: number;
  cash_sales: number;
  card_sales: number;
  mobile_sales: number;
  status: 'active' | 'closed';
  notes?: string;
  created_at: string;
  user?: POSUser;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  order_id: string;
  receipt_data: any;
  receipt_type: 'customer' | 'kitchen' | 'merchant';
  printed_at?: string;
  emailed_to?: string;
  sms_to?: string;
  created_at: string;
}

export interface PaymentData {
  user_id: string;
  payment_method: 'cash' | 'card' | 'mobile' | 'bank';
  amount: number;
  tip_amount?: number;
  reference?: string;
}

export interface OrderData {
  table_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_count?: number;
  order_type: 'dine_in' | 'takeaway' | 'delivery' | 'bar';
  items: Array<{
    menu_item_id: string;
    quantity: number;
    unit_price: string;
    total_price: string;
    modifiers?: any[];
    special_instructions?: string;
  }>;
  user_id: string;
  discount_type?: 'percentage' | 'amount';
  discount_value?: string;
  status?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  estimated_time?: number;
  notes?: string;
  special_requests?: string;
  reference?: string;
}

export interface CartItem {
  id: string;
  menu_item: MenuItem;
  quantity: number;
  unit_price: number;
  total_price: number;
  modifiers: any[];
  special_instructions: string;
}

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  activeOrders: number;
  availableTables: number;
  totalTips: number;
  averageOrderValue: number;
}

export interface KitchenOrder {
  id: string;
  order_number: string;
  table_number?: string;
  order_type: string;
  items: OrderItem[];
  special_requests?: string;
  priority: string;
  estimated_time: number;
  created_at: string;
  elapsed_time: number;
}