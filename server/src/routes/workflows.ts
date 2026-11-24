import { Router } from 'express';
import mongoose from 'mongoose';
import { WorkflowTemplate } from '../models/WorkflowTemplate';
import { ProposalType } from '../models/ProposalType';
import { Delegation } from '../models/Delegation';
import { User } from '../models/User';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { validate, workflowActionSchema, stageUpdateSchema } from '../middleware/validate';
import { executeApprovalAction, runSLACheckAndEscalations } from '../services/workflowEngine';
import { logAudit } from '../services/auditLogger';

const router = Router();

// Get workflow templates with stages
router.get('/templates', authenticateToken, async (req, res) => {
  const templates = await WorkflowTemplate.find({ isActive: true })
    .populate('proposalTypeId');

  return res.json(
    templates.map((t) => ({
      id: t._id.toString(),
      _id: t._id,
      proposalTypeId: t.proposalTypeId,
      proposalType: t.proposalTypeId,
      name: t.name,
      description: t.description,
      version: t.version,
      stages: (t.stages || []).map((s: any) => ({
        id: s._id.toString(),
        _id: s._id,
        stepOrder: s.stepOrder,
        name: s.name,
        approverRole: s.approverRole,
        slaDays: s.slaDays,
        minAmount: s.minAmount,
        maxAmount: s.maxAmount,
        conditionExpr: s.conditionExpr,
        checklistTemplateId: s.checklistTemplateId,
      })),
    }))
  );
});

// Admin-editable stage config (Thresholds, SLA, approverRole, conditions)
router.put('/stages/:id', authenticateToken, requireRoles('Admin', 'Management'), validate(stageUpdateSchema), async (req, res) => {
  const stageId = req.params.id as string;
  const { name, approverRole, slaDays, minAmount, maxAmount, conditionExpr } = req.body;

  const template = await WorkflowTemplate.findOne({ 'stages._id': stageId });
  if (!template) {
    return res.status(404).json({ error: 'Stage not found' });
  }

  const stage = (template.stages as any).id(stageId);
  if (!stage) {
    return res.status(404).json({ error: 'Stage not found' });
  }

  const before = {
    name: stage.name,
    approverRole: stage.approverRole,
    minAmount: stage.minAmount,
    maxAmount: stage.maxAmount,
  };

  if (name !== undefined) stage.name = name;
  if (approverRole !== undefined) stage.approverRole = approverRole;
  if (slaDays !== undefined) stage.slaDays = Number(slaDays);
  if (minAmount !== undefined) stage.minAmount = minAmount === null ? null : Number(minAmount);
  if (maxAmount !== undefined) stage.maxAmount = maxAmount === null ? null : Number(maxAmount);
  if (conditionExpr !== undefined) stage.conditionExpr = conditionExpr;

  await template.save();

  await logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    entityType: 'WORKFLOW_STAGE',
    entityId: stage._id.toString(),
    action: 'UPDATE',
    before,
    after: { name: stage.name, approverRole: stage.approverRole, minAmount: stage.minAmount, maxAmount: stage.maxAmount },
    ipAddress: req.ip,
  });

  return res.json({
    id: stage._id.toString(),
    _id: stage._id,
    stepOrder: stage.stepOrder,
    name: stage.name,
    approverRole: stage.approverRole,
    slaDays: stage.slaDays,
    minAmount: stage.minAmount,
    maxAmount: stage.maxAmount,
    conditionExpr: stage.conditionExpr,
  });
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
  const delegations = await Delegation.find()
    .populate('delegatorId', 'name email roleId')
    .populate('delegateeId', 'name email roleId')
    .sort({ createdAt: -1 });

  return res.json(delegations);
});

// Create Delegation
router.post('/delegations', authenticateToken, async (req, res) => {
  const { delegateeId, role, startDate, endDate, reason } = req.body;

  if (!delegateeId || !role || !startDate || !endDate) {
    return res.status(400).json({ error: 'Delegatee, role, start date and end date are required' });
  }

  const delegation = await Delegation.create({
    delegatorId: new mongoose.Types.ObjectId(req.user!.id),
    delegateeId: new mongoose.Types.ObjectId(delegateeId),
    role,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    reason,
    isActive: true,
  });

  await logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    entityType: 'DELEGATION',
    entityId: delegation._id.toString(),
    action: 'CREATE',
    after: { delegateeId, role, startDate, endDate },
    ipAddress: req.ip,
  });

  const populated = await Delegation.findById(delegation._id)
    .populate('delegatorId')
    .populate('delegateeId');

  return res.status(201).json(populated);
});

// Revoke Delegation
router.delete('/delegations/:id', authenticateToken, async (req, res) => {
  const delegationId = req.params.id as string;
  const delegation = await Delegation.findById(delegationId);
  if (!delegation) return res.status(404).json({ error: 'Delegation not found' });

  if (delegation.delegatorId.toString() !== req.user!.id && req.user!.role !== 'Admin') {
    return res.status(403).json({ error: 'Not authorized to revoke this delegation' });
  }

  delegation.isActive = false;
  await delegation.save();

  return res.json({ success: true, delegation });
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
