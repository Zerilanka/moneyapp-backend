const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  user: 'money_user',
  host: 'localhost',
  database: 'moneyapp_db',
  password: 'secure_password_2026',
  port: 5432,
});

// Función robusta para crear tablas inmediatamente
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        card_name VARCHAR(255) NOT NULL,
        card_type VARCHAR(50) NOT NULL,
        last_digits VARCHAR(4) NOT NULL,
        card_color VARCHAR(50) DEFAULT '#1e293b'
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        card_id INT,
        title VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        date VARCHAR(50) NOT NULL
      );
    `);
    console.log('Tablas verificadas y creadas correctamente en la BD.');
  } catch (err) {
    console.error('Error al inicializar tablas:', err);
  }
};

// Arrancar base de datos y servidor de inmediato
initDB();

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Faltan datos.' });
  try {
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'El correo ya está registrado.' });
    
    const newUser = await pool.query('INSERT INTO users (email, password) VALUES ($1, $2) RETURNING email', [email, password]);
    res.json({ success: true, email: newUser.rows[0].email });
  } catch (err) {
    res.status(500).json({ error: 'Error interno en registro.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0 || userResult.rows[0].password !== password) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }
    res.json({ success: true, email: userResult.rows[0].email });
  } catch (err) {
    res.status(500).json({ error: 'Error interno en login.' });
  }
});

app.get('/api/cards/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const result = await pool.query('SELECT id::text, card_name, card_type, last_digits, card_color FROM cards WHERE user_email = $1', [email]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cards', async (req, res) => {
  const { email, card_name, card_type, last_digits, card_color } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO cards (user_email, card_name, card_type, last_digits, card_color) VALUES ($1, $2, $3, $4, $5) RETURNING id::text, card_name, card_type, last_digits, card_color',
      [email, card_name, card_type || 'débito', last_digits, card_color || '#1e293b']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cards/:id', async (req, res) => {
  const { id } = req.params;
  const { card_name, card_type, last_digits, card_color } = req.body;
  try {
    await pool.query('UPDATE cards SET card_name = $1, card_type = $2, last_digits = $3, card_color = $4 WHERE id = $5', [card_name, card_type, last_digits, card_color, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cards/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM cards WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const result = await pool.query(`
      SELECT t.id::text, t.title, t.amount, t.type, t.date, c.card_name 
      FROM transactions t 
      LEFT JOIN cards c ON t.card_id = c.id 
      WHERE t.user_email = $1 ORDER BY t.id DESC
    `, [email]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { email, card_id, title, amount, type, date } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO transactions (user_email, card_id, title, amount, type, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id::text, title, amount, type, date',
      [email, card_id, title, amount, type, date]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor nativo corriendo de forma inmediata en el puerto ${PORT}`);
});