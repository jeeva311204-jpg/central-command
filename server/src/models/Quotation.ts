import mongoose, { Schema, Document } from 'mongoose';
import { IVendor } from './Vendor';

export interface IQuotation extends Document {
  id: string;
  proposalId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  vendor?: IVendor;
  quotationNumber: string;
  price: number;
  installationCost: number;
  deliveryWeeks: number;
  warrantyYears: number;
  capacityPerHour: number;
  powerConsumptionKw: number;
  scorePrice: number;
  scoreWarranty: number;
  scoreCapacity: number;
  scorePower: number;
  scoreVendorRating: number;
  weightedScore: number;
  isRecommended: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuotationSchema = new Schema<IQuotation>(
  {
    proposalId: { type: Schema.Types.ObjectId, ref: 'Proposal', required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    quotationNumber: { type: String, required: true, trim: true },
    price: { type: Number, required: true, set: (v: number) => Math.round(v) },
    installationCost: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    deliveryWeeks: { type: Number, default: 4 },
    warrantyYears: { type: Number, default: 2 },
    capacityPerHour: { type: Number, default: 100 },
    powerConsumptionKw: { type: Number, default: 15 },
    scorePrice: { type: Number, default: 0 },
    scoreWarranty: { type: Number, default: 0 },
    scoreCapacity: { type: Number, default: 0 },
    scorePower: { type: Number, default: 0 },
    scoreVendorRating: { type: Number, default: 0 },
    weightedScore: { type: Number, default: 0 },
    isRecommended: { type: Boolean, default: false },
    notes: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

QuotationSchema.virtual('vendor', {
  ref: 'Vendor',
  localField: 'vendorId',
  foreignField: '_id',
  justOne: true,
});

export const Quotation =
  mongoose.models.Quotation ||
  mongoose.model<IQuotation>('Quotation', QuotationSchema);
