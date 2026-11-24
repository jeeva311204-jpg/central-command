import { Router } from 'express';
import { Department } from '../models/Department';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { authenticateToken, requireRoles } from '../middleware/auth';

const router = Router();

// GET organization tree (departments, managers, staff members)
router.get('/tree', authenticateToken, async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('hodId')
      .sort({ name: 1 });

    const users = await User.find({ isActive: true })
      .populate('roleId')
      .populate('departmentId')
      .populate('managerId')
      .sort({ name: 1 });

    const tree = departments.map((dept) => {
      const manager = dept.hodId as any;
      const staff = users.filter((u) => {
        const userDeptId = u.departmentId ? (u.departmentId as any)._id?.toString() || u.departmentId.toString() : null;
        const isNotManager = manager ? u._id.toString() !== manager._id?.toString() : true;
        return userDeptId === dept._id.toString() && isNotManager;
      });

      return {
        id: dept._id.toString(),
        name: dept.name,
        code: dept.code,
        manager: manager
          ? {
              id: manager._id.toString(),
              name: manager.name,
              email: manager.email,
              phone: manager.phone,
            }
          : null,
        staffCount: staff.length,
        staff: staff.map((s: any) => ({
          id: s._id.toString(),
          name: s.name,
          email: s.email,
          role: s.roleId?.name || 'Staff',
          phone: s.phone,
          managerId: s.managerId?._id?.toString() || s.managerId?.toString() || null,
        })),
      };
    });

    // Unassigned users (if any)
    const unassigned = users
      .filter((u) => !u.departmentId)
      .map((u: any) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.roleId?.name || 'Staff',
      }));

    return res.json({ departments: tree, unassigned });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch organization structure' });
  }
});

// POST assign manager to department (Management, Board, Admin)
router.post('/assign-manager', authenticateToken, requireRoles('Admin', 'Management'), async (req, res) => {
  try {
    const { departmentId, userId } = req.body;
    if (!departmentId || !userId) {
      return res.status(400).json({ error: 'departmentId and userId are required' });
    }

    const dept = await Department.findById(departmentId);
    if (!dept) return res.status(404).json({ error: 'Department not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Set department HOD
    dept.hodId = user._id;
    await dept.save();

    // Ensure user has role HOD or appropriate management role
    const hodRole = await Role.findOne({ name: 'HOD' });
    if (hodRole && user.roleId.toString() !== hodRole._id.toString()) {
      user.roleId = hodRole._id;
    }
    user.departmentId = dept._id;
    await user.save();

    // Update all existing department staff to report to this manager
    await User.updateMany(
      { departmentId: dept._id, _id: { $ne: user._id } },
      { $set: { managerId: user._id } }
    );

    return res.json({
      message: `Successfully assigned ${user.name} as Manager of ${dept.name}`,
      departmentId: dept._id.toString(),
      managerId: user._id.toString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to assign manager' });
  }
});

// POST assign staff member to department and manager (Admin, Management, HOD)
router.post('/assign-staff', authenticateToken, requireRoles('Admin', 'Management', 'HOD'), async (req, res) => {
  try {
    const { userId, departmentId, roleName } = req.body;
    if (!userId || !departmentId) {
      return res.status(400).json({ error: 'userId and departmentId are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const dept = await Department.findById(departmentId);
    if (!dept) return res.status(404).json({ error: 'Department not found' });

    user.departmentId = dept._id;
    if (dept.hodId) {
      user.managerId = dept.hodId;
    }

    if (roleName) {
      const roleDoc = await Role.findOne({ name: roleName });
      if (roleDoc) {
        user.roleId = roleDoc._id;
      }
    }

    await user.save();

    return res.json({
      message: `Assigned ${user.name} to ${dept.name}`,
      user: {
        id: user._id.toString(),
        name: user.name,
        departmentId: dept._id.toString(),
        managerId: user.managerId?.toString() || null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to assign staff member' });
  }
});

export default router;
