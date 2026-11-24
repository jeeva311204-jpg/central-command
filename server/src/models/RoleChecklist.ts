import mongoose, { Schema, Document } from 'mongoose';

export interface IRoleChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: Date;
  note?: string;
}

export interface IRoleChecklist extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  roleName: string;
  departmentId?: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  items: IRoleChecklistItem[];
  completionRate: number; // 0 - 100
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChecklistItemSchema = new Schema<IRoleChecklistItem>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    note: { type: String },
  },
  { _id: false }
);

const RoleChecklistSchema = new Schema<IRoleChecklist>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roleName: { type: String, required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    items: [ChecklistItemSchema],
    completionRate: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for user + date unique lookup
RoleChecklistSchema.index({ userId: 1, date: 1 }, { unique: true });

RoleChecklistSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

RoleChecklistSchema.virtual('department', {
  ref: 'Department',
  localField: 'departmentId',
  foreignField: '_id',
  justOne: true,
});

export const RoleChecklist =
  mongoose.models.RoleChecklist ||
  mongoose.model<IRoleChecklist>('RoleChecklist', RoleChecklistSchema);
