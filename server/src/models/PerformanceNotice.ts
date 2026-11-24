import mongoose, { Schema, Document } from 'mongoose';

export interface IPerformanceNotice extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  issuedById: mongoose.Types.ObjectId;
  type: 'WARNING' | 'TERMINATION_NOTICE' | 'SLA_BREACH' | 'COMMENDATION';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  subject: string;
  reason: string;
  actionRequired?: string;
  isAcknowledged: boolean;
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PerformanceNoticeSchema = new Schema<IPerformanceNotice>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    issuedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['WARNING', 'TERMINATION_NOTICE', 'SLA_BREACH', 'COMMENDATION'],
      default: 'WARNING',
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    subject: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    actionRequired: { type: String, trim: true },
    isAcknowledged: { type: Boolean, default: false, index: true },
    acknowledgedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

PerformanceNoticeSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

PerformanceNoticeSchema.virtual('issuedBy', {
  ref: 'User',
  localField: 'issuedById',
  foreignField: '_id',
  justOne: true,
});

export const PerformanceNotice =
  mongoose.models.PerformanceNotice ||
  mongoose.model<IPerformanceNotice>('PerformanceNotice', PerformanceNoticeSchema);
