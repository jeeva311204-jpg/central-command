import mongoose, { Schema, Document } from 'mongoose';

export interface IChecklistItem {
  _id?: mongoose.Types.ObjectId;
  description: string;
  isMandatory: boolean;
  role: string;
  category?: string;
}

export interface IChecklistTemplate extends Document {
  id: string;
  name: string;
  type: string; // EVALUATION, IMPLEMENTATION, COMMISSIONING, VERIFICATION
  description?: string;
  items: IChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
}

const ChecklistItemSchema = new Schema<IChecklistItem>(
  {
    description: { type: String, required: true },
    isMandatory: { type: Boolean, default: true },
    role: { type: String, required: true },
    category: { type: String },
  },
  { _id: true }
);

const ChecklistTemplateSchema = new Schema<IChecklistTemplate>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, index: true },
    description: { type: String },
    items: [ChecklistItemSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const ChecklistTemplate =
  mongoose.models.ChecklistTemplate ||
  mongoose.model<IChecklistTemplate>('ChecklistTemplate', ChecklistTemplateSchema);
