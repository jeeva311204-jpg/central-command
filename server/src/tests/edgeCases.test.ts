import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db';
import { generateToken } from '../middleware/auth';
import { executeApprovalAction, canUserApproveStage } from '../services/workflowEngine';

describe('Item 5: Comprehensive Edge Cases Test Suite', () => {
  let employeeUser: any;
  let employeeToken: string;
  let hodUser: any;
  let engineerUser: any;
  let financeUser: any;
  let procurementUser: any;
  let managementUser: any;
  let department: any;
  let proposalType: any;
  let stages: any[];

  beforeAll(async () => {
    employeeUser = await prisma.user.findFirst({
      where: { role: { name: 'Employee' } },
      include: { role: true },
    });
    employeeToken = generateToken(employeeUser);

    hodUser = await prisma.user.findFirst({
      where: { role: { name: 'HOD' } },
      include: { role: true },
    });

    engineerUser = await prisma.user.findFirst({
      where: { role: { name: 'Engineer' } },
      include: { role: true },
    });

    financeUser = await prisma.user.findFirst({
      where: { role: { name: 'Finance' } },
      include: { role: true },
    });

    procurementUser = await prisma.user.findFirst({
      where: { role: { name: 'Procurement' } },
      include: { role: true },
    });

    managementUser = await prisma.user.findFirst({
      where: { role: { name: 'Management' } },
      include: { role: true },
    });

    department = await prisma.department.findFirst({
      where: { code: 'PROD' },
      include: { budgets: true },
    });

    proposalType = await prisma.proposalType.findUnique({
      where: { code: 'NEW_MACHINE' },
      include: {
        workflowTemplate: {
          include: { stages: { orderBy: { stepOrder: 'asc' } } },
        },
      },
    });

    stages = proposalType.workflowTemplate.stages;
  });

  // Edge Case 1: Revision and Resubmission
  it('1. Revision & Resubmission: Approver requests revision creating snapshot, initiator resubmits', async () => {
    const proposal = await prisma.proposal.create({
      data: {
        proposalNumber: `REV-TEST-${Date.now()}`,
        title: 'Machine for Revision Test',
        proposalTypeId: proposalType.id,
        departmentId: department.id,
        initiatorId: employeeUser.id,
        currentStageId: stages[0].id,
        status: 'IN_REVIEW',
        purchasePrice: 2000000,
        totalInvestment: 2000000,
      },
    });

    // Approver requests revision
    const revised = await executeApprovalAction({
      proposalId: proposal.id,
      userId: hodUser.id,
      action: 'REQUEST_REVISION',
      comments: 'Please revise quotation and useful life',
    });

    expect(revised.status).toBe('REVISION_REQUESTED');

    // Confirm ProposalVersion snapshot was created
    const versionSnap = await prisma.proposalVersion.findFirst({
      where: { proposalId: proposal.id },
      orderBy: { versionNumber: 'desc' },
    });
    expect(versionSnap).not.toBeNull();
    expect(versionSnap?.changeSummary).toContain('Please revise quotation');

    // Initiator resubmits via PUT /api/proposals/:id
    const resubmitRes = await request(app)
      .put(`/api/proposals/${proposal.id}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        usefulLifeYears: 7,
        resubmitForApproval: true,
      });

    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.status).toBe('IN_REVIEW');
  });

  // Edge Case 2: Rejection at each workflow stage
  it('2. Rejection terminates proposal status cleanly at each of the 5 stages', async () => {
    const approversByStage = [
      { stage: stages[0], approver: hodUser },
      { stage: stages[1], approver: engineerUser },
      { stage: stages[2], approver: financeUser },
      { stage: stages[3], approver: procurementUser },
      { stage: stages[4], approver: managementUser },
    ];

    for (let i = 0; i < approversByStage.length; i++) {
      const { stage, approver } = approversByStage[i];

      const prop = await prisma.proposal.create({
        data: {
          proposalNumber: `REJ-STAGE-${i}-${Date.now()}`,
          title: `Rejection Test at ${stage.name}`,
          proposalTypeId: proposalType.id,
          departmentId: department.id,
          initiatorId: employeeUser.id,
          currentStageId: stage.id,
          status: 'IN_REVIEW',
          purchasePrice: 4000000,
          totalInvestment: 4000000,
        },
      });

      const rejected = await executeApprovalAction({
        proposalId: prop.id,
        userId: approver.id,
        action: 'REJECT',
        comments: `Rejected at ${stage.name} due to non-compliance`,
      });

      expect(rejected.status).toBe('REJECTED');

      // Verify further approval attempts fail on rejected proposal
      await expect(
        executeApprovalAction({
          proposalId: prop.id,
          userId: approver.id,
          action: 'APPROVE',
        })
      ).rejects.toThrow(/Cannot perform action on proposal with status REJECTED/);
    }
  });

  // Edge Case 3: Delegation Expiry
  it('3. Delegation Expiry: Expired delegation cannot approve stage', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2); // Expired 2 days ago

    const pastStart = new Date();
    pastStart.setDate(pastStart.getDate() - 10);

    // Create an expired delegation from HOD to Employee
    const expiredDelegation = await prisma.delegation.create({
      data: {
        delegatorId: hodUser.id,
        delegateeId: employeeUser.id,
        role: 'HOD',
        startDate: pastStart,
        endDate: pastDate, // Already expired!
        isActive: true,
        reason: 'HOD on annual leave last week',
      },
    });

    const check = await canUserApproveStage(employeeUser.id, 'HOD');
    expect(check.allowed).toBe(false);

    // Cleanup
    await prisma.delegation.delete({ where: { id: expiredDelegation.id } });
  });

  // Edge Case 4: Budget Overrun Block
  it('4. Budget Overrun Block: Prohibits non-privileged users from submitting proposal exceeding budget', async () => {
    // Current budget available for department
    const budget = await prisma.budget.findFirst({
      where: { departmentId: department.id, fiscalYear: 'FY2026-27' },
    });

    const hugeAmount = (budget?.allocatedAmount || 10000000) * 10; // Exceeds budget by 10x

    const res = await request(app)
      .post('/api/proposals')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'Overrun Massive Investment Proposal',
        proposalTypeId: proposalType.id,
        departmentId: department.id,
        purchasePrice: hugeAmount,
      });

    expect(res.status).toBe(400);
    expect(res.body.blocked).toBe(true);
    expect(res.body.error).toContain('BUDGET OVERRUN ALERT');
  });

  // Edge Case 5: Concurrent Approval by Two Users
  it('5. Concurrent Approval: Detects stale stage and blocks race condition', async () => {
    const proposal = await prisma.proposal.create({
      data: {
        proposalNumber: `CONC-TEST-${Date.now()}`,
        title: 'Concurrent Approval Machine',
        proposalTypeId: proposalType.id,
        departmentId: department.id,
        initiatorId: employeeUser.id,
        currentStageId: stages[0].id,
        status: 'IN_REVIEW',
        purchasePrice: 3000000,
        totalInvestment: 3000000,
      },
    });

    // Approver 1 approves the HOD stage
    const updated = await executeApprovalAction({
      proposalId: proposal.id,
      userId: hodUser.id,
      action: 'APPROVE',
      expectedStageId: stages[0].id,
    });

    // Proposal has now moved to stage 1 (Engineer)
    expect(updated.currentStageId).toBe(stages[1].id);

    // Approver 2 tries to concurrently approve the old HOD stage
    await expect(
      executeApprovalAction({
        proposalId: proposal.id,
        userId: hodUser.id,
        action: 'APPROVE',
        expectedStageId: stages[0].id, // Stale stage!
      })
    ).rejects.toThrow(/Concurrent modification detected/);
  });
});
