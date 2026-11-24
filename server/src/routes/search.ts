import { Router } from 'express';
import { Proposal, Asset, Change4M, PurchaseOrder, Vendor } from '../models';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();

    if (!q) {
      return res.json({ proposals: [], assets: [], changes4m: [], purchaseOrders: [], vendors: [] });
    }

    const [proposals, assets, changes4m, purchaseOrders, vendors] = await Promise.all([
      Proposal.find({
        $or: [
          { proposalNumber: { $regex: q, $options: 'i' } },
          { title: { $regex: q, $options: 'i' } },
          { machineName: { $regex: q, $options: 'i' } },
          { manufacturer: { $regex: q, $options: 'i' } },
        ],
      })
        .populate('department')
        .limit(5),
      Asset.find({
        $or: [
          { assetCode: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } },
          { serialNumber: { $regex: q, $options: 'i' } },
          { location: { $regex: q, $options: 'i' } },
        ],
      })
        .populate('department')
        .limit(5),
      Change4M.find({
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { reasonForChange: { $regex: q, $options: 'i' } },
        ],
      }).limit(5),
      PurchaseOrder.find({
        poNumber: { $regex: q, $options: 'i' },
      })
        .populate('vendor')
        .limit(5),
      Vendor.find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { code: { $regex: q, $options: 'i' } },
          { city: { $regex: q, $options: 'i' } },
        ],
      }).limit(5),
    ]);

    const toCleanList = (list: any[]) =>
      list.map((item) => {
        const obj = item.toObject({ virtuals: true });
        obj.id = obj._id.toString();
        return obj;
      });

    return res.json({
      proposals: toCleanList(proposals),
      assets: toCleanList(assets),
      changes4m: toCleanList(changes4m),
      purchaseOrders: toCleanList(purchaseOrders),
      vendors: toCleanList(vendors),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
