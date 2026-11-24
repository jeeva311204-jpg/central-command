import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db';
import { generateToken } from '../middleware/auth';

describe('Item 4: Role-Based Authorization & JWT Role Tamper Resistance Test', () => {
  let employeeUser: any;
  let employeeToken: string;
  let financeUser: any;
  let financeToken: string;
  let stage: any;
  let testPO: any;

  beforeAll(async () => {
    employeeUser = await prisma.user.findFirst({
      where: { role: { name: 'Employee' } },
      include: { role: true },
    });
    employeeToken = generateToken(employeeUser);

    financeUser = await prisma.user.findFirst({
      where: { role: { name: 'Finance' } },
      include: { role: true },
    });
    financeToken = generateToken(financeUser);

    stage = await prisma.workflowStage.findFirst();
    testPO = await prisma.purchaseOrder.findFirst();
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).put(`/api/workflows/stages/${stage.id}`).send({ slaDays: 5 });
    expect(res.status).toBe(401);
  });

  it('rejects Workflow stage edits by Employee with 403 (requires Admin or Management)', async () => {
    const res = await request(app)
      .put(`/api/workflows/stages/${stage.id}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ slaDays: 10 });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Access denied/i);
  });

  it('rejects Purchase Order generation by Employee with 403 (requires Procurement or Admin)', async () => {
    const res = await request(app)
      .post('/api/purchase-orders/generate')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ proposalId: 'mock-id', vendorId: 'mock-vendor', quotationId: 'mock-quotation' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Access denied/i);
  });

  it('rejects PO status transition by Finance user with 403 (requires Procurement or Admin)', async () => {
    if (testPO) {
      const res = await request(app)
        .post(`/api/purchase-orders/${testPO.id}/status`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ status: 'DELIVERED' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Access denied/i);
    }
  });

  it('rejects 4M Change verification by Employee with 403 (requires Quality or Admin)', async () => {
    const res = await request(app)
      .post('/api/changes-4m/dummy-change-id/verify')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ verified: true });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Access denied/i);
  });

  it('rejects 4M Change closure by Employee with 403 (requires HOD or Admin)', async () => {
    const res = await request(app)
      .post('/api/changes-4m/dummy-change-id/closure')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ closureComments: 'close' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Access denied/i);
  });

  it('confirms client cannot spoof role via request body or headers (role is verified exclusively from JWT)', async () => {
    // Attempt privilege escalation by sending role: "Admin" in body & headers with employee token
    const res = await request(app)
      .put(`/api/workflows/stages/${stage.id}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('X-User-Role', 'Admin')
      .set('Role', 'Admin')
      .send({
        role: 'Admin',
        userRole: 'Admin',
        slaDays: 99,
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Current role: Employee/i);
  });
});
