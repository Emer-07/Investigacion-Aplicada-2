const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, tokenBlacklist } = require('../utils/authMiddleware');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_demo_change_me';
const TOKEN_EXPIRATION = '1h'; // ajustar según necesidad

// Base de datos en memoria (demo). En producción usar DB real.
const users = []; // { id, username, email, passwordHash }

// Helpers
function findUserByUsername(username) {
  return users.find(u => u.username === username);
}
function findUserByEmail(email) {
  return users.find(u => u.email === email);
}

// Registro
router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ message: 'username, password y email son requeridos' });
  }
  if (findUserByUsername(username) || findUserByEmail(email)) {
    return res.status(409).json({ message: 'Usuario o email ya registrado' });
  }
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const user = { id: users.length + 1, username, email, passwordHash: hash };
  users.push(user);
  // devolver datos mínimos
  res.status(201).json({ message: 'Usuario creado', user: { id: user.id, username: user.username, email: user.email } });
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'username y password son requeridos' });

  const user = findUserByUsername(username);
  if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });

  const payload = { sub: user.id, username: user.username };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
  res.status(200).json({ message: 'Autenticado', token, expiresIn: TOKEN_EXPIRATION });
});

// Recurso protegido
router.get('/protected-resource', authenticateToken, (req, res) => {
  // req.user proviene del middleware de autenticación
  res.status(200).json({ data: `Recurso protegido accesible para ${req.user.username}`, user: req.user });
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(400).json({ message: 'Token requerido' });
  // Añadir a blacklist
  tokenBlacklist.add(token);
  res.status(200).json({ message: 'Sesión cerrada. Token invalidado' });
});

module.exports = router;
