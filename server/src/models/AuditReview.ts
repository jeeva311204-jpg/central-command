import mongoose, { Schema, Document } from 'mongoose';
import { IProposal } from './Proposal';
import { IAsset } from './Asset';
import { IUser } from './User';

export interface IAuditReview extends Document {
  id: string;
  proposalId: mongoose.Types.ObjectId;
  proposal?: IProposal;
  assetId?: mongoose.Types.ObjectId;
  asset?: IAsset;
  intervalMonths: number; // 3, 6, 12
  scheduledDate: Date;
  conductedDate?: Date;
  status: 'PENDING' | 'COMPLETED';
  targetProductionUnits?: number;
  actualProductionUnits?: number;
  targetSavings?: number;
  actualSavings?: number;
  targetRoi?: number;
  actualRoi?: number;
  deviationNotes?: string;
  conductedById?: mongoose.Types.ObjectId;
  conductedBy?: IUser;
  createdAt: Date;
  updatedAt: Date;
}

const AuditReviewSchema = new Schema<IAuditReview>(
  {
    proposalId: { type: Schema.Types.ObjectId, ref: 'Proposal', required: true, index: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', index: true },
    intervalMonths: { type: Number, required: true },
    scheduledDate: { type: Date, required: true },
    conductedDate: { type: Date },
    status: { type: String, enum: ['PENDING', 'COMPLETED'], default: 'PENDING', index: true },
    targetProductionUnits: { type: Number },
    actualProductionUnits: { type: Number },
    targetSavings: { type: Number, set: (v: number) => (v !== undefined && v !== null ? Math.round(v) : v) },
    actualSavings: { type: Number, set: (v: number) => (v !== undefined && v !== null ? Math.round(v) : v) },
    targetRoi: { type: Number },
    actualRoi: { type: Number },
    deviationNotes: { type: String },
    conductedById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AuditReviewSchema.virtual('proposal', {
  ref: 'Proposal',
  localField: 'proposalId',
  foreignField: '_id',
  justOne: true,
});

AuditReviewSchema.virtual('asset', {
  ref: 'Asset',
  localField: 'assetId',
  foreignField: '_id',
  justOne: true,
});

AuditReviewSchema.virtual('conductedBy', {
  ref: 'User',
  localField: 'conductedById',
  foreignField: '_id',
  justOne: true,
});

export const AuditReview =
  mongoose.models.AuditReview ||
  mongoose.model<IAuditReview>('AuditReview', AuditReviewSchema);
