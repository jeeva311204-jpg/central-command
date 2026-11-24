import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface ITask extends Document {
  id: string;
  change4mId?: mongoose.Types.ObjectId;
  proposalId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  assignedToId: mongoose.Types.ObjectId;
  assignedTo?: IUser;
  dueDate: Date;
  status: 'PENDING' | 'COMPLETED';
  completedAt?: Date;
  verificationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    change4mId: { type: Schema.Types.ObjectId, ref: 'Change4M', index: true },
    proposalId: { type: Schema.Types.ObjectId, ref: 'Proposal', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    assignedToId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['PENDING', 'COMPLETED'], default: 'PENDING', index: true },
    completedAt: { type: Date },
    verificationNotes: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

TaskSchema.virtual('assignedTo', {
  ref: 'User',
  localField: 'assignedToId',
  foreignField: '_id',
  justOne: true,
});

export const Task = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
