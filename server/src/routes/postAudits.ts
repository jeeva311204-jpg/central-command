import { Router } from 'express';
import mongoose from 'mongoose';
import { AuditReview } from '../models';
import { authenticateToken } from '../middleware/auth';
import { logAudit } from '../services/auditLogger';

const router = Router();

// List post-investment audits
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, intervalMonths } = req.query;
    const query: any = {};
    if (status) query.status = String(status);
    if (intervalMonths) query.intervalMonths = Number(intervalMonths);

    const audits = await AuditReview.find(query)
      .populate({
        path: 'proposal',
        populate: { path: 'department' },
      })
      .populate('asset')
      .populate('conductedBy', 'name role')
      .sort({ scheduledDate: 1 });

    const result = audits.map((a) => {
      const obj = a.toObject({ virtuals: true });
      obj.id = obj._id.toString();
      return obj;
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Conduct / record post-investment audit review
router.post('/:id/conduct', authenticateToken, async (req, res) => {
  try {
    const auditId = req.params.id as string;
    const { actualProductionUnits, actualSavings, actualRoi, deviationNotes } = req.body;

    const existing = await AuditReview.findById(auditId);
    if (!existing) return res.status(404).json({ error: 'Audit review record not found' });

    const updated = await AuditReview.findByIdAndUpdate(
      auditId,
      {
        actualProductionUnits: actualProductionUnits ? Number(actualProductionUnits) : null,
        actualSavings: actualSavings !== undefined ? Number(actualSavings) : null,
        actualRoi: actualRoi !== undefined ? Number(actualRoi) : null,
        deviationNotes,
        status: 'COMPLETED',
        conductedDate: new Date(),
        conductedById: new mongoose.Types.ObjectId(req.user!.id),
      },
      { new: true }
    )
      .populate('proposal')
      .populate('asset')
      .populate('conductedBy');

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      entityType: 'AUDIT_REVIEW',
      entityId: updated!._id.toString(),
      action: 'UPDATE',
      after: {
        intervalMonths: updated!.intervalMonths,
        actualSavings: updated!.actualSavings,
        targetSavings: updated!.targetSavings,
      },
      ipAddress: req.ip,
    });

    const obj = updated!.toObject({ virtuals: true });
    obj.id = obj._id.toString();
    return res.json(obj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
