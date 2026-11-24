import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDB, teardownTestDB } from './setup';
import {
  User,
  Department,
  ProposalType,
  Proposal,
  WorkflowTemplate,
  Notification,
  SimulatedEmail,
  Role,
} from '../models';
import { runSLACheckAndEscalations } from '../services/workflowEngine';

describe('Item 2: SLA Escalation Automation & Overdue Fixtures Test', () => {
  let user: any;
  let department: any;
  let proposalType: any;
  let stage: any;
  let overdueProposal: any;
  let freshProposal: any;

  beforeAll(async () => {
    await setupTestDB();

    const [empRole, hodRole, mgmtRole] = await Promise.all([
      Role.findOneAndUpdate({ name: 'Employee' }, { name: 'Employee' }, { upsert: true, new: true }),
      Role.findOneAndUpdate({ name: 'HOD' }, { name: 'HOD' }, { upsert: true, new: true }),
      Role.findOneAndUpdate({ name: 'Management' }, { name: 'Management' }, { upsert: true, new: true }),
    ]);

    department = await Department.create({ name: 'SLA Test Dept', code: 'SLAD', isActive: true });

    user = await User.create({
      name: 'SLA Initiator',
      email: `sla-user-${Date.now()}@changeflow.com`,
      roleId: empRole._id,
      roleName: 'Employee',
      departmentId: department._id,
      passwordHash: 'dummy',
      isActive: true,
    });

    const hodUser = await User.create({
      name: 'SLA HOD',
      email: `sla-hod-${Date.now()}@changeflow.com`,
      roleId: hodRole._id,
      roleName: 'HOD',
      departmentId: department._id,
      passwordHash: 'dummy',
      isActive: true,
    });

    await User.create({
      name: 'SLA Director',
      email: `sla-director-${Date.now()}@changeflow.com`,
      roleId: mgmtRole._id,
      roleName: 'Management',
      departmentId: department._id,
      passwordHash: 'dummy',
      isActive: true,
    });

    proposalType = await ProposalType.create({
      code: 'SLA_TEST',
      name: 'SLA Test Type',
      isActive: true,
    });

    const template = await WorkflowTemplate.create({
      proposalTypeId: proposalType._id,
      name: 'SLA Test Template',
      stages: [
        { stepOrder: 1, name: 'HOD Review', approverRole: 'HOD', slaDays: 2 },
      ],
    });
    stage = template.stages[0];

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    overdueProposal = await Proposal.create({
      proposalNumber: `TEST-OVERDUE-${Date.now()}`,
      title: 'Overdue Test Machine for SLA Escalation',
      proposalTypeId: proposalType._id,
      departmentId: department._id,
      initiatorId: user._id,
      currentStageId: stage._id,
      status: 'IN_REVIEW',
      totalInvestment: 2500000,
    });

    await Proposal.findByIdAndUpdate(
      overdueProposal._id,
      { updatedAt: pastDate },
      { timestamps: false }
    );

    freshProposal = await Proposal.create({
      proposalNumber: `TEST-FRESH-${Date.now()}`,
      title: 'Fresh Test Machine within SLA',
      proposalTypeId: proposalType._id,
      departmentId: department._id,
      initiatorId: user._id,
      currentStageId: stage._id,
      status: 'IN_REVIEW',
      totalInvestment: 1500000,
    });
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('detects overdue proposals and triggers auto-escalations', async () => {
    const escalations = await runSLACheckAndEscalations();

    const overdueResult = escalations.find((e) => e.proposalId === overdueProposal._id.toString());
    expect(overdueResult).toBeDefined();
    expect(overdueResult?.daysOverdue).toBeGreaterThan(0);

    const freshResult = escalations.find((e) => e.proposalId === freshProposal._id.toString());
    expect(freshResult).toBeUndefined();
  });

  it('generates in-app notifications and email alerts for approvers and management', async () => {
    const notifications = await Notification.find({
      linkUrl: `/proposals/${overdueProposal._id}`,
    });
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications.some((n) => n.title.includes('SLA Escalation'))).toBe(true);

    const emails = await SimulatedEmail.find({
      category: 'SLA_ESCALATION',
      subject: { $regex: overdueProposal.proposalNumber },
    });
    expect(emails.length).toBeGreaterThan(0);
    expect(emails[0].bodyHtml).toContain('overdue');
  });
});
