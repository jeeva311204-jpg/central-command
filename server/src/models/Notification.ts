import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: string; // APPROVAL, ESCALATION, SLA_WARNING, WARRANTY, MAINTENANCE, AUDIT, SYSTEM
  isRead: boolean;
  linkUrl?: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'SYSTEM', index: true },
    isRead: { type: Boolean, default: false, index: true },
    linkUrl: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);
