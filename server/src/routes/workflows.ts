import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { validate, workflowActionSchema, stageUpdateSchema } from '../middleware/validate';
import { executeApprovalAction, runSLACheckAndEscalations } from '../services/workflowEngine';
import { logAudit } from '../services/auditLogger';

const router = Router();

// Get workflow templates with stages
router.get('/templates', authenticateToken, async (req, res) => {
  const templates = await prisma.workflowTemplate.findMany({
    include: {
      proposalType: true,
      stages: {
        orderBy: { stepOrder: 'asc' },
      },
    },
  });
  return res.json(templates);
});

// Admin-editable stage config (Thresholds, SLA, approverRole, conditions)
router.put('/stages/:id', authenticateToken, requireRoles('Admin', 'Management'), validate(stageUpdateSchema), async (req, res) => {
  const stageId = req.params.id as string;
  const { name, approverRole, slaDays, minAmount, maxAmount, conditionExpr } = req.body;

  const stage = await prisma.workflowStage.findUnique({
    where: { id: stageId },
  });

  if (!stage) {
    return res.status(404).json({ error: 'Stage not found' });
  }

  const updated = await prisma.workflowStage.update({
    where: { id: stageId },
    data: {
      name: name || stage.name,
      approverRole: approverRole || stage.approverRole,
      slaDays: slaDays !== undefined ? Number(slaDays) : stage.slaDays,
      minAmount: minAmount !== undefined ? (minAmount === null ? null : Number(minAmount)) : stage.minAmount,
      maxAmount: maxAmount !== undefined ? (maxAmount === null ? null : Number(maxAmount)) : stage.maxAmount,
      conditionExpr: conditionExpr !== undefined ? conditionExpr : stage.conditionExpr,
    },
  });

  await logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    entityType: 'WORKFLOW_STAGE',
    entityId: stage.id,
    action: 'UPDATE',
    before: { name: stage.name, approverRole: stage.approverRole, minAmount: stage.minAmount, maxAmount: stage.maxAmount },
    after: { name: updated.name, approverRole: updated.approverRole, minAmount: updated.minAmount, maxAmount: updated.maxAmount },
    ipAddress: req.ip,
  });

  return res.json(updated);
});

// Execute Approval Action (APPROVE, REJECT, REQUEST_REVISION, DELEGATE)
router.post('/proposals/:id/action', authenticateToken, validate(workflowActionSchema), async (req, res) => {
  try {
    const proposalId = req.params.id as string;
    const { action, comments, checklistResponses, delegatedToId, expectedStageId } = req.body;

    if (!action || !['APPROVE', 'REJECT', 'REQUEST_REVISION', 'DELEGATE'].includes(action)) {
      return res.status(400).json({ error: 'Invalid or missing approval action' });
    }

    const result = await executeApprovalAction({
      proposalId,
      userId: req.user!.id,
      action,
      comments,
      checklistResponses,
      delegatedToId,
      expectedStageId,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Action ${action} executed successfully.`,
      proposal: result,
    });
  } catch (err: any) {
    console.error('Error executing workflow action:', err);
    return res.status(400).json({ error: err.message || 'Action failed' });
  }
});

// List Delegations
router.get('/delegations', authenticateToken, async (req, res) => {
  const delegations = await prisma.delegation.findMany({
    include: {
      delegator: { select: { id: true, name: true, email: true, role: true } },
      delegatee: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(delegations);
});

// Create Delegation
router.post('/delegations', authenticateToken, async (req, res) => {
  const { delegateeId, role, startDate, endDate, reason } = req.body;

  if (!delegateeId || !role || !startDate || !endDate) {
    return res.status(400).json({ error: 'Delegatee, role, start date and end date are required' });
  }

  const delegation = await prisma.delegation.create({
    data: {
      delegatorId: req.user!.id,
      delegateeId,
      role,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      isActive: true,
    },
    include: {
      delegator: true,
      delegatee: true,
    },
  });

  await logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    entityType: 'DELEGATION',
    entityId: delegation.id,
    action: 'CREATE',
    after: { delegateeId, role, startDate, endDate },
    ipAddress: req.ip,
  });

  return res.status(201).json(delegation);
});

// Revoke Delegation
router.delete('/delegations/:id', authenticateToken, async (req, res) => {
  const delegationId = req.params.id as string;
  const delegation = await prisma.delegation.findUnique({ where: { id: delegationId } });
  if (!delegation) return res.status(404).json({ error: 'Delegation not found' });

  if (delegation.delegatorId !== req.user!.id && req.user!.role !== 'Admin') {
    return res.status(403).json({ error: 'Not authorized to revoke this delegation' });
  }

  const updated = await prisma.delegation.update({
    where: { id: delegationId },
    data: { isActive: false },
  });

  return res.json({ success: true, delegation: updated });
});

// Trigger SLA Check & Escalation manually or on schedule
router.post('/sla-check', authenticateToken, async (req, res) => {
  try {
    const escalations = await runSLACheckAndEscalations();
    return res.json({
      success: true,
      escalatedCount: escalations.length,
      escalations,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'SLA check failed' });
  }
});

export default router;
