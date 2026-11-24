import { Router } from 'express';
import mongoose from 'express';
import { Types } from 'mongoose';
import { withTransaction } from '../db';
import {
  PurchaseOrder,
  Proposal,
  Vendor,
  Quotation,
  Delivery,
  getNextSequence,
} from '../models';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { logAudit } from '../services/auditLogger';
import { sendSimulatedEmail } from '../services/notificationService';

const router = Router();

// List POs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, vendorId } = req.query;
    const query: any = {};
    if (status) query.status = String(status);
    if (vendorId) query.vendorId = new Types.ObjectId(String(vendorId));

    const pos = await PurchaseOrder.find(query)
      .populate('proposal', 'proposalNumber title departmentId')
      .populate('vendor')
      .populate('quotation')
      .populate('delivery')
      .sort({ createdAt: -1 });

    const result = pos.map((p) => {
      const obj = p.toObject({ virtuals: true });
      obj.id = obj._id.toString();
      return obj;
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Generate PO from approved proposal
router.post('/generate', authenticateToken, requireRoles('Procurement', 'Admin'), async (req, res) => {
  try {
    const { proposalId, vendorId, quotationId, paymentTerms, expectedDeliveryWeeks } = req.body;

    if (!proposalId || !vendorId) {
      return res.status(400).json({ error: 'proposalId and vendorId are required' });
    }

    const proposal = await Proposal.findById(proposalId).populate('department');
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    if (proposal.status !== 'APPROVED') {
      return res.status(400).json({
        error: `Cannot generate PO for proposal with status "${proposal.status}". Proposal must be APPROVED first.`,
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    let quotation = null;
    if (quotationId) {
      quotation = await Quotation.findById(quotationId);
    }

    const weeks = expectedDeliveryWeeks || quotation?.deliveryWeeks || proposal.expectedDeliveryWeeks || 4;
    const expectedDeliveryDate = new Date(Date.now() + weeks * 7 * 86400000);
    const totalAmount = quotation ? quotation.price + quotation.installationCost : proposal.totalInvestment;

    const resultPO = await withTransaction(async (session) => {
      const seq = await getNextSequence('poNumber', session);
      const poNumber = `PO-2026-${String(seq).padStart(3, '0')}`;

      const poDocs = await PurchaseOrder.create(
        [
          {
            poNumber,
            proposalId: proposal._id,
            vendorId: vendor._id,
            quotationId: quotation ? quotation._id : undefined,
            totalAmount,
            currency: proposal.currency || 'INR',
            status: 'CREATED',
            issuedDate: new Date(),
            expectedDeliveryDate,
            paymentTerms: paymentTerms || '30% Advance, 60% on Delivery, 10% on Final Commissioning',
            createdById: new Types.ObjectId(req.user!.id),
          },
        ],
        { session }
      );
      const po = poDocs[0];

      const deliveryDocs = await Delivery.create(
        [
          {
            purchaseOrderId: po._id,
            status: 'IN_TRANSIT',
            notes: 'Purchase order issued to vendor. Awaiting factory shipment dispatch.',
          },
        ],
        { session }
      );
      const delivery = deliveryDocs[0];

      await Vendor.findByIdAndUpdate(
        vendor._id,
        { $inc: { purchaseHistoryCount: 1 } },
        { session }
      );

      await logAudit({
        userId: req.user!.id,
        userName: req.user!.name,
        entityType: 'PURCHASE_ORDER',
        entityId: po._id.toString(),
        action: 'CREATE',
        after: { poNumber, totalAmount, vendor: vendor.name },
        ipAddress: req.ip,
        session,
      });

      return { po, delivery };
    });

    const populated = await PurchaseOrder.findById(resultPO.po._id)
      .populate('proposal')
      .populate('vendor')
      .populate('delivery');

    const obj = populated!.toObject({ virtuals: true });
    obj.id = obj._id.toString();

    await sendSimulatedEmail(
      vendor.email || 'vendor@supplier.com',
      vendor.contactPerson || vendor.name,
      `[ChangeFlow Official PO] Purchase Order ${resultPO.po.poNumber}`,
      `<p>Dear ${vendor.name},</p><p>Please find attached Purchase Order <strong>${resultPO.po.poNumber}</strong> for <em>${proposal.machineName || proposal.title}</em>.</p><p>Total Value: ₹${totalAmount.toLocaleString('en-IN')}</p>`,
      'PO_ISSUED'
    );

    return res.status(201).json(obj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update PO status (CREATED -> DISPATCHED -> DELIVERED -> INVOICED -> PAID)
const handlePOStatusUpdate = async (req: any, res: any) => {
  try {
    const poId = req.params.id as string;
    const { status, trackingNumber, carrier, actualDeliveryDate } = req.body;

    const validStatuses = ['CREATED', 'DISPATCHED', 'DELIVERED', 'INVOICED', 'PAID'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Valid statuses: ${validStatuses.join(', ')}` });
    }

    const existing = await PurchaseOrder.findById(poId);
    if (!existing) return res.status(404).json({ error: 'Purchase Order not found' });

    const updatedActualDeliveryDate = actualDeliveryDate
      ? new Date(actualDeliveryDate)
      : status === 'DELIVERED'
      ? new Date()
      : existing.actualDeliveryDate;

    const po = await PurchaseOrder.findByIdAndUpdate(
      poId,
      {
        status,
        actualDeliveryDate: updatedActualDeliveryDate,
      },
      { new: true }
    )
      .populate('vendor')
      .populate('proposal');

    // Sync delivery status
    const existingDelivery = await Delivery.findOne({ purchaseOrderId: po!._id });
    if (existingDelivery) {
      const deliveryUpdate: any = {};
      if (status === 'DISPATCHED') {
        deliveryUpdate.status = 'IN_TRANSIT';
        deliveryUpdate.dispatchDate = new Date();
        if (trackingNumber) deliveryUpdate.trackingNumber = trackingNumber;
        if (carrier) deliveryUpdate.carrier = carrier;
      } else if (status === 'DELIVERED') {
        deliveryUpdate.status = 'DELIVERED';
        deliveryUpdate.deliveryDate = new Date();
      }

      if (Object.keys(deliveryUpdate).length > 0) {
        await Delivery.findByIdAndUpdate(existingDelivery._id, deliveryUpdate);
      }
    }

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      entityType: 'PURCHASE_ORDER',
      entityId: po!._id.toString(),
      action: 'STATUS_CHANGE',
      before: { status: existing.status },
      after: { status },
      ipAddress: req.ip,
    });

    const populatedDelivery = await Delivery.findOne({ purchaseOrderId: po!._id });
    const obj = po!.toObject({ virtuals: true });
    obj.id = obj._id.toString();
    obj.delivery = populatedDelivery ? populatedDelivery.toObject({ virtuals: true }) : null;

    return res.json(obj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

router.patch('/:id/status', authenticateToken, requireRoles('Procurement', 'Admin'), handlePOStatusUpdate);
router.post('/:id/status', authenticateToken, requireRoles('Procurement', 'Admin'), handlePOStatusUpdate);

export default router;
