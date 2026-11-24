import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
  id: string;
  name: string;
  code: string; // PROD, MAINT, QA, ENG, LOG
  hodId?: mongoose.Types.ObjectId;
  isActive: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    hodId: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Department = mongoose.models.Department || mongoose.model<IDepartment>('Department', DepartmentSchema);
