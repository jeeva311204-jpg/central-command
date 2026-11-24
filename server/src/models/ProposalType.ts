import mongoose, { Schema, Document } from 'mongoose';

export interface IFormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

export interface IFormSchema {
  fields: IFormField[];
  requiredFinancials: string[];
  checklistTemplateId?: mongoose.Types.ObjectId;
  version: number;
}

export interface IProposalType extends Document {
  id: string;
  code: string; // NEW_MACHINE, REPLACEMENT, UPGRADATION, etc.
  name: string;
  description?: string;
  icon?: string;
  category: string;
  isActive: boolean;
  formSchema: IFormSchema;
  createdAt: Date;
  updatedAt: Date;
}

const FormFieldSchema = new Schema<IFormField>(
  {
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, required: true },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
  },
  { _id: false }
);

const FormSchemaDef = new Schema<IFormSchema>(
  {
    fields: [FormFieldSchema],
    requiredFinancials: [{ type: String }],
    checklistTemplateId: { type: Schema.Types.ObjectId, ref: 'ChecklistTemplate' },
    version: { type: Number, default: 1 },
  },
  { _id: false }
);

const ProposalTypeSchema = new Schema<IProposalType>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    icon: { type: String },
    category: { type: String, default: 'CAPEX' },
    isActive: { type: Boolean, default: true, index: true },
    formSchema: { type: FormSchemaDef, default: () => ({ fields: [], requiredFinancials: [], version: 1 }) },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ProposalTypeSchema.virtual('workflowTemplate', {
  ref: 'WorkflowTemplate',
  localField: '_id',
  foreignField: 'proposalTypeId',
  justOne: true,
});

export const ProposalType =
  mongoose.models.ProposalType ||
  mongoose.model<IProposalType>('ProposalType', ProposalTypeSchema);
