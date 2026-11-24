import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { validate, change4mCreateSchema } from '../middleware/validate';
import { logAudit } from '../services/auditLogger';
import { createNotification } from '../services/notificationService';

const router = Router();

// List 4M changes
router.get('/', authenticateToken, async (req, res) => {
  const { category, status } = req.query;
  const where: any = {};
  if (category) where.changeCategory = String(category);
  if (status) where.status = String(status);

  const changes = await prisma.change4M.findMany({
    where,
    include: {
      proposal: { select: { id: true, proposalNumber: true, title: true } },
      verifiedBy: { select: { id: true, name: true, role: true } },
      tasks: {
        include: { assignedTo: { select: { id: true, name: true, role: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(changes);
});

// Get 4M change detail
router.get('/:id', authenticateToken, async (req, res) => {
  const changeId = req.params.id as string;
  const change = await prisma.change4M.findUnique({
    where: { id: changeId },
    include: {
      proposal: true,
      verifiedBy: true,
      tasks: {
        include: { assignedTo: true },
        orderBy: { dueDate: 'asc' },
      },
    },
  });

  if (!change) return res.status(404).json({ error: '4M Change not found' });
  return res.json(change);
});

// Create 4M change
router.post('/', authenticateToken, validate(change4mCreateSchema), async (req, res) => {
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

  const change = await prisma.change4M.create({
    data: {
      proposalId: proposalId || null,
      changeCategory,
      title,
      description,
      reasonForChange,
      riskAssessmentJson: JSON.stringify(riskAssessment || {
        severity: 2,
        probability: 2,
        riskScore: 4,
        riskLevel: 'LOW',
        mitigationPlan: 'Standard engineering controls applied.',
      }),
      impactProduction,
      impactQuality,
      impactSafety,
      status: 'SUBMITTED',
      tasks: tasks && Array.isArray(tasks) && tasks.length > 0 ? {
        create: tasks.map((t: any) => ({
          title: t.title,
          description: t.description || null,
          assignedToId: t.assignedToId || req.user!.id,
          dueDate: new Date(t.dueDate || Date.now() + 7 * 86400000),
          status: 'PENDING',
        })),
      } : undefined,
    },
    include: {
      tasks: true,
    },
  });

  await logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    entityType: 'CHANGE4M',
    entityId: change.id,
    action: 'CREATE',
    after: { title, changeCategory },
    ipAddress: req.ip,
  });

  return res.status(201).json(change);
});

// Add implementation task to 4M change
router.post('/:id/tasks', authenticateToken, async (req, res) => {
  const changeId = req.params.id as string;
  const { title, description, assignedToId, dueDate } = req.body;

  if (!title || !assignedToId || !dueDate) {
    return res.status(400).json({ error: 'Title, assignedToId and dueDate are required' });
  }

  const task = await prisma.task.create({
    data: {
      change4mId: changeId,
      title,
      description,
      assignedToId,
      dueDate: new Date(dueDate),
      status: 'PENDING',
    },
    include: { assignedTo: true },
  });

  await createNotification(
    assignedToId,
    `New 4M Implementation Task Assigned`,
    `You have been assigned: "${title}". Due date: ${new Date(dueDate).toLocaleDateString()}`,
    'SYSTEM',
    `/changes4m/${changeId}`
  );

  return res.status(201).json(task);
});

// Update task status
router.patch('/tasks/:taskId', authenticateToken, async (req, res) => {
  const taskId = req.params.taskId as string;
  const { status, verificationNotes } = req.body;

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === 'COMPLETED' ? new Date() : null,
      verificationNotes,
    },
  });

  return res.json(updated);
});

// Quality verification of 4M change
router.post('/:id/verify', authenticateToken, requireRoles('Quality', 'Admin'), async (req, res) => {
  const changeId = req.params.id as string;
  const { verificationNotes } = req.body;

  const change = await prisma.change4M.findUnique({ where: { id: changeId } });
  if (!change) return res.status(404).json({ error: '4M Change record not found' });

  const updated = await prisma.change4M.update({
    where: { id: changeId },
    data: {
      verifiedById: req.user!.id,
    },
  });

  await logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    entityType: 'CHANGE4M',
    entityId: change.id,
    action: 'STATUS_CHANGE',
    after: { verifiedById: req.user!.id, verificationNotes },
    ipAddress: req.ip,
  });

  return res.json({ success: true, change: updated });
});

// Closure of 4M change (HOD or Admin)
const handle4MClosure = async (req: any, res: any) => {
  const changeId = req.params.id as string;
  const { closureNotes, closureComments } = req.body;

  const changeRecord = await prisma.change4M.findUnique({ where: { id: changeId } });
  if (!changeRecord) return res.status(404).json({ error: '4M Change record not found' });

  // Check if all tasks completed
  const pendingTasks = await prisma.task.count({
    where: {
      change4mId: changeId,
      status: { not: 'COMPLETED' },
    },
  });

  if (pendingTasks > 0) {
    return res.status(400).json({
      error: `Cannot close 4M Change. There are still ${pendingTasks} incomplete checklist tasks.`,
    });
  }

  const change = await prisma.change4M.update({
    where: { id: changeId },
    data: {
      status: 'CLOSED',
      closureNotes: closureNotes || closureComments || 'All verification checklist tasks completed and verified by Lead QA/Engineer.',
      closedAt: new Date(),
      verifiedById: req.user!.id,
    },
  });

  await logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    entityType: 'CHANGE4M',
    entityId: change.id,
    action: 'STATUS_CHANGE',
    after: { status: 'CLOSED', closedAt: change.closedAt },
    ipAddress: req.ip,
  });

  return res.json(change);
};

router.post('/:id/close', authenticateToken, requireRoles('HOD', 'Admin'), handle4MClosure);
router.post('/:id/closure', authenticateToken, requireRoles('HOD', 'Admin'), handle4MClosure);

export default router;
