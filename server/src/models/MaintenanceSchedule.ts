import mongoose, { Schema, Document } from 'mongoose';
import { IAsset } from './Asset';
import { IUser } from './User';

export interface IMaintenanceSchedule extends Document {
  id: string;
  assetId: mongoose.Types.ObjectId;
  asset?: IAsset;
  title: string;
  frequencyType: 'CALENDAR' | 'HOURS';
  frequencyValue: number; // e.g. 30 (days) or 500 (operating hours)
  nextDueDate: Date;
  nextDueHours?: number;
  lastServiceDate?: Date;
  status: 'SCHEDULED' | 'OVERDUE' | 'COMPLETED';
  assignedToId?: mongoose.Types.ObjectId;
  assignedTo?: IUser;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceScheduleSchema = new Schema<IMaintenanceSchedule>(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    title: { type: String, required: true, trim: true },
    frequencyType: { type: String, enum: ['CALENDAR', 'HOURS'], default: 'CALENDAR' },
    frequencyValue: { type: Number, default: 30 },
    nextDueDate: { type: Date, required: true, index: true },
    nextDueHours: { type: Number },
    lastServiceDate: { type: Date },
    status: {
      type: String,
      enum: ['SCHEDULED', 'OVERDUE', 'COMPLETED'],
      default: 'SCHEDULED',
      index: true,
    },
    assignedToId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

MaintenanceScheduleSchema.virtual('asset', {
  ref: 'Asset',
  localField: 'assetId',
  foreignField: '_id',
  justOne: true,
});

MaintenanceScheduleSchema.virtual('assignedTo', {
  ref: 'User',
  localField: 'assignedToId',
  foreignField: '_id',
  justOne: true,
});

export const MaintenanceSchedule =
  mongoose.models.MaintenanceSchedule ||
  mongoose.model<IMaintenanceSchedule>('MaintenanceSchedule', MaintenanceScheduleSchema);
