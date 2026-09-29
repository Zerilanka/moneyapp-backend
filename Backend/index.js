import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();

// Habilitar CORS para que la app móvil y otros clientes se conecten sin problemas
app.use(cors());
app.use(express.json());

// Configuración de la conexión a Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Necesario para conexiones seguras en la nube como Neon
});

// Ruta de prueba inicial
app.get('/', (req, res) => {
  res.send('Backend de MoneyApp funcionando correctamente con Neon!');
});

// ==========================================
// RUTAS DE AUTENTICACIÓN (Login y Registro)
// ==========================================

// Registro de usuario
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Validar si el usuario ya existe
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado.' });
    }

    // Insertar nuevo usuario en la base de datos de Neon
    const newUser = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, password]
    );
    
    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error('Error en el registro:', err);
    res.status(500).json({ error: 'Error interno del servidor al registrar.' });
  }
});

// Inicio de sesión
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Buscar usuario por correo y contraseña
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );

    if (userQuery.rows.length === 0) {
      return res.status(400).json({ error: 'Correo o contraseña incorrectos.' });
    }

    res.json(userQuery.rows[0]);
  } catch (err) {
    console.error('Error en el login:', err);
    res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
  }
});

// Puerto de escucha
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});