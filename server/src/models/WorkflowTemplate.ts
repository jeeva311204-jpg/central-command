import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkflowStage {
  _id: mongoose.Types.ObjectId;
  id?: string;
  stepOrder: number;
  name: string;
  approverRole: string; // HOD, Engineer, Finance, Procurement, Management
  slaDays: number;
  minAmount?: number | null;
  maxAmount?: number | null;
  conditionExpr?: string | null;
  checklistTemplateId?: mongoose.Types.ObjectId;
}

export interface IWorkflowTemplate extends Document {
  id: string;
  proposalTypeId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  version: number;
  stages: IWorkflowStage[];
  createdAt: Date;
  updatedAt: Date;
}

export const WorkflowStageSchema = new Schema<IWorkflowStage>(
  {
    stepOrder: { type: Number, required: true },
    name: { type: String, required: true },
    approverRole: { type: String, required: true },
    slaDays: { type: Number, default: 3 },
    minAmount: { type: Number, default: null },
    maxAmount: { type: Number, default: null },
    conditionExpr: { type: String, default: null },
    checklistTemplateId: { type: Schema.Types.ObjectId, ref: 'ChecklistTemplate' },
  },
  { _id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const WorkflowTemplateSchema = new Schema<IWorkflowTemplate>(
  {
    proposalTypeId: { type: Schema.Types.ObjectId, ref: 'ProposalType', required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    stages: [WorkflowStageSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const WorkflowTemplate =
  mongoose.models.WorkflowTemplate ||
  mongoose.model<IWorkflowTemplate>('WorkflowTemplate', WorkflowTemplateSchema);
