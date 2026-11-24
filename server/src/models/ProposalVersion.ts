import mongoose, { Schema, Document } from 'mongoose';

export interface IProposalVersion extends Document {
  id: string;
  proposalId: mongoose.Types.ObjectId;
  versionNumber: number;
  snapshot: Record<string, any>;
  snapshotJson?: string;
  changedById: mongoose.Types.ObjectId;
  changeSummary?: string;
  createdAt: Date;
}

const ProposalVersionSchema = new Schema<IProposalVersion>(
  {
    proposalId: { type: Schema.Types.ObjectId, ref: 'Proposal', required: true, index: true },
    versionNumber: { type: Number, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    changedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changeSummary: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Append-only (no updatedAt)
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Backward compatible snapshotJson virtual
ProposalVersionSchema.virtual('snapshotJson').get(function () {
  return typeof this.snapshot === 'string' ? this.snapshot : JSON.stringify(this.snapshot);
});

// Append-only integrity: Block updates and deletions at model level via Mongoose hooks
const throwImmutableError = function () {
  throw new Error('ProposalVersion is immutable and append-only. Updates and deletions are strictly prohibited.');
};

ProposalVersionSchema.pre('updateOne', throwImmutableError);
ProposalVersionSchema.pre('updateMany', throwImmutableError);
ProposalVersionSchema.pre('findOneAndUpdate', throwImmutableError);
ProposalVersionSchema.pre('replaceOne', throwImmutableError);
ProposalVersionSchema.pre('deleteOne', throwImmutableError);
ProposalVersionSchema.pre('deleteMany', throwImmutableError);
ProposalVersionSchema.pre('findOneAndDelete', throwImmutableError);

export const ProposalVersion =
  mongoose.models.ProposalVersion ||
  mongoose.model<IProposalVersion>('ProposalVersion', ProposalVersionSchema);
