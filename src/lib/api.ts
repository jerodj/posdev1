import { POSUser, Order, Table, MenuItem, MenuCategory, Shift, OrderData, PaymentData, DashboardStats, BusinessSettings, Receipt, Modifier } from '../types/pos';

interface LoginResponse {
  token: string;
  user: POSUser;
  currency: string;
}

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3004';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3005';
const REQUEST_TIMEOUT = 10000; // 10 seconds
const WS_RECONNECT_INTERVAL = 5000; // Initial 5 seconds for WebSocket reconnection
const WS_MAX_RECONNECT_INTERVAL = 30000; // Max 30 seconds
const WS_RECONNECT_DECAY = 1.5; // Exponential backoff factor
const MAX_RETRIES = 2; // Max retry attempts for failed requests
const RETRY_DELAY = 1000; // Initial retry delay in ms
const PING_INTERVAL = 30000; // 30 seconds for WebSocket ping

class POSApi {
  private token: string | null = null;
  private ws: WebSocket | null = null;
  private wsListeners: Map<string, (data: any) => void> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.validateEnvironment();
    this.token = localStorage.getItem('pos_token');
    this.initializeWebSocket();
  }

  /* ==================== */
  /*  Private Methods     */
  /* ==================== */

  private validateEnvironment(): void {
    if (!import.meta.env.VITE_API_URL && window.location.hostname === 'localhost') {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Using default API URL',
        url: API_BASE_URL
      }, null, 2));
    }
  }

  private initializeWebSocket(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = this.token ? `${WS_URL}?token=${this.token}` : WS_URL;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => this.handleWebSocketOpen(wsUrl);
      this.ws.onmessage = (event) => this.handleWebSocketMessage(event);
      this.ws.onerror = (error) => this.handleWebSocketError(wsUrl, error);
      this.ws.onclose = () => this.handleWebSocketClose(wsUrl);
    } catch (error) {
      this.logWebSocketError('Failed to initialize WebSocket', error);
      this.scheduleReconnect();
    }
  }

  private handleWebSocketOpen(wsUrl: string): void {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'WebSocket connected',
      url: wsUrl,
    }, null, 2));

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempts = 0;

    // Setup ping/pong mechanism
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, PING_INTERVAL);
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Handle pong responses
      if (data.type === 'pong') return;
      
      // Normal message handling
      const { event: evt, data: eventData } = data;
      this.wsListeners.forEach((callback, key) => {
        if (key === evt) callback(eventData);
      });
    } catch (error) {
      this.logWebSocketError('WebSocket message parse error', error);
    }
  }

  private handleWebSocketError(wsUrl: string, error: Event): void {
    this.logWebSocketError('WebSocket error', error, { url: wsUrl });
  }

  private handleWebSocketClose(wsUrl: string): void {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'WebSocket disconnected',
      url: wsUrl,
    }, null, 2));

    // Clean up ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.ws = null;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (!this.reconnectTimeout) {
      const delay = Math.min(
        WS_RECONNECT_INTERVAL * Math.pow(WS_RECONNECT_DECAY, this.reconnectAttempts),
        WS_MAX_RECONNECT_INTERVAL
      );
      this.reconnectAttempts++;
      
      this.reconnectTimeout = setTimeout(() => {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Attempting WebSocket reconnection',
          url: WS_URL,
          attempt: this.reconnectAttempts,
          delay,
        }, null, 2));
        this.initializeWebSocket();
      }, delay);
    }
  }

  private logWebSocketError(message: string, error: unknown, context?: any): void {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error: error instanceof Error ? error.message : String(error),
      ...context
    }, null, 2));
  }

  private async requestWithRetry(
    endpoint: string,
    options: RequestInit = {},
    retries = MAX_RETRIES,
    delay = RETRY_DELAY
  ): Promise<any> {
    try {
      return await this.request(endpoint, options);
    } catch (error) {
      if (retries > 0 && 
          error instanceof Error && 
          !error.message.includes('401') && 
          !error.message.includes('400')) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.requestWithRetry(endpoint, options, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['X-POS-Token'] = this.token;
    } else if (endpoint !== '/auth/login') {
      throw new Error('No authentication token available');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Sending request to ${url}`,
        method: options.method || 'GET',
        body: options.body,
      }, null, 2));

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });

      clearTimeout(timeoutId);

      // Handle CORS-specific errors
      if (response.type === 'opaque' && response.status === 0) {
        throw new Error('CORS error: Request was blocked due to CORS policy');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        this.logRequestError(url, options.method || 'GET', response.status, error);
        
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded: ${error.error || 'Too many requests'}. Try again after ${error.retryAfter || 'unknown'} seconds`);
        } else if (response.status === 401) {
          this.logout();
          throw new Error('Unauthorized: Invalid or expired token');
        } else if (response.status === 403) {
          throw new Error('Forbidden: Insufficient permissions');
        } else {
          throw new Error(error.error || `API request failed: ${response.statusText} (${response.status})`);
        }
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        this.logRequestError(url, options.method || 'GET', 0, { error: `Request timed out after ${REQUEST_TIMEOUT}ms` });
        throw new Error(`Request to ${url} timed out after ${REQUEST_TIMEOUT}ms`);
      }
      
      if (error instanceof Error && error.message.includes('CORS')) {
        this.logRequestError(url, options.method || 'GET', 0, { 
          error: error.message,
          suggestion: 'Check server CORS configuration and ensure proper headers are set'
        });
        throw new Error('Cross-origin request blocked. Please contact support if this persists.');
      }
      
      throw error;
    }
  }

  private logRequestError(url: string, method: string, status: number, error: any): void {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `Request failed for ${url}`,
      method,
      status,
      error: error.error || error.message || String(error),
      retryAfter: error.retryAfter,
    }, null, 2));
  }

  /* ==================== */
  /*  Public Methods      */
  /* ==================== */

  // WebSocket Management
  addWebSocketListener(event: string, callback: (data: unknown) => void): void {
    this.wsListeners.set(event, callback);
  }

  removeWebSocketListener(event: string): void {
    this.wsListeners.delete(event);
  }

  disconnectWebSocket(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Authentication
  async login(staff_id: string, pin: string): Promise<LoginResponse> {
    if (!staff_id || !pin) {
      throw new Error('Invalid login credentials: staff_id and pin are required');
    }
    const response = await this.requestWithRetry('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ staff_id, pin }),
    });
    this.token = response.token;
    localStorage.setItem('pos_token', response.token);
    localStorage.setItem('pos_user', JSON.stringify(response.user));
    this.initializeWebSocket();
    return response;
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    this.disconnectWebSocket();
  }

  // Business Settings
  async getBusinessSettings(): Promise<BusinessSettings> {
    const settings = await this.requestWithRetry('/settings/business');
    return {
      id: settings.id || 1,
      business_name: settings.business_name || 'Unknown',
      currency: settings.currency || 'UGX',
      tax_rate: parseFloat(settings.tax_rate),
      receipt_footer: settings.receipt_footer || ''
    };
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const stats = await this.requestWithRetry('/dashboard/stats');
    return {
      todaySales: parseFloat(stats.todaySales) || 0,
      todayOrders: parseInt(stats.todayOrders) || 0,
      activeOrders: parseInt(stats.activeOrders) || 0,
      availableTables: parseInt(stats.availableTables) || 0,
      totalTips: parseFloat(stats.totalTips) || 0,
      averageOrderValue: parseFloat(stats.averageOrderValue) || 0,
      currency: stats.currency || 'UGX',
    };
  }

  // Menu
  async getMenuItems(): Promise<MenuItem[]> {
    const items = await this.requestWithRetry('/menu/items');
    return items.map((item: any) => ({
      ...item,
      id: item.id || '',
      name: item.name || '',
      description: item.description || '',
      price: parseFloat(item.price) || 0,
      cost_price: parseFloat(item.cost_price) || 0,
      profit_margin: parseFloat(item.profit_margin) || 0,
      is_available: item.is_available || false,
      category_id: item.category_id || '',
      image_url: item.image_url || '',
      abv: item.abv ? parseFloat(item.abv) : undefined,
      calories: item.calories ? parseInt(item.calories) : undefined,
      spice_level: parseInt(item.spice_level) || 0,
      preparation_time: parseInt(item.preparation_time) || 0,
      modifiers: item.modifiers || [],
      category: item.category || null,
    }));
  }

  async getMenuCategories(): Promise<MenuCategory[]> {
    const categories = await this.requestWithRetry('/menu/categories');
    return categories.map((category: any) => ({
      id: category.id || '',
      name: category.name || '',
      description: category.description || '',
      is_active: category.is_active || false,
      color: category.color || '#000000',
      icon: category.icon || '',
      business_type: category.business_type || 'food',
      sort_order: parseInt(category.sort_order) || 0,
    }));
  }

  // Tables
  async getTables(): Promise<Table[]> {
    const tables = await this.requestWithRetry('/tables');
    return tables.map((table: any) => ({
      id: table.id || '',
      number: table.number || '',
      name: table.name || '',
      status: table.status || 'unknown',
      capacity: parseInt(table.capacity) || 0,
      x_position: parseFloat(table.x_position) || 0,
      y_position: parseFloat(table.y_position) || 0,
      shape: table.shape || 'rectangle',
      rotation: parseInt(table.rotation) || 0,
    }));
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    const orders = await this.requestWithRetry('/orders');
    return orders.map((order: any) => ({
      id: order.id || '',
      order_number: order.order_number || '',
      table_id: order.table_id || null,
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      customer_count: parseInt(order.customer_count) || 0,
      order_type: order.order_type || 'dine_in',
      status: order.status || 'open',
      subtotal: parseFloat(order.subtotal) || 0,
      tax_amount: parseFloat(order.tax_amount) || 0,
      discount_amount: parseFloat(order.discount_amount) || 0,
      tip_amount: parseFloat(order.tip_amount) || 0,
      total_amount: parseFloat(order.total_amount) || 0,
      notes: order.notes || '',
      special_requests: order.special_requests || '',
      estimated_time: parseInt(order.estimated_time) || 0,
      server_id: order.server_id || '',
      priority: order.priority || 'normal',
      created_at: order.created_at || new Date().toISOString(),
      updated_at: order.updated_at || new Date().toISOString(),
      items: order.items?.map((item: any) => ({
        id: item.id || '',
        order_id: item.order_id || '',
        menu_item_id: item.menu_item_id || '',
        quantity: parseInt(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        total_price: parseFloat(item.total_price) || 0,
        modifiers: item.modifiers || [],
        special_instructions: item.special_instructions || '',
        menu_item: item.menu_item ? {
          id: item.menu_item.id || '',
          name: item.menu_item.name || '',
          price: parseFloat(item.menu_item.price) || 0,
          is_available: item.menu_item.is_available || false,
        } : null,
      })) || [],
      table: order.table ? {
        id: order.table.id || '',
        number: order.table.number || '',
        name: order.table.name || '',
        status: order.table.status || 'unknown',
        capacity: parseInt(order.table.capacity) || 0,
        x_position: parseFloat(order.table.x_position) || 0,
        y_position: parseFloat(order.table.y_position) || 0,
      } : null,
      server: order.server || null,
      currency: order.currency || 'UGX',
    }));
  }

  async getPendingOrders(userId: string): Promise<Order[]> {
    if (!userId) {
      throw new Error('Invalid userId: userId is required');
    }
    const orders = await this.requestWithRetry(`/orders?user_id=${userId}&status=open,sent_to_kitchen,preparing,ready`);
    return orders.map((order: any) => ({
      ...order,
      subtotal: parseFloat(order.subtotal) || 0,
      tax_amount: parseFloat(order.tax_amount) || 0,
      discount_amount: parseFloat(order.discount_amount) || 0,
      tip_amount: parseFloat(order.tip_amount) || 0,
      total_amount: parseFloat(order.total_amount) || 0,
      customer_count: parseInt(order.customer_count) || 0,
      estimated_time: parseInt(order.estimated_time) || 0,
      items: order.items?.map((item: any) => ({
        ...item,
        quantity: parseInt(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        total_price: parseFloat(item.total_price) || 0,
        menu_item: item.menu_item ? {
          ...item.menu_item,
          price: parseFloat(item.menu_item.price) || 0,
          is_available: item.menu_item.is_available || false,
        } : null,
      })) || [],
      table: order.table ? {
        id: order.table.id || '',
        number: order.table.number || '',
        name: order.table.name || '',
        status: order.table.status || 'unknown',
        capacity: parseInt(order.table.capacity) || 0,
        x_position: parseFloat(order.table.x_position) || 0,
        y_position: parseFloat(order.table.y_position) || 0,
      } : null,
      server: order.server || null,
      currency: order.currency || 'UGX',
    }));
  }

  async createOrder(orderData: OrderData): Promise<Order> {
    if (!orderData.user_id || !orderData.order_type || !orderData.items?.length) {
      throw new Error('Invalid order data: user_id, order_type, and items are required');
    }
    try {
      const order = await this.requestWithRetry('/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...orderData,
          items: orderData.items.map(item => ({
            ...item,
            modifiers: item.modifiers || [],
            special_instructions: item.special_instructions || null,
          })),
        }),
      });
      return {
        ...order,
        subtotal: parseFloat(order.subtotal) || 0,
        tax_amount: parseFloat(order.tax_amount) || 0,
        discount_amount: parseFloat(order.discount_amount) || 0,
        tip_amount: parseFloat(order.tip_amount) || 0,
        total_amount: parseFloat(order.total_amount) || 0,
        customer_count: parseInt(order.customer_count) || 0,
        estimated_time: parseInt(order.estimated_time) || 0,
        items: order.items?.map((item: any) => ({
          ...item,
          quantity: parseInt(item.quantity) || 0,
          unit_price: parseFloat(item.unit_price) || 0,
          total_price: parseFloat(item.total_price) || 0,
          menu_item: item.menu_item ? {
            ...item.menu_item,
            price: parseFloat(item.menu_item.price) || 0,
            is_available: item.menu_item.is_available || false,
          } : null,
        })) || [],
        table: order.table ? {
          id: order.table.id || '',
          number: order.table.number || '',
          name: order.table.name || '',
          status: order.table.status || 'unknown',
          capacity: parseInt(order.table.capacity) || 0,
          x_position: parseFloat(order.table.x_position) || 0,
          y_position: parseFloat(order.table.y_position) || 0,
        } : null,
        server: order.server || null,
        currency: order.currency || 'UGX',
      };
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Failed to create order',
        error: error instanceof Error ? error.message : String(error),
        table_id: orderData.table_id,
      }, null, 2));
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: string, userId: string, kitchenNotes?: string): Promise<void> {
    if (!orderId || !status || !userId) {
      throw new Error('Invalid order status update: orderId, status, and userId are required');
    }
    await this.requestWithRetry(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, user_id: userId, kitchen_notes: kitchenNotes || null }),
    });
  }

  async processPayment(orderId: string, paymentData: PaymentData): Promise<void> {
    if (!orderId || !paymentData.user_id || !paymentData.payment_method || paymentData.amount == null) {
      throw new Error('Invalid payment data: orderId, user_id, payment_method, and amount are required');
    }
    await this.requestWithRetry(`/orders/${orderId}/payment`, {
      method: 'POST',
      body: JSON.stringify({
        ...paymentData,
        tip_amount: paymentData.tip_amount || 0,
      }),
    });
  }

  // Receipts
  async getReceipt(orderId: string): Promise<Receipt> {
    if (!orderId) {
      throw new Error('Invalid orderId: orderId is required');
    }
    const receipt = await this.requestWithRetry(`/receipts/${orderId}`);
    return {
      id: receipt.id || '',
      receipt_number: receipt.receipt_number || '',
      order_id: receipt.order_id || '',
      order_number: receipt.order_number || '',
      receipt_data: {
        business_name: receipt.receipt_data.business_name || 'Unknown',
        order_number: receipt.receipt_data.order_number || '',
        items: receipt.receipt_data.items?.map((item: any) => ({
          name: item.name || '',
          quantity: parseInt(item.quantity) || 0,
          unit_price: parseFloat(item.unit_price) || 0,
          total_price: parseFloat(item.total_price) || 0,
          modifiers: item.modifiers || [],
        })) || [],
        subtotal: parseFloat(receipt.receipt_data.subtotal) || 0,
        tax_amount: parseFloat(receipt.receipt_data.tax_amount) || 0,
        discount_amount: parseFloat(receipt.receipt_data.discount_amount) || 0,
        tip_amount: parseFloat(receipt.receipt_data.tip_amount) || 0,
        total_amount: parseFloat(receipt.receipt_data.total_amount) || 0,
        payment_method: receipt.receipt_data.payment_method || '',
        change_amount: parseFloat(receipt.receipt_data.change_amount) || 0,
        timestamp: receipt.receipt_data.timestamp || new Date().toISOString(),
        receipt_footer: receipt.receipt_data.receipt_footer || '',
      },
      receipt_type: receipt.receipt_type || 'customer',
      created_at: receipt.created_at || new Date().toISOString(),
      currency: receipt.currency || 'UGX',
    };
  }

  // Modifiers
  async getModifiers(): Promise<Modifier[]> {
    const modifiers = await this.requestWithRetry('/modifiers');
    return modifiers.map((modifier: any) => ({
      id: modifier.id || '',
      name: modifier.name || '',
      type: modifier.type || '',
      required: modifier.required || false,
      max_selections: parseInt(modifier.max_selections) || 0,
      options: modifier.options?.map((option: any) => ({
        id: option.id || '',
        name: option.name || '',
        price_adjustment: parseFloat(option.price_adjustment) || 0,
      })) || [],
    }));
  }

  // Shifts
  async startShift(userId: string, startingCash: number): Promise<Shift> {
    if (!userId || startingCash == null || isNaN(startingCash)) {
      throw new Error('Invalid shift data: userId and startingCash are required and must be valid');
    }
    const shift = await this.requestWithRetry('/shifts/start', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, starting_cash: startingCash }),
    });
    return {
      id: shift.id || '',
      user_id: shift.user_id || '',
      starting_cash: parseFloat(shift.starting_cash) || 0,
      ending_cash: shift.ending_cash ? parseFloat(shift.ending_cash) : undefined,
      total_sales: parseFloat(shift.total_sales) || 0,
      total_tips: parseFloat(shift.total_tips) || 0,
      total_orders: parseInt(shift.total_orders) || 0,
      cash_sales: parseFloat(shift.cash_sales) || 0,
      card_sales: parseFloat(shift.card_sales) || 0,
      mobile_sales: parseFloat(shift.mobile_sales) || 0,
      status: shift.status || 'active',
      start_time: shift.start_time || new Date().toISOString(),
      end_time: shift.end_time || null,
      notes: shift.notes || '',
      currency: shift.currency || 'UGX',
    };
  }

  async endShift(userId: string, endingCash: number): Promise<Shift> {
    if (!userId || endingCash == null || isNaN(endingCash)) {
      throw new Error('Invalid shift data: userId and endingCash are required and must be valid');
    }
    const shift = await this.requestWithRetry('/shifts/end', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, ending_cash: endingCash }),
    });
    return {
      id: shift.id || '',
      user_id: shift.user_id || '',
      starting_cash: parseFloat(shift.starting_cash) || 0,
      ending_cash: parseFloat(shift.ending_cash) || 0,
      total_sales: parseFloat(shift.total_sales) || 0,
      total_tips: parseFloat(shift.total_tips) || 0,
      total_orders: parseInt(shift.total_orders) || 0,
      cash_sales: parseFloat(shift.cash_sales) || 0,
      card_sales: parseFloat(shift.card_sales) || 0,
      mobile_sales: parseFloat(shift.mobile_sales) || 0,
      status: shift.status || 'closed',
      start_time: shift.start_time || new Date().toISOString(),
      end_time: shift.end_time || new Date().toISOString(),
      notes: shift.notes || '',
      currency: shift.currency || 'UGX',
    };
  }

  async getCurrentShift(userId: string): Promise<Shift | null> {
    if (!userId) {
      throw new Error('Invalid userId: userId is required');
    }
    const shift = await this.requestWithRetry(`/shifts/current?user_id=${userId}`);
    if (!shift) return null;
    return {
      id: shift.id || '',
      user_id: shift.user_id || '',
      starting_cash: parseFloat(shift.starting_cash) || 0,
      ending_cash: shift.ending_cash ? parseFloat(shift.ending_cash) : undefined,
      total_sales: parseFloat(shift.total_sales) || 0,
      total_tips: parseFloat(shift.total_tips) || 0,
      total_orders: parseInt(shift.total_orders) || 0,
      cash_sales: parseFloat(shift.cash_sales) || 0,
      card_sales: parseFloat(shift.card_sales) || 0,
      mobile_sales: parseFloat(shift.mobile_sales) || 0,
      status: shift.status || 'active',
      start_time: shift.start_time || new Date().toISOString(),
      end_time: shift.end_time || null,
      notes: shift.notes || '',
      currency: shift.currency || 'UGX',
    };
  }
}

export const posApi = new POSApi();