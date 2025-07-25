import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { POSUser, Order, Table, MenuItem, MenuCategory, CartItem, BusinessSettings } from '../types/pos';
import { posApi } from '../lib/api';
import toast from 'react-hot-toast';

interface Shift {
  id: string;
  user_id: string;
  starting_cash: number;
  status: string;
  start_time: string;
  end_time?: string;
  ending_cash?: number;
  total_sales?: number;
  total_tips?: number;
  total_orders?: number;
  cash_sales?: number;
  card_sales?: number;
  mobile_sales?: number;
}

interface POSState {
  currentUser: POSUser | null;
  currentShift: Shift | null;
  currentOrder: Order | null;
  selectedTable: Table | null;
  cart: CartItem[];
  orders: Order[];
  tables: Table[];
  menuItems: MenuItem[];
  categories: MenuCategory[];
  businessSettings: BusinessSettings | null;
  loading: boolean;
  discountType: 'percentage' | 'amount' | null;
  discountValue: number;
  login: (staffId: string, pin: string) => Promise<boolean>;
  logout: () => void;
  startShift: (startingCash: number) => Promise<void>;
  endShift: (endingCash: number) => Promise<Shift>;
  getCurrentShift: (userId: string) => Promise<void>;
  selectTable: (table: Table | null) => void;
  addToCart: (item: MenuItem, modifiers?: any[], instructions?: string) => void;
  updateCartItem: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  setDiscount: (type: 'percentage' | 'amount' | null, value: number) => void;
  createOrder: (orderType: string, customerName?: string, sendToKitchen?: boolean) => Promise<Order>;
  sendToKitchen: (orderId: string) => Promise<void>;
  processPayment: (orderId: string, paymentMethod: string, amount: number, tip?: number) => Promise<void>;
  fetchData: () => Promise<void>;
  fetchBusinessSettings: () => Promise<void>;
  playSound: (type: 'order_created' | 'order_ready' | 'payment_success') => void;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      currentShift: null,
      currentOrder: null,
      selectedTable: null,
      cart: [],
      orders: [],
      tables: [],
      menuItems: [],
      categories: [],
      businessSettings: null,
      loading: false,
      discountType: null,
      discountValue: 0,

      login: async (staffId: string, pin: string) => {
        set({ loading: true });
        try {
          const { user, token } = await posApi.login(staffId, pin);
          set({ currentUser: user });
          localStorage.setItem('pos_token', token);
          localStorage.setItem('user_id', user.id);
          posApi.addWebSocketListener('order_created', async () => {
            await get().fetchData();
            get().playSound('order_created');
          });
          posApi.addWebSocketListener('order_status_updated', async () => {
            await get().fetchData();
            get().playSound('order_ready');
          });
          posApi.addWebSocketListener('payment_processed', async () => {
            await get().fetchData();
            get().playSound('payment_success');
          });
          return true;
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Login error',
            endpoint: '/auth/login',
            method: 'POST',
            error: error instanceof Error ? error.message : String(error),
          }, null, 2));
          const errorMessage = error instanceof Error && error.message.includes('Rate limit exceeded')
            ? error.message
            : `Login failed: ${error instanceof Error ? error.message : String(error)}`;
          toast.error(errorMessage);
          return false;
        } finally {
          set({ loading: false });
        }
      },

      logout: () => {
        posApi.logout();
        localStorage.removeItem('pos_token');
        localStorage.removeItem('user_id');
        set({ currentUser: null, currentShift: null, cart: [], orders: [], tables: [], menuItems: [], categories: [], businessSettings: null });
      },

      startShift: async (startingCash: number) => {
        const { currentUser } = get();
        if (!currentUser) throw new Error('No user logged in');
        set({ loading: true });
        try {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Starting shift',
            userId: currentUser.id,
            startingCash,
            endpoint: '/shifts/start',
            method: 'POST',
          }, null, 2));
          const shift = await posApi.startShift(currentUser.id, startingCash);
          set({ currentShift: shift });
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Error starting shift',
            endpoint: '/shifts/start',
            method: 'POST',
            error: error instanceof Error ? error.message : String(error),
          }, null, 2));
          const errorMessage = error instanceof Error && error.message.includes('Rate limit exceeded')
            ? error.message
            : `Failed to start shift: ${error instanceof Error ? error.message : String(error)}`;
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      endShift: async (endingCash: number) => {
        const { currentUser } = get();
        if (!currentUser) throw new Error('No user logged in');
        if (endingCash < 0) throw new Error('Ending cash cannot be negative');
        const pendingOrders = await posApi.getPendingOrders(currentUser.id);
        if (pendingOrders.length > 0) {
          throw new Error(`Cannot end shift with ${pendingOrders.length} pending orders`);
        }
        set({ loading: true });
        try {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Ending shift',
            userId: currentUser.id,
            endingCash,
            endpoint: '/shifts/end',
            method: 'POST',
          }, null, 2));
          const shift = await posApi.endShift(currentUser.id, endingCash);
          set({ currentShift: null });
          get().playSound('payment_success');
          return shift;
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Error ending shift',
            endpoint: '/shifts/end',
            method: 'POST',
            error: error instanceof Error ? error.message : String(error),
          }, null, 2));
          const errorMessage = error instanceof Error && error.message.includes('Rate limit exceeded')
            ? error.message
            : `Failed to end shift: ${error instanceof Error ? error.message : String(error)}`;
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      getCurrentShift: async (userId: string) => {
        set({ loading: true });
        try {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Fetching current shift',
            userId,
            endpoint: `/shifts/current?user_id=${userId}`,
            method: 'GET',
          }, null, 2));
          const shift = await posApi.getCurrentShift(userId);
          set({ currentShift: shift });
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Error fetching shift',
            endpoint: `/shifts/current?user_id=${userId}`,
            method: 'GET',
            error: error instanceof Error ? error.message : String(error),
          }, null, 2));
          const errorMessage = error instanceof Error && error.message.includes('Rate limit exceeded')
            ? error.message
            : `Failed to fetch shift: ${error instanceof Error ? error.message : String(error)}`;
          toast.error(errorMessage);
        } finally {
          set({ loading: false });
        }
      },

      selectTable: (table: Table | null) => {
        const validatedTable = table ? {
          id: table.id || '',
          number: table.number || '',
          name: table.name || '',
          status: table.status || 'unknown',
          capacity: table.capacity || 0,
          x_position: table.x_position || 0,
          y_position: table.y_position || 0,
        } : null;
        set({ selectedTable: validatedTable });
      },

      addToCart: (item: MenuItem, modifiers: any[] = [], instructions: string = '') => {
        const cartItem: CartItem = {
          id: `${item.id}-${Date.now()}`,
          menu_item: item,
          quantity: 1,
          unit_price: item.price,
          total_price: item.price,
          modifiers,
          special_instructions: instructions || null,
        };
        set(state => ({ cart: [...state.cart, cartItem] }));
      },

      updateCartItem: (id: string, quantity: number) => {
        set(state => ({
          cart: state.cart
            .map(item =>
              item.id === id
                ? { ...item, quantity, total_price: (parseFloat(item.unit_price.toString()) * quantity).toFixed(2) }
                : item
            )
            .filter(item => item.quantity > 0),
        }));
      },

      removeFromCart: (id: string) => {
        set(state => ({ cart: state.cart.filter(item => item.id !== id) }));
      },

      clearCart: () => {
        set({ cart: [], selectedTable: null, discountType: null, discountValue: 0 });
      },

      setDiscount: (type: 'percentage' | 'amount' | null, value: number) => {
        set({ discountType: type, discountValue: value });
      },

      createOrder: async (orderType: string, customerName = '', sendToKitchen = false) => {
        const { currentUser, selectedTable, cart, discountType, discountValue } = get();
        if (!currentUser) throw new Error('No user logged in');
        if (cart.length === 0) throw new Error('Cart is empty');
        if (orderType === 'dine_in' && !selectedTable) throw new Error('No table selected');
        
        // Allow orders even without active shift
        const { currentShift } = get();
        if (!currentShift && ['server', 'bartender', 'cashier'].includes(currentUser.role)) {
          console.warn('Creating order without active shift');
        }
        
        set({ loading: true });
        try {
          const items = cart.map(item => ({
            menu_item_id: item.menu_item.id,
            quantity: item.quantity,
            unit_price: parseFloat(item.unit_price.toString()).toFixed(2),
            total_price: parseFloat(item.total_price.toString()).toFixed(2),
            modifiers: item.modifiers,
            special_instructions: item.special_instructions,
          }));
          const orderData = {
            table_id: selectedTable?.id || null,
            customer_name: customerName || null,
            order_type: orderType,
            items,
            user_id: currentUser.id,
            discount_type: discountType,
            discount_value: discountValue.toString(),
            status: sendToKitchen ? 'sent_to_kitchen' : 'open',
            priority: items.some(item => item.special_instructions?.toLowerCase().includes('urgent')) ? 'urgent' : 'normal',
            customer_count: 1,
            estimated_time: 15,
          };
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Creating order',
            endpoint: '/orders',
            method: 'POST',
            orderData,
            sendToKitchen,
          }, null, 2));
          const order = await posApi.createOrder(orderData);
          set({ currentOrder: order, cart: [], selectedTable: null, discountType: null, discountValue: 0 });
          await get().fetchData();
          if (sendToKitchen) {
            get().playSound('order_created');
          }
          return order;
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Error creating order',
            endpoint: '/orders',
            method: 'POST',
            error: error instanceof Error ? error.message : String(error),
          }, null, 2));
          const errorMessage = error instanceof Error && error.message.includes('Rate limit exceeded')
            ? error.message
            : `Failed to create order: ${error instanceof Error ? error.message : String(error)}`;
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      sendToKitchen: async (orderId: string) => {
        const { currentUser } = get();
        if (!currentUser) throw new Error('No user logged in');
        set({ loading: true });
        try {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Sending order to kitchen',
            orderId,
            userId: currentUser.id,
            endpoint: `/orders/${orderId}/status`,
            method: 'PUT',
          }, null, 2));
          await posApi.updateOrderStatus(orderId, 'sent_to_kitchen', currentUser.id);
          await get().fetchData();
          get().playSound('order_created');
          toast.success('Order sent to kitchen!');
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Error sending to kitchen',
            endpoint: `/orders/${orderId}/status`,
            method: 'PUT',
            error: error instanceof Error ? error.message : String(error),
          }, null, 2));
          const errorMessage = error instanceof Error && error.message.includes('Rate limit exceeded')
            ? error.message
            : `Failed to send to kitchen: ${error instanceof Error ? error.message : String(error)}`;
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      processPayment: async (orderId: string, paymentMethod: string, amount: number, tip = 0) => {
        const { currentUser } = get();
        if (!currentUser) throw new Error('No user logged in');
        
        // Allow payment processing even without active shift
        const { currentShift } = get();
        if (!currentShift && ['server', 'bartender', 'cashier'].includes(currentUser.role)) {
          console.warn('Processing payment without active shift');
        }
        
        set({ loading: true });
        try {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Processing payment',
            orderId,
            paymentMethod,
            amount,
            tip,
            endpoint: `/orders/${orderId}/payment`,
            method: 'POST',
          }, null, 2));
          await posApi.processPayment(orderId, { payment_method: paymentMethod, amount, tip_amount: tip, user_id: currentUser.id });
          await get().fetchData();
          get().playSound('payment_success');
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Error processing payment',
            endpoint: `/orders/${orderId}/payment`,
            method: 'POST',
            error: error instanceof Error ? error.message : String(error),
          }, null, 2));
          const errorMessage = error instanceof Error && error.message.includes('Rate limit exceeded')
            ? error.message
            : `Failed to process payment: ${error instanceof Error ? error.message : String(error)}`;
          toast.error(errorMessage);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      fetchData: async () => {
        const { currentUser } = get();
        set({ loading: true });
        try {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Fetching POS data',
            endpoints: ['/tables', '/menu/items', '/menu/categories', '/orders', '/shifts/current', '/settings/business'],
            method: 'GET',
          }, null, 2));
          const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 10000));
          const [tables, menuItems, categories, orders, shift, businessSettings] = await Promise.race([
            Promise.all([
              posApi.getTables(),
              posApi.getMenuItems(),
              posApi.getMenuCategories(),
              posApi.getOrders(),
              currentUser ? posApi.getCurrentShift(currentUser.id) : Promise.resolve(null),
              posApi.getBusinessSettings(),
            ]),
            timeout,
          ]);
          set({ tables, menuItems, categories, orders, currentShift: shift, businessSettings });
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Error fetching data',
            endpoints: ['/tables', '/menu/items', '/menu/categories', '/orders', '/shifts/current', '/settings/business'],
            method: 'GET',
            error: error instanceof Error ? error.message : String(error),
          }, null, 2));
          const errorMessage = error instanceof Error && error.message.includes('Rate limit exceeded')
            ? error.message
            : `Failed to load data: ${error instanceof Error ? error.message : String(error)}`;
          toast.error(errorMessage);
        } finally {
          set({ loading: false });
        }
      },

      fetchBusinessSettings: async () => {
        set({ loading: true });
        try {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Fetching business settings',
            endpoint: '/settings/business',
            method: 'GET',
          }, null, 2));
          const businessSettings = await posApi.getBusinessSettings();
          set({ businessSettings });
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Error fetching business settings',
            endpoint: '/settings/business',
            method: 'GET',
            error: error instanceof Error ? error.message : String(error),
          }, null, 2));
          const errorMessage = error instanceof Error && error.message.includes('Rate limit exceeded')
            ? error.message
            : `Failed to fetch business settings: ${error instanceof Error ? error.message : String(error)}`;
          toast.error(errorMessage);
        } finally {
          set({ loading: false });
        }
      },

      playSound: (type: 'order_created' | 'order_ready' | 'payment_success') => {
        const audio = new Audio(`/sounds/${type}.mp3`);
        audio.play().catch(error => console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Error playing sound',
          type,
          error: error instanceof Error ? error.message : String(error),
        }, null, 2)));
      },
    }),
    {
      name: 'pos-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        currentShift: state.currentShift,
        cart: state.cart,
        selectedTable: state.selectedTable,
        discountType: state.discountType,
        discountValue: state.discountValue,
      }),
    }
  )
);