import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../db';
import { getApplicableStagesForProposal } from '../services/workflowEngine';

describe('Item 1: Workflow-as-Data Threshold Rules Integration Test', () => {
  let proposalType: any;
  let managementStage: any;
  let testProposal: any;
  let user: any;
  let department: any;

  beforeAll(async () => {
    // Find NEW_MACHINE proposal type and its workflow template stages
    proposalType = await prisma.proposalType.findUnique({
      where: { code: 'NEW_MACHINE' },
      include: {
        workflowTemplate: {
          include: {
            stages: { orderBy: { stepOrder: 'asc' } },
          },
        },
      },
    });

    expect(proposalType).toBeDefined();
    expect(proposalType.workflowTemplate).toBeDefined();

    // Find the Management stage
    managementStage = proposalType.workflowTemplate.stages.find(
      (s: any) => s.approverRole === 'Management'
    );
    expect(managementStage).toBeDefined();

    user = await prisma.user.findFirst();
    department = await prisma.department.findFirst();

    // Create a proposal with total investment ₹35,00,000 (3.5 Million)
    testProposal = await prisma.proposal.create({
      data: {
        proposalNumber: `TEST-WAD-${Date.now()}`,
        title: 'Workflow As Data Test Machine',
        proposalTypeId: proposalType.id,
        departmentId: department.id,
        initiatorId: user.id,
        status: 'IN_REVIEW',
        purchasePrice: 3500000,
        totalInvestment: 3500000,
      },
    });
  });

  it('initially includes Management stage when proposal amount (₹35L) exceeds default minAmount (₹10L)', async () => {
    // Reset to default 1,000,000
    await prisma.workflowStage.update({
      where: { id: managementStage.id },
      data: { minAmount: 1000000, maxAmount: null, conditionExpr: 'amount > 1000000' },
    });

    const applicableStages = await getApplicableStagesForProposal(testProposal.id);
    const hasManagement = applicableStages.some((s) => s.id === managementStage.id);
    expect(hasManagement).toBe(true);
  });

  it('dynamically excludes Management stage when admin updates threshold to ₹50L via database/API without code changes', async () => {
    // Admin edits threshold rule in DB to ₹50 Lakhs
    await prisma.workflowStage.update({
      where: { id: managementStage.id },
      data: { minAmount: 5000000, conditionExpr: 'amount > 5000000' },
    });

    // Verify newly evaluated stages for ₹35L proposal
    const applicableStages = await getApplicableStagesForProposal(testProposal.id);
    const hasManagement = applicableStages.some((s) => s.id === managementStage.id);
    expect(hasManagement).toBe(false);
  });

  it('dynamically includes Management stage again when threshold is lowered to ₹20L', async () => {
    // Admin edits threshold rule to ₹20 Lakhs
    await prisma.workflowStage.update({
      where: { id: managementStage.id },
      data: { minAmount: 2000000, conditionExpr: 'amount > 2000000' },
    });

    const applicableStages = await getApplicableStagesForProposal(testProposal.id);
    const hasManagement = applicableStages.some((s) => s.id === managementStage.id);
    expect(hasManagement).toBe(true);

    // Clean up: restore default 1,000,000
    await prisma.workflowStage.update({
      where: { id: managementStage.id },
      data: { minAmount: 1000000, conditionExpr: 'amount > 1000000' },
    });
  });
});
