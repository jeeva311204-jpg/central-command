import { Router } from 'express';
import mongoose from 'mongoose';
import { Asset, MaintenanceSchedule, AuditReview } from '../models';
import { authenticateToken } from '../middleware/auth';
import { logAudit } from '../services/auditLogger';

const router = Router();

// List assets with warranty status & maintenance
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { departmentId, status, category, warrantyExpiringSoon } = req.query;

    const query: any = {};
    if (departmentId) query.departmentId = new mongoose.Types.ObjectId(String(departmentId));
    if (status) query.status = String(status);
    if (category) query.category = String(category);

    if (warrantyExpiringSoon === 'true') {
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000);
      query.warrantyExpiryDate = {
        $gte: new Date(),
        $lte: thirtyDaysFromNow,
      };
    }

    const assets = await Asset.find(query)
      .populate('department')
      .populate('vendor')
      .populate('proposal', 'proposalNumber title')
      .sort({ purchaseDate: -1 });

    const assetIds = assets.map((a) => a._id);
    const [allSchedules, allReviews] = await Promise.all([
      MaintenanceSchedule.find({ assetId: { $in: assetIds } }).sort({ nextDueDate: 1 }),
      AuditReview.find({ assetId: { $in: assetIds } }).sort({ intervalMonths: 1 }),
    ]);

    const now = new Date();
    const enriched = assets.map((a) => {
      const obj = a.toObject({ virtuals: true });
      obj.id = obj._id.toString();
      obj.maintenanceSchedules = allSchedules.filter((s) => s.assetId?.toString() === obj.id);
      obj.auditReviews = allReviews.filter((r) => r.assetId?.toString() === obj.id);

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

      obj.daysUntilWarrantyExpiry = daysUntilWarrantyExpiry;
      obj.isWarrantyExpiringSoon = isWarrantyExpiringSoon;
      obj.isWarrantyExpired = isWarrantyExpired;

      return obj;
    });

    return res.json(enriched);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get asset detail
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const assetId = req.params.id as string;
    const asset = await Asset.findById(assetId)
      .populate('department')
      .populate('vendor')
      .populate('proposal');

    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const [schedules, reviews] = await Promise.all([
      MaintenanceSchedule.find({ assetId: asset._id })
        .populate('assignedTo', 'name role')
        .sort({ nextDueDate: 1 }),
      AuditReview.find({ assetId: asset._id })
        .populate('conductedBy', 'name')
        .sort({ intervalMonths: 1 }),
    ]);

    const obj = asset.toObject({ virtuals: true });
    obj.id = obj._id.toString();
    obj.maintenanceSchedules = schedules;
    obj.auditReviews = reviews;

    return res.json(obj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// List maintenance schedules
router.get('/maintenance/all', authenticateToken, async (req, res) => {
  try {
    const { status, assetId } = req.query;
    const query: any = {};
    if (status) query.status = String(status);
    if (assetId) query.assetId = new mongoose.Types.ObjectId(String(assetId));

    const schedules = await MaintenanceSchedule.find(query)
      .populate({
        path: 'asset',
        populate: { path: 'department' },
      })
      .populate('assignedTo', 'name role')
      .sort({ nextDueDate: 1 });

    const result = schedules.map((s) => {
      const obj = s.toObject({ virtuals: true });
      obj.id = obj._id.toString();
      return obj;
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Schedule preventive maintenance
router.post('/maintenance', authenticateToken, async (req, res) => {
  try {
    const { assetId, title, frequencyType, frequencyValue, nextDueDate, nextDueHours, assignedToId } = req.body;

    if (!assetId || !title) {
      return res.status(400).json({ error: 'assetId and title are required' });
    }

    const schedule = await MaintenanceSchedule.create({
      assetId: new mongoose.Types.ObjectId(String(assetId)),
      title,
      frequencyType: frequencyType || 'CALENDAR',
      frequencyValue: Number(frequencyValue) || 30,
      nextDueDate: nextDueDate ? new Date(nextDueDate) : new Date(Date.now() + 30 * 86400000),
      nextDueHours: nextDueHours ? Number(nextDueHours) : null,
      assignedToId: assignedToId ? new mongoose.Types.ObjectId(String(assignedToId)) : null,
      status: 'SCHEDULED',
    });

    const populated = await MaintenanceSchedule.findById(schedule._id)
      .populate('asset')
      .populate('assignedTo');

    const obj = populated!.toObject({ virtuals: true });
    obj.id = obj._id.toString();
    return res.status(201).json(obj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Mark maintenance completed
router.patch('/maintenance/:id/complete', authenticateToken, async (req, res) => {
  try {
    const scheduleId = req.params.id as string;
    const existing = await MaintenanceSchedule.findById(scheduleId);

    if (!existing) return res.status(404).json({ error: 'Maintenance schedule not found' });

    const now = new Date();
    const nextDueDate = new Date(now.getTime() + existing.frequencyValue * 86400000);

    const updated = await MaintenanceSchedule.findByIdAndUpdate(
      scheduleId,
      {
        status: 'COMPLETED',
        lastServiceDate: now,
        nextDueDate,
      },
      { new: true }
    );

    const obj = updated!.toObject({ virtuals: true });
    obj.id = obj._id.toString();
    return res.json(obj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
