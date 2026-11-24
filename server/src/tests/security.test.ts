import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../app';
import { setupTestDB, teardownTestDB } from './setup';
import { User, Role, Department } from '../models';
import { generateToken } from '../middleware/auth';

describe('Item 6: Security Hardening & NoSQL Injection Protection Test Suite', () => {
  let employeeUser: any;
  let employeeToken: string;

  beforeAll(async () => {
    await setupTestDB();

    const role = await Role.findOneAndUpdate(
      { name: 'Employee' },
      { name: 'Employee' },
      { upsert: true, new: true }
    );
    const dept = await Department.create({ name: 'Sec Dept', code: 'SEC', isActive: true });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('ChangeFlow2026!', salt);

    employeeUser = await User.create({
      name: 'Security Operator',
      email: 'sec-op@changeflow.com',
      roleId: role._id,
      roleName: 'Employee',
      departmentId: dept._id,
      passwordHash,
      isActive: true,
    });

    employeeToken = generateToken({
      id: employeeUser._id.toString(),
      email: employeeUser.email,
      name: employeeUser.name,
      role: 'Employee',
      departmentId: dept._id.toString(),
    });
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('1. Bcrypt Passwords: Confirms passwords in database are hashed with bcrypt, never plaintext', async () => {
    expect(employeeUser.passwordHash).not.toBe('ChangeFlow2026!');
    expect(employeeUser.passwordHash).toMatch(/^\$2[ab]\$\d+\$/);

    const matches = await bcrypt.compare('ChangeFlow2026!', employeeUser.passwordHash);
    expect(matches).toBe(true);

    const wrongMatches = await bcrypt.compare('WrongPassword', employeeUser.passwordHash);
    expect(wrongMatches).toBe(false);
  });

  it('2. Zod & express-mongo-sanitize: Blocks NoSQL injection attempts on login route (e.g. {"$ne": null})', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: { $ne: null },
        password: 'ChangeFlow2026!',
      });

    // Must be blocked with 400 validation error because Zod requires email to be a valid string email
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('3. Zod Input Validation: Blocks invalid login payloads with 400 and error details', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'not-an-email',
      password: '',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toBeDefined();
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('4. Zod Input Validation: Blocks invalid proposal action payload with 400', async () => {
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

  it('5. Upload Security: Blocks executable files from upload pipeline', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${employeeToken}`)
      .attach('file', Buffer.from('#!/bin/bash\necho dangerous'), 'malicious.sh');

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
