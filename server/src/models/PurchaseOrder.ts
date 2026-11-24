import mongoose, { Schema, Document } from 'mongoose';
import { IVendor } from './Vendor';
import { IProposal } from './Proposal';

export interface IPurchaseOrder extends Document {
  id: string;
  poNumber: string; // PO-2026-001
  proposalId: mongoose.Types.ObjectId;
  proposal?: IProposal;
  vendorId: mongoose.Types.ObjectId;
  vendor?: IVendor;
  quotationId?: mongoose.Types.ObjectId;
  totalAmount: number;
  currency: string;
  status: 'CREATED' | 'DISPATCHED' | 'DELIVERED' | 'INVOICED' | 'PAID';
  issuedDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  paymentTerms: string;
  createdById: mongoose.Types.ObjectId;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: { type: String, required: true, unique: true, index: true },
    proposalId: { type: Schema.Types.ObjectId, ref: 'Proposal', required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation' },
    totalAmount: { type: Number, required: true, set: (v: number) => Math.round(v) },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['CREATED', 'DISPATCHED', 'DELIVERED', 'INVOICED', 'PAID'],
      default: 'CREATED',
      index: true,
    },
    issuedDate: { type: Date, default: Date.now },
    expectedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    paymentTerms: { type: String, default: '30% Advance, 60% on Delivery, 10% on Commissioning' },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paidAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

PurchaseOrderSchema.virtual('proposal', {
  ref: 'Proposal',
  localField: 'proposalId',
  foreignField: '_id',
  justOne: true,
});

PurchaseOrderSchema.virtual('vendor', {
  ref: 'Vendor',
  localField: 'vendorId',
  foreignField: '_id',
  justOne: true,
});

PurchaseOrderSchema.virtual('delivery', {
  ref: 'Delivery',
  localField: '_id',
  foreignField: 'purchaseOrderId',
  justOne: true,
});

export const PurchaseOrder =
  mongoose.models.PurchaseOrder ||
  mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
