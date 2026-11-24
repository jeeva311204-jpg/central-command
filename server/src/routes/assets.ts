import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';
import { logAudit } from '../services/auditLogger';

const router = Router();

// List assets with warranty status & maintenance
router.get('/', authenticateToken, async (req, res) => {
  const { departmentId, status, category, warrantyExpiringSoon } = req.query;

  const where: any = {};
  if (departmentId) where.departmentId = String(departmentId);
  if (status) where.status = String(status);
  if (category) where.category = String(category);

  if (warrantyExpiringSoon === 'true') {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000);
    where.warrantyExpiryDate = {
      gte: new Date(),
      lte: thirtyDaysFromNow,
    };
  }

  const assets = await prisma.asset.findMany({
    where,
    include: {
      department: true,
      vendor: true,
      proposal: { select: { id: true, proposalNumber: true, title: true } },
      maintenanceSchedules: {
        orderBy: { nextDueDate: 'asc' },
      },
      auditReviews: {
        orderBy: { intervalMonths: 'asc' },
      },
    },
    orderBy: { purchaseDate: 'desc' },
  });

  // Calculate days until warranty expiry for each asset
  const now = new Date();
  const enriched = assets.map(a => {
    let daysUntilWarrantyExpiry = null;
    let isWarrantyExpiringSoon = false;
    let isWarrantyExpired = false;

    if (a.warrantyExpiryDate) {
      const diffMs = new Date(a.warrantyExpiryDate).getTime() - now.getTime();
      daysUntilWarrantyExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysUntilWarrantyExpiry <= 0) {
        isWarrantyExpired = true;
      } else if (daysUntilWarrantyExpiry <= 30) {
        isWarrantyExpiringSoon = true;
      }
    }

    return {
      ...a,
      daysUntilWarrantyExpiry,
      isWarrantyExpiringSoon,
      isWarrantyExpired,
    };
  });

  return res.json(enriched);
});

// Get asset detail
router.get('/:id', authenticateToken, async (req, res) => {
  const assetId = req.params.id as string;
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      department: true,
      vendor: true,
      proposal: true,
      maintenanceSchedules: {
        include: { assignedTo: { select: { id: true, name: true, role: true } } },
        orderBy: { nextDueDate: 'asc' },
      },
      auditReviews: {
        include: { conductedBy: { select: { id: true, name: true } } },
        orderBy: { intervalMonths: 'asc' },
      },
    },
  });

  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  return res.json(asset);
});

// List maintenance schedules
router.get('/maintenance/all', authenticateToken, async (req, res) => {
  const { status, assetId } = req.query;
  const where: any = {};
  if (status) where.status = String(status);
  if (assetId) where.assetId = String(assetId);

  const schedules = await prisma.maintenanceSchedule.findMany({
    where,
    include: {
      asset: { include: { department: true } },
      assignedTo: { select: { id: true, name: true, role: true } },
    },
    orderBy: { nextDueDate: 'asc' },
  });

  return res.json(schedules);
});

// Schedule preventive maintenance
router.post('/maintenance', authenticateToken, async (req, res) => {
  const { assetId, title, frequencyType, frequencyValue, nextDueDate, nextDueHours, assignedToId } = req.body;

  if (!assetId || !title) {
    return res.status(400).json({ error: 'assetId and title are required' });
  }

  const schedule = await prisma.maintenanceSchedule.create({
    data: {
      assetId,
      title,
      frequencyType: frequencyType || 'CALENDAR',
      frequencyValue: Number(frequencyValue) || 30,
      nextDueDate: nextDueDate ? new Date(nextDueDate) : new Date(Date.now() + 30 * 86400000),
      nextDueHours: nextDueHours ? Number(nextDueHours) : null,
      assignedToId: assignedToId || null,
      status: 'SCHEDULED',
    },
    include: { asset: true, assignedTo: true },
  });

  return res.status(201).json(schedule);
});

// Mark maintenance completed
router.patch('/maintenance/:id/complete', authenticateToken, async (req, res) => {
  const scheduleId = req.params.id as string;
  const existing = await prisma.maintenanceSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!existing) return res.status(404).json({ error: 'Maintenance schedule not found' });

  const now = new Date();
  const nextDueDate = new Date(now.getTime() + existing.frequencyValue * 86400000);

  const updated = await prisma.maintenanceSchedule.update({
    where: { id: scheduleId },
    data: {
      status: 'COMPLETED',
      lastServiceDate: now,
      nextDueDate,
    },
  });

  return res.json(updated);
});

export default router;
