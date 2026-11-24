export type UserRole =
  | 'Employee'
  | 'HOD'
  | 'Engineer'
  | 'Maintenance'
  | 'Finance'
  | 'Procurement'
  | 'Quality'
  | 'Management'
  | 'Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role: { id: string; name: UserRole; description?: string };
  departmentId?: string;
  department?: { id: string; name: string; code: string };
  phone?: string;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  hodId?: string;
  hod?: User;
}

export interface Budget {
  id: string;
  departmentId: string;
  department?: Department;
  fiscalYear: string;
  allocatedAmount: number;
  utilisedAmount: number;
  currency: string;
}

export interface ProposalType {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  category: string;
  isActive: boolean;
  formSchema?: FormSchema;
  workflowTemplate?: WorkflowTemplate;
}

export interface FormSchema {
  id: string;
  proposalTypeId: string;
  fieldsJson: string; // JSON parsed to dynamic fields
  requiredFinancialsJson: string;
  checklistTemplateId?: string;
  version: number;
}

export interface WorkflowTemplate {
  id: string;
  proposalTypeId: string;
  proposalType?: ProposalType;
  name: string;
  description?: string;
  isActive: boolean;
  version: number;
  stages: WorkflowStage[];
}

export interface WorkflowStage {
  id: string;
  workflowTemplateId: string;
  stepOrder: number;
  name: string;
  approverRole: UserRole;
  slaDays: number;
  conditionExpr?: string;
  minAmount?: number;
  maxAmount?: number;
  checklistTemplateId?: string;
}

export type ProposalStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'REVISION_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface BettermentAnalysis {
  production: {
    capacityBefore: string;
    capacityAfter: string;
    cycleTimeReductionSec: number;
    outputPerShift: string;
    rejectionRateReductionPercent: number;
    notes?: string;
  };
  financial: {
    expectedAnnualSavings: number;
    extraRevenuePerYear: number;
    additionalOpexPerYear: number;
    paybackMonths: number;
    notes?: string;
  };
  quality: {
    defectReductionPercent: number;
    precisionToleranceImprovement: string;
    reworkReductionHoursPerMonth: number;
    customerComplaintsRisk: string;
  };
  manpower: {
    operatorsRequiredBefore: number;
    operatorsRequiredAfter: number;
    trainingRequiredDays: number;
    manualWorkReductionPercent: number;
    ergonomicsImprovement: string;
  };
  safetyMaintenance: {
    safetyHazardReduction: string;
    energySavingKwPerMonth: number;
    maintenanceDowntimeReductionPercent: number;
    sparesAvailability: string;
  };
}

export interface Proposal {
  id: string;
  proposalNumber: string;
  title: string;
  proposalTypeId: string;
  proposalType: ProposalType;
  departmentId: string;
  department: Department;
  initiatorId: string;
  initiator: User;
  currentStageId?: string;
  currentStage?: WorkflowStage;
  status: ProposalStatus;
  priority: PriorityLevel;

  machineName?: string;
  category?: string;
  manufacturer?: string;
  supplier?: string;
  currentMachineDetails?: string;
  proposedMachineDetails?: string;
  expectedDeliveryWeeks?: number;

  purchasePrice: number;
  installationCost: number;
  transportCost: number;
  trainingCost: number;
  toolingCost: number;
  otherCost: number;
  totalInvestment: number;
  currency: string;

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
  budgetImpactStatus: 'WITHIN_BUDGET' | 'WARNING_HIGH_UTILISATION' | 'BUDGET_EXCEEDED';

  bettermentJson?: string;
  customFieldsJson?: string;

  approvalActions?: ApprovalAction[];
  versions?: ProposalVersion[];
  quotations?: Quotation[];
  purchaseOrders?: PurchaseOrder[];
  changes4m?: Change4M[];
  tasks?: Task[];
  assets?: Asset[];
  auditReviews?: AuditReview[];
  documents?: DocumentItem[];

  createdAt: string;
  updatedAt: string;
}

export interface ProposalVersion {
  id: string;
  proposalId: string;
  versionNumber: number;
  snapshotJson: string;
  changedById: string;
  changeSummary?: string;
  createdAt: string;
}

export interface ApprovalAction {
  id: string;
  proposalId: string;
  stageId: string;
  stageName: string;
  approverId: string;
  approver: User;
  action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION' | 'DELEGATE';
  comments?: string;
  checklistResponsesJson?: string;
  delegatedToId?: string;
  createdAt: string;
}

export interface Delegation {
  id: string;
  delegatorId: string;
  delegator: User;
  delegateeId: string;
  delegatee: User;
  role: string;
  startDate: string;
  endDate: string;
  reason?: string;
  isActive: boolean;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  checklistTemplateId: string;
  itemText: string;
  order: number;
  isMandatory: boolean;
  defaultAssigneeRole?: string;
}

