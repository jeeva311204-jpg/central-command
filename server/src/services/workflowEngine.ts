import mongoose from 'mongoose';
import { withTransaction } from '../db';
import { Proposal, IProposal } from '../models/Proposal';
import { ProposalVersion } from '../models/ProposalVersion';
import { WorkflowTemplate, IWorkflowStage } from '../models/WorkflowTemplate';
import { ApprovalAction } from '../models/ApprovalAction';
import { Delegation } from '../models/Delegation';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Budget } from '../models/Budget';
import { logAudit } from './auditLogger';
import { createNotification, sendSimulatedEmail } from './notificationService';

export interface StageFilterContext {
  amount: number;
}

/**
 * Filter stages applicable for the given amount based on configurable thresholds
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
export async function getApplicableStagesForProposal(proposalId: string): Promise<any[]> {
  const proposal = await Proposal.findById(proposalId);
  if (!proposal) return [];

  const workflowTemplate = await WorkflowTemplate.findOne({
    proposalTypeId: proposal.proposalTypeId,
  });

  if (!workflowTemplate || !workflowTemplate.stages) {
    return [];
  }

  const allStages = [...workflowTemplate.stages].sort((a, b) => a.stepOrder - b.stepOrder);
  return allStages
    .filter((stage) => isStageApplicable(stage, proposal.totalInvestment))
    .map((stage) => ({
      id: stage._id ? stage._id.toString() : stage.id,
      _id: stage._id,
      stepOrder: stage.stepOrder,
      name: stage.name,
      approverRole: stage.approverRole,
      slaDays: stage.slaDays,
      minAmount: stage.minAmount,
      maxAmount: stage.maxAmount,
      conditionExpr: stage.conditionExpr,
      checklistTemplateId: stage.checklistTemplateId,
    }));
}

/**
 * Check if a user is authorized to act on a stage (direct role or active delegation)
 */
export async function canUserApproveStage(userId: string, targetRole: string): Promise<{
  allowed: boolean;
  isDelegated: boolean;
  delegatorId?: string;
}> {
  const user = await User.findById(userId).populate('roleId');
  if (!user || !user.isActive) return { allowed: false, isDelegated: false };

  const roleDoc: any = user.roleId;
  const userRoleName = roleDoc?.name || '';

  // Admin or exact role match
  if (userRoleName === 'Admin' || userRoleName.toLowerCase() === targetRole.toLowerCase()) {
    return { allowed: true, isDelegated: false };
  }

  // Check active delegations
  const now = new Date();
  const activeDelegation = await Delegation.findOne({
    delegateeId: user._id,
    role: targetRole,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });

  if (activeDelegation) {
    return {
      allowed: true,
      isDelegated: true,
      delegatorId: activeDelegation.delegatorId.toString(),
    };
  }

  return { allowed: false, isDelegated: false };
}

