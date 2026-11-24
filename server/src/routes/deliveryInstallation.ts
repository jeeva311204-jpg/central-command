import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';
import { logAudit } from '../services/auditLogger';
import { createNotification } from '../services/notificationService';

const router = Router();

// List deliveries with pipeline steps
router.get('/', authenticateToken, async (req, res) => {
  const deliveries = await prisma.delivery.findMany({
    include: {
      purchaseOrder: {
        include: {
          vendor: true,
          proposal: { include: { department: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return res.json(deliveries);
});

// Update pipeline step (dispatch, delivery, installation, commissioning, training)
router.patch('/:id/step', authenticateToken, async (req, res) => {
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

  const delivery = await prisma.delivery.update({
    where: { id: deliveryId },
    data,
    include: { purchaseOrder: { include: { proposal: true, vendor: true } } },
  });

  return res.json(delivery);
});

// Final Quality & Engineering Verification Sign-off
// Triggers auto-registration into Asset Register (Module 8)!
router.post('/:id/signoff', authenticateToken, async (req, res) => {
  const deliveryId = req.params.id as string;
  const { signoffType, serialNumber, location, warrantyMonths } = req.body; // 'QUALITY' or 'ENGINEERING'

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      purchaseOrder: {
        include: {
          proposal: { include: { department: true } },
          vendor: true,
        },
      },
    },
  });

  if (!delivery) return res.status(404).json({ error: 'Delivery record not found' });

  const updateData: any = {};
  if (signoffType === 'QUALITY') {
    updateData.qualityVerifiedById = req.user!.id;
  } else if (signoffType === 'ENGINEERING') {
    updateData.engineeringVerifiedById = req.user!.id;
  } else {
    // Both signed off simultaneously
    updateData.qualityVerifiedById = req.user!.id;
    updateData.engineeringVerifiedById = req.user!.id;
  }

  // Check if both signoffs are present now
  const isNowFullyVerified = (updateData.qualityVerifiedById || delivery.qualityVerifiedById) &&
                            (updateData.engineeringVerifiedById || delivery.engineeringVerifiedById);

  if (isNowFullyVerified) {
    updateData.status = 'VERIFIED';
    if (!delivery.commissioningDate) {
      updateData.commissioningDate = new Date();
    }
  }

  const updatedDelivery = await prisma.delivery.update({
    where: { id: deliveryId },
    data: updateData,
  });

  let registeredAsset = null;

  // AUTO-REGISTER ASSET IF FULLY VERIFIED AND NOT YET REGISTERED
  if (isNowFullyVerified) {
    const proposal = delivery.purchaseOrder.proposal;
    const existingAsset = await prisma.asset.findFirst({
      where: { proposalId: proposal.id },
    });

    if (!existingAsset) {
      const assetCount = await prisma.asset.count();
      const deptCode = proposal.department.code || 'GEN';
      const assetCode = `AST-${deptCode}-${String(assetCount + 1).padStart(3, '0')}`;

      const warrantyDurationMonths = warrantyMonths || 12;
      const warrantyExpiryDate = new Date(Date.now() + warrantyDurationMonths * 30 * 86400000);

      registeredAsset = await prisma.asset.create({
        data: {
          assetCode,
          name: proposal.machineName || proposal.title,
          proposalId: proposal.id,
          departmentId: proposal.departmentId,
          vendorId: delivery.purchaseOrder.vendorId,
          serialNumber: serialNumber || `SN-${Date.now().toString().slice(-8)}`,
          category: proposal.category || 'CNC Machining',
          purchaseDate: delivery.purchaseOrder.issuedDate,
          commissioningDate: new Date(),
          purchaseCost: delivery.purchaseOrder.totalAmount,
          warrantyExpiryDate,
          location: location || `${proposal.department.name} Main Shop Floor`,
          status: 'ACTIVE',
        },
      });

      // Create default preventive maintenance schedule (e.g. 90-day cycle)
      await prisma.maintenanceSchedule.create({
        data: {
          assetId: registeredAsset.id,
          title: 'Initial 90-Day Preventive Calibration & Lubrication Check',
          frequencyType: 'CALENDAR',
          frequencyValue: 90,
          lastServiceDate: new Date(),
          nextDueDate: new Date(Date.now() + 90 * 86400000),
          status: 'SCHEDULED',
        },
      });

      // Create initial Post-Investment Audit records at 3, 6, and 12 months (Module 9)!
      await prisma.auditReview.createMany({
        data: [
          {
            proposalId: proposal.id,
            assetId: registeredAsset.id,
            intervalMonths: 3,
            scheduledDate: new Date(Date.now() + 90 * 86400000),
            status: 'PENDING',
            targetSavings: proposal.annualSavings / 4,
            targetRoi: proposal.roiPercent,
          },
          {
            proposalId: proposal.id,
            assetId: registeredAsset.id,
            intervalMonths: 6,
            scheduledDate: new Date(Date.now() + 180 * 86400000),
            status: 'PENDING',
            targetSavings: proposal.annualSavings / 2,
            targetRoi: proposal.roiPercent,
          },
          {
            proposalId: proposal.id,
            assetId: registeredAsset.id,
            intervalMonths: 12,
            scheduledDate: new Date(Date.now() + 365 * 86400000),
            status: 'PENDING',
            targetSavings: proposal.annualSavings,
            targetRoi: proposal.roiPercent,
          },
        ],
      });

      await logAudit({
        userId: req.user!.id,
        userName: req.user!.name,
        entityType: 'ASSET',
        entityId: registeredAsset.id,
        action: 'CREATE',
        after: { assetCode, name: registeredAsset.name, purchaseCost: registeredAsset.purchaseCost },
        ipAddress: req.ip,
      });

      await createNotification(
        req.user!.id,
        `Asset Registered: ${assetCode}`,
        `Machinery commissioned and registered in enterprise Asset Register as ${assetCode}. 3/6/12 month audit reviews and preventive maintenance scheduled.`,
        'SYSTEM',
        `/assets`
      );
    }
  }

  return res.json({
    delivery: updatedDelivery,
    registeredAsset,
    isFullyVerified: isNowFullyVerified,
  });
});

export default router;
