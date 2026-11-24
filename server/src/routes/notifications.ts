import { Router } from 'express';
import mongoose from 'mongoose';
import { Notification, SimulatedEmail } from '../models';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get in-app notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userOid = new mongoose.Types.ObjectId(req.user!.id);
    const notifications = await Notification.find({ userId: userOid })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      userId: userOid,
      isRead: false,
    });

    const result = notifications.map((n) => {
      const obj = n.toObject({ virtuals: true });
      obj.id = obj._id.toString();
      return obj;
    });

    return res.json({ notifications: result, unreadCount });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notifId = req.params.id as string;
    const notification = await Notification.findByIdAndUpdate(
      notifId,
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    const obj = notification.toObject({ virtuals: true });
    obj.id = obj._id.toString();
    return res.json(obj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Mark all as read
router.post('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userOid = new mongoose.Types.ObjectId(req.user!.id);
    await Notification.updateMany({ userId: userOid, isRead: false }, { isRead: true });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get Simulated Email Log (shows all auto-generated email dispatches)
router.get('/emails', authenticateToken, async (req, res) => {
  try {
    const { category, search } = req.query;
    const query: any = {};
    if (category) query.category = String(category);
    if (search) {
      const q = String(search);
      query.$or = [
        { toEmail: { $regex: q, $options: 'i' } },
        { recipientName: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } },
      ];
    }

    const emails = await SimulatedEmail.find(query)
      .sort({ sentAt: -1 })
      .limit(50);

    const result = emails.map((e) => {
      const obj = e.toObject({ virtuals: true });
      obj.id = obj._id.toString();
      return obj;
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
