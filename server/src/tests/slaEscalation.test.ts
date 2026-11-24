import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../db';
import { runSLACheckAndEscalations } from '../services/workflowEngine';

describe('Item 2: SLA Escalation Automation & Overdue Fixtures Test', () => {
  let user: any;
  let department: any;
  let proposalType: any;
  let stage: any;
  let overdueProposal: any;
  let freshProposal: any;

  beforeAll(async () => {
    user = await prisma.user.findFirst({ where: { role: { name: 'Employee' } } });
    department = await prisma.department.findFirst();
    proposalType = await prisma.proposalType.findFirst({
      include: { workflowTemplate: { include: { stages: true } } },
    });
    stage = proposalType.workflowTemplate.stages[0]; // e.g. HOD stage

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10); // 10 days in past (SLA is 2-3 days)

    // Overdue proposal fixture
    overdueProposal = await prisma.proposal.create({
      data: {
        proposalNumber: `TEST-OVERDUE-${Date.now()}`,
        title: 'Overdue Test Machine for SLA Escalation',
        proposalTypeId: proposalType.id,
        departmentId: department.id,
        initiatorId: user.id,
        currentStageId: stage.id,
        status: 'IN_REVIEW',
        totalInvestment: 2500000,
        updatedAt: pastDate,
      },
    });

    // Manually force updatedAt into the past because Prisma @updatedAt defaults to now() on creation
    await prisma.$executeRawUnsafe(
      `UPDATE Proposal SET updatedAt = ? WHERE id = ?`,
      pastDate.toISOString(),
      overdueProposal.id
    );

    // Fresh proposal fixture (updated right now)
    freshProposal = await prisma.proposal.create({
      data: {
        proposalNumber: `TEST-FRESH-${Date.now()}`,
        title: 'Fresh Test Machine within SLA',
        proposalTypeId: proposalType.id,
        departmentId: department.id,
        initiatorId: user.id,
        currentStageId: stage.id,
        status: 'IN_REVIEW',
        totalInvestment: 1500000,
      },
    });
  });

  it('detects overdue proposals and triggers auto-escalations', async () => {
    const escalations = await runSLACheckAndEscalations();

    // Verify overdueProposal was escalated
    const overdueResult = escalations.find((e) => e.proposalId === overdueProposal.id);
    expect(overdueResult).toBeDefined();
    expect(overdueResult?.daysOverdue).toBeGreaterThan(0);

    // Verify fresh proposal was NOT escalated
    const freshResult = escalations.find((e) => e.proposalId === freshProposal.id);
    expect(freshResult).toBeUndefined();
  });

  it('generates in-app notifications and email alerts for approvers and management', async () => {
    // Check notifications created for the overdue proposal
    const notifications = await prisma.notification.findMany({
      where: {
        linkUrl: `/proposals/${overdueProposal.id}`,
      },
    });

    expect(notifications.length).toBeGreaterThan(0);
    const hasSlaWarningOrEscalation = notifications.some(
      (n) => n.type === 'SLA_WARNING' || n.type === 'ESCALATION'
    );
    expect(hasSlaWarningOrEscalation).toBe(true);

    // Check simulated email created
    const emails = await prisma.simulatedEmail.findMany({
      where: {
        category: 'SLA_ESCALATION',
        subject: { contains: overdueProposal.proposalNumber },
      },
    });

    expect(emails.length).toBeGreaterThan(0);
    expect(emails[0].bodyHtml).toContain(overdueProposal.proposalNumber);
  });
});
