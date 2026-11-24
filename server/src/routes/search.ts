import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  const q = String(req.query.q || '').trim();

  if (!q) {
    return res.json({ proposals: [], assets: [], changes4m: [], purchaseOrders: [], vendors: [] });
  }

  const [proposals, assets, changes4m, purchaseOrders, vendors] = await Promise.all([
    prisma.proposal.findMany({
      where: {
        OR: [
          { proposalNumber: { contains: q } },
          { title: { contains: q } },
          { machineName: { contains: q } },
          { manufacturer: { contains: q } },
        ],
      },
      include: { department: true },
      take: 5,
    }),
    prisma.asset.findMany({
      where: {
        OR: [
          { assetCode: { contains: q } },
          { name: { contains: q } },
          { serialNumber: { contains: q } },
          { location: { contains: q } },
        ],
      },
      include: { department: true },
      take: 5,
    }),
    prisma.change4M.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { reasonForChange: { contains: q } },
        ],
      },
      take: 5,
    }),
    prisma.purchaseOrder.findMany({
      where: {
        OR: [
          { poNumber: { contains: q } },
        ],
      },
      include: { vendor: true },
      take: 5,
    }),
    prisma.vendor.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { code: { contains: q } },
          { city: { contains: q } },
        ],
      },
      take: 5,
    }),
  ]);

  return res.json({
    proposals,
    assets,
    changes4m,
    purchaseOrders,
    vendors,
  });
});

export default router;
