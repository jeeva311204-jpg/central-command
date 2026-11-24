import mongoose, { Schema, Document } from 'mongoose';

export interface ISimulatedEmail extends Document {
  id: string;
  toEmail: string;
  recipientName?: string;
  subject: string;
  bodyHtml: string;
  category: string; // APPROVAL_REQUEST, SLA_ESCALATION, REVISION_REQUEST, PO_ISSUED, WARRANTY_ALERT, MAINTENANCE_ALERT
  sentAt: Date;
}

const SimulatedEmailSchema = new Schema<ISimulatedEmail>(
  {
    toEmail: { type: String, required: true, lowercase: true, trim: true },
    recipientName: { type: String },
    subject: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    category: { type: String, required: true, index: true },
    sentAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const SimulatedEmail =
  mongoose.models.SimulatedEmail ||
  mongoose.model<ISimulatedEmail>('SimulatedEmail', SimulatedEmailSchema);
