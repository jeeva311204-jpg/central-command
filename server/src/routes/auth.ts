import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Department } from '../models/Department';
import { config } from '../config';
import { authenticateToken, generateToken } from '../middleware/auth';
import { validate, loginSchema } from '../middleware/validate';

const router = Router();

// Rate limiter for authentication attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
});

// Login
router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).populate('roleId').populate('departmentId');

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const roleDoc: any = user.roleId;
  const deptDoc: any = user.departmentId;
  const token = generateToken({ id: user._id.toString(), role: roleDoc?.name });

  return res.json({
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: roleDoc?.name,
      roleDescription: roleDoc?.description,
      department: deptDoc ? { id: deptDoc._id.toString(), name: deptDoc.name, code: deptDoc.code } : null,
      phone: user.phone,
    },
  });
});

// Quick demo user switch (for live hackathon demo)
router.post('/switch-demo-user', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email }).populate('roleId').populate('departmentId');

  if (!user) {
    return res.status(404).json({ error: 'Demo user not found' });
  }

  const roleDoc: any = user.roleId;
  const deptDoc: any = user.departmentId;
  const token = generateToken({ id: user._id.toString(), role: roleDoc?.name });

  return res.json({
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: roleDoc?.name,
      roleDescription: roleDoc?.description,
      department: deptDoc ? { id: deptDoc._id.toString(), name: deptDoc.name, code: deptDoc.code } : null,
      phone: user.phone,
    },
  });
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user!.id).populate('roleId').populate('departmentId');

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const roleDoc: any = user.roleId;
  const deptDoc: any = user.departmentId;

  return res.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: roleDoc?.name,
    roleDescription: roleDoc?.description,
    department: deptDoc ? { id: deptDoc._id.toString(), name: deptDoc.name, code: deptDoc.code } : null,
    phone: user.phone,
  });
});

// List all demo users for instant role-switching in the UI
router.get('/demo-users', async (req, res) => {
  const users = await User.find({ isActive: true })
    .populate('roleId')
    .populate('departmentId');

  return res.json(
    users.map((u) => {
      const roleDoc: any = u.roleId;
      const deptDoc: any = u.departmentId;
      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: roleDoc?.name || 'Employee',
        department: deptDoc ? deptDoc.name : 'All Enterprise',
        phone: u.phone,
      };
    })
  );
});

export default router;
