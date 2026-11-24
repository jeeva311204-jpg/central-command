import mongoose, { Schema, Document } from 'mongoose';
import { IDepartment } from './Department';
import { IUser } from './User';

export interface IRiskAssessment {
  severity: number;
  probability: number;
  score: number;
  mitigationPlan?: string;
}

export interface IImpactAreas {
  production?: string;
  quality?: string;
  safety?: string;
}

export interface IChange4M extends Document {
  id: string;
  changeNumber: string; // CHG-2026-001
  proposalId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  changeCategory: 'MAN' | 'MACHINE' | 'MATERIAL' | 'METHOD';
  departmentId: mongoose.Types.ObjectId;
  department?: IDepartment;
  initiatorId: mongoose.Types.ObjectId;
  initiator?: IUser;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTING' | 'VERIFIED' | 'CLOSED';
  reasonForChange: string;
  riskImpactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskAssessment: IRiskAssessment;
  riskAssessmentJson?: string;
  impactAreas: IImpactAreas;
  verifiedById?: mongoose.Types.ObjectId;
  verifiedBy?: IUser;
  closureNotes?: string;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const Change4MSchema = new Schema<IChange4M>(
  {
    changeNumber: { type: String, required: true, unique: true, index: true },
    proposalId: { type: Schema.Types.ObjectId, ref: 'Proposal', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    changeCategory: {
      type: String,
      enum: ['MAN', 'MACHINE', 'MATERIAL', 'METHOD'],
      required: true,
      index: true,
    },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    initiatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTING', 'VERIFIED', 'CLOSED'],
      default: 'DRAFT',
      index: true,
    },
    reasonForChange: { type: String, required: true },
    riskImpactLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    riskAssessment: {
      severity: { type: Number, default: 1 },
      probability: { type: Number, default: 1 },
      score: { type: Number, default: 1 },
      mitigationPlan: { type: String },
    },
    impactAreas: {
      production: { type: String },
      quality: { type: String },
      safety: { type: String },
    },
    verifiedById: { type: Schema.Types.ObjectId, ref: 'User' },
    closureNotes: { type: String },
    closedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

Change4MSchema.virtual('department', {
  ref: 'Department',
  localField: 'departmentId',
  foreignField: '_id',
  justOne: true,
});

Change4MSchema.virtual('initiator', {
  ref: 'User',
  localField: 'initiatorId',
  foreignField: '_id',
  justOne: true,
});

Change4MSchema.virtual('verifiedBy', {
  ref: 'User',
  localField: 'verifiedById',
  foreignField: '_id',
  justOne: true,
});

Change4MSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'change4mId',
});

Change4MSchema.virtual('riskAssessmentJson').get(function () {
  return JSON.stringify(this.riskAssessment || {});
});

export const Change4M =
  mongoose.models.Change4M ||
  mongoose.model<IChange4M>('Change4M', Change4MSchema);
