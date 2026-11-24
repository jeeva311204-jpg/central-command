import { Router } from 'express';
import mongoose from 'mongoose';
import { withTransaction } from '../db';
import {
  Delivery,
  PurchaseOrder,
  Proposal,
  Department,
  Asset,
  MaintenanceSchedule,
  AuditReview,
  getNextSequence,
} from '../models';
import { authenticateToken } from '../middleware/auth';
import { logAudit } from '../services/auditLogger';
import { createNotification } from '../services/notificationService';

const router = Router();

// List deliveries with pipeline steps
router.get('/', authenticateToken, async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate({
        path: 'purchaseOrder',
        populate: [
          { path: 'vendor' },
          { path: 'proposal', populate: { path: 'department' } },
        ],
      })
      .sort({ updatedAt: -1 });

    const result = deliveries.map((d) => {
      const obj = d.toObject({ virtuals: true });
      obj.id = obj._id.toString();
      return obj;
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update pipeline step (dispatch, delivery, installation, commissioning, training)
router.patch('/:id/step', authenticateToken, async (req, res) => {
  try {
    const deliveryId = req.params.id as string;
    const {
      status,
      dispatchDate,
      deliveryDate,
      installationDate,
      commissioningDate,
      trainingCompletedDate,
      trackingNumber,
      carrier,
      notes,
    } = req.body;

    const data: any = {};
    if (status) data.status = status;
    if (dispatchDate) data.dispatchDate = new Date(dispatchDate);
    if (deliveryDate) data.deliveryDate = new Date(deliveryDate);
    if (installationDate) data.installationDate = new Date(installationDate);
    if (commissioningDate) data.commissioningDate = new Date(commissioningDate);
    if (trainingCompletedDate) data.trainingCompletedDate = new Date(trainingCompletedDate);
    if (trackingNumber) data.trackingNumber = trackingNumber;
    if (carrier) data.carrier = carrier;
    if (notes) data.notes = notes;

    const delivery = await Delivery.findByIdAndUpdate(deliveryId, data, { new: true }).populate({
      path: 'purchaseOrder',
      populate: [{ path: 'proposal' }, { path: 'vendor' }],
    });

    if (!delivery) return res.status(404).json({ error: 'Delivery record not found' });

    const obj = delivery.toObject({ virtuals: true });
    obj.id = obj._id.toString();
    return res.json(obj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Final Quality & Engineering Verification Sign-off
// Triggers auto-registration into Asset Register (Module 8)!
router.post('/:id/signoff', authenticateToken, async (req, res) => {
  try {
    const deliveryId = req.params.id as string;
    const { signoffType, serialNumber, location, warrantyMonths } = req.body;

    const delivery = await Delivery.findById(deliveryId).populate({
      path: 'purchaseOrder',
      populate: [
        { path: 'proposal', populate: { path: 'department' } },
        { path: 'vendor' },
      ],
    });

    if (!delivery) return res.status(404).json({ error: 'Delivery record not found' });

    const updateData: any = {};
    if (signoffType === 'QUALITY') {
      updateData.qualityVerifiedById = new mongoose.Types.ObjectId(req.user!.id);
    } else if (signoffType === 'ENGINEERING') {
      updateData.engineeringVerifiedById = new mongoose.Types.ObjectId(req.user!.id);
    } else {
      updateData.qualityVerifiedById = new mongoose.Types.ObjectId(req.user!.id);
      updateData.engineeringVerifiedById = new mongoose.Types.ObjectId(req.user!.id);
    }

    const isNowFullyVerified =
      (updateData.qualityVerifiedById || delivery.qualityVerifiedById) &&
      (updateData.engineeringVerifiedById || delivery.engineeringVerifiedById);

    if (isNowFullyVerified) {
      updateData.status = 'VERIFIED';
      if (!delivery.commissioningDate) {
        updateData.commissioningDate = new Date();
      }
    }

    const updatedDeliveryDoc = await Delivery.findByIdAndUpdate(deliveryId, updateData, { new: true });
    let registeredAsset: any = null;

    if (isNowFullyVerified) {
      const po = delivery.purchaseOrder as any;
      const proposal = po?.proposal as any;

      if (proposal) {
        const existingAsset = await Asset.findOne({ proposalId: proposal._id });

        if (!existingAsset) {
          registeredAsset = await withTransaction(async (session) => {
            const seq = await getNextSequence('assetCode', session);
            const deptCode = proposal.department?.code || 'GEN';
            const assetCode = `AST-${deptCode}-${String(seq).padStart(3, '0')}`;

            const warrantyDurationMonths = warrantyMonths || 12;
            const warrantyExpiryDate = new Date(Date.now() + warrantyDurationMonths * 30 * 86400000);

            const assetDocs = await Asset.create(
              [
                {
                  assetCode,
                  name: proposal.machineName || proposal.title,
                  proposalId: proposal._id,
                  departmentId: proposal.departmentId,
                  vendorId: po.vendorId,
                  serialNumber: serialNumber || `SN-${Date.now().toString().slice(-8)}`,
                  category: proposal.category || 'CNC Machining',
                  purchaseDate: po.issuedDate || new Date(),
                  commissioningDate: new Date(),
                  purchasePrice: po.totalAmount,
                  warrantyExpiryDate,
                  location: location || `${proposal.department?.name || 'Plant'} Main Shop Floor`,
                  status: 'OPERATIONAL',
                },
              ],
              { session }
            );
            const asset = assetDocs[0];

            await MaintenanceSchedule.create(
              [
                {
                  assetId: asset._id,
                  title: 'Initial 90-Day Preventive Calibration & Lubrication Check',
                  frequencyType: 'CALENDAR',
                  frequencyValue: 90,
                  lastServiceDate: new Date(),
                  nextDueDate: new Date(Date.now() + 90 * 86400000),
                  status: 'SCHEDULED',
                },
              ],
              { session }
            );

            await AuditReview.create(
              [
                {
                  proposalId: proposal._id,
                  assetId: asset._id,
                  intervalMonths: 3,
                  scheduledDate: new Date(Date.now() + 90 * 86400000),
                  status: 'PENDING',
                  targetSavings: proposal.annualSavings ? proposal.annualSavings / 4 : 0,
                  targetRoi: proposal.roiPercent || 0,
                },
                {
                  proposalId: proposal._id,
                  assetId: asset._id,
                  intervalMonths: 6,
                  scheduledDate: new Date(Date.now() + 180 * 86400000),
                  status: 'PENDING',
                  targetSavings: proposal.annualSavings ? proposal.annualSavings / 2 : 0,
                  targetRoi: proposal.roiPercent || 0,
                },
                {
                  proposalId: proposal._id,
                  assetId: asset._id,
                  intervalMonths: 12,
                  scheduledDate: new Date(Date.now() + 365 * 86400000),
                  status: 'PENDING',
                  targetSavings: proposal.annualSavings || 0,
                  targetRoi: proposal.roiPercent || 0,
                },
              ],
              { session }
            );

            await logAudit({
              userId: req.user!.id,
              userName: req.user!.name,
              entityType: 'ASSET',
              entityId: asset._id.toString(),
              action: 'CREATE',
              after: { assetCode, name: asset.name, purchaseCost: asset.purchasePrice },
              ipAddress: req.ip,
              session,
            });

            return asset;
          });

          await createNotification(
            req.user!.id,
            `Asset Registered: ${registeredAsset.assetCode}`,
            `Machinery commissioned and registered in enterprise Asset Register as ${registeredAsset.assetCode}. 3/6/12 month audit reviews and preventive maintenance scheduled.`,
            'SYSTEM',
            `/assets`
          );
        }
      }
    }

    const delObj = updatedDeliveryDoc!.toObject({ virtuals: true });
    delObj.id = delObj._id.toString();

    let assetObj = null;
    if (registeredAsset) {
      assetObj = registeredAsset.toObject ? registeredAsset.toObject({ virtuals: true }) : registeredAsset;
      assetObj.id = assetObj._id?.toString() || assetObj.id;
    }

    return res.json({
      delivery: delObj,
      registeredAsset: assetObj,
      isFullyVerified: isNowFullyVerified,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