export interface Task {
  id: string;
  proposalId?: string;
  change4mId?: string;
  title: string;
  description?: string;
  assignedToId: string;
  assignedTo: User;
  dueDate: string;
  completedAt?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  verificationNotes?: string;
}

export type Change4MCategory = 'MAN' | 'MACHINE' | 'MATERIAL' | 'METHOD';

export interface Change4M {
  id: string;
  proposalId?: string;
  proposal?: { id: string; proposalNumber: string; title: string };
  changeCategory: Change4MCategory;
  title: string;
  description: string;
  reasonForChange: string;
  riskAssessmentJson: string; // severity, probability, riskScore, mitigationPlan
  impactProduction?: string;
  impactQuality?: string;
  impactSafety?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'IN_IMPLEMENTATION' | 'VERIFIED' | 'CLOSED';
  closureNotes?: string;
  closedAt?: string;
  verifiedById?: string;
  verifiedBy?: User;
  tasks?: Task[];
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  code: string;
  rating: number;
  contactPerson?: string;
  email?: string;
  phone?: string;
  city?: string;
  categoriesJson?: string;
  purchaseHistoryCount: number;
  isApproved: boolean;
}

export interface Quotation {
  id: string;
  proposalId: string;
  vendorId: string;
  vendor: Vendor;
  quotationNumber: string;
  quoteDate: string;
  validUntil?: string;
  price: number;
  installationCost: number;
  deliveryWeeks: number;
  warrantyMonths: number;
  capacityPerHour?: number;
  powerConsumptionKw?: number;
  technicalScore: number;
  weightedScore: number;
  notes?: string;
  isRecommended: boolean;
  isAccepted: boolean;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  proposalId: string;
  proposal?: Proposal;
  vendorId: string;
  vendor: Vendor;
  quotationId?: string;
  quotation?: Quotation;
  totalAmount: number;
  currency: string;
  status: 'CREATED' | 'DISPATCHED' | 'DELIVERED' | 'INVOICED' | 'PAID';
  issuedDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  paymentTerms?: string;
  delivery?: Delivery;
  createdAt: string;
}

export interface Delivery {
  id: string;
  purchaseOrderId: string;
  trackingNumber?: string;
  carrier?: string;
  dispatchDate?: string;
  deliveryDate?: string;
  installationDate?: string;
  commissioningDate?: string;
  trainingCompletedDate?: string;
  qualityVerifiedById?: string;
  engineeringVerifiedById?: string;
  status: 'IN_TRANSIT' | 'DELIVERED' | 'INSTALLED' | 'COMMISSIONED' | 'VERIFIED';
  notes?: string;
}

export interface Asset {
  id: string;
  assetCode: string;
  name: string;
  proposalId?: string;
  departmentId: string;
  department: Department;
  vendorId?: string;
  vendor?: Vendor;
  serialNumber?: string;
  category?: string;
  purchaseDate: string;
  commissioningDate?: string;
  purchaseCost: number;
  warrantyExpiryDate?: string;
  location?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
  maintenanceSchedules?: MaintenanceSchedule[];
  auditReviews?: AuditReview[];
}

export interface MaintenanceSchedule {
  id: string;
  assetId: string;
  asset?: Asset;
  title: string;
  frequencyType: 'CALENDAR' | 'OPERATING_HOURS';
  frequencyValue: number;
  lastServiceDate?: string;
  nextDueDate?: string;
  nextDueHours?: number;
  assignedToId?: string;
  assignedTo?: User;
  status: 'SCHEDULED' | 'DUE' | 'OVERDUE' | 'COMPLETED';
}

export interface AuditReview {
  id: string;
  proposalId: string;
  proposal?: Proposal;
  assetId?: string;
  asset?: Asset;
  intervalMonths: number; // 3, 6, 12
  scheduledDate: string;
  conductedDate?: string;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  actualProductionUnits?: number;
  targetProductionUnits?: number;
  actualSavings?: number;
  targetSavings?: number;
  actualRoi?: number;
  targetRoi?: number;
  deviationNotes?: string;
  conductedById?: string;
  conductedBy?: User;
}

export interface DocumentItem {
  id: string;
  proposalId?: string;
  proposal?: { id: string; proposalNumber: string; title: string };
  entityType: string;
  entityId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedById: string;
  uploadedBy?: User;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'APPROVAL' | 'ESCALATION' | 'SLA_WARNING' | 'WARRANTY' | 'MAINTENANCE' | 'AUDIT' | 'SYSTEM';
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface SimulatedEmailItem {
  id: string;
  toEmail: string;
  recipientName?: string;
  subject: string;
  bodyHtml: string;
  category: string;
  sentAt: string;
}

export interface AuditLogItem {
  id: string;
  userId?: string;
  userName?: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeJson?: string;
  afterJson?: string;
  ipAddress?: string;
  timestamp: string;
}
