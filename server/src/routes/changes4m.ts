import { Router } from 'express';
import mongoose from 'mongoose';
import { Change4M, Task, User, Proposal, getNextSequence } from '../models';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { validate, change4mCreateSchema } from '../middleware/validate';
import { logAudit } from '../services/auditLogger';
import { createNotification } from '../services/notificationService';

const router = Router();

// List 4M changes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, status } = req.query;
    const query: any = {};
    if (category) query.changeCategory = String(category);
    if (status) query.status = String(status);

    const changes = await Change4M.find(query)
      .populate('proposal', 'proposalNumber title')
      .populate('verifiedBy', 'name role')
      .sort({ createdAt: -1 });

    const changeIds = changes.map((c) => c._id);
    const tasks = await Task.find({ change4mId: { $in: changeIds } })
      .populate('assignedTo', 'name role');

    const result = changes.map((c) => {
      const obj = c.toObject({ virtuals: true });
      obj.id = obj._id.toString();
      obj.tasks = tasks.filter((t) => t.change4mId?.toString() === c._id.toString());
      return obj;
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get 4M change detail
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const changeId = req.params.id as string;
    const change = await Change4M.findById(changeId)
      .populate('proposal')
      .populate('verifiedBy');

    if (!change) return res.status(404).json({ error: '4M Change not found' });

    const tasks = await Task.find({ change4mId: change._id })
      .populate('assignedTo')
      .sort({ dueDate: 1 });

    const obj = change.toObject({ virtuals: true });
    obj.id = obj._id.toString();
    obj.tasks = tasks;

    return res.json(obj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create 4M change
router.post('/', authenticateToken, validate(change4mCreateSchema), async (req, res) => {
  try {
    const {
      proposalId,
      changeCategory,
      title,
      description,
      reasonForChange,
      riskAssessment,
      impactProduction,
      impactQuality,
      impactSafety,
      tasks,
    } = req.body;

    if (!changeCategory || !title || !description || !reasonForChange) {
      return res.status(400).json({ error: 'Category, title, description, and reason are required' });
    }

    const seq = await getNextSequence('changeNumber');
    const changeNumber = `CHG-2026-${String(seq).padStart(3, '0')}`;

    // Resolve department
    let departmentId = req.body.departmentId || req.user?.departmentId;
    if (!departmentId && proposalId) {
      const p = await Proposal.findById(proposalId);
      departmentId = p?.departmentId;
    }

    const parsedRisk = typeof riskAssessment === 'string' ? JSON.parse(riskAssessment) : (riskAssessment || {
      severity: 2,
      probability: 2,
      score: 4,
      riskLevel: 'LOW',
      mitigationPlan: 'Standard engineering controls applied.',
    });

    const change = await Change4M.create({
      changeNumber,
      proposalId: proposalId ? new mongoose.Types.ObjectId(String(proposalId)) : undefined,
      changeCategory,
      title,
      description,
      reasonForChange,
      departmentId: departmentId ? new mongoose.Types.ObjectId(String(departmentId)) : undefined,
      initiatorId: new mongoose.Types.ObjectId(req.user!.id),
      riskImpactLevel: parsedRisk.riskLevel || 'LOW',
      riskAssessment: {
        severity: parsedRisk.severity || 1,
        probability: parsedRisk.probability || 1,
        score: parsedRisk.score || parsedRisk.riskScore || 1,
        mitigationPlan: parsedRisk.mitigationPlan || '',
      },
      impactAreas: {
        production: impactProduction,
        quality: impactQuality,
        safety: impactSafety,
      },
      status: 'SUBMITTED',
    });

    let createdTasks: any[] = [];
    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      const taskDocs = tasks.map((t: any) => ({
        change4mId: change._id,
        proposalId: change.proposalId,
        title: t.title,
        description: t.description || null,
        assignedToId: new mongoose.Types.ObjectId(String(t.assignedToId || req.user!.id)),
        dueDate: new Date(t.dueDate || Date.now() + 7 * 86400000),
        status: 'PENDING',
      }));
      createdTasks = await Task.insertMany(taskDocs);
    }

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      entityType: 'CHANGE4M',
      entityId: change._id.toString(),
      action: 'CREATE',
      after: { title, changeCategory },
      ipAddress: req.ip,
    });

    const obj = change.toObject({ virtuals: true });
    obj.id = obj._id.toString();
    obj.tasks = createdTasks;
    return res.status(201).json(obj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Add implementation task to 4M change
router.post('/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const changeId = req.params.id as string;
    const { title, description, assignedToId, dueDate } = req.body;

    if (!title || !assignedToId || !dueDate) {
      return res.status(400).json({ error: 'Title, assignedToId and dueDate are required' });
    }

    const task = await Task.create({
      change4mId: new mongoose.Types.ObjectId(changeId),
      title,
      description,
      assignedToId: new mongoose.Types.ObjectId(String(assignedToId)),
      dueDate: new Date(dueDate),
      status: 'PENDING',
    });

    await createNotification(
      assignedToId,
      `New 4M Implementation Task Assigned`,
      `You have been assigned: "${title}". Due date: ${new Date(dueDate).toLocaleDateString()}`,
      'SYSTEM',
      `/changes4m/${changeId}`
    );

    const populated = await Task.findById(task._id).populate('assignedTo');
    return res.status(201).json(populated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update task status
router.patch('/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.taskId as string;
    const { status, verificationNotes } = req.body;

    const updated = await Task.findByIdAndUpdate(
      taskId,
      {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        verificationNotes,
      },
      { new: true }
    );

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Quality verification of 4M change
router.post('/:id/verify', authenticateToken, requireRoles('Quality', 'Admin'), async (req, res) => {
  try {
    const changeId = req.params.id as string;
    const { verificationNotes } = req.body;

    const change = await Change4M.findById(changeId);
    if (!change) return res.status(404).json({ error: '4M Change record not found' });

    const updated = await Change4M.findByIdAndUpdate(
      changeId,
      {
        verifiedById: new mongoose.Types.ObjectId(req.user!.id),
      },
      { new: true }
    );

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      entityType: 'CHANGE4M',
      entityId: change._id.toString(),
      action: 'STATUS_CHANGE',
      after: { verifiedById: req.user!.id, verificationNotes },
      ipAddress: req.ip,
    });

    return res.json({ success: true, change: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Closure of 4M change (HOD or Admin)
const handle4MClosure = async (req: any, res: any) => {
  try {
    const changeId = req.params.id as string;
    const { closureNotes, closureComments } = req.body;

    const changeRecord = await Change4M.findById(changeId);
    if (!changeRecord) return res.status(404).json({ error: '4M Change record not found' });

    // Check if all tasks completed
    const pendingTasks = await Task.countDocuments({
      change4mId: changeRecord._id,
      status: { $ne: 'COMPLETED' },
    });

    if (pendingTasks > 0) {
      return res.status(400).json({
        error: `Cannot close 4M Change. There are still ${pendingTasks} incomplete checklist tasks.`,
      });
    }

    const closedAt = new Date();
    const change = await Change4M.findByIdAndUpdate(
      changeId,
      {
        status: 'CLOSED',
        closureNotes:
          closureNotes ||
          closureComments ||
          'All verification checklist tasks completed and verified by Lead QA/Engineer.',
        closedAt,
        verifiedById: new mongoose.Types.ObjectId(req.user!.id),
      },
      { new: true }
    );

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      entityType: 'CHANGE4M',
      entityId: change!._id.toString(),
      action: 'STATUS_CHANGE',
      after: { status: 'CLOSED', closedAt },
      ipAddress: req.ip,
    });

    return res.json(change);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

router.post('/:id/close', authenticateToken, requireRoles('HOD', 'Admin'), handle4MClosure);
router.post('/:id/closure', authenticateToken, requireRoles('HOD', 'Admin'), handle4MClosure);

export default router;
