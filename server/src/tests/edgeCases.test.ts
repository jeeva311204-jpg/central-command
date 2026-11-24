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
  WorkflowTemplate,
  Delegation,
  Budget,
  Role,
} from '../models';
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
    await setupTestDB();

    const [empRole, hodRole, engRole, finRole, procRole, mgmtRole] = await Promise.all([
      Role.findOneAndUpdate({ name: 'Employee' }, { name: 'Employee' }, { upsert: true, new: true }),
      Role.findOneAndUpdate({ name: 'HOD' }, { name: 'HOD' }, { upsert: true, new: true }),
      Role.findOneAndUpdate({ name: 'Engineer' }, { name: 'Engineer' }, { upsert: true, new: true }),
      Role.findOneAndUpdate({ name: 'Finance' }, { name: 'Finance' }, { upsert: true, new: true }),
      Role.findOneAndUpdate({ name: 'Procurement' }, { name: 'Procurement' }, { upsert: true, new: true }),
      Role.findOneAndUpdate({ name: 'Management' }, { name: 'Management' }, { upsert: true, new: true }),
    ]);

    department = await Department.create({
      name: 'Production Edge',
      code: 'PROD_EDGE',
      isActive: true,
    });

    await Budget.create({
      departmentId: department._id,
      fiscalYear: 'FY2026-27',
      allocatedAmount: 50000000,
      utilisedAmount: 18000000,
    });

    employeeUser = await User.create({
      name: 'Edge Employee',
      email: `emp-edge-${Date.now()}@changeflow.com`,
      roleId: empRole._id,
      roleName: 'Employee',
      departmentId: department._id,
      passwordHash: 'dummy',
      isActive: true,
    });
    employeeToken = generateToken({
      id: employeeUser._id.toString(),
      email: employeeUser.email,
      name: employeeUser.name,
      role: 'Employee',
      departmentId: department._id.toString(),
    });

    hodUser = await User.create({
      name: 'Edge HOD',
      email: `hod-edge-${Date.now()}@changeflow.com`,
      roleId: hodRole._id,
      roleName: 'HOD',
      departmentId: department._id,
      passwordHash: 'dummy',
      isActive: true,
    });

    engineerUser = await User.create({
      name: 'Edge Engineer',
      email: `eng-edge-${Date.now()}@changeflow.com`,
      roleId: engRole._id,
      roleName: 'Engineer',
      departmentId: department._id,
      passwordHash: 'dummy',
      isActive: true,
    });

    financeUser = await User.create({
      name: 'Edge Finance',
      email: `fin-edge-${Date.now()}@changeflow.com`,
      roleId: finRole._id,
      roleName: 'Finance',
      departmentId: department._id,
      passwordHash: 'dummy',
      isActive: true,
    });

    procurementUser = await User.create({
      name: 'Edge Procurement',
      email: `proc-edge-${Date.now()}@changeflow.com`,
      roleId: procRole._id,
      roleName: 'Procurement',
      departmentId: department._id,
      passwordHash: 'dummy',
      isActive: true,
    });

    managementUser = await User.create({
      name: 'Edge Director',
      email: `mgmt-edge-${Date.now()}@changeflow.com`,
      roleId: mgmtRole._id,
      roleName: 'Management',
      departmentId: department._id,
      passwordHash: 'dummy',
      isActive: true,
    });

    proposalType = await ProposalType.create({
      code: `EDGE_TYPE_${Date.now()}`,
      name: 'Edge Machine Type',
      isActive: true,
    });

    const template = await WorkflowTemplate.create({
      proposalTypeId: proposalType._id,
      name: 'Edge Workflow Template',
      stages: [
        { stepOrder: 1, name: 'HOD Departmental Approval', approverRole: 'HOD', slaDays: 2 },
        { stepOrder: 2, name: 'Technical & Engineering Review', approverRole: 'Engineer', slaDays: 3, minAmount: 100000, conditionExpr: 'amount > 100000' },
        { stepOrder: 3, name: 'Financial Viability & Budget Signoff', approverRole: 'Finance', slaDays: 3, minAmount: 100000, conditionExpr: 'amount > 100000' },
        { stepOrder: 4, name: 'Procurement & Vendor Commercial Review', approverRole: 'Procurement', slaDays: 2, minAmount: 1000000, conditionExpr: 'amount > 1000000' },
        { stepOrder: 5, name: 'Executive Management / Director Sanction', approverRole: 'Management', slaDays: 4, minAmount: 1000000, conditionExpr: 'amount > 1000000' },
      ],
    });

    stages = template.stages;
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  // Edge Case 1: Revision and Resubmission
  it('1. Revision & Resubmission: Approver requests revision creating snapshot, initiator resubmits', async () => {
    const proposal = await Proposal.create({
      proposalNumber: `REV-TEST-${Date.now()}`,
      title: 'Machine for Revision Test',
      proposalTypeId: proposalType._id,
      departmentId: department._id,
      initiatorId: employeeUser._id,
      currentStageId: stages[0]._id,
      status: 'IN_REVIEW',
      purchasePrice: 2000000,
      totalInvestment: 2000000,
    });

    const revised = await executeApprovalAction({
      proposalId: proposal._id.toString(),
      userId: hodUser._id.toString(),
      action: 'REQUEST_REVISION',
      comments: 'Please revise quotation and useful life',
    });

    expect(revised.status).toBe('REVISION_REQUESTED');

    const versionSnap = await ProposalVersion.findOne({ proposalId: proposal._id }).sort({ versionNumber: -1 });
    expect(versionSnap).not.toBeNull();
    expect(versionSnap?.changeSummary).toContain('Please revise quotation');

    const resubmitRes = await request(app)
      .put(`/api/proposals/${proposal._id}`)
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

      const prop = await Proposal.create({
        proposalNumber: `REJ-STAGE-${i}-${Date.now()}`,
        title: `Rejection Test at ${stage.name}`,
        proposalTypeId: proposalType._id,
        departmentId: department._id,
        initiatorId: employeeUser._id,
        currentStageId: stage._id,
        status: 'IN_REVIEW',
        purchasePrice: 4000000,
        totalInvestment: 4000000,
      });

      const rejected = await executeApprovalAction({
        proposalId: prop._id.toString(),
        userId: approver._id.toString(),
        action: 'REJECT',
        comments: `Rejected at ${stage.name} due to non-compliance`,
      });

      expect(rejected.status).toBe('REJECTED');

      await expect(
        executeApprovalAction({
          proposalId: prop._id.toString(),
          userId: approver._id.toString(),
          action: 'APPROVE',
        })
      ).rejects.toThrow(/Cannot perform action on proposal with status REJECTED/);
    }
  });

  // Edge Case 3: Delegation Expiry
  it('3. Delegation Expiry: Expired delegation cannot approve stage', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);

    const pastStart = new Date();
    pastStart.setDate(pastStart.getDate() - 10);

    const expiredDelegation = await Delegation.create({
      delegatorId: hodUser._id,
      delegateeId: employeeUser._id,
      role: 'HOD',
      startDate: pastStart,
      endDate: pastDate,
      isActive: true,
      reason: 'HOD on annual leave last week',
    });

    const check = await canUserApproveStage(employeeUser._id.toString(), 'HOD');
    expect(check.allowed).toBe(false);

    await Delegation.findByIdAndDelete(expiredDelegation._id);
  });

  // Edge Case 4: Budget Overrun Block
  it('4. Budget Overrun Block: Prohibits non-privileged users from submitting proposal exceeding budget', async () => {
    const budget = await Budget.findOne({ departmentId: department._id, fiscalYear: 'FY2026-27' });
    const hugeAmount = (budget?.allocatedAmount || 10000000) * 10;

    const res = await request(app)
      .post('/api/proposals')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'Overrun Massive Investment Proposal',
        proposalTypeId: proposalType._id.toString(),
        departmentId: department._id.toString(),
        purchasePrice: hugeAmount,
      });

    expect(res.status).toBe(400);
    expect(res.body.blocked).toBe(true);
    expect(res.body.error).toContain('BUDGET OVERRUN ALERT');
  });

  // Edge Case 5: Concurrent Approval by Two Users
  it('5. Concurrent Approval: Detects stale stage and blocks race condition', async () => {
    const proposal = await Proposal.create({
      proposalNumber: `CONC-TEST-${Date.now()}`,
      title: 'Concurrent Approval Machine',
      proposalTypeId: proposalType._id,
      departmentId: department._id,
      initiatorId: employeeUser._id,
      currentStageId: stages[0]._id,
      status: 'IN_REVIEW',
      purchasePrice: 3000000,
      totalInvestment: 3000000,
    });

    const updated = await executeApprovalAction({
      proposalId: proposal._id.toString(),
      userId: hodUser._id.toString(),
      action: 'APPROVE',
      expectedStageId: stages[0]._id.toString(),
    });

    expect(updated.currentStageId?.toString()).toBe(stages[1]._id.toString());

    await expect(
      executeApprovalAction({
        proposalId: proposal._id.toString(),
        userId: hodUser._id.toString(),
        action: 'APPROVE',
        expectedStageId: stages[0]._id.toString(),
      })
    ).rejects.toThrow(/Concurrent modification detected/);
  });
});
