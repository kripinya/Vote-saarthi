const request = require('supertest');
const { app } = require('../server');
const { generateKeyPair } = require('../crypto/keys');

describe('Vote Saarthi Voting API Tests', () => {
  let agent;

  beforeAll(async () => {
    await generateKeyPair(); // Ensure keys are generated for the app
    agent = request.agent(app);
    // Login before voting
    await agent.post('/api/auth/login').send({ voterId: 'DEF2345678' });
  });

  it('should retrieve the public key', async () => {
    const res = await agent.get('/api/vote/public-key');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('publicKey');
  });

  it('should successfully submit an encrypted vote', async () => {
    const votePayload = {
      encryptedVote: 'dummyEncryptedVoteString123',
      encryptedKey: 'dummyEncryptedKeyString456',
      iv: 'dummyIvString789'
    };
    const res = await agent.post('/api/vote/submit').send(votePayload);
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('receipt');
  });

  it('should reject a second vote attempt from the same session', async () => {
    const votePayload = {
      encryptedVote: 'dummyEncryptedVoteString123',
      encryptedKey: 'dummyEncryptedKeyString456',
      iv: 'dummyIvString789'
    };
    const res = await agent.post('/api/vote/submit').send(votePayload);
    expect(res.statusCode).toEqual(403);
    expect(res.body.error).toContain('already cast your vote');
  });

  it('should reject vote without authentication', async () => {
    const unauthAgent = request.agent(app);
    const res = await unauthAgent.post('/api/vote/submit').send({
      encryptedVote: 'test', encryptedKey: 'test', iv: 'test'
    });
    expect(res.statusCode).toEqual(401);
  });
});
