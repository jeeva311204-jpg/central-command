import mongoose, { Schema, Document } from 'mongoose';

export interface IDelivery extends Document {
  id: string;
  purchaseOrderId: mongoose.Types.ObjectId;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'INSTALLED' | 'COMMISSIONED' | 'VERIFIED';
  dispatchDate?: Date;
  deliveryDate?: Date;
  installationDate?: Date;
  commissioningDate?: Date;
  trainingCompletedDate?: Date;
  qualityVerifiedById?: mongoose.Types.ObjectId;
  engineeringVerifiedById?: mongoose.Types.ObjectId;
  serialNumber?: string;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema = new Schema<IDelivery>(
  {
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'INSTALLED', 'COMMISSIONED', 'VERIFIED'],
      default: 'PENDING',
      index: true,
    },
    dispatchDate: { type: Date },
    deliveryDate: { type: Date },
    installationDate: { type: Date },
    commissioningDate: { type: Date },
    trainingCompletedDate: { type: Date },
    qualityVerifiedById: { type: Schema.Types.ObjectId, ref: 'User' },
    engineeringVerifiedById: { type: Schema.Types.ObjectId, ref: 'User' },
    serialNumber: { type: String, trim: true },
    trackingNumber: { type: String, trim: true },
    carrier: { type: String, trim: true },
    notes: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

DeliverySchema.virtual('purchaseOrder', {
  ref: 'PurchaseOrder',
  localField: 'purchaseOrderId',
  foreignField: '_id',
  justOne: true,
});

export const Delivery =
  mongoose.models.Delivery ||
  mongoose.model<IDelivery>('Delivery', DeliverySchema);
