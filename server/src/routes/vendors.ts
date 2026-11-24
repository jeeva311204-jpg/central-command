import { Router } from 'express';
import mongoose from 'mongoose';
import { Vendor, Quotation, PurchaseOrder, Asset } from '../models';
import { authenticateToken } from '../middleware/auth';
import { logAudit } from '../services/auditLogger';

const router = Router();

// List vendors
router.get('/', authenticateToken, async (req, res) => {
  try {
    const vendors = await Vendor.find({ isActive: true }).sort({ rating: -1 });

    const result = await Promise.all(
      vendors.map(async (v) => {
        const [qCount, poCount, assetCount] = await Promise.all([
          Quotation.countDocuments({ vendorId: v._id }),
          PurchaseOrder.countDocuments({ vendorId: v._id }),
          Asset.countDocuments({ vendorId: v._id }),
        ]);

        const obj = v.toObject({ virtuals: true });
        obj.id = obj._id.toString();
        obj._count = {
          quotations: qCount,
          purchaseOrders: poCount,
          assets: assetCount,
        };
        return obj;
      })
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create vendor
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, code, contactPerson, email, phone, city, rating, categories } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and Vendor code are required' });
    }

    const vendor = await Vendor.create({
      name,
      code,
      contactPerson,
      email,
      phone,
      city,
      rating: rating ? Number(rating) : 4.0,
      categories: Array.isArray(categories) ? categories : [],
      isActive: true,
    });

    const obj = vendor.toObject({ virtuals: true });
    obj.id = obj._id.toString();
    return res.status(201).json(obj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// List quotations for a proposal
router.get('/quotations/proposal/:proposalId', authenticateToken, async (req, res) => {
  try {
    const proposalId = req.params.proposalId as string;
    const quotations = await Quotation.find({ proposalId: new mongoose.Types.ObjectId(proposalId) })
      .populate('vendor')
      .sort({ weightedScore: -1 });

    const result = quotations.map((q) => {
      const obj = q.toObject({ virtuals: true });
      obj.id = obj._id.toString();
      return obj;
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create quotation
router.post('/quotations', authenticateToken, async (req, res) => {
  try {
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

    const quotation = await Quotation.create({
      proposalId: new mongoose.Types.ObjectId(String(proposalId)),
      vendorId: new mongoose.Types.ObjectId(String(vendorId)),
      quotationNumber,
      price: Number(price),
      installationCost: Number(installationCost) || 0,
      deliveryWeeks: Number(deliveryWeeks) || 4,
      warrantyMonths: Number(warrantyMonths) || 12,
      capacityPerHour: capacityPerHour ? Number(capacityPerHour) : null,
      powerConsumptionKw: powerConsumptionKw ? Number(powerConsumptionKw) : null,
      technicalScore: technicalScore ? Number(technicalScore) : 80,
      notes,
    });

    const populated = await Quotation.findById(quotation._id).populate('vendor');
    const obj = populated!.toObject({ virtuals: true });
    obj.id = obj._id.toString();
    return res.status(201).json(obj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Multi-attribute weighted scoring & side-by-side comparison
router.post('/quotations/compare', authenticateToken, async (req, res) => {
  try {
    const { proposalId, weights } = req.body;

    if (!proposalId) {
      return res.status(400).json({ error: 'proposalId is required' });
    }

    const quotes = await Quotation.find({ proposalId: new mongoose.Types.ObjectId(String(proposalId)) })
      .populate('vendor');

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

    const minPrice = Math.min(...quotes.map((q) => q.price + q.installationCost));
    const maxPrice = Math.max(...quotes.map((q) => q.price + q.installationCost));
    const maxWarranty = Math.max(...quotes.map((q) => q.warrantyMonths));
    const minWarranty = Math.min(...quotes.map((q) => q.warrantyMonths));
    const maxCapacity = Math.max(...quotes.map((q) => q.capacityPerHour || 1));
    const minPower = Math.min(...quotes.map((q) => q.powerConsumptionKw || 10));
    const maxPower = Math.max(...quotes.map((q) => q.powerConsumptionKw || 10));

    let bestScore = -1;
    let recommendedId: string | null = null;

    const scoredQuotes = quotes.map((q) => {
      const totalCost = q.price + q.installationCost;
      const priceScore = maxPrice === minPrice ? 100 : ((maxPrice - totalCost) / (maxPrice - minPrice)) * 100;
      const warrantyScore = maxWarranty === minWarranty ? 100 : (q.warrantyMonths / maxWarranty) * 100;
      const capacityScore = ((q.capacityPerHour || 1) / maxCapacity) * 100;
      const powerScore = maxPower === minPower ? 100 : ((maxPower - (q.powerConsumptionKw || 10)) / (maxPower - minPower)) * 100;
      const ratingScore = ((q.vendor?.rating || 4) / 5) * 100;

      const weightedScore = Number(
        (
          (priceScore * w.price +
            warrantyScore * w.warranty +
            capacityScore * w.capacity +
            powerScore * w.power +
            ratingScore * w.rating) /
          totalWeight
        ).toFixed(2)
      );

      const quoteId = q._id.toString();
      if (weightedScore > bestScore) {
        bestScore = weightedScore;
        recommendedId = quoteId;
      }

      const obj = q.toObject({ virtuals: true });
      obj.id = quoteId;
      return {
        ...obj,
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

    for (const sq of scoredQuotes) {
      await Quotation.findByIdAndUpdate(sq.id, {
        weightedScore: sq.weightedScore,
        isRecommended: sq.id === recommendedId,
      });
    }

    return res.json({
      quotations: scoredQuotes,
      recommendedQuotationId: recommendedId,
      weights: w,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Accept quotation
router.post('/quotations/:id/accept', authenticateToken, async (req, res) => {
  try {
    const quoteId = req.params.id as string;
    const quote = await Quotation.findById(quoteId).populate('proposal').populate('vendor');

    if (!quote) return res.status(404).json({ error: 'Quotation not found' });

    // Unset previous accepted quotes for this proposal
    await Quotation.updateMany(
      { proposalId: quote.proposalId },
      { isAccepted: false }
    );

    const updated = await Quotation.findByIdAndUpdate(
      quoteId,
      { isAccepted: true },
      { new: true }
    );

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      entityType: 'QUOTATION',
      entityId: quote._id.toString(),
      action: 'UPDATE',
      after: { isAccepted: true, vendorName: quote.vendor?.name, price: quote.price },
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
