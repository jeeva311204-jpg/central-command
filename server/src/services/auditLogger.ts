import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog';

export interface AuditLogParams {
  userId?: string | mongoose.Types.ObjectId;
  userName?: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'APPROVE' | 'REJECT' | 'REQUEST_REVISION' | 'DELEGATE' | 'DELETE' | 'STATUS_CHANGE';
  before?: any;
  after?: any;
  ipAddress?: string;
  session?: mongoose.ClientSession;
}

export async function logAudit(params: AuditLogParams) {
  try {
    const data: any = {
      userId: params.userId ? new mongoose.Types.ObjectId(params.userId.toString()) : undefined,
      userName: params.userName || 'System',
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      before: params.before,
      after: params.after,
      ipAddress: params.ipAddress || '127.0.0.1',
      timestamp: new Date(),
    };

    if (params.session) {
      const docs = await AuditLog.create([data], { session: params.session });
      return docs[0];
    } else {
      return await AuditLog.create(data);
    }
  } catch (err) {
    console.error('Failed to write audit log:', err);
    return null;
  }
}
