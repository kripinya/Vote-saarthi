const request = require('supertest');
const { app } = require('../server');

describe('Vote Saarthi Auth API Tests', () => {
  let agent;

  beforeAll(() => {
    agent = request.agent(app); // Keeps session across requests
  });

  it('should fail login with invalid ID format', async () => {
    const res = await agent.post('/api/auth/login').send({ voterId: 'invalid-id' });
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('Invalid Voter ID format');
  });

  it('should fail login with non-existent ID', async () => {
    const res = await agent.post('/api/auth/login').send({ voterId: 'ZZZ9999999' });
    expect(res.statusCode).toEqual(404);
    expect(res.body.error).toContain('Voter ID not found');
  });

  it('should successfully login with valid ID', async () => {
    const res = await agent.post('/api/auth/login').send({ voterId: 'ABC1234567' });
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.voter.name).toEqual('Rahul Sharma');
  });

  it('should retrieve active session after login', async () => {
    const res = await agent.get('/api/auth/session');
    expect(res.statusCode).toEqual(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.voter.voterId).toEqual('ABC1234567');
  });

  it('should successfully logout', async () => {
    const res = await agent.post('/api/auth/logout');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 401 for session after logout', async () => {
    const res = await agent.get('/api/auth/session');
    expect(res.statusCode).toEqual(401);
    expect(res.body.authenticated).toBe(false);
  });
});
