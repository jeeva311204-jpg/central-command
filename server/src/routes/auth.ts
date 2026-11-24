import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db';
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

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true, department: true },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user);

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      roleDescription: user.role.description,
      department: user.department ? { id: user.department.id, name: user.department.name, code: user.department.code } : null,
      phone: user.phone,
    },
  });
});

// Quick demo user switch (for live hackathon demo)
router.post('/switch-demo-user', async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true, department: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'Demo user not found' });
  }

  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      roleDescription: user.role.description,
      department: user.department ? { id: user.department.id, name: user.department.name, code: user.department.code } : null,
      phone: user.phone,
    },
  });
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { role: true, department: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    roleDescription: user.role.description,
    department: user.department ? { id: user.department.id, name: user.department.name, code: user.department.code } : null,
    phone: user.phone,
  });
});

// List all demo users for instant role-switching in the UI
router.get('/demo-users', async (req, res) => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    include: { role: true, department: true },
    orderBy: { role: { name: 'asc' } },
  });

  return res.json(
    users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role.name,
      department: u.department ? u.department.name : 'All Enterprise',
      phone: u.phone,
    }))
  );
});

export default router;
