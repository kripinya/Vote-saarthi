const request = require('supertest');
const { app } = require('../server');

describe('Vote Saarthi Google Services Mocks Tests', () => {
  let agent;

  beforeAll(async () => {
    agent = request.agent(app);
    await agent.post('/api/auth/login').send({ voterId: 'GHI3456789' });
  });

  it('should verify the Gemini AI status', async () => {
    const res = await request(app).get('/api/gemini/status');
    expect(res.statusCode).toEqual(200);
    expect(res.body.service).toEqual('Google Gemini AI');
    expect(res.body.status).toEqual('Active');
  });

  it('should successfully trigger BigQuery sync', async () => {
    const res = await agent.post('/api/sync/analytics');
    expect(res.statusCode).toEqual(200);
    expect(res.body.service).toEqual('Google BigQuery');
    expect(res.body.status).toContain('queued successfully');
  });

  it('should successfully trigger Cloud Functions verify', async () => {
    const res = await agent.post('/api/functions/verify');
    expect(res.statusCode).toEqual(200);
    expect(res.body.service).toEqual('Google Cloud Functions');
    expect(res.body.status).toEqual('Verification passed');
  });

  it('should reject services if not authenticated', async () => {
    const res1 = await request(app).post('/api/sync/analytics');
    expect(res1.statusCode).toEqual(401);

    const res2 = await request(app).post('/api/functions/verify');
    expect(res2.statusCode).toEqual(401);
  });
});
