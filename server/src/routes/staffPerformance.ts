import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Staff checklist & task performance metrics
router.get('/', authenticateToken, async (req, res) => {
  const tasks = await prisma.task.findMany({
    include: {
      assignedTo: {
        include: { department: true, role: true },
      },
      proposal: { select: { id: true, proposalNumber: true, title: true } },
      change4m: { select: { id: true, title: true, changeCategory: true } },
    },
  });

  const now = new Date();

  // Aggregate by user
  const userStatsMap: Record<string, {
    user: any;
    totalTasks: number;
    completedTasks: number;
    completedOnTimeTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    overdueTasks: number;
  }> = {};

  for (const t of tasks) {
    const u = t.assignedTo;
    if (!userStatsMap[u.id]) {
      userStatsMap[u.id] = {
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role.name,
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

    const stat = userStatsMap[u.id];
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
    } else if (t.status === 'IN_PROGRESS') {
      stat.inProgressTasks += 1;
    } else {
      stat.pendingTasks += 1;
    }
  }

  const staffPerformance = Object.values(userStatsMap).map(s => {
    const completionRate = s.totalTasks > 0 ? Number(((s.completedTasks / s.totalTasks) * 100).toFixed(1)) : 100;
    const onTimeRate = s.completedTasks > 0 ? Number(((s.completedOnTimeTasks / s.completedTasks) * 100).toFixed(1)) : 100;

    return {
      ...s,
      completionRate,
      onTimeRate,
    };
  });

  return res.json({
    totalTasksCount: tasks.length,
    staffPerformance,
    recentTasks: tasks.slice(0, 15),
  });
});

export default router;
