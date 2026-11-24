import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get audit logs (globally or filtered by entity)
router.get('/', authenticateToken, async (req, res) => {
  const { entityType, entityId, action, search } = req.query;

  const where: any = {};
  if (entityType) where.entityType = String(entityType);
  if (entityId) where.entityId = String(entityId);
  if (action) where.action = String(action);

  if (search) {
    const q = String(search);
    where.OR = [
      { userName: { contains: q } },
      { entityId: { contains: q } },
      { entityType: { contains: q } },
    ];
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  return res.json(logs);
});

export default router;
