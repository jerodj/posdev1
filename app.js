// Express POS API using local PostgreSQL
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Helper function for audit trail
async function createAuditTrail(userId, action, description, metadata = {}) {
  try {
    await pool.query(
      'INSERT INTO audit_trails (user_id, action, description, metadata, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, action, description, JSON.stringify(metadata), '127.0.0.1', 'POS System']
    );
  } catch (error) {
    console.error('Audit trail error:', error);
  }
}

// Login
app.post('/auth/login', async (req, res) => {
  const { staff_id, pin } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM pos_users WHERE staff_id = $1 AND pin = $2 AND is_active = true LIMIT 1',
      [staff_id, pin]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    await pool.query('UPDATE pos_users SET last_login = NOW() WHERE id = $1', [user.id]);
    await createAuditTrail(user.id, 'LOGIN', 'User logged in', { staff_id });

    res.json({ user, token: `pos_${user.id}_${Date.now()}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard stats
app.get('/dashboard/stats', async (req, res) => {
  try {
    const orders = await pool.query('SELECT COUNT(*) FROM orders');
    const users = await pool.query('SELECT COUNT(*) FROM pos_users');
    res.json({ orders: parseInt(orders.rows[0].count), users: parseInt(users.rows[0].count) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Orders CRUD
app.get('/orders', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/orders', async (req, res) => {
  const { table_id, items, total, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO orders (table_id, items, total, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [table_id, JSON.stringify(items), total, status || 'PENDING']
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/orders/:id/payment', async (req, res) => {
  const { id } = req.params;
  const { amount_paid, method, user_id } = req.body;
  try {
    await pool.query('UPDATE orders SET is_paid = true WHERE id = $1', [id]);
    await pool.query(
      'INSERT INTO payments (order_id, amount_paid, method, paid_at) VALUES ($1, $2, $3, NOW())',
      [id, amount_paid, method]
    );
    await createAuditTrail(user_id, 'PAYMENT', `Payment of ${amount_paid} received for order ${id}`, { order_id: id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tables
app.get('/tables', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tables');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Menu
app.get('/menu/items', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM menu_items');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/menu/categories', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM menu_categories');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Shifts
app.post('/shifts/start', async (req, res) => {
  const { user_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO shifts (user_id, started_at) VALUES ($1, NOW()) RETURNING *',
      [user_id]
    );
    await createAuditTrail(user_id, 'SHIFT_START', 'Shift started');
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/shifts/end', async (req, res) => {
  const { shift_id, user_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE shifts SET ended_at = NOW() WHERE id = $1 RETURNING *',
      [shift_id]
    );
    await createAuditTrail(user_id, 'SHIFT_END', 'Shift ended');
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/shifts/current', async (req, res) => {
  const { user_id } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM shifts WHERE user_id = $1 AND ended_at IS NULL LIMIT 1',
      [user_id]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all
app.all('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  console.log(`POS API running on http://localhost:${port}`);
});