import mongoose, { Schema, Document } from 'mongoose';
import { IDepartment } from './Department';
import { IVendor } from './Vendor';

export interface IAsset extends Document {
  id: string;
  assetCode: string; // AST-PROD-001
  name: string;
  category?: string;
  serialNumber?: string;
  departmentId: mongoose.Types.ObjectId;
  department?: IDepartment;
  proposalId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  vendor?: IVendor;
  purchasePrice: number;
  purchaseDate: Date;
  commissioningDate?: Date;
  warrantyExpiryDate?: Date;
  location?: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'DECOMMISSIONED';
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    assetCode: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    proposalId: { type: Schema.Types.ObjectId, ref: 'Proposal', index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', index: true },
    purchasePrice: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    purchaseDate: { type: Date, default: Date.now },
    commissioningDate: { type: Date },
    warrantyExpiryDate: { type: Date, index: true },
    location: { type: String },
    status: {
      type: String,
      enum: ['OPERATIONAL', 'MAINTENANCE', 'DECOMMISSIONED', 'ACTIVE'],
      default: 'OPERATIONAL',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AssetSchema.virtual('purchaseCost')
  .get(function () {
    return this.purchasePrice;
  })
  .set(function (v: number) {
    this.purchasePrice = v;
  });

AssetSchema.virtual('department', {
  ref: 'Department',
  localField: 'departmentId',
  foreignField: '_id',
  justOne: true,
});

AssetSchema.virtual('vendor', {
  ref: 'Vendor',
  localField: 'vendorId',
  foreignField: '_id',
  justOne: true,
});

AssetSchema.virtual('proposal', {
  ref: 'Proposal',
  localField: 'proposalId',
  foreignField: '_id',
  justOne: true,
});

AssetSchema.virtual('maintenanceSchedules', {
  ref: 'MaintenanceSchedule',
  localField: '_id',
  foreignField: 'assetId',
});

AssetSchema.virtual('auditReviews', {
  ref: 'AuditReview',
  localField: '_id',
  foreignField: 'assetId',
});

export const Asset = mongoose.models.Asset || mongoose.model<IAsset>('Asset', AssetSchema);
