const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_demo_change_me';

// Blacklist simple en memoria (Set). En producción usar Redis u otro store persistente.
const tokenBlacklist = new Set();

// Middleware para autenticar token y chequear blacklist
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'Authorization header requerido' });

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'Formato Authorization: Bearer <token>' });

  const token = parts[1];
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ message: 'Token inválido (logout efectuado)' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(401).json({ message: 'Token inválido o expirado' });
    req.user = { id: payload.sub, username: payload.username };
    req.token = token;
    next();
  });
}

// Opcional: puedes limpiar tokens expirados de la blacklist periódicamente en producción.

module.exports = { authenticateToken, tokenBlacklist };
