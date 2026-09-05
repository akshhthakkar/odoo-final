import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('A-15: Malformed JSON Error Handling', () => {
  it('returns 400 with VALIDATION_ERROR and safe message on malformed JSON', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ invalid json body here');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Invalid JSON request body');

    // Verify parser internals and source positions are NOT exposed
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('SyntaxError');
    expect(bodyStr).not.toContain('position');
    expect(bodyStr).not.toContain('Unexpected token');
    expect(bodyStr).not.toContain('at JSON.parse');
  });
});
