import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IApprovalAction extends Document {
  id: string;
  proposalId: mongoose.Types.ObjectId;
  stageId: mongoose.Types.ObjectId;
  stageName: string;
  approverId: mongoose.Types.ObjectId;
  approver?: IUser;
  action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION' | 'DELEGATE';
  comments?: string;
  checklistResponses?: Record<string, any>;
  checklistResponsesJson?: string;
  delegatedToId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ApprovalActionSchema = new Schema<IApprovalAction>(
  {
    proposalId: { type: Schema.Types.ObjectId, ref: 'Proposal', required: true, index: true },
    stageId: { type: Schema.Types.ObjectId, required: true },
    stageName: { type: String, required: true },
    approverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: {
      type: String,
      enum: ['APPROVE', 'REJECT', 'REQUEST_REVISION', 'DELEGATE'],
      required: true,
    },
    comments: { type: String },
    checklistResponses: { type: Schema.Types.Mixed },
    delegatedToId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ApprovalActionSchema.virtual('approver', {
  ref: 'User',
  localField: 'approverId',
  foreignField: '_id',
  justOne: true,
});

ApprovalActionSchema.virtual('checklistResponsesJson').get(function () {
  return this.checklistResponses ? JSON.stringify(this.checklistResponses) : null;
});

export const ApprovalAction =
  mongoose.models.ApprovalAction ||
  mongoose.model<IApprovalAction>('ApprovalAction', ApprovalActionSchema);
