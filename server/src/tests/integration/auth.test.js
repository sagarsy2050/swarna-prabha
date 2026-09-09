import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { prisma, dbReachable, resetDb, buildTestApp, makeUser } from '../helpers.js';

const hasDb = await dbReachable();
if (!hasDb) {
  console.warn('\n[integration] Postgres not reachable — auth.test.js skipped. Run `npm run db:up && npm run db:migrate`.\n');
}

describe.skipIf(!hasDb)('auth flow', () => {
  let app;
  beforeAll(async () => {
    app = await buildTestApp();
  });
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('registers a customer and returns an access token + refresh cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'c1@test.dev', password: 'password123', fullName: 'C One' });
    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.role).toBe('CUSTOMER');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'].join()).toMatch(/jw_refresh=/);
  });

  it('rejects duplicate registration', async () => {
    await makeUser({ email: 'dup@test.dev' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@test.dev', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('rejects a weak password at validation', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'weak@test.dev', password: 'short' });
    expect(res.status).toBe(422);
  });

  it('logs in, reaches /me, refreshes, then logout revokes the refresh token', async () => {
    await makeUser({ email: 'login@test.dev', password: 'password123' });
    const agent = request.agent(app);

    const login = await agent
      .post('/api/auth/login')
      .send({ email: 'login@test.dev', password: 'password123' });
    expect(login.status).toBe(200);
    const token = login.body.data.accessToken;

    const me = await agent.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('login@test.dev');

    const refreshed = await agent.post('/api/auth/refresh').send();
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();

    await agent.post('/api/auth/logout').send();
    const again = await agent.post('/api/auth/refresh').send();
    expect(again.status).toBe(401);
  });

  it('rejects a bad password with 401', async () => {
    await makeUser({ email: 'bp@test.dev', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bp@test.dev', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('blocks protected routes without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
