import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../models/User';

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

export function generateToken(user: { id?: string; _id?: any; role?: { name: string } | string }): string {
  const userId = user.id || user._id?.toString();
  const roleName = typeof user.role === 'object' ? user.role?.name : user.role;
  return jwt.sign({ userId, role: roleName }, config.jwtSecret, { expiresIn: '7d' });
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; role?: string };
    const user = await User.findById(decoded.userId).populate('roleId').populate('departmentId');

    if (!user || !user.isActive) {
      return res.status(403).json({ error: 'User is inactive or not found' });
    }

    const roleDoc: any = user.roleId;
    const roleName = roleDoc?.name || decoded.role || 'Employee';

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: roleName,
      departmentId: user.departmentId ? user.departmentId.toString() : undefined,
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
