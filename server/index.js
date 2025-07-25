
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';

dotenv.config();

// Validate environment variables
const requiredEnvVars = ['PG_HOST', 'PG_PORT', 'PG_DATABASE', 'PG_USER', 'PG_PASSWORD'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `Missing required environment variable: ${envVar}`
    }, null, 2));
    process.exit(1);
  }
}

const app = express();
const port = process.env.PORT || 3004;
const wsPort = process.env.WS_PORT || 3005;

// PostgreSQL client
const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT),
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Test database connection
pool.connect((err) => {
  if (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to connect to PostgreSQL',
      error: err.message
    }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Connected to PostgreSQL'
  }, null, 2));
});

// In-memory cache for frequently accessed data
const cache = {
  businessSettings: null,
  menuItems: null,
  menuCategories: null,
  lastUpdated: null
};

// Function to refresh cache
const refreshCache = async () => {
  try {
    const { rows: settings } = await pool.query('SELECT * FROM business_settings LIMIT 1');
    cache.businessSettings = settings[0] || {
      business_name: 'Default Business',
      currency: 'UGX',
      tax_rate: 10.00,
      receipt_footer: ''
    };

    const { rows: items } = await pool.query(`
      SELECT mi.*, mc.name AS category_name, mc.color AS colored, mc.icon, mc.business_type, mc.sort_order
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.is_available = TRUE
      ORDER BY mi.name
    `);
    const itemIds = items.map(item => item.id);
    const { rows: itemModifiers } = await pool.query(`
      SELECT im.item_id, m.id AS modifier_id, m.name AS modifier_name, m.type, m.required, m.max_selections,
             mo.id AS option_id, mo.name AS option_name, mo.price_adjustment
      FROM item_modifiers im
      JOIN modifiers m ON im.modifier_id = m.id
      LEFT JOIN modifier_options mo ON m.id = mo.modifier_id
      WHERE im.item_id = ANY($1)
    `, [itemIds]);
    cache.menuItems = items.map(item => ({
      ...item,
      category: item.category_name ? {
        id: item.category_id,
        name: item.category_name,
        color: item.colored,
        icon: item.icon,
        business_type: item.business_type,
        sort_order: item.sort_order
      } : null,
      modifiers: itemModifiers
        .filter(im => im.item_id === item.id)
        .map(im => ({
          id: im.modifier_id,
          name: im.modifier_name,
          type: im.type,
          required: im.required,
          max_selections: im.max_selections,
          options: itemModifiers
            .filter(opt => opt.modifier_id === im.modifier_id && opt.option_id)
            .map(opt => ({
              id: opt.option_id,
              name: opt.option_name,
              price_adjustment: opt.price_adjustment
            }))
        }))
        .filter(mod => mod.options.length > 0)
    }));

    const { rows: categories } = await pool.query(`
      SELECT * FROM menu_categories
      WHERE is_active = TRUE
      ORDER BY sort_order
    `);
    cache.menuCategories = categories;

    cache.lastUpdated = new Date().toISOString();
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Cache refreshed',
      cacheKeys: Object.keys(cache)
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to refresh cache',
      error: error.message
    }, null, 2));
  }
};

// Refresh cache on startup and every 5 minutes
refreshCache();
setInterval(refreshCache, 5 * 60 * 1000);

// Dynamic CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'CORS policy violation',
        origin
      }, null, 2));
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-POS-Token'],
  credentials: true
}));
app.use(express.json());

// WebSocket server
const wss = new WebSocketServer({ port: wsPort }, () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `WebSocket server started on ws://localhost:${wsPort}`
  }, null, 2));
});

wss.on('error', (error) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: 'WebSocket server error',
    error: error.message
  }, null, 2));
});

const clients = new Set();

