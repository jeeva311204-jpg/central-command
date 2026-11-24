import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../db';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(user: { id: string; role?: { name: string } | string }): string {
  const roleName = typeof user.role === 'object' ? user.role?.name : user.role;
  return jwt.sign({ userId: user.id, role: roleName }, config.jwtSecret, { expiresIn: '7d' });
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true, department: true },
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ error: 'User is inactive or not found' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      departmentId: user.departmentId || undefined,
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requireRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    if (req.user.role === 'Admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Current role: ${req.user.role}`,
    });
  };
}
