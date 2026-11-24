import { Router } from 'express';
import { AuditLog } from '../models';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get audit logs (globally or filtered by entity)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId, action, search } = req.query;

    const query: any = {};
    if (entityType) query.entityType = String(entityType);
    if (entityId) query.entityId = String(entityId);
    if (action) query.action = String(action);

    if (search) {
      const q = String(search);
      query.$or = [
        { userName: { $regex: q, $options: 'i' } },
        { entityId: { $regex: q, $options: 'i' } },
        { entityType: { $regex: q, $options: 'i' } },
      ];
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(100);

    const result = logs.map((l) => {
      const obj = l.toObject({ virtuals: true });
      obj.id = obj._id.toString();
      return obj;
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