wss.on('connection', async (ws, req) => {
  const url = req.url || '';
  const token = new URLSearchParams(url.split('?')[1]).get('token');
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'WebSocket connection attempt',
    url,
    token: token || 'none',
    clientIp: req.socket.remoteAddress
  }, null, 2));

  if (!token) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'WebSocket connection rejected: Missing token',
      url,
      clientIp: req.socket.remoteAddress
    }, null, 2));
    ws.close(1008, 'Missing token');
    return;
  }

  const [, userId, timestamp] = token.split('_');
  if (!userId || !timestamp) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'WebSocket connection rejected: Invalid token format',
      url,
      token,
      clientIp: req.socket.remoteAddress
    }, null, 2));
    ws.close(1008, 'Invalid token format');
    return;
  }

  try {
    const { rows } = await pool.query(`
      SELECT id, is_active, role FROM pos_users
      WHERE id = $1 AND is_active = TRUE
    `, [userId]);

    if (rows.length === 0) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'WebSocket connection rejected: Invalid or inactive user',
        userId,
        url,
        clientIp: req.socket.remoteAddress
      }, null, 2));
      ws.close(1008, 'Invalid or inactive user');
      return;
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'WebSocket client connected',
      wsPort,
      userId,
      role: rows[0].role,
      url,
      clientIp: req.socket.remoteAddress
    }, null, 2));

    clients.add(ws);

    ws.on('message', (message) => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'WebSocket message received',
        data: message.toString(),
        userId,
        clientIp: req.socket.remoteAddress
      }, null, 2));
    });

    ws.on('close', (code, reason) => {
      clients.delete(ws);
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'WebSocket client disconnected',
        wsPort,
        userId,
        code,
        reason: reason.toString(),
        clientIp: req.socket.remoteAddress
      }, null, 2));
    });

    ws.on('error', (error) => {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'WebSocket client error',
        error: error.message,
        userId,
        url,
        clientIp: req.socket.remoteAddress
      }, null, 2));
    });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'WebSocket authentication error',
      error: error.message,
      userId,
      url,
      clientIp: req.socket.remoteAddress
    }, null, 2));
    ws.close(1008, 'Authentication error');
  }
});

// Broadcast function for WebSocket
const broadcast = (event, data) => {
  const message = JSON.stringify({ event, data });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Helper function for error handling
const handleError = (res, error, message = 'Internal server error') => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message,
    error: error.message
  }, null, 2));
  res.status(500).json({ 
    error: message,
    details: error.message 
  });
};

