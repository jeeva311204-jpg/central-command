import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';
import { logAudit } from '../services/auditLogger';

const router = Router();

// List vendors
router.get('/', authenticateToken, async (req, res) => {
  const vendors = await prisma.vendor.findMany({
    include: {
      _count: { select: { quotations: true, purchaseOrders: true, assets: true } },
    },
    orderBy: { rating: 'desc' },
  });
  return res.json(vendors);
});

// Create vendor
router.post('/', authenticateToken, async (req, res) => {
  const { name, code, contactPerson, email, phone, city, rating, categories } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Name and Vendor code are required' });
  }

  const vendor = await prisma.vendor.create({
    data: {
      name,
      code,
      contactPerson,
      email,
      phone,
      city,
      rating: rating ? Number(rating) : 4.0,
      categoriesJson: categories ? JSON.stringify(categories) : null,
    },
  });

  return res.status(201).json(vendor);
});

// List quotations for a proposal
router.get('/quotations/proposal/:proposalId', authenticateToken, async (req, res) => {
  const proposalId = req.params.proposalId as string;
  const quotations = await prisma.quotation.findMany({
    where: { proposalId },
    include: { vendor: true },
    orderBy: { weightedScore: 'desc' },
  });
  return res.json(quotations);
});

// Create quotation
router.post('/quotations', authenticateToken, async (req, res) => {
  const {
    proposalId,
    vendorId,
    quotationNumber,
    price,
    installationCost,
    deliveryWeeks,
    warrantyMonths,
    capacityPerHour,
    powerConsumptionKw,
    technicalScore,
    notes,
  } = req.body;

  if (!proposalId || !vendorId || !quotationNumber || price === undefined) {
    return res.status(400).json({ error: 'proposalId, vendorId, quotationNumber and price are required' });
  }

  const quotation = await prisma.quotation.create({
    data: {
      proposalId,
      vendorId,
      quotationNumber,
      price: Number(price),
      installationCost: Number(installationCost) || 0,
      deliveryWeeks: Number(deliveryWeeks) || 4,
      warrantyMonths: Number(warrantyMonths) || 12,
      capacityPerHour: capacityPerHour ? Number(capacityPerHour) : null,
      powerConsumptionKw: powerConsumptionKw ? Number(powerConsumptionKw) : null,
      technicalScore: technicalScore ? Number(technicalScore) : 80,
      notes,
    },
    include: { vendor: true },
  });

  return res.status(201).json(quotation);
});

// Multi-attribute weighted scoring & side-by-side comparison
// Default weights: price (30%), warranty (20%), capacity (20%), power (15%), vendorRating (15%)
router.post('/quotations/compare', authenticateToken, async (req, res) => {
  const { proposalId, weights } = req.body;

  if (!proposalId) {
    return res.status(400).json({ error: 'proposalId is required' });
  }

  const quotes = await prisma.quotation.findMany({
    where: { proposalId },
    include: { vendor: true },
  });

  if (quotes.length === 0) {
    return res.json({ quotations: [], recommendedQuotationId: null });
  }

  const w = {
    price: weights?.price ?? 30,
    warranty: weights?.warranty ?? 20,
    capacity: weights?.capacity ?? 20,
    power: weights?.power ?? 15,
    rating: weights?.rating ?? 15,
  };

  const totalWeight = w.price + w.warranty + w.capacity + w.power + w.rating;

  // Find min/max for normalization
  const minPrice = Math.min(...quotes.map(q => q.price + q.installationCost));
  const maxPrice = Math.max(...quotes.map(q => q.price + q.installationCost));
  const maxWarranty = Math.max(...quotes.map(q => q.warrantyMonths));
  const minWarranty = Math.min(...quotes.map(q => q.warrantyMonths));
  const maxCapacity = Math.max(...quotes.map(q => q.capacityPerHour || 1));
  const minPower = Math.min(...quotes.map(q => q.powerConsumptionKw || 10));
  const maxPower = Math.max(...quotes.map(q => q.powerConsumptionKw || 10));

  let bestScore = -1;
  let recommendedId: string | null = null;

  const scoredQuotes = quotes.map(q => {
    const totalCost = q.price + q.installationCost;
    // Lower price is better: 100 for minPrice, linear down
    const priceScore = maxPrice === minPrice ? 100 : ((maxPrice - totalCost) / (maxPrice - minPrice)) * 100;
    // Higher warranty is better
    const warrantyScore = maxWarranty === minWarranty ? 100 : (q.warrantyMonths / maxWarranty) * 100;
    // Higher capacity is better
    const capacityScore = (q.capacityPerHour || 1) / maxCapacity * 100;
    // Lower power consumption is better
    const powerScore = maxPower === minPower ? 100 : ((maxPower - (q.powerConsumptionKw || 10)) / (maxPower - minPower)) * 100;
    // Vendor rating out of 5
    const ratingScore = (q.vendor.rating / 5) * 100;

    const weightedScore = Number((
      (priceScore * w.price +
        warrantyScore * w.warranty +
        capacityScore * w.capacity +
        powerScore * w.power +
        ratingScore * w.rating) /
      totalWeight
    ).toFixed(2));

    if (weightedScore > bestScore) {
      bestScore = weightedScore;
      recommendedId = q.id;
    }

    return {
      ...q,
      totalCost,
      breakdownScores: {
        priceScore: Number(priceScore.toFixed(1)),
        warrantyScore: Number(warrantyScore.toFixed(1)),
        capacityScore: Number(capacityScore.toFixed(1)),
        powerScore: Number(powerScore.toFixed(1)),
        ratingScore: Number(ratingScore.toFixed(1)),
      },
      weightedScore,
    };
  });

  // Update weighted score and recommendation in DB
  for (const sq of scoredQuotes) {
    await prisma.quotation.update({
      where: { id: sq.id },
      data: {
        weightedScore: sq.weightedScore,
        isRecommended: sq.id === recommendedId,
      },
    });
  }

  return res.json({
    quotations: scoredQuotes,
    recommendedQuotationId: recommendedId,
    weights: w,
  });
});

// Accept quotation
router.post('/quotations/:id/accept', authenticateToken, async (req, res) => {
  const quoteId = req.params.id as string;
  const quote = await prisma.quotation.findUnique({
    where: { id: quoteId },
    include: { proposal: true, vendor: true },
  });

  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  // Unset previous accepted quotes for this proposal
  await prisma.quotation.updateMany({
    where: { proposalId: quote.proposalId },
    data: { isAccepted: false },
  });

  const updated = await prisma.quotation.update({
    where: { id: quoteId },
    data: { isAccepted: true },
  });

  await logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    entityType: 'QUOTATION',
    entityId: quote.id,
    action: 'UPDATE',
    after: { isAccepted: true, vendorName: quote.vendor.name, price: quote.price },
    ipAddress: req.ip,
  });

  return res.json(updated);
});

export default router;
