import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDB, teardownTestDB } from './setup';
import {
  User,
  Department,
  ProposalType,
  Proposal,
  WorkflowTemplate,
  Role,
} from '../models';
import { getApplicableStagesForProposal } from '../services/workflowEngine';

describe('Item 1: Workflow-as-Data Threshold Rules Integration Test', () => {
  let proposalType: any;
  let managementStage: any;
  let testProposal: any;
  let user: any;
  let department: any;

  beforeAll(async () => {
    await setupTestDB();

    const role = await Role.findOneAndUpdate({ name: 'Admin' }, { name: 'Admin' }, { upsert: true, new: true });
    department = await Department.create({ name: 'WAD Dept', code: 'WADD', isActive: true });
    user = await User.create({
      name: 'WAD User',
      email: `wad-${Date.now()}@changeflow.com`,
      roleId: role._id,
      roleName: 'Admin',
      departmentId: department._id,
      passwordHash: 'dummy',
      isActive: true,
    });

    proposalType = await ProposalType.create({
      code: `WAD_TYPE_${Date.now()}`,
      name: 'WAD Machine Type',
      isActive: true,
    });

    const template = await WorkflowTemplate.create({
      proposalTypeId: proposalType._id,
      name: 'WAD Workflow',
      stages: [
        { stepOrder: 1, name: 'HOD Approval', approverRole: 'HOD', minAmount: null },
        { stepOrder: 2, name: 'Technical Review', approverRole: 'Engineer', minAmount: 100000, conditionExpr: 'amount > 100000' },
        { stepOrder: 3, name: 'Finance Signoff', approverRole: 'Finance', minAmount: 100000, conditionExpr: 'amount > 100000' },
        { stepOrder: 4, name: 'Procurement Review', approverRole: 'Procurement', minAmount: 1000000, conditionExpr: 'amount > 1000000' },
        { stepOrder: 5, name: 'Management Sanction', approverRole: 'Management', minAmount: 1000000, conditionExpr: 'amount > 1000000' },
      ],
    });

    managementStage = template.stages.find((s: any) => s.approverRole === 'Management');
    expect(managementStage).toBeDefined();

    testProposal = await Proposal.create({
      proposalNumber: `TEST-WAD-${Date.now()}`,
      title: 'Workflow As Data Test Machine',
      proposalTypeId: proposalType._id,
      departmentId: department._id,
      initiatorId: user._id,
      status: 'IN_REVIEW',
      purchasePrice: 3500000,
      totalInvestment: 3500000,
    });
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('initially includes Management stage when proposal amount (₹35L) exceeds default minAmount (₹10L)', async () => {
    await WorkflowTemplate.updateOne(
      { 'stages._id': managementStage._id },
      {
        $set: {
          'stages.$.minAmount': 1000000,
          'stages.$.maxAmount': null,
          'stages.$.conditionExpr': 'amount > 1000000',
        },
      }
    );

    const applicableStages = await getApplicableStagesForProposal(testProposal._id.toString());
    const hasManagement = applicableStages.some((s) => s.id === managementStage._id.toString());
    expect(hasManagement).toBe(true);
  });

  it('dynamically excludes Management stage when admin updates threshold to ₹50L via database/API without code changes', async () => {
    await WorkflowTemplate.updateOne(
      { 'stages._id': managementStage._id },
      {
        $set: {
          'stages.$.minAmount': 5000000,
          'stages.$.conditionExpr': 'amount > 5000000',
        },
      }
    );

    const applicableStages = await getApplicableStagesForProposal(testProposal._id.toString());
    const hasManagement = applicableStages.some((s) => s.id === managementStage._id.toString());
    expect(hasManagement).toBe(false);
  });

  it('dynamically includes Management stage again when threshold is lowered to ₹20L', async () => {
    await WorkflowTemplate.updateOne(
      { 'stages._id': managementStage._id },
      {
        $set: {
          'stages.$.minAmount': 2000000,
          'stages.$.conditionExpr': 'amount > 2000000',
        },
      }
    );

    const applicableStages = await getApplicableStagesForProposal(testProposal._id.toString());
    const hasManagement = applicableStages.some((s) => s.id === managementStage._id.toString());
    expect(hasManagement).toBe(true);
  });
});
