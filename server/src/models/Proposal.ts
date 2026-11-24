import mongoose, { Schema, Document } from 'mongoose';

export interface IBettermentAnalysis {
  production?: {
    currentCapacity?: string;
    proposedCapacity?: string;
    cycleTimeReduction?: string;
    outputPerShift?: string;
    rejectionRateReduction?: string;
  };
  financial?: {
    estimatedOpex?: string;
    annualSavings?: string;
    additionalRevenue?: string;
    costBenefitSummary?: string;
  };
  quality?: {
    defectRateReduction?: string;
    precisionImprovement?: string;
    reworkReduction?: string;
    qualityScore?: string;
  };
  manpower?: {
    currentRequirement?: string;
    proposedRequirement?: string;
    trainingNeeds?: string;
    manualWorkReduction?: string;
  };
  safetyMaintenance?: {
    safetyRisksEliminated?: string;
    maintenanceReduction?: string;
    energyEfficiencyImprovement?: string;
    sparePartsStandardisation?: string;
  };
}

export interface IProposal extends Document {
  id: string;
  proposalNumber: string; // CF-2026-001
  title: string;
  proposalTypeId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  initiatorId: mongoose.Types.ObjectId;
  currentStageId?: mongoose.Types.ObjectId;
  status: string; // DRAFT, IN_REVIEW, REVISION_REQUESTED, APPROVED, REJECTED, CANCELLED
  priority: string; // LOW, MEDIUM, HIGH, CRITICAL

  // Machine specs
  machineName?: string;
  category?: string;
  manufacturer?: string;
  supplier?: string;
  currentMachineDetails?: string;
  proposedMachineDetails?: string;
  expectedDeliveryWeeks: number;

  // Cost breakdown (integers)
  purchasePrice: number;
  installationCost: number;
  transportCost: number;
  trainingCost: number;
  toolingCost: number;
  otherCost: number;
  totalInvestment: number;
  currency: string;

  // Financial calculations
  usefulLifeYears: number;
  discountRate: number;
  salvageValue: number;
  annualSavings: number;
  extraRevenue: number;
  extraOpex: number;
  annualNetBenefit: number;
  simplePayback: number;
  roiPercent: number;
  npv: number;
  irr: number;
  discountedPayback: number;
  annualDepreciation: number;
  budgetImpactStatus: string;

  // Embedded Betterment Analysis
  betterment: IBettermentAnalysis;
  bettermentJson?: string;
  customFields?: Record<string, any>;
  customFieldsJson?: string;

  createdAt: Date;
  updatedAt: Date;
}

const BettermentSchema = new Schema<IBettermentAnalysis>(
  {
    production: { type: Schema.Types.Mixed, default: {} },
    financial: { type: Schema.Types.Mixed, default: {} },
    quality: { type: Schema.Types.Mixed, default: {} },
    manpower: { type: Schema.Types.Mixed, default: {} },
    safetyMaintenance: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const ProposalSchema = new Schema<IProposal>(
  {
    proposalNumber: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    proposalTypeId: { type: Schema.Types.ObjectId, ref: 'ProposalType', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    initiatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    currentStageId: { type: Schema.Types.ObjectId, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'IN_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },

    machineName: { type: String, trim: true },
    category: { type: String, trim: true },
    manufacturer: { type: String, trim: true },
    supplier: { type: String, trim: true },
    currentMachineDetails: { type: String },
    proposedMachineDetails: { type: String },
    expectedDeliveryWeeks: { type: Number, default: 4 },

    // Financial values stored as integer currency
    purchasePrice: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    installationCost: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    transportCost: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    trainingCost: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    toolingCost: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    otherCost: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    totalInvestment: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    currency: { type: String, default: 'INR' },

    usefulLifeYears: { type: Number, default: 5 },
    discountRate: { type: Number, default: 10 },
    salvageValue: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    annualSavings: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    extraRevenue: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    extraOpex: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    annualNetBenefit: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    simplePayback: { type: Number, default: 0 },
    roiPercent: { type: Number, default: 0 },
    npv: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    irr: { type: Number, default: 0 },
    discountedPayback: { type: Number, default: 0 },
    annualDepreciation: { type: Number, default: 0, set: (v: number) => Math.round(v) },
    budgetImpactStatus: {
      type: String,
      enum: ['WITHIN_BUDGET', 'WARNING_HIGH_UTILISATION', 'BUDGET_EXCEEDED'],
      default: 'WITHIN_BUDGET',
    },

    betterment: { type: BettermentSchema, default: () => ({}) },
    customFields: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    versionKey: '__v', // Optimistic concurrency control enabled!
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
ProposalSchema.index({ departmentId: 1, createdAt: -1 });
ProposalSchema.index({ status: 1, currentStageId: 1 });
ProposalSchema.index({ createdAt: -1 });

// Virtuals for relations
ProposalSchema.virtual('department', {
  ref: 'Department',
  localField: 'departmentId',
  foreignField: '_id',
  justOne: true,
});

ProposalSchema.virtual('proposalType', {
  ref: 'ProposalType',
  localField: 'proposalTypeId',
  foreignField: '_id',
  justOne: true,
});

ProposalSchema.virtual('initiator', {
  ref: 'User',
  localField: 'initiatorId',
  foreignField: '_id',
  justOne: true,
});

// Getter for backward compatibility with frontend JSON strings
ProposalSchema.virtual('bettermentJson').get(function () {
  return JSON.stringify(this.betterment || {});
});

ProposalSchema.virtual('customFieldsJson').get(function () {
  return JSON.stringify(this.customFields || {});
});

export const Proposal = mongoose.models.Proposal || mongoose.model<IProposal>('Proposal', ProposalSchema);
