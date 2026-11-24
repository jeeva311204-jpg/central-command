import { prisma } from '../db';

export interface AuditLogParams {
  userId?: string;
  userName?: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'APPROVE' | 'REJECT' | 'REQUEST_REVISION' | 'DELEGATE' | 'DELETE' | 'STATUS_CHANGE';
  before?: any;
  after?: any;
  ipAddress?: string;
}

export async function logAudit(params: AuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userName: params.userName || 'System',
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        beforeJson: params.before ? JSON.stringify(params.before) : null,
        afterJson: params.after ? JSON.stringify(params.after) : null,
        ipAddress: params.ipAddress || '127.0.0.1',
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
    return null;
  }
}
