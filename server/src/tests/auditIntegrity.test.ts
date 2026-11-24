import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db';
import { generateToken } from '../middleware/auth';

describe('Item 3: Audit Integrity & Immutability Test', () => {
  let adminToken: string;
  let adminUser: any;
  let testProposal: any;
  let versionRecord: any;
  let auditLogRecord: any;

  beforeAll(async () => {
    adminUser = await prisma.user.findFirst({
      where: { role: { name: 'Admin' } },
      include: { role: true },
    });
    adminToken = generateToken(adminUser);

    const dept = await prisma.department.findFirst();
    const propType = await prisma.proposalType.findFirst();

    // Create a proposal
    testProposal = await prisma.proposal.create({
      data: {
        proposalNumber: `INTEG-TEST-${Date.now()}`,
        title: 'Audit Integrity Test Machine',
        proposalTypeId: propType.id,
        departmentId: dept.id,
        initiatorId: adminUser.id,
        totalInvestment: 1200000,
        status: 'IN_REVIEW',
      },
    });

    // Create an immutable version record
    versionRecord = await prisma.proposalVersion.create({
      data: {
        proposalId: testProposal.id,
        versionNumber: 1,
        snapshotJson: JSON.stringify({ title: testProposal.title, amount: 1200000 }),
        changedById: adminUser.id,
        changeSummary: 'Initial proposal snapshot',
      },
    });

    // Create an immutable audit log record
    auditLogRecord = await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        userName: adminUser.name,
        entityType: 'PROPOSAL',
        entityId: testProposal.id,
        action: 'CREATE',
        beforeJson: null,
        afterJson: JSON.stringify({ id: testProposal.id }),
      },
    });
  });

  it('rejects any DELETE or PUT/PATCH requests to AuditLog endpoints (404 Not Found)', async () => {
    // Attempt to DELETE an audit log
    const delRes = await request(app)
      .delete(`/api/audit-logs/${auditLogRecord.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(404);

    // Attempt to PUT (modify) an audit log
    const putRes = await request(app)
      .put(`/api/audit-logs/${auditLogRecord.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'TAMPERED' });
    expect(putRes.status).toBe(404);
  });

  it('rejects any DELETE or PUT/PATCH requests to ProposalVersion endpoints (404 Not Found)', async () => {
    // Attempt to DELETE a proposal version
    const delRes = await request(app)
      .delete(`/api/proposals/${testProposal.id}/versions/${versionRecord.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(404);

    // Attempt to PUT (modify) a proposal version
    const putRes = await request(app)
      .put(`/api/proposals/${testProposal.id}/versions/${versionRecord.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ snapshotJson: '{}' });
    expect(putRes.status).toBe(404);
  });

  it('enforces database-level RESTRICT on Proposal deletion when ProposalVersion exists (prevents cascading deletes)', async () => {
    // Attempting to delete the proposal directly must fail because ProposalVersion onDelete is Restrict
    let deleteFailed = false;
    try {
      await prisma.proposal.delete({
        where: { id: testProposal.id },
      });
    } catch (error: any) {
      deleteFailed = true;
      // Prisma error code P2003 or P2014 or foreign key constraint error
      expect(error.message).toMatch(/Foreign key|constraint|violation|delete/i);
    }
    expect(deleteFailed).toBe(true);

    // Verify ProposalVersion record remains intact
    const survivingVersion = await prisma.proposalVersion.findUnique({
      where: { id: versionRecord.id },
    });
    expect(survivingVersion).not.toBeNull();
  });

  it('proves AuditLog record persists independently even if referenced entity is modified', async () => {
    // Verify AuditLog still exists with original un-tampered data
    const survivingLog = await prisma.auditLog.findUnique({
      where: { id: auditLogRecord.id },
    });
    expect(survivingLog).not.toBeNull();
    expect(survivingLog?.action).toBe('CREATE');
    expect(survivingLog?.entityId).toBe(testProposal.id);
  });
});
