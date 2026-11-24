import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { logAudit } from '../services/auditLogger';
import { createNotification, sendSimulatedEmail } from '../services/notificationService';

const router = Router();

// List POs
router.get('/', authenticateToken, async (req, res) => {
  const { status, vendorId } = req.query;
  const where: any = {};
  if (status) where.status = String(status);
  if (vendorId) where.vendorId = String(vendorId);

  const pos = await prisma.purchaseOrder.findMany({
    where,
    include: {
      proposal: { select: { id: true, proposalNumber: true, title: true, department: true } },
      vendor: true,
      quotation: true,
      delivery: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(pos);
});

// Generate PO from approved proposal
router.post('/generate', authenticateToken, requireRoles('Procurement', 'Admin'), async (req, res) => {
  const { proposalId, vendorId, quotationId, paymentTerms, expectedDeliveryWeeks } = req.body;

  if (!proposalId || !vendorId) {
    return res.status(400).json({ error: 'proposalId and vendorId are required' });
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { department: true },
  });

  if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
  if (proposal.status !== 'APPROVED') {
    return res.status(400).json({ error: `Cannot generate PO for proposal with status "${proposal.status}". Proposal must be APPROVED first.` });
  }

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

  let quotation = null;
  if (quotationId) {
    quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
  }

  const count = await prisma.purchaseOrder.count();
  const poNumber = `PO-2026-${String(count + 1).padStart(3, '0')}`;
  const totalAmount = quotation ? quotation.price + quotation.installationCost : proposal.totalInvestment;

  const weeks = expectedDeliveryWeeks || quotation?.deliveryWeeks || proposal.expectedDeliveryWeeks || 4;
  const expectedDeliveryDate = new Date(Date.now() + weeks * 7 * 86400000);

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      proposalId,
      vendorId,
      quotationId,
      totalAmount,
      currency: proposal.currency,
      status: 'CREATED',
      issuedDate: new Date(),
      expectedDeliveryDate,
      paymentTerms: paymentTerms || '30% Advance, 60% on Delivery, 10% on Final Commissioning',
      createdById: req.user!.id,
      delivery: {
        create: {
          status: 'IN_TRANSIT',
          notes: 'Purchase order issued to vendor. Awaiting factory shipment dispatch.',
        },
      },
    },
    include: {
      proposal: true,
      vendor: true,
      delivery: true,
    },
  });

  // Increment purchase history count on vendor
  await prisma.vendor.update({
    where: { id: vendorId },
    data: { purchaseHistoryCount: { increment: 1 } },
  });

  await logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    entityType: 'PURCHASE_ORDER',
    entityId: po.id,
    action: 'CREATE',
    after: { poNumber, totalAmount, vendor: vendor.name },
    ipAddress: req.ip,
  });

  await sendSimulatedEmail(
    vendor.email || 'vendor@supplier.com',
    vendor.contactPerson || vendor.name,
    `[ChangeFlow Official PO] Purchase Order ${po.poNumber}`,
    `<p>Dear ${vendor.name},</p><p>Please find attached Purchase Order <strong>${po.poNumber}</strong> for <em>${proposal.machineName || proposal.title}</em>.</p><p>Total Value: ₹${totalAmount.toLocaleString('en-IN')}</p>`,
    'PO_ISSUED'
  );

  return res.status(201).json(po);
});

// Update PO status (CREATED -> DISPATCHED -> DELIVERED -> INVOICED -> PAID)
const handlePOStatusUpdate = async (req: any, res: any) => {
  const poId = req.params.id as string;
  const { status, trackingNumber, carrier, actualDeliveryDate } = req.body;

  const validStatuses = ['CREATED', 'DISPATCHED', 'DELIVERED', 'INVOICED', 'PAID'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Valid statuses: ${validStatuses.join(', ')}` });
  }

  const existing = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { delivery: true },
  });

  if (!existing) return res.status(404).json({ error: 'Purchase Order not found' });

  const po = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status,
      actualDeliveryDate: actualDeliveryDate ? new Date(actualDeliveryDate) : (status === 'DELIVERED' ? new Date() : existing.actualDeliveryDate),
    },
    include: { delivery: true, vendor: true, proposal: true },
  });

  // Sync delivery status
  if (existing.delivery) {
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
      await prisma.delivery.update({
        where: { id: existing.delivery.id },
        data: deliveryUpdate,
      });
    }
  }

  await logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    entityType: 'PURCHASE_ORDER',
    entityId: po.id,
    action: 'STATUS_CHANGE',
    before: { status: existing.status },
    after: { status },
    ipAddress: req.ip,
  });

  return res.json(po);
};

router.patch('/:id/status', authenticateToken, requireRoles('Procurement', 'Admin'), handlePOStatusUpdate);
router.post('/:id/status', authenticateToken, requireRoles('Procurement', 'Admin'), handlePOStatusUpdate);

export default router;