// Helper function for audit trail
const createAuditTrail = async (userId, action, description, metadata = {}) => {
  try {
    await pool.query(`
      INSERT INTO audit_trails (user_id, action, description, metadata, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [userId, action, description, JSON.stringify(metadata), '127.0.0.1', 'POS System']);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Audit trail error',
      error: error.message
    }, null, 2));
  }
};

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const token = req.headers['x-pos-token'];
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const [, userId] = token.split('_');
  if (!userId) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  try {
    const { rows } = await pool.query(`
      SELECT id, is_active, role FROM pos_users
      WHERE id = $1 AND is_active = TRUE
    `, [userId]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = { id: userId, role: rows[0].role };
    next();
  } catch (error) {
    handleError(res, error, 'Token validation failed');
  }
};

// Apply authentication to all routes except /auth/login and /health
app.use((req, res, next) => {
  if (req.path === '/auth/login' || req.path === '/health') {
    return next();
  }
  authenticateToken(req, res, next);
});

// Authentication Routes
app.post('/auth/login', async (req, res) => {
  try {
    const { staff_id, pin } = req.body;

    if (!staff_id || !pin) {
      return res.status(400).json({ error: 'Staff ID and PIN are required' });
    }

    const { rows } = await pool.query(`
      SELECT * FROM pos_users
      WHERE staff_id = $1 AND pin = $2 AND is_active = TRUE
    `, [staff_id, pin]);

    if (rows.length === 0) {
      await createAuditTrail(null, 'LOGIN_FAILED', 'Invalid login attempt', { staff_id });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    await pool.query(`
      UPDATE pos_users
      SET last_login = NOW()
      WHERE id = $1
    `, [user.id]);

    await createAuditTrail(user.id, 'LOGIN', 'User logged in', { staff_id });

    const token = `pos_${user.id}_${Date.now()}`;
    res.json({ 
      user: {
        id: user.id,
        staff_id: user.staff_id,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
        is_active: user.is_active
      }, 
      token,
      currency: cache.businessSettings.currency || 'UGX'
    });
  } catch (error) {
    handleError(res, error, 'Login failed');
  }
});

// Dashboard Routes
app.get('/dashboard/stats', async (req, res) => {
  try {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Processing dashboard stats request',
      userId: req.user.id,
      path: req.path,
      clientIp: req.socket.remoteAddress
    }, null, 2));

    const today = new Date().toISOString().split('T')[0];

    const { rows } = await pool.query(`
      SELECT 
        (SELECT COALESCE(json_agg(o), '[]'::json) FROM (
          SELECT total_amount, tip_amount, status
          FROM orders
          WHERE created_at >= $1
        ) o) AS today_orders,
        (SELECT COUNT(*) 
         FROM orders 
         WHERE status IN ('open', 'sent_to_kitchen', 'preparing', 'ready')
        ) AS active_orders,
        (SELECT COUNT(*) 
         FROM tables 
         WHERE status = 'available'
        ) AS available_tables
    `, [today]);

    const todayOrders = rows[0].today_orders || [];
    const paidOrders = todayOrders.filter(o => o.status === 'paid');
    const todaySales = paidOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const totalTips = paidOrders.reduce((sum, o) => sum + parseFloat(o.tip_amount || 0), 0);
    const averageOrderValue = paidOrders.length ? todaySales / paidOrders.length : 0;

    const stats = {
      todaySales,
      todayOrders: paidOrders.length,
      activeOrders: parseInt(rows[0].active_orders) || 0,
      availableTables: parseInt(rows[0].available_tables) || 0,
      totalTips,
      averageOrderValue,
      currency: cache.businessSettings.currency || 'UGX'
    };

    await createAuditTrail(req.user.id, 'FETCH_DASHBOARD_STATS', 'Fetched dashboard statistics', { stats });

    res.json(stats);
  } catch (error) {
    handleError(res, error, 'Failed to fetch dashboard stats');
  }
});

// Menu Routes
app.get('/menu/items', async (req, res) => {
  try {
    if (!cache.menuItems) {
      await refreshCache();
    }
    await createAuditTrail(req.user.id, 'FETCH_MENU_ITEMS', 'Fetched menu items', { itemCount: cache.menuItems.length });
    res.json(cache.menuItems);
  } catch (error) {
    handleError(res, error, 'Failed to fetch menu items');
  }
});

app.get('/menu/categories', async (req, res) => {
  try {
    if (!cache.menuCategories) {
      await refreshCache();
    }
    await createAuditTrail(req.user.id, 'FETCH_MENU_CATEGORIES', 'Fetched menu categories', { categoryCount: cache.menuCategories.length });
    res.json(cache.menuCategories);
  } catch (error) {
    handleError(res, error, 'Failed to fetch menu categories');
  }
});

// Table Routes
app.get('/tables', async (req, res) => {
  try {
    const { rows: tables } = await pool.query(`
      SELECT * FROM tables
      ORDER BY number
    `);

    await createAuditTrail(req.user.id, 'FETCH_TABLES', 'Fetched tables', { tableCount: tables.length });

    res.json(tables);
  } catch (error) {
    handleError(res, error, 'Failed to fetch tables');
  }
});

// Order Routes
app.get('/orders', async (req, res) => {
  try {
    const { user_id, status } = req.query;
    
    let query = `
      SELECT o.*, 
             t.number AS table_number, t.name AS table_name, t.status AS table_status,
             pu.staff_id, pu.full_name AS server_name,
             oi.id AS order_item_id, oi.quantity, oi.unit_price, oi.total_price, oi.modifiers AS order_item_modifiers, oi.special_instructions,
             mi.name AS menu_item_name, mi.price AS menu_item_price
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN pos_users pu ON o.server_id = pu.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
    `;
    const params = [];
    
    if (user_id) {
      query += ` WHERE o.server_id = $1`;
      params.push(user_id);
    }

    if (status) {
      const statusArray = status.split(',');
      const placeholders = statusArray.map((_, i) => `$${params.length + i + 1}`).join(',');
      query += user_id ? ` AND o.status IN (${placeholders})` : ` WHERE o.status IN (${placeholders})`;
      params.push(...statusArray);
    } else {
      const defaultStatuses = ['open', 'sent_to_kitchen', 'preparing', 'ready', 'served', 'paid'];
      const placeholders = defaultStatuses.map((_, i) => `$${params.length + i + 1}`).join(',');
      query += user_id ? ` AND o.status IN (${placeholders})` : ` WHERE o.status IN (${placeholders})`;
      params.push(...defaultStatuses);
    }

    query += ` ORDER BY o.created_at DESC`;

    const { rows } = await pool.query(query, params);

    const orders = rows.reduce((acc, row) => {
      let order = acc.find(o => o.id === row.id);
      if (!order) {
        order = {
          ...row,
          table: row.table_number ? { id: row.table_id, number: row.table_number, name: row.table_name, status: row.table_status } : null,
          server: { id: row.server_id, staff_id: row.staff_id, full_name: row.server_name },
          items: []
        };
        acc.push(order);
      }
      if (row.order_item_id) {
        order.items.push({
          id: row.order_item_id,
          order_id: row.order_id,
          menu_item_id: row.menu_item_id,
          quantity: row.quantity,
          unit_price: row.unit_price,
          total_price: row.total_price,
          modifiers: row.order_item_modifiers,
          special_instructions: row.special_instructions,
          menu_item: { id: row.menu_item_id, name: row.menu_item_name, price: row.menu_item_price }
        });
      }
      return acc;
    }, []);

    await createAuditTrail(req.user.id, 'FETCH_ORDERS', 'Fetched orders', { orderCount: orders.length });

    res.json(orders);
  } catch (error) {
    handleError(res, error, 'Failed to fetch orders');
  }
});

app.post('/orders', async (req, res) => {
  try {
    const { 
      table_id, 
      customer_name = '', 
      customer_phone = '',
      customer_count = 1,
      order_type = 'dine_in', 
      items, 
      user_id,
      discount_type,
      discount_value,
      status = 'open',
      priority = 'normal',
      notes = '',
      special_requests = '',
      estimated_time = 15,
      reference // Optional reference field for pre-paid orders
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Validate items
    for (const item of items) {
      if (!item.menu_item_id || !item.quantity || !item.unit_price || !item.total_price) {
        return res.status(400).json({ error: 'Invalid item data: menu_item_id, quantity, unit_price, and total_price are required' });
      }
      if (item.modifiers && !Array.isArray(item.modifiers)) {
        return res.status(400).json({ error: 'Modifiers must be an array' });
      }
    }

    const { rows: orderNumberRow } = await pool.query(`SELECT generate_order_number() AS order_number`);
    const orderNumber = orderNumberRow[0].order_number;

    const subtotal = items.reduce((sum, item) => {
      const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
      const modifierTotal = (item.modifiers || []).reduce((msum, mod) => 
        msum + (parseFloat(mod.price_adjustment || 0)), 0);
      return sum + itemTotal + modifierTotal;
    }, 0);

    let discountAmount = 0;
    if (discount_type && discount_value) {
      if (discount_type === 'percentage') {
        discountAmount = (subtotal * parseFloat(discount_value)) / 100;
      } else if (discount_type === 'fixed') {
        discountAmount = parseFloat(discount_value);
      } else {
        return res.status(400).json({ error: 'Invalid discount_type: must be "percentage" or "fixed"' });
      }
    }

    const taxRate = cache.businessSettings.tax_rate || 10.00;
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = discountedSubtotal * (taxRate / 100);
    const totalAmount = discountedSubtotal + taxAmount;

    const { rows: orderRows } = await pool.query(`
      INSERT INTO orders (
        order_number, table_id, customer_name, customer_phone, customer_count, order_type, status,
        subtotal, tax_amount, discount_amount, total_amount, notes, special_requests, 
        estimated_time, server_id, priority, reference, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      RETURNING *
    `, [
      orderNumber, table_id || null, customer_name, customer_phone, customer_count, order_type, status,
      discountedSubtotal, taxAmount, discountAmount, totalAmount, notes, special_requests,
      estimated_time, user_id, priority, reference || null
    ]);

    const order = orderRows[0];

    for (const item of items) {
      const modifiers = Array.isArray(item.modifiers) ? item.modifiers : [];
      await pool.query(`
        INSERT INTO order_items (
          order_id, menu_item_id, quantity, unit_price, total_price, modifiers, special_instructions
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        order.id, item.menu_item_id, parseInt(item.quantity), parseFloat(item.unit_price),
        parseFloat(item.total_price), modifiers, item.special_instructions || ''
      ]);
    }

    if (table_id && order_type === 'dine_in') {
      await pool.query(`
        UPDATE tables
        SET status = 'occupied'
        WHERE id = $1
      `, [table_id]);
    }

    await createAuditTrail(user_id, 'ORDER_CREATED', 'Order created', {
      order_id: order.id,
      order_number: orderNumber,
      total_amount: totalAmount,
      reference: reference || null
    });

    broadcast('order_created', {
      order_id: order.id,
      order_number: orderNumber,
      status,
      total_amount: totalAmount,
      kitchen_notes: notes,
      reference: reference || null
    });

    const { rows: completeOrderRows } = await pool.query(`
      SELECT o.*, 
             t.number AS table_number, t.name AS table_name, t.status AS table_status,
             pu.staff_id, pu.full_name AS server_name,
             oi.id AS order_item_id, oi.quantity, oi.unit_price, oi.total_price, oi.modifiers AS order_item_modifiers, oi.special_instructions,
             mi.name AS menu_item_name, mi.price AS menu_item_price
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN pos_users pu ON o.server_id = pu.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.id = $1
    `, [order.id]);

    const completeOrder = completeOrderRows.reduce((acc, row) => {
      if (!acc.id) {
        acc = {
          ...row,
          table: row.table_number ? { id: row.table_id, number: row.table_number, name: row.table_name, status: row.table_status } : null,
          server: { id: row.server_id, staff_id: row.staff_id, full_name: row.server_name },
          items: [],
          reference: row.reference || null
        };
      }
      if (row.order_item_id) {
        acc.items.push({
          id: row.order_item_id,
          order_id: row.order_id,
          menu_item_id: row.menu_item_id,
          quantity: row.quantity,
          unit_price: row.unit_price,
          total_price: row.total_price,
          modifiers: row.order_item_modifiers || [],
          special_instructions: row.special_instructions || '',
          menu_item: { id: row.menu_item_id, name: row.menu_item_name, price: row.menu_item_price }
        });
      }
      return acc;
    }, {});

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Order created',
      orderId: order.id,
      orderNumber,
      reference: reference || null
    }, null, 2));

    res.json(completeOrder);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to create order',
      error: error.message
    }, null, 2));
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, user_id, kitchen_notes } = req.body;

    if (!status || !user_id) {
      return res.status(400).json({ error: 'Status and user_id are required' });
    }

    const { rows } = await pool.query(`
      UPDATE orders
      SET status = $1, kitchen_notes = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, kitchen_notes || null, orderId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = rows[0];

    await createAuditTrail(user_id, 'ORDER_STATUS_UPDATED', `Order status changed to ${status}`, {
      order_id: orderId,
      new_status: status,
      kitchen_notes
    });

    broadcast('order_status_updated', {
      order_id: orderId,
      status,
      kitchen_notes,
      updated_at: order.updated_at
    });

    res.json(order);
  } catch (error) {
    handleError(res, error, 'Failed to update order status');
  }
});

app.post('/orders/:orderId/payment', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { payment_method, amount, tip_amount = 0, change_amount = 0, reference_number, card_last_four, user_id } = req.body;

    if (!payment_method || !amount || !user_id) {
      return res.status(400).json({ error: 'Payment method, amount, and user_id are required' });
    }

    const { rows: orderRows } = await pool.query(`
      SELECT * FROM orders
      WHERE id = $1
    `, [orderId]);

    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRows[0];

    const { rows: paymentRows } = await pool.query(`
      INSERT INTO payments (
        order_id, payment_method, amount, tip_amount, change_amount, reference_number, 
        card_last_four, status, processed_by, processed_at, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8, NOW(), NOW())
      RETURNING *
    `, [orderId, payment_method, parseFloat(amount), parseFloat(tip_amount), parseFloat(change_amount), 
        reference_number, card_last_four, user_id]);

    const payment = paymentRows[0];

    await pool.query(`
      UPDATE orders
      SET status = 'paid', tip_amount = $1, updated_at = NOW()
      WHERE id = $2
    `, [parseFloat(tip_amount), orderId]);

    if (order.table_id && order.order_type === 'dine_in') {
      await pool.query(`
        UPDATE tables
        SET status = 'available'
        WHERE id = $1
      `, [order.table_id]);
    }

    const { rows: orderItems } = await pool.query(`
      SELECT oi.*, mi.name AS menu_item_name, mi.price AS menu_item_price
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = $1
    `, [orderId]);

    const receiptData = {
      business_name: cache.businessSettings.business_name || 'Default Business',
      order_number: order.order_number,
      items: orderItems.map(item => ({
        name: item.menu_item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        modifiers: item.modifiers
      })),
      subtotal: order.subtotal,
      tax_amount: order.tax_amount,
      discount_amount: order.discount_amount,
      tip_amount: parseFloat(tip_amount),
      total_amount: parseFloat(amount) + parseFloat(tip_amount),
      payment_method,
      change_amount: parseFloat(change_amount),
      timestamp: new Date().toISOString(),
      receipt_footer: cache.businessSettings.receipt_footer || ''
    };

    // Debug receipt number query
    const { rows: receiptNumberRow } = await pool.query(`SELECT generate_receipt_number() AS receipt_number`);
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Receipt number query result',
      receiptNumberRow
    }, null, 2));
    if (!receiptNumberRow[0] || !receiptNumberRow[0].receipt_number) {
      throw new Error('Failed to generate receipt number: Empty or invalid result');
    }
    const receiptNumber = receiptNumberRow[0].receipt_number;

    const { rows: receiptRows } = await pool.query(`
      INSERT INTO receipts (receipt_number, order_id, receipt_data, receipt_type, created_at)
      VALUES ($1, $2, $3, 'customer', NOW())
      RETURNING *
    `, [receiptNumber, orderId, receiptData]);

    await createAuditTrail(user_id, 'PAYMENT_PROCESSED', 'Payment processed', {
      order_id: orderId,
      payment_method,
      amount,
      tip_amount,
      receipt_number: receiptNumber
    });

    broadcast('payment_processed', {
      order_id: orderId,
      payment_method,
      amount,
      tip_amount,
      receipt_number: receiptNumber
    });

    res.json({ payment, receipt: receiptRows[0] });
  } catch (error) {
    handleError(res, error, 'Failed to process payment');
  }
});

// Shift Routes
app.post('/shifts/start', async (req, res) => {
  try {
    const { user_id, starting_cash } = req.body;

    if (!user_id || starting_cash == null) {
      return res.status(400).json({ error: 'User ID and starting cash are required' });
    }

    const { rows: existingShift } = await pool.query(`
      SELECT id FROM shifts
      WHERE user_id = $1 AND status = 'active'
    `, [user_id]);

    if (existingShift.length > 0) {
      return res.status(400).json({ error: 'User already has an active shift' });
    }

    const { rows: shiftRows } = await pool.query(`
      INSERT INTO shifts (user_id, starting_cash, status, start_time)
      VALUES ($1, $2, 'active', NOW())
      RETURNING *
    `, [user_id, parseFloat(starting_cash)]);

    const shift = shiftRows[0];

    await createAuditTrail(user_id, 'SHIFT_STARTED', 'Shift started', { starting_cash });

    res.json(shift);
  } catch (error) {
    handleError(res, error, 'Failed to start shift');
  }
});

app.post('/shifts/end', async (req, res) => {
  try {
    const { user_id, ending_cash, notes } = req.body;

    if (!user_id || ending_cash == null) {
      return res.status(400).json({ error: 'User ID and ending cash are required' });
    }

    const { rows: shiftRows } = await pool.query(`
      SELECT * FROM shifts
      WHERE user_id = $1 AND status = 'active'
    `, [user_id]);

    if (shiftRows.length === 0) {
      return res.status(404).json({ error: 'No active shift found' });
    }

    const shift = shiftRows[0];

    const { rows: orders } = await pool.query(`
      SELECT total_amount, tip_amount, payment_method
      FROM orders
      WHERE server_id = $1 AND created_at >= $2 AND status = 'paid'
    `, [user_id, shift.start_time]);

    const totalSales = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const totalTips = orders.reduce((sum, o) => sum + parseFloat(o.tip_amount || 0), 0);
    const cashSales = orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const cardSales = orders.filter(o => o.payment_method === 'card').reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const mobileSales = orders.filter(o => o.payment_method === 'mobile').reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

    const { rows: updatedShiftRows } = await pool.query(`
      UPDATE shifts
      SET end_time = NOW(),
          ending_cash = $1,
          total_sales = $2,
          total_tips = $3,
          total_orders = $4,
          cash_sales = $5,
          card_sales = $6,
          mobile_sales = $7,
          status = 'closed',
          notes = $8
      WHERE id = $9
      RETURNING *
    `, [
      parseFloat(ending_cash), totalSales, totalTips, orders.length,
      cashSales, cardSales, mobileSales, notes || null, shift.id
    ]);

    const updatedShift = updatedShiftRows[0];

    await createAuditTrail(user_id, 'SHIFT_ENDED', 'Shift ended', {
      ending_cash,
      total_sales: totalSales,
      total_tips: totalTips,
      total_orders: orders.length,
      cash_sales: cashSales,
      card_sales: cardSales,
      mobile_sales: mobileSales,
      notes
    });

    res.json(updatedShift);
  } catch (error) {
    handleError(res, error, 'Failed to end shift');
  }
});

app.get('/shifts/current', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const { rows } = await pool.query(`
      SELECT * FROM shifts
      WHERE user_id = $1 AND status = 'active'
    `, [user_id]);

    await createAuditTrail(req.user.id, 'FETCH_CURRENT_SHIFT', 'Fetched current shift', { user_id });

    res.json(rows[0] || null);
  } catch (error) {
    handleError(res, error, 'Failed to fetch current shift');
  }
});

// Business Settings Routes
app.get('/settings/business', async (req, res) => {
  try {
    if (!cache.businessSettings) {
      await refreshCache();
    }
    await createAuditTrail(req.user.id, 'FETCH_BUSINESS_SETTINGS', 'Fetched business settings', {});
    res.json(cache.businessSettings);
  } catch (error) {
    handleError(res, error, 'Failed to fetch business settings');
  }
});

// Receipt Routes
app.get('/receipts/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const { rows: receiptRows } = await pool.query(`
      SELECT r.*, o.order_number, o.subtotal, o.tax_amount, o.discount_amount, o.total_amount, o.tip_amount
      FROM receipts r
      JOIN orders o ON r.order_id = o.id
      WHERE r.order_id = $1 AND r.receipt_type = 'customer'
    `, [orderId]);

    if (receiptRows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    await createAuditTrail(req.user.id, 'FETCH_RECEIPT', 'Fetched receipt', { orderId });

    res.json(receiptRows[0]);
  } catch (error) {
    handleError(res, error, 'Failed to fetch receipt');
  }
});

// Modifier Routes
app.get('/modifiers', async (req, res) => {
  try {
    const { rows: modifiers } = await pool.query(`
      SELECT m.*, mo.id AS option_id, mo.name AS option_name, mo.price_adjustment
      FROM modifiers m
      LEFT JOIN modifier_options mo ON m.id = mo.modifier_id
      ORDER BY m.name
    `);

    const formattedModifiers = modifiers.reduce((acc, row) => {
      let modifier = acc.find(m => m.id === row.id);
      if (!modifier) {
        modifier = {
          id: row.id,
          name: row.name,
          type: row.type,
          required: row.required,
          max_selections: row.max_selections,
          options: []
        };
        acc.push(modifier);
      }
      if (row.option_id) {
        modifier.options.push({
          id: row.option_id,
          name: row.option_name,
          price_adjustment: row.price_adjustment
        });
      }
      return acc;
    }, []);

    await createAuditTrail(req.user.id, 'FETCH_MODIFIERS', 'Fetched modifiers', { modifierCount: formattedModifiers.length });

    res.json(formattedModifiers);
  } catch (error) {
    handleError(res, error, 'Failed to fetch modifiers');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), dbConnected: pool.totalCount > 0 });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: 'Unhandled error',
    error: error.message,
    path: req.path,
    clientIp: req.socket.remoteAddress
  }, null, 2));
  res.status(500).json({ 
    error: 'Internal server error',
    details: error.message 
  });
});

app.listen(port, () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `POS API server running on http://localhost:${port}`,
    dashboard: `http://localhost:${port}/health`,
    wsPort: `ws://localhost:${wsPort}`
  }, null, 2));
});
