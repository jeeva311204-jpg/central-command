import { Router } from 'express';
import { Task, User } from '../models';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Staff checklist & task performance metrics
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate({
        path: 'assignedTo',
        populate: [{ path: 'department' }, { path: 'role' }],
      })
      .populate('proposal', 'proposalNumber title')
      .populate('change4mId', 'title changeCategory');

    const now = new Date();

    const userStatsMap: Record<
      string,
      {
        user: any;
        totalTasks: number;
        completedTasks: number;
        completedOnTimeTasks: number;
        inProgressTasks: number;
        pendingTasks: number;
        overdueTasks: number;
      }
    > = {};

    for (const t of tasks) {
      const u = (t as any).assignedTo;
      if (!u) continue;
      const uId = u._id.toString();

      if (!userStatsMap[uId]) {
        userStatsMap[uId] = {
          user: {
            id: uId,
            name: u.name,
            email: u.email,
            role: u.roleName || u.role?.name || 'Staff',
            department: u.department ? u.department.name : 'Enterprise',
          },
          totalTasks: 0,
          completedTasks: 0,
          completedOnTimeTasks: 0,
          inProgressTasks: 0,
          pendingTasks: 0,
          overdueTasks: 0,
        };
      }

      const stat = userStatsMap[uId];
      stat.totalTasks += 1;

      const isOverdue = t.status !== 'COMPLETED' && new Date(t.dueDate) < now;
      if (isOverdue) {
        stat.overdueTasks += 1;
      }

      if (t.status === 'COMPLETED') {
        stat.completedTasks += 1;
        if (t.completedAt && new Date(t.completedAt) <= new Date(t.dueDate)) {
          stat.completedOnTimeTasks += 1;
        }
      } else if ((t.status as string) === 'IN_PROGRESS') {
        stat.inProgressTasks += 1;
      } else {
        stat.pendingTasks += 1;
      }
    }

    const staffPerformance = Object.values(userStatsMap).map((s) => {
      const completionRate =
        s.totalTasks > 0 ? Number(((s.completedTasks / s.totalTasks) * 100).toFixed(1)) : 100;
      const onTimeRate =
        s.completedTasks > 0 ? Number(((s.completedOnTimeTasks / s.completedTasks) * 100).toFixed(1)) : 100;

      return {
        ...s,
        completionRate,
        onTimeRate,
      };
    });

    const recentTasks = tasks.slice(0, 15).map((t) => {
      const obj = t.toObject({ virtuals: true });
      obj.id = obj._id.toString();
      return obj;
    });

    return res.json({
      totalTasksCount: tasks.length,
      staffPerformance,
      recentTasks,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
