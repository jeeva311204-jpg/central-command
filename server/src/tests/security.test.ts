import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../app';
import { prisma } from '../db';
import { generateToken } from '../middleware/auth';

describe('Item 6: Security Hardening Test Suite', () => {
  let employeeUser: any;
  let employeeToken: string;

  beforeAll(async () => {
    employeeUser = await prisma.user.findFirst({
      where: { email: 'operator1@changeflow.com' },
      include: { role: true },
    });
    employeeToken = generateToken(employeeUser);
  });

  it('1. Bcrypt Passwords: Confirms passwords in database are hashed with bcrypt, never plaintext', async () => {
    expect(employeeUser.passwordHash).not.toBe('ChangeFlow2026!');
    // Bcrypt hashes start with $2a$ or $2b$
    expect(employeeUser.passwordHash).toMatch(/^\$2[ab]\$\d+\$/);

    const matches = await bcrypt.compare('ChangeFlow2026!', employeeUser.passwordHash);
    expect(matches).toBe(true);

    const wrongMatches = await bcrypt.compare('WrongPassword', employeeUser.passwordHash);
    expect(wrongMatches).toBe(false);
  });

  it('2. Zod Input Validation: Blocks invalid login payloads with 400 and error details', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'not-an-email',
      password: '',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toBeDefined();
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('3. Zod Input Validation: Blocks invalid proposal action payload with 400', async () => {
    const res = await request(app)
      .post('/api/workflows/proposals/dummy-id/action')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        action: 'INVALID_ACTION_NAME',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details[0].message).toMatch(/APPROVE.*REJECT/i);
  });

  it('4. Upload Security: Blocks executable files from upload pipeline', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${employeeToken}`)
      .attach('file', Buffer.from('#!/bin/bash\necho dangerous'), 'malicious.sh');

    // Multer or custom filter must block it
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
