import mongoose, { Schema, Document as MongooseDoc } from 'mongoose';
import { IUser } from './User';

export interface IDocumentItem extends MongooseDoc {
  id: string;
  proposalId?: mongoose.Types.ObjectId;
  entityType: string; // PROPOSAL, QUOTATION, PO, INVOICE, VERIFICATION, CHANGE4M
  entityId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedById: mongoose.Types.ObjectId;
  uploadedBy?: IUser;
  createdAt: Date;
}

const DocumentSchema = new Schema<IDocumentItem>(
  {
    proposalId: { type: Schema.Types.ObjectId, ref: 'Proposal', index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, index: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    filePath: { type: String, required: true },
    uploadedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

DocumentSchema.virtual('uploadedBy', {
  ref: 'User',
  localField: 'uploadedById',
  foreignField: '_id',
  justOne: true,
});

export const DocumentModel =
  mongoose.models.Document ||
  mongoose.model<IDocumentItem>('Document', DocumentSchema);
