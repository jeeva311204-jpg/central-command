import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
  id: string;
  name: string;
  code: string; // VEND-001
  rating: number;
  contactPerson?: string;
  email?: string;
  phone?: string;
  city?: string;
  purchaseHistoryCount: number;
  isApproved: boolean;
  isActive: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    rating: { type: Number, default: 4.5 },
    contactPerson: { type: String },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String },
    city: { type: String },
    purchaseHistoryCount: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Vendor = mongoose.models.Vendor || mongoose.model<IVendor>('Vendor', VendorSchema);
