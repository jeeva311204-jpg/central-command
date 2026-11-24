import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';
import { logAudit } from '../services/auditLogger';

const router = Router();

// List post-investment audits
router.get('/', authenticateToken, async (req, res) => {
  const { status, intervalMonths } = req.query;
  const where: any = {};
  if (status) where.status = String(status);
  if (intervalMonths) where.intervalMonths = Number(intervalMonths);

  const audits = await prisma.auditReview.findMany({
    where,
    include: {
      proposal: {
        include: { department: true },
      },
      asset: true,
      conductedBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: { scheduledDate: 'asc' },
  });

  return res.json(audits);
});

// Conduct / record post-investment audit review
router.post('/:id/conduct', authenticateToken, async (req, res) => {
  const auditId = req.params.id as string;
  const { actualProductionUnits, actualSavings, actualRoi, deviationNotes } = req.body;

  const existing = await prisma.auditReview.findUnique({
    where: { id: auditId },
    include: { proposal: true },
  });

  if (!existing) return res.status(404).json({ error: 'Audit review record not found' });

  const updated = await prisma.auditReview.update({
    where: { id: auditId },
    data: {
      actualProductionUnits: actualProductionUnits ? Number(actualProductionUnits) : null,
      actualSavings: actualSavings !== undefined ? Number(actualSavings) : null,
      actualRoi: actualRoi !== undefined ? Number(actualRoi) : null,
      deviationNotes,
      status: 'COMPLETED',
      conductedDate: new Date(),
      conductedById: req.user!.id,
    },
    include: {
      proposal: true,
      asset: true,
      conductedBy: true,
    },
  });

  await logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    entityType: 'AUDIT_REVIEW',
    entityId: updated.id,
    action: 'UPDATE',
    after: {
      intervalMonths: updated.intervalMonths,
      actualSavings: updated.actualSavings,
      targetSavings: updated.targetSavings,
    },
    ipAddress: req.ip,
  });

  return res.json(updated);
});

export default router;
