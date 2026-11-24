import { prisma } from '../db';
import { logAudit } from './auditLogger';
import { createNotification, sendSimulatedEmail } from './notificationService';

export interface StageFilterContext {
  amount: number;
}

/**
 * Filter stages applicable for the given amount based on configurable thresholds
 * Default business rules:
 * - <= 100,000 (1 Lakh): HOD only
 * - 100,000 - 1,000,000 (1L - 10L): HOD + Technical (Engineer) + Finance
 * - > 1,000,000 (> 10L): HOD + Technical (Engineer) + Finance + Procurement + Management
 */
export function isStageApplicable(stage: {
  approverRole: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  conditionExpr?: string | null;
}, amount: number): boolean {
  // If specific min/max is set on the stage directly in DB, use it
  if (stage.minAmount !== null && stage.minAmount !== undefined && amount < stage.minAmount) {
    return false;
  }
  if (stage.maxAmount !== null && stage.maxAmount !== undefined && amount > stage.maxAmount) {
    return false;
  }

  // Parse conditionExpr if present, e.g. "amount > 1000000"
  if (stage.conditionExpr) {
    try {
      const expr = stage.conditionExpr.trim();
      if (expr.startsWith('amount >=')) {
        const val = parseFloat(expr.replace('amount >=', '').trim());
        if (amount < val) return false;
      } else if (expr.startsWith('amount >')) {
        const val = parseFloat(expr.replace('amount >', '').trim());
        if (amount <= val) return false;
      } else if (expr.startsWith('amount <=')) {
        const val = parseFloat(expr.replace('amount <=', '').trim());
        if (amount > val) return false;
      } else if (expr.startsWith('amount <')) {
        const val = parseFloat(expr.replace('amount <', '').trim());
        if (amount >= val) return false;
      }
    } catch (e) {
      console.warn('Failed to parse condition expression:', stage.conditionExpr);
    }
  }

  // Pure workflow-as-data: stage applies unless filtered out by its configured thresholds or condition expressions
  return true;
}

/**
 * Get ordered applicable stages for a proposal
 */
