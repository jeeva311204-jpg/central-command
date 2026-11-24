import { Router } from 'express';
import { PerformanceNotice } from '../models/PerformanceNotice';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { sendSimulatedEmail } from '../services/notificationService';
import { authenticateToken, requireRoles } from '../middleware/auth';

const router = Router();

// GET notices for the current user (or all notices for Admin/Management/HOD)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.id;

    let query: any = {};
    if (userRole === 'Admin' || userRole === 'Management') {
      // Management & Admin can see all notices
      query = {};
    } else if (userRole === 'HOD') {
      // HOD can see notices issued to them, or notices issued by them to their department team
      const myTeam = await User.find({ managerId: userId }).select('_id');
      const teamIds = myTeam.map((m) => m._id);
      query = {
        $or: [
          { userId },
          { issuedById: userId },
          { userId: { $in: teamIds } },
        ],
      };
    } else {
      // Staff members see only notices issued directly to them
      query = { userId };
    }

    const notices = await PerformanceNotice.find(query)
      .populate('userId', 'name email roleId departmentId')
      .populate('issuedById', 'name email roleId')
      .sort({ createdAt: -1 });

    return res.json(notices);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch performance notices' });
  }
});

// POST issue a new warning or termination letter (Admin, Management, HOD)
router.post('/', authenticateToken, requireRoles('Admin', 'Management', 'HOD'), async (req, res) => {
  try {
    const issuerId = req.user!.id;
    const issuerRole = req.user!.role;
    const { userId, type, severity, subject, reason, actionRequired } = req.body;

    if (!userId || !subject || !reason) {
      return res.status(400).json({ error: 'userId, subject, and reason are required' });
    }

    const targetUser = await User.findById(userId).populate('roleId').populate('departmentId');
    if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

    // HODs can only issue notices to their department team members
    if (issuerRole === 'HOD') {
      const issuer = await User.findById(issuerId);
      const issuerDeptId = issuer?.departmentId?.toString();
      const targetDeptId = (targetUser.departmentId as any)?._id?.toString() || targetUser.departmentId?.toString();

      if (issuerDeptId !== targetDeptId) {
        return res.status(403).json({ error: 'Department Managers can only issue notices to members of their own department' });
      }
    }

    const notice = await PerformanceNotice.create({
      userId: targetUser._id,
      issuedById: issuerId,
      type: type || 'WARNING',
      severity: severity || 'Medium',
      subject,
      reason,
      actionRequired: actionRequired || 'Immediate improvement and checklist compliance required.',
      isAcknowledged: false,
    });

    const issuer = await User.findById(issuerId);

    // Create in-app high-priority notification
    const alertTitle = type === 'TERMINATION_NOTICE'
      ? `🚨 FORMAL TERMINATION NOTICE: ${subject}`
      : type === 'SLA_BREACH'
      ? `⚠️ SLA BREACH WARNING: ${subject}`
      : `⚠️ OFFICIAL PERFORMANCE WARNING: ${subject}`;

    await Notification.create({
      userId: targetUser._id,
      title: alertTitle,
      message: `${reason}. Issued by ${issuer?.name || 'Management'}.`,
      type: type === 'TERMINATION_NOTICE' ? 'ESCALATION' : 'SLA_WARNING',
      linkUrl: '/',
    });

    // Send email alert
    await sendSimulatedEmail(
      targetUser.email,
      targetUser.name,
      `[ChangeFlow Enterprise] ${alertTitle}`,
      `<p>Dear ${targetUser.name},</p><p>You have been issued a formal <strong>${type}</strong>.</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Reason:</strong> ${reason}</p><p><strong>Action Required:</strong> ${actionRequired || 'Immediate remediation'}</p><p>Issued by: ${issuer?.name || 'Management'}</p>`,
      'SLA_ESCALATION'
    );

    return res.status(201).json({
      message: 'Performance notice issued successfully',
      notice,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to issue performance notice' });
  }
});

// POST acknowledge a notice
router.post('/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const notice = await PerformanceNotice.findById(req.params.id);
    if (!notice) return res.status(404).json({ error: 'Notice not found' });

    if (notice.userId.toString() !== req.user!.id && req.user!.role !== 'Admin') {
      return res.status(403).json({ error: 'You can only acknowledge notices issued to you' });
    }

    notice.isAcknowledged = true;
    notice.acknowledgedAt = new Date();
    await notice.save();

    return res.json({
      message: 'Notice acknowledged',
      notice,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to acknowledge notice' });
  }
});

export default router;
