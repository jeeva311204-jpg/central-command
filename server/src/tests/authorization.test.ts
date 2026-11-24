import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { setupTestDB, teardownTestDB } from './setup';
import {
  User,
  Department,
  ProposalType,
  WorkflowTemplate,
  PurchaseOrder,
  Vendor,
  Proposal,
  Role,
} from '../models';
import { generateToken } from '../middleware/auth';

describe('Item 4: Role-Based Authorization & JWT Role Tamper Resistance Test', () => {
  let employeeUser: any;
  let employeeToken: string;
  let financeUser: any;
  let financeToken: string;
  let stage: any;
  let testPO: any;

  beforeAll(async () => {
    await setupTestDB();

    const [empRole, finRole] = await Promise.all([
      Role.findOneAndUpdate({ name: 'Employee' }, { name: 'Employee' }, { upsert: true, new: true }),
      Role.findOneAndUpdate({ name: 'Finance' }, { name: 'Finance' }, { upsert: true, new: true }),
    ]);

    const dept = await Department.create({ name: 'Prod Auth Dept', code: 'PAD', isActive: true });
    const vendor = await Vendor.create({ name: 'Auth Test Vendor', code: 'ATV', isActive: true });
    const propType = await ProposalType.create({ code: 'AUTH_TEST', name: 'Auth Test', isActive: true });

    const template = await WorkflowTemplate.create({
      proposalTypeId: propType._id,
      name: 'Auth Workflow',
      stages: [
        { stepOrder: 1, name: 'Initial HOD', approverRole: 'HOD', slaDays: 2 },
      ],
    });
    stage = template.stages[0];

    employeeUser = await User.create({
      name: 'Test Operator',
      email: `emp-auth-${Date.now()}@changeflow.com`,
      roleId: empRole._id,
      roleName: 'Employee',
      departmentId: dept._id,
      passwordHash: 'dummyhash',
      isActive: true,
    });
    employeeToken = generateToken({
      id: employeeUser._id.toString(),
      email: employeeUser.email,
      name: employeeUser.name,
      role: 'Employee',
      departmentId: dept._id.toString(),
    });

    financeUser = await User.create({
      name: 'Test Finance Controller',
      email: `fin-auth-${Date.now()}@changeflow.com`,
      roleId: finRole._id,
      roleName: 'Finance',
      departmentId: dept._id,
      passwordHash: 'dummyhash',
      isActive: true,
    });
    financeToken = generateToken({
      id: financeUser._id.toString(),
      email: financeUser.email,
      name: financeUser.name,
      role: 'Finance',
      departmentId: dept._id.toString(),
    });

    const proposal = await Proposal.create({
      proposalNumber: `AUTH-PRP-${Date.now()}`,
      title: 'Auth PO Proposal',
      proposalTypeId: propType._id,
      departmentId: dept._id,
      initiatorId: employeeUser._id,
      totalInvestment: 500000,
      status: 'APPROVED',
    });

    testPO = await PurchaseOrder.create({
      poNumber: `PO-AUTH-${Date.now()}`,
      proposalId: proposal._id,
      vendorId: vendor._id,
      createdById: employeeUser._id,
      totalAmount: 500000,
      status: 'CREATED',
    });
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).put(`/api/workflows/stages/${stage._id}`).send({ slaDays: 5 });
    expect(res.status).toBe(401);
  });

  it('rejects Workflow stage edits by Employee with 403 (requires Admin or Management)', async () => {
    const res = await request(app)
      .put(`/api/workflows/stages/${stage._id}`)
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
    const res = await request(app)
      .post(`/api/purchase-orders/${testPO._id}/status`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ status: 'DELIVERED' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Access denied/i);
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
    const res = await request(app)
      .put(`/api/workflows/stages/${stage._id}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('X-User-Role', 'Admin')
      .set('Role', 'Admin')
      .send({
        role: 'Admin',
        userRole: 'Admin',
        slaDays: 99,
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Access denied/i);
  });
});
