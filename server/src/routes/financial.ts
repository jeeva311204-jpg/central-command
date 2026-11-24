import { Router } from 'express';
import mongoose from 'mongoose';
import { calculateFinancialMetrics, evaluateBudgetImpact } from '../services/financial';
import { Budget } from '../models';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Live calculate metrics for frontend form
router.post('/calculate', (req, res) => {
  const metrics = calculateFinancialMetrics(req.body);
  return res.json(metrics);
});

// Live evaluate budget impact for department and proposed amount
router.post('/budget-check', authenticateToken, async (req, res) => {
  try {
    const { departmentId, amount } = req.body;

    if (!departmentId || amount === undefined) {
      return res.status(400).json({ error: 'departmentId and amount are required' });
    }

    const budget = await Budget.findOne({
      departmentId: new mongoose.Types.ObjectId(String(departmentId)),
      fiscalYear: 'FY2026-27',
    });

    const allocated = budget?.allocatedAmount || 10000000;
    const utilised = budget?.utilisedAmount || 0;

    const result = evaluateBudgetImpact(allocated, utilised, Number(amount) || 0);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