/**
 * Execute an approval action on a proposal inside an ACID transaction
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
  return await withTransaction(async (session) => {
    const { proposalId, userId, action, comments, checklistResponses, delegatedToId, expectedStageId, ipAddress } = params;

    const query = Proposal.findById(proposalId);
    if (session) query.session(session);
    const proposal = await query.populate('departmentId').populate('initiatorId');

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.status !== 'IN_REVIEW' && proposal.status !== 'DRAFT') {
      throw new Error(`Cannot perform action on proposal with status ${proposal.status}`);
    }

    if (expectedStageId && proposal.currentStageId && proposal.currentStageId.toString() !== expectedStageId) {
      throw new Error(`Concurrent modification detected: Proposal is no longer at stage ${expectedStageId}`);
    }

    const user = await User.findById(userId).populate('roleId');
    if (!user) throw new Error('User not found');

    // Find current stage details from WorkflowTemplate
    const workflowTemplate = await WorkflowTemplate.findOne({
      proposalTypeId: proposal.proposalTypeId,
    });
    const currentStage = workflowTemplate?.stages.find(
      (s: any) => s._id.toString() === proposal.currentStageId?.toString()
    );

    if (!currentStage) {
      throw new Error('Proposal has no active workflow stage');
    }

    // Check permission
    const authCheck = await canUserApproveStage(userId, currentStage.approverRole);
    if (!authCheck.allowed) {
      throw new Error(`User does not have authorization to approve for role ${currentStage.approverRole}`);
    }

    const applicableStages = await getApplicableStagesForProposal(proposalId);
    const currentStageIndex = applicableStages.findIndex(
      (s) => s.id === currentStage._id.toString() || s._id?.toString() === currentStage._id.toString()
    );

    const beforeSnapshot = {
      status: proposal.status,
      currentStageId: proposal.currentStageId?.toString(),
      currentStageName: currentStage.name,
      __v: (proposal as any).__v,
    };

    // 1. REJECT
    if (action === 'REJECT') {
      proposal.status = 'REJECTED';
      await proposal.save({ session });

      const actionDoc = {
        proposalId: proposal._id,
        stageId: currentStage._id,
        stageName: currentStage.name,
        approverId: user._id,
        action: 'REJECT',
        comments: comments || 'Proposal rejected by approver.',
        checklistResponses,
      };

      if (session) {
        await ApprovalAction.create([actionDoc], { session });
      } else {
        await ApprovalAction.create(actionDoc);
      }

      await logAudit({
        userId,
        userName: user.name,
        entityType: 'PROPOSAL',
        entityId: proposalId,
        action: 'REJECT',
        before: beforeSnapshot,
        after: { status: 'REJECTED' },
        ipAddress,
        session,
      });

      const initiator: any = proposal.initiatorId;
      if (initiator) {
        await createNotification(
          initiator._id,
          `Proposal ${proposal.proposalNumber} Rejected`,
          `Your proposal "${proposal.title}" was rejected at ${currentStage.name} by ${user.name}. Reason: ${comments || 'No reason provided.'}`,
          'APPROVAL',
          `/proposals/${proposalId}`,
          session
        );

        await sendSimulatedEmail(
          initiator.email,
          initiator.name,
          `[ChangeFlow] Proposal Rejected: ${proposal.proposalNumber}`,
          `<p>Your proposal <strong>${proposal.proposalNumber} - ${proposal.title}</strong> has been rejected at stage <em>${currentStage.name}</em> by ${user.name}.</p><p>Comments: ${comments || 'None'}</p>`,
          'APPROVAL_REQUEST',
          session
        );
      }

      return proposal;
    }

    // 2. REQUEST_REVISION
    if (action === 'REQUEST_REVISION') {
      const versionCount = await ProposalVersion.countDocuments({ proposalId: proposal._id });
      const fullSnapshot = proposal.toObject ? proposal.toObject() : proposal;

      const versionDoc = {
        proposalId: proposal._id,
        versionNumber: versionCount + 1,
        snapshot: fullSnapshot,
        changedById: user._id,
        changeSummary: comments || `Revision requested at ${currentStage.name}`,
      };

      if (session) {
        await ProposalVersion.create([versionDoc], { session });
      } else {
        await ProposalVersion.create(versionDoc);
      }

      proposal.status = 'REVISION_REQUESTED';
      await proposal.save({ session });

      const actionDoc = {
        proposalId: proposal._id,
        stageId: currentStage._id,
        stageName: currentStage.name,
        approverId: user._id,
        action: 'REQUEST_REVISION',
        comments: comments || 'Revision requested.',
        checklistResponses,
      };

      if (session) {
        await ApprovalAction.create([actionDoc], { session });
      } else {
        await ApprovalAction.create(actionDoc);
      }

      await logAudit({
        userId,
        userName: user.name,
        entityType: 'PROPOSAL',
        entityId: proposalId,
        action: 'REQUEST_REVISION',
        before: beforeSnapshot,
        after: { status: 'REVISION_REQUESTED', versionCreated: versionCount + 1 },
        ipAddress,
        session,
      });

      const initiator: any = proposal.initiatorId;
      if (initiator) {
        await createNotification(
          initiator._id,
          `Revision Requested for ${proposal.proposalNumber}`,
          `${user.name} requested changes at ${currentStage.name}: "${comments || 'Please revise and resubmit'}"`,
          'APPROVAL',
          `/proposals/${proposalId}`,
          session
        );

        await sendSimulatedEmail(
          initiator.email,
          initiator.name,
          `[ChangeFlow] Revision Requested: ${proposal.proposalNumber}`,
          `<p>Revision has been requested for your proposal <strong>${proposal.proposalNumber}</strong> by ${user.name}.</p><p>Instructions: ${comments || 'Review and update required fields'}</p>`,
          'REVISION_REQUEST',
          session
        );
      }

      return proposal;
    }

    // 3. APPROVE
    if (action === 'APPROVE') {
      const actionDoc = {
        proposalId: proposal._id,
        stageId: currentStage._id,
        stageName: currentStage.name,
        approverId: user._id,
        action: 'APPROVE',
        comments: comments || 'Approved',
        checklistResponses,
        delegatedToId: authCheck.isDelegated ? user._id : undefined,
      };

      if (session) {
        await ApprovalAction.create([actionDoc], { session });
      } else {
        await ApprovalAction.create(actionDoc);
      }

      const nextStage = applicableStages[currentStageIndex + 1];

      if (nextStage) {
        // Advance to next stage
        proposal.currentStageId = nextStage._id || new mongoose.Types.ObjectId(nextStage.id);
        proposal.status = 'IN_REVIEW';
        await proposal.save({ session });

        await logAudit({
          userId,
          userName: user.name,
          entityType: 'PROPOSAL',
          entityId: proposalId,
          action: 'APPROVE',
          before: beforeSnapshot,
          after: { status: 'IN_REVIEW', currentStageId: nextStage.id, currentStageName: nextStage.name },
          ipAddress,
          session,
        });

        // Find users with nextStage.approverRole
        const targetRole = await Role.findOne({ name: nextStage.approverRole });
        if (targetRole) {
          const nextApprovers = await User.find({ roleId: targetRole._id, isActive: true });
          for (const approver of nextApprovers) {
            await createNotification(
              approver._id,
              `Action Required: ${proposal.proposalNumber}`,
              `Proposal "${proposal.title}" (₹${proposal.totalInvestment.toLocaleString('en-IN')}) requires your approval at stage: ${nextStage.name}`,
              'APPROVAL',
              `/proposals/${proposalId}`,
              session
            );

            await sendSimulatedEmail(
              approver.email,
              approver.name,
              `[ChangeFlow Approval Required] ${proposal.proposalNumber} - ${nextStage.name}`,
              `<p>Proposal <strong>${proposal.proposalNumber} - ${proposal.title}</strong> is pending your review as ${nextStage.approverRole}.</p><p>Total Value: ₹${proposal.totalInvestment.toLocaleString('en-IN')}</p>`,
              'APPROVAL_REQUEST',
              session
            );
          }
        }

        return proposal;
      } else {
        // Final approval reached!
        proposal.status = 'APPROVED';
        await proposal.save({ session });

        // Update Department Budget utilisation within transaction
        const budget = await Budget.findOne({
          departmentId: proposal.departmentId,
        });

        if (budget) {
          budget.utilisedAmount += proposal.totalInvestment;
          await budget.save({ session });
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
          session,
        });

        const initiator: any = proposal.initiatorId;
        if (initiator) {
          await createNotification(
            initiator._id,
            `Proposal Fully Approved! 🎉`,
            `Your CAPEX Proposal "${proposal.title}" has received all required executive approvals. Ready for PO generation.`,
            'APPROVAL',
            `/proposals/${proposalId}`,
            session
          );

          await sendSimulatedEmail(
            initiator.email,
            initiator.name,
            `[ChangeFlow APPROVED] Proposal ${proposal.proposalNumber} Sanctioned`,
            `<p>Congratulations! Proposal <strong>${proposal.proposalNumber}</strong> has completed all approval stages and is sanctioned.</p><p>Total Approved Budget: ₹${proposal.totalInvestment.toLocaleString('en-IN')}</p>`,
            'APPROVAL_REQUEST',
            session
          );
        }

        return proposal;
      }
    }

    // 4. DELEGATE
    if (action === 'DELEGATE') {
      if (!delegatedToId) {
        throw new Error('delegatedToId is required for delegation');
      }

      const delegatee = await User.findById(delegatedToId);
      if (!delegatee) throw new Error('Delegatee user not found');

      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 86400000);

      const delegationDoc = {
        delegatorId: user._id,
        delegateeId: delegatee._id,
        role: currentStage.approverRole,
        startDate: now,
        endDate: nextWeek,
        reason: comments || `Delegated for ${currentStage.name} review`,
        isActive: true,
      };

      if (session) {
        await Delegation.create([delegationDoc], { session });
      } else {
        await Delegation.create(delegationDoc);
      }

      const actionDoc = {
        proposalId: proposal._id,
        stageId: currentStage._id,
        stageName: currentStage.name,
        approverId: user._id,
        action: 'DELEGATE',
        comments: comments || `Delegated authority to ${delegatee.name}`,
        delegatedToId: delegatee._id,
      };

      if (session) {
        await ApprovalAction.create([actionDoc], { session });
      } else {
        await ApprovalAction.create(actionDoc);
      }

      await logAudit({
        userId,
        userName: user.name,
        entityType: 'PROPOSAL',
        entityId: proposalId,
        action: 'DELEGATE',
        before: beforeSnapshot,
        after: { delegatedToId: delegatee._id.toString(), delegateeName: delegatee.name },
        ipAddress,
        session,
      });

      await createNotification(
        delegatee._id,
        `Approval Authority Delegated: ${proposal.proposalNumber}`,
        `${user.name} has delegated their approval role for proposal "${proposal.title}" to you.`,
        'APPROVAL',
        `/proposals/${proposalId}`,
        session
      );

      return proposal;
    }

    throw new Error(`Unsupported action ${action}`);
  });
}

/**
 * SLA check: Finds overdue proposals and sends auto-escalations
 */
