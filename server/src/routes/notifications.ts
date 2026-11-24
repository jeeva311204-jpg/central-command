import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get in-app notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: req.user!.id, isRead: false },
  });

  return res.json({ notifications, unreadCount });
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  const notifId = req.params.id as string;
  const notification = await prisma.notification.update({
    where: { id: notifId },
    data: { isRead: true },
  });
  return res.json(notification);
});

// Mark all as read
router.post('/mark-all-read', authenticateToken, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true },
  });
  return res.json({ success: true });
});

// Get Simulated Email Log (shows all auto-generated email dispatches)
router.get('/emails', authenticateToken, async (req, res) => {
  const { category, search } = req.query;
  const where: any = {};
  if (category) where.category = String(category);
  if (search) {
    const q = String(search);
    where.OR = [
      { toEmail: { contains: q } },
      { recipientName: { contains: q } },
      { subject: { contains: q } },
    ];
  }

  const emails = await prisma.simulatedEmail.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    take: 50,
  });

  return res.json(emails);
});

export default router;
