const request = require('supertest');
const app = require('../index'); // exportado en index.js
const { tokenBlacklist } = require('../utils/authMiddleware');

describe('Auth API - casos solicitados', () => {
  let server;
  beforeAll(() => {
    // nada especial; app ya exporta express
  });

  afterAll(() => {
    // limpiar blacklist por si acaso
    tokenBlacklist.clear();
  });

  test('Caso 1: Verificar registro de usuario -> POST /api/register', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'usuario_test', password: 'pass1234', email: 'u_test@example.com' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('username', 'usuario_test');
  });

  test('Caso 2: Verificar login -> POST /api/login', async () => {
    // primero asegurar que el usuario existe (registro)
    await request(app)
      .post('/api/register')
      .send({ username: 'usuario_login', password: 'passLogin123', email: 'ulogin@example.com' });

    const res = await request(app)
      .post('/api/login')
      .send({ username: 'usuario_login', password: 'passLogin123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');

    // almacenar para siguiente test
    global.TEST_TOKEN = res.body.token;
  });

  test('Caso 3: Acceso recurso protegido con token válido -> GET /api/protected-resource', async () => {
    const res = await request(app)
      .get('/api/protected-resource')
      .set('Authorization', `Bearer ${global.TEST_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  test('Caso 4: Logout invalida token -> POST /api/logout', async () => {
    const res = await request(app)
      .post('/api/logout')
      .set('Authorization', `Bearer ${global.TEST_TOKEN}`);

    expect(res.status).toBe(200);
    // ahora token debe considerarse inválido
    const res2 = await request(app)
      .get('/api/protected-resource')
      .set('Authorization', `Bearer ${global.TEST_TOKEN}`);

    expect(res2.status).toBe(401);
  });
});
