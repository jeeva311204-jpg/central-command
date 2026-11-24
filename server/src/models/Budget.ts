import mongoose, { Schema, Document } from 'mongoose';
import { IDepartment } from './Department';

export interface IBudget extends Document {
  id: string;
  departmentId: mongoose.Types.ObjectId;
  department?: IDepartment;
  fiscalYear: string; // e.g. "FY2026-27"
  allocatedAmount: number; // Stored as integer currency
  utilisedAmount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    fiscalYear: { type: String, required: true, trim: true, index: true },
    allocatedAmount: {
      type: Number,
      required: true,
      set: (v: number) => Math.round(v),
    },
    utilisedAmount: {
      type: Number,
      default: 0,
      set: (v: number) => Math.round(v),
    },
    currency: { type: String, default: 'INR' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

// Compound unique index
BudgetSchema.index({ departmentId: 1, fiscalYear: 1 }, { unique: true });

BudgetSchema.virtual('department', {
  ref: 'Department',
  localField: 'departmentId',
  foreignField: '_id',
  justOne: true,
});

export const Budget = mongoose.models.Budget || mongoose.model<IBudget>('Budget', BudgetSchema);