export async function runSLACheckAndEscalations() {
  const pendingProposals = await Proposal.find({ status: 'IN_REVIEW' })
    .populate('departmentId')
    .populate('initiatorId');

  const now = new Date();
  const escalations = [];

  for (const proposal of pendingProposals) {
    if (!proposal.currentStageId) continue;

    const workflowTemplate = await WorkflowTemplate.findOne({
      proposalTypeId: proposal.proposalTypeId,
    });
    const currentStage = workflowTemplate?.stages.find(
      (s: any) => s._id.toString() === proposal.currentStageId?.toString()
    );

    if (!currentStage) continue;
    const slaDays = currentStage.slaDays || 3;
    const stageAgeMs = now.getTime() - new Date(proposal.updatedAt).getTime();
    const stageAgeDays = stageAgeMs / (1000 * 60 * 60 * 24);

    if (stageAgeDays > slaDays) {
      const targetRole = await Role.findOne({ name: currentStage.approverRole });
      const approvers = targetRole ? await User.find({ roleId: targetRole._id, isActive: true }) : [];

      const managementRole = await Role.findOne({ name: 'Management' });
      const managers = managementRole ? await User.find({ roleId: managementRole._id, isActive: true }) : [];

      for (const approver of approvers) {
        await createNotification(
          approver._id,
          `⚠️ SLA Breached: ${proposal.proposalNumber}`,
          `Proposal "${proposal.title}" is ${Math.floor(stageAgeDays - slaDays)} days overdue at stage "${currentStage.name}". Immediate action required.`,
          'SLA_WARNING',
          `/proposals/${proposal._id}`
        );
      }

      const dept: any = proposal.departmentId;
      for (const manager of managers) {
        await createNotification(
          manager._id,
          `🚨 SLA Escalation: ${proposal.proposalNumber}`,
          `Proposal "${proposal.title}" (₹${proposal.totalInvestment.toLocaleString('en-IN')}) is delayed by ${Math.floor(stageAgeDays - slaDays)} days at "${currentStage.name}". Escalated for review.`,
          'ESCALATION',
          `/proposals/${proposal._id}`
        );

        await sendSimulatedEmail(
          manager.email,
          manager.name,
          `[ChangeFlow ESCALATION] SLA Breach on ${proposal.proposalNumber}`,
          `<p>Proposal <strong>${proposal.proposalNumber}</strong> in Department <strong>${dept?.name || 'Operations'}</strong> has breached its SLA of ${slaDays} days.</p><p>Current Stage: ${currentStage.name}</p><p>Days pending: ${stageAgeDays.toFixed(1)} days</p>`,
          'SLA_ESCALATION'
        );
      }

      escalations.push({
        proposalId: proposal._id.toString(),
        stageName: currentStage.name,
        daysOverdue: stageAgeDays - slaDays,
      });
    }
  }

  return escalations;
}
