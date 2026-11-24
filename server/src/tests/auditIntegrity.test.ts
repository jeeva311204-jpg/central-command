import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { setupTestDB, teardownTestDB } from './setup';
import {
  User,
  Department,
  ProposalType,
  Proposal,
  ProposalVersion,
  AuditLog,
  Role,
} from '../models';
import { generateToken } from '../middleware/auth';

describe('Item 3: Audit Integrity & Immutability Test', () => {
  let adminToken: string;
  let adminUser: any;
  let testProposal: any;
  let versionRecord: any;
  let auditLogRecord: any;

  beforeAll(async () => {
    await setupTestDB();

    const role = await Role.findOneAndUpdate(
      { name: 'Admin' },
      { name: 'Admin', description: 'Administrator' },
      { upsert: true, new: true }
    );

    const dept = await Department.create({
      name: 'Engineering Testing',
      code: 'TEST',
      isActive: true,
    });

    const propType = await ProposalType.create({
      code: 'TEST_MACHINE',
      name: 'Test Machine Purchase',
      category: 'CAPEX',
      isActive: true,
    });

    adminUser = await User.create({
      name: 'Audit Admin',
      email: `admin-audit-${Date.now()}@changeflow.com`,
      roleId: role._id,
      roleName: 'Admin',
      departmentId: dept._id,
      passwordHash: 'dummyhash',
      isActive: true,
    });

    adminToken = generateToken({
      id: adminUser._id.toString(),
      email: adminUser.email,
      name: adminUser.name,
      role: 'Admin',
      departmentId: dept._id.toString(),
    });

    testProposal = await Proposal.create({
      proposalNumber: `INTEG-TEST-${Date.now()}`,
      title: 'Audit Integrity Test Machine',
      proposalTypeId: propType._id,
      departmentId: dept._id,
      initiatorId: adminUser._id,
      totalInvestment: 1200000,
      status: 'IN_REVIEW',
    });

    versionRecord = await ProposalVersion.create({
      proposalId: testProposal._id,
      versionNumber: 1,
      snapshot: { title: testProposal.title, amount: 1200000 },
      changedById: adminUser._id,
      changeSummary: 'Initial proposal snapshot',
    });

    auditLogRecord = await AuditLog.create({
      userId: adminUser._id.toString(),
      userName: adminUser.name,
      entityType: 'PROPOSAL',
      entityId: testProposal._id.toString(),
      action: 'CREATE',
      afterJson: JSON.stringify({ id: testProposal._id.toString() }),
    });
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('rejects any DELETE or PUT/PATCH requests to AuditLog endpoints (404 Not Found)', async () => {
    const delRes = await request(app)
      .delete(`/api/audit-logs/${auditLogRecord._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(404);

    const putRes = await request(app)
      .put(`/api/audit-logs/${auditLogRecord._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'TAMPERED' });
    expect(putRes.status).toBe(404);
  });

  it('rejects any DELETE or PUT/PATCH requests to ProposalVersion endpoints (404 Not Found)', async () => {
    const delRes = await request(app)
      .delete(`/api/proposals/${testProposal._id}/versions/${versionRecord._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(404);

    const putRes = await request(app)
      .put(`/api/proposals/${testProposal._id}/versions/${versionRecord._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ snapshotJson: '{}' });
    expect(putRes.status).toBe(404);
  });

  it('enforces model-level pre-hook blocking any modification to AuditLog', async () => {
    let updateError: any = null;
    try {
      await AuditLog.updateOne({ _id: auditLogRecord._id }, { action: 'TAMPERED' });
    } catch (err: any) {
      updateError = err;
    }
    expect(updateError).not.toBeNull();
    expect(updateError.message).toContain('AuditLog is an immutable append-only ledger');
  });

  it('enforces model-level pre-hook blocking any deletion of AuditLog', async () => {
    let deleteError: any = null;
    try {
      await AuditLog.deleteOne({ _id: auditLogRecord._id });
    } catch (err: any) {
      deleteError = err;
    }
    expect(deleteError).not.toBeNull();
    expect(deleteError.message).toContain('AuditLog is an immutable append-only ledger');
  });

  it('enforces model-level pre-hook blocking any modification to ProposalVersion', async () => {
    let updateError: any = null;
    try {
      await ProposalVersion.updateOne({ _id: versionRecord._id }, { changeSummary: 'TAMPERED' });
    } catch (err: any) {
      updateError = err;
    }
    expect(updateError).not.toBeNull();
    expect(updateError.message).toContain('ProposalVersion is immutable and append-only');
  });

  it('enforces model-level pre-hook blocking any deletion of ProposalVersion', async () => {
    let deleteError: any = null;
    try {
      await ProposalVersion.deleteOne({ _id: versionRecord._id });
    } catch (err: any) {
      deleteError = err;
    }
    expect(deleteError).not.toBeNull();
    expect(deleteError.message).toContain('ProposalVersion is immutable and append-only');
  });
});