export async function getApplicableStagesForProposal(proposalId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      proposalType: {
        include: {
          workflowTemplate: {
            include: {
              stages: {
                orderBy: { stepOrder: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  if (!proposal || !proposal.proposalType.workflowTemplate) {
    return [];
  }

  const allStages = proposal.proposalType.workflowTemplate.stages;
  return allStages.filter(stage => isStageApplicable(stage, proposal.totalInvestment));
}

/**
 * Check if a user is authorized to act on a stage (direct role or active delegation)
 */
export async function canUserApproveStage(userId: string, targetRole: string): Promise<{
  allowed: boolean;
  isDelegated: boolean;
  delegatorId?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) return { allowed: false, isDelegated: false };

  // Admin or exact role match
  if (user.role.name === 'Admin' || user.role.name.toLowerCase() === targetRole.toLowerCase()) {
    return { allowed: true, isDelegated: false };
  }

  // Check active delegations
  const now = new Date();
  const activeDelegation = await prisma.delegation.findFirst({
    where: {
      delegateeId: userId,
      role: { equals: targetRole },
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: { delegator: true },
  });

  if (activeDelegation) {
    return {
      allowed: true,
      isDelegated: true,
      delegatorId: activeDelegation.delegatorId,
    };
  }

  return { allowed: false, isDelegated: false };
}

/**
 * Execute an approval action on a proposal
 */
export async function executeApprovalAction(params: {
  proposalId: string;
  userId: string;
  action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION' | 'DELEGATE';
  comments?: string;
  checklistResponses?: any;
  delegatedToId?: string;
  expectedStageId?: string;
  ipAddress?: string;
}) {
  const { proposalId, userId, action, comments, checklistResponses, delegatedToId, expectedStageId, ipAddress } = params;

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      currentStage: true,
      initiator: true,
      department: true,
    },
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  if (proposal.status !== 'IN_REVIEW' && proposal.status !== 'DRAFT') {
    throw new Error(`Cannot perform action on proposal with status ${proposal.status}`);
  }

  if (expectedStageId && proposal.currentStageId !== expectedStageId) {
    throw new Error(`Concurrent modification detected: Proposal is no longer at stage ${expectedStageId}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const currentStage = proposal.currentStage;
  if (!currentStage) {
    throw new Error('Proposal has no active workflow stage');
  }

  // Check permission
  const authCheck = await canUserApproveStage(userId, currentStage.approverRole);
  if (!authCheck.allowed) {
    throw new Error(`User does not have authorization to approve for role ${currentStage.approverRole}`);
  }

  const applicableStages = await getApplicableStagesForProposal(proposalId);
  const currentStageIndex = applicableStages.findIndex(s => s.id === currentStage.id);

  const beforeSnapshot = {
    status: proposal.status,
    currentStageId: proposal.currentStageId,
    currentStageName: currentStage.name,
  };

  // 1. REJECT
  if (action === 'REJECT') {
    const updated = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: 'REJECTED',
      },
    });

    await prisma.approvalAction.create({
      data: {
        proposalId,
        stageId: currentStage.id,
        stageName: currentStage.name,
        approverId: userId,
        action: 'REJECT',
        comments: comments || 'Proposal rejected by approver.',
        checklistResponsesJson: checklistResponses ? JSON.stringify(checklistResponses) : null,
      },
    });

    await logAudit({
      userId,
      userName: user.name,
      entityType: 'PROPOSAL',
      entityId: proposalId,
      action: 'REJECT',
      before: beforeSnapshot,
      after: { status: 'REJECTED' },
      ipAddress,
    });

    await createNotification(
      proposal.initiatorId,
      `Proposal ${proposal.proposalNumber} Rejected`,
      `Your proposal "${proposal.title}" was rejected at ${currentStage.name} by ${user.name}. Reason: ${comments || 'No reason provided.'}`,
      'APPROVAL',
      `/proposals/${proposalId}`
    );

    await sendSimulatedEmail(
      proposal.initiator.email,
      proposal.initiator.name,
      `[ChangeFlow] Proposal Rejected: ${proposal.proposalNumber}`,
      `<p>Your proposal <strong>${proposal.proposalNumber} - ${proposal.title}</strong> has been rejected at stage <em>${currentStage.name}</em> by ${user.name}.</p><p>Comments: ${comments || 'None'}</p>`,
      'APPROVAL_REQUEST'
    );

    return updated;
  }

  // 2. REQUEST_REVISION
  if (action === 'REQUEST_REVISION') {
    // Snapshot old version
    const versionCount = await prisma.proposalVersion.count({ where: { proposalId } });
    const fullSnapshot = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { currentStage: true, department: true, initiator: true },
    });

    await prisma.proposalVersion.create({
      data: {
        proposalId,
        versionNumber: versionCount + 1,
        snapshotJson: JSON.stringify(fullSnapshot),
        changedById: userId,
        changeSummary: comments || `Revision requested at ${currentStage.name}`,
      },
    });

    const updated = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: 'REVISION_REQUESTED',
      },
    });

    await prisma.approvalAction.create({
      data: {
        proposalId,
        stageId: currentStage.id,
        stageName: currentStage.name,
        approverId: userId,
        action: 'REQUEST_REVISION',
        comments: comments || 'Revision requested.',
        checklistResponsesJson: checklistResponses ? JSON.stringify(checklistResponses) : null,
      },
    });

    await logAudit({
      userId,
      userName: user.name,
      entityType: 'PROPOSAL',
      entityId: proposalId,
      action: 'REQUEST_REVISION',
      before: beforeSnapshot,
      after: { status: 'REVISION_REQUESTED', versionCreated: versionCount + 1 },
      ipAddress,
    });

    await createNotification(
      proposal.initiatorId,
      `Revision Requested for ${proposal.proposalNumber}`,
      `${user.name} requested changes at ${currentStage.name}: "${comments || 'Please revise and resubmit'}"`,
      'APPROVAL',
      `/proposals/${proposalId}/edit`
    );

    await sendSimulatedEmail(
      proposal.initiator.email,
      proposal.initiator.name,
      `[ChangeFlow] Revision Requested: ${proposal.proposalNumber}`,
      `<p>Revision has been requested for your proposal <strong>${proposal.proposalNumber}</strong> by ${user.name}.</p><p>Instructions: ${comments || 'Review and update required fields'}</p>`,
      'REVISION_REQUEST'
    );

    return updated;
  }

  // 3. APPROVE
  if (action === 'APPROVE') {
    await prisma.approvalAction.create({
      data: {
        proposalId,
        stageId: currentStage.id,
        stageName: currentStage.name,
        approverId: userId,
        action: 'APPROVE',
        comments: comments || 'Approved',
        checklistResponsesJson: checklistResponses ? JSON.stringify(checklistResponses) : null,
        delegatedToId: authCheck.isDelegated ? userId : null,
      },
    });

    const nextStage = applicableStages[currentStageIndex + 1];

    if (nextStage) {
      // Advance to next stage
      const updated = await prisma.proposal.update({
        where: { id: proposalId },
        data: {
          currentStageId: nextStage.id,
          status: 'IN_REVIEW',
        },
      });

      await logAudit({
        userId,
        userName: user.name,
        entityType: 'PROPOSAL',
        entityId: proposalId,
        action: 'APPROVE',
        before: beforeSnapshot,
        after: { status: 'IN_REVIEW', currentStageId: nextStage.id, currentStageName: nextStage.name },
        ipAddress,
      });

      // Notify approvers of next stage
      const nextApprovers = await prisma.user.findMany({
        where: {
          role: { name: nextStage.approverRole },
          isActive: true,
        },
      });

      for (const approver of nextApprovers) {
        await createNotification(
          approver.id,
          `Action Required: ${proposal.proposalNumber}`,
          `Proposal "${proposal.title}" (₹${proposal.totalInvestment.toLocaleString('en-IN')}) requires your approval at stage: ${nextStage.name}`,
          'APPROVAL',
          `/proposals/${proposalId}`
        );

        await sendSimulatedEmail(
          approver.email,
          approver.name,
          `[ChangeFlow Approval Required] ${proposal.proposalNumber} - ${nextStage.name}`,
          `<p>Proposal <strong>${proposal.proposalNumber} - ${proposal.title}</strong> is pending your review as ${nextStage.approverRole}.</p><p>Total Value: ₹${proposal.totalInvestment.toLocaleString('en-IN')}</p>`,
          'APPROVAL_REQUEST'
        );
      }

      return updated;
    } else {
      // Final approval reached!
      const updated = await prisma.proposal.update({
        where: { id: proposalId },
        data: {
          status: 'APPROVED',
        },
      });

      // Update Department Budget utilisation
      const budget = await prisma.budget.findFirst({
        where: { departmentId: proposal.departmentId },
      });
      if (budget) {
        await prisma.budget.update({
          where: { id: budget.id },
          data: { utilisedAmount: budget.utilisedAmount + proposal.totalInvestment },
        });
      }

      await logAudit({
        userId,
        userName: user.name,
        entityType: 'PROPOSAL',
        entityId: proposalId,
        action: 'APPROVE',
        before: beforeSnapshot,
        after: { status: 'APPROVED', isFinalApproval: true },
        ipAddress,
      });

      await createNotification(
        proposal.initiatorId,
        `Proposal Fully Approved! 🎉`,
        `Your proposal "${proposal.title}" (${proposal.proposalNumber}) has received final approval and is now ready for Procurement and PO generation.`,
        'APPROVAL',
        `/proposals/${proposalId}`
      );

      await sendSimulatedEmail(
        proposal.initiator.email,
        proposal.initiator.name,
        `[ChangeFlow] Proposal Fully Approved: ${proposal.proposalNumber}`,
        `<p>Congratulations! Proposal <strong>${proposal.proposalNumber}</strong> has completed all approval stages successfully.</p><p>Total Sanctioned: ₹${proposal.totalInvestment.toLocaleString('en-IN')}</p>`,
        'APPROVAL_REQUEST'
      );

      return updated;
    }
  }

  // 4. DELEGATE
  if (action === 'DELEGATE') {
    if (!delegatedToId) {
      throw new Error('Delegated target user ID is required');
    }

    const delegatee = await prisma.user.findUnique({ where: { id: delegatedToId } });
    if (!delegatee) throw new Error('Target user not found');

    await prisma.approvalAction.create({
      data: {
        proposalId,
        stageId: currentStage.id,
        stageName: currentStage.name,
        approverId: userId,
        action: 'DELEGATE',
        comments: comments || `Delegated approval authority to ${delegatee.name}`,
        delegatedToId,
      },
    });

    await createNotification(
      delegatedToId,
      `Approval Delegated: ${proposal.proposalNumber}`,
      `${user.name} has delegated the approval of proposal "${proposal.title}" (${currentStage.name}) to you.`,
      'APPROVAL',
      `/proposals/${proposalId}`
    );

    return proposal;
  }

  throw new Error(`Unsupported action ${action}`);
}

/**
 * SLA check: Finds overdue proposals and sends auto-escalations
 */
export async function runSLACheckAndEscalations() {
  const pendingProposals = await prisma.proposal.findMany({
    where: { status: 'IN_REVIEW' },
    include: {
      currentStage: true,
      initiator: true,
      department: true,
    },
  });

  const now = new Date();
  const escalations = [];

  for (const proposal of pendingProposals) {
    if (!proposal.currentStage) continue;
    const slaDays = proposal.currentStage.slaDays || 3;
    const stageAgeMs = now.getTime() - new Date(proposal.updatedAt).getTime();
    const stageAgeDays = stageAgeMs / (1000 * 60 * 60 * 24);

    if (stageAgeDays > slaDays) {
      // Overdue! Send auto-escalation to approvers and Management
      const approvers = await prisma.user.findMany({
        where: { role: { name: proposal.currentStage.approverRole }, isActive: true },
      });
      const managers = await prisma.user.findMany({
        where: { role: { name: 'Management' }, isActive: true },
      });

      for (const approver of approvers) {
        await createNotification(
          approver.id,
          `⚠️ SLA Breached: ${proposal.proposalNumber}`,
          `Proposal "${proposal.title}" is ${Math.floor(stageAgeDays - slaDays)} days overdue at stage "${proposal.currentStage.name}". Immediate action required.`,
          'SLA_WARNING',
          `/proposals/${proposal.id}`
        );
      }

      for (const manager of managers) {
        await createNotification(
          manager.id,
          `🚨 SLA Escalation: ${proposal.proposalNumber}`,
          `Proposal "${proposal.title}" (₹${proposal.totalInvestment.toLocaleString('en-IN')}) is delayed by ${Math.floor(stageAgeDays - slaDays)} days at "${proposal.currentStage.name}". Escalated for review.`,
          'ESCALATION',
          `/proposals/${proposal.id}`
        );

        await sendSimulatedEmail(
          manager.email,
          manager.name,
          `[ChangeFlow ESCALATION] SLA Breach on ${proposal.proposalNumber}`,
          `<p>Proposal <strong>${proposal.proposalNumber}</strong> in Department <strong>${proposal.department.name}</strong> has breached its SLA of ${slaDays} days.</p><p>Current Stage: ${proposal.currentStage.name}</p><p>Days pending: ${stageAgeDays.toFixed(1)} days</p>`,
          'SLA_ESCALATION'
        );
      }

      escalations.push({
        proposalId: proposal.id,
        stageName: proposal.currentStage.name,
        daysOverdue: stageAgeDays - slaDays,
      });
    }
  }

  return escalations;
}
