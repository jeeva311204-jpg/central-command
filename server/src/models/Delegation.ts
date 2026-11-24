import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IDelegation extends Document {
  id: string;
  delegatorId: mongoose.Types.ObjectId;
  delegator?: IUser;
  delegateeId: mongoose.Types.ObjectId;
  delegatee?: IUser;
  role: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  isActive: boolean;
  createdAt: Date;
}

const DelegationSchema = new Schema<IDelegation>(
  {
    delegatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    delegateeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

DelegationSchema.index({ delegateeId: 1, role: 1, isActive: 1, startDate: 1, endDate: 1 });

DelegationSchema.virtual('delegator', {
  ref: 'User',
  localField: 'delegatorId',
  foreignField: '_id',
  justOne: true,
});

DelegationSchema.virtual('delegatee', {
  ref: 'User',
  localField: 'delegateeId',
  foreignField: '_id',
  justOne: true,
});

export const Delegation =
  mongoose.models.Delegation ||
  mongoose.model<IDelegation>('Delegation', DelegationSchema);
