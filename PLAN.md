# ChangeFlow Enterprise — Architecture, Data Model & Implementation Plan

## Executive Summary
**ChangeFlow Enterprise** is an Integrated 4M Change Management, CAPEX & Procurement Automation Platform engineered for industrial enterprises. It unifies machinery investment proposals, 4M changes (Man, Machine, Material, Method), dynamic threshold-based workflows, live financial modeling (NPV, IRR, Payback, ROI, Depreciation), vendor quotation comparisons with multi-factor scoring, asset lifecycle tracking, post-investment audit reviews, and complete audit logging into a single cohesive, auditable system.

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND: React + Vite + TypeScript                      │
│   Tailwind CSS  │  Recharts  │  Lucide Icons  │  React Router  │  Context State  │
├──────────────────────────────────────────────────────────────────────────────────┤
│ • Role-Based Dashboards (Employee / Approver / Management CAPEX)                 │
│ • Proposal Engine (14 types, Full Machine Purchase & Replacement wizards)        │
│ • Live Financial Modeling & Budget Overrun Warnings                              │
│ • 4M Change Request & Risk Matrix & Verification Checklists                      │
│ • Visual Dynamic Workflow Tracker & Admin Workflow/Threshold Builder            │
│ • Multi-Vendor Quotation Evaluation & Machine Comparison Matrix                  │
│ • Delivery & Commissioning Pipeline & Asset / Preventive Maintenance Register   │
│ • Post-Investment 3/6/12 Month Audits & Staff Performance Metrics                │
│ • Notification Center & Simulated Email Log & Immutable Audit Trail              │
└──────────────────────────────────────┬───────────────────────────────────────────┘
                                       │ HTTP / REST APIs + JWT Auth
┌──────────────────────────────────────▼───────────────────────────────────────────┐
│                       BACKEND: Node.js + Express + TypeScript                    │
├──────────────────────────────────────────────────────────────────────────────────┤
│ • Router & Controller Layer: RBAC Middleware, File Uploads (Multer), Validation  │
│ • Core Workflow Engine: Dynamic Stage Evaluator, Threshold Rules, Delegation,    │
│   SLA Escalation Engine, Version Control                                         │
│ • Financial Evaluation Service: Total Cost, Net Benefit, Simple Payback, ROI,    │
│   NPV, IRR (Newton-Raphson), Discounted Payback, Straight-Line Depreciation      │
│ • Procurement Service: Weighted Quotation Scoring, Best-Value Recommendation,    │
│   Purchase Order Lifecycle (Created -> Dispatched -> Delivered -> Invoiced)     │
│ • Asset Lifecycle Service: Commissioning -> Auto-Asset Registration -> Warranties │
│   & Preventive Maintenance Schedules                                             │
│ • Post-Investment Audit Engine: 3, 6, 12-Month Scheduled Reviews vs Projections  │
│ • Notification & Simulated Email Dispatcher                                      │
│ • Immutable Audit Logger (Who / What / When / Before / After JSON diff)          │
│ • PDF Generation Service: Detailed Executive Proposal Dossier                    │
└──────────────────────────────────────┬───────────────────────────────────────────┘
                                       │ Prisma ORM
┌──────────────────────────────────────▼───────────────────────────────────────────┐
│                      DATABASE: SQLite (Portable to PostgreSQL)                   │
│   Prisma Schema with 24 Models, Foreign Key Integrity, Cascades, Indexes        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Comprehensive Data Model

The database comprises 24 relational models designed for SQLite with full portability to PostgreSQL:

1. **User**: `id`, `name`, `email`, `passwordHash`, `roleId`, `departmentId`, `phone`, `isActive`, `createdAt`
2. **Role**: `id`, `name` (Employee, HOD, Engineer, Maintenance, Finance, Procurement, Quality, Management, Admin), `description`
3. **Department**: `id`, `name`, `code`, `hodId`, `createdAt`
4. **Budget**: `id`, `departmentId`, `fiscalYear`, `allocatedAmount`, `utilisedAmount`, `currency`
5. **ProposalType**: `id`, `code`, `name`, `description`, `icon`, `category` (14 standard industrial types)
6. **FormSchema**: `id`, `proposalTypeId`, `fieldsJson`, `requiredFinancialsJson`, `checklistTemplateId`, `version`
7. **WorkflowTemplate**: `id`, `proposalTypeId`, `name`, `description`, `isActive`, `version`
8. **WorkflowStage**: `id`, `workflowTemplateId`, `stepOrder`, `name`, `approverRole`, `slaDays`, `conditionExpr`, `minAmount`, `maxAmount`, `checklistTemplateId`
9. **Proposal**: `id`, `proposalNumber` (e.g., `CF-2026-001`), `title`, `proposalTypeId`, `departmentId`, `initiatorId`, `currentStageId`, `status` (DRAFT, IN_REVIEW, REVISION_REQUESTED, APPROVED, REJECTED, CANCELLED), `priority`, `totalInvestment`, `currency`, `usefulLifeYears`, `discountRate`, `salvageValue`, `annualSavings`, `extraRevenue`, `extraOpex`, `simplePayback`, `roiPercent`, `npv`, `irr`, `discountedPayback`, `annualDepreciation`, `budgetImpactStatus`, `machineName`, `currentMachineDetails`, `proposedMachineDetails`, `bettermentJson`, `createdAt`, `updatedAt`
10. **ProposalVersion**: `id`, `proposalId`, `versionNumber`, `snapshotJson`, `changedById`, `changeSummary`, `createdAt`
11. **ApprovalAction**: `id`, `proposalId`, `stageId`, `stageName`, `approverId`, `action` (APPROVE, REJECT, REQUEST_REVISION, DELEGATE), `comments`, `checklistResponsesJson`, `delegatedToId`, `createdAt`
12. **Delegation**: `id`, `delegatorId`, `delegateeId`, `role`, `startDate`, `endDate`, `reason`, `isActive`
13. **ChecklistTemplate**: `id`, `name`, `category` (EVALUATION, IMPLEMENTATION, COMMISSIONING, VERIFICATION), `description`
14. **ChecklistItem**: `id`, `checklistTemplateId`, `itemText`, `order`, `isMandatory`, `defaultAssigneeRole`
15. **Task**: `id`, `proposalId`, `change4mId`, `title`, `description`, `assignedToId`, `dueDate`, `completedAt`, `status` (PENDING, IN_PROGRESS, COMPLETED, OVERDUE), `verificationNotes`
16. **Change4M**: `id`, `proposalId`, `changeCategory` (MAN, MACHINE, MATERIAL, METHOD), `title`, `description`, `reasonForChange`, `riskAssessmentJson` (severity, probability, riskScore, mitigation), `impactProduction`, `impactQuality`, `impactSafety`, `status`, `closureNotes`, `closedAt`, `verifiedById`
17. **Vendor**: `id`, `name`, `code`, `rating` (1-5), `contactPerson`, `email`, `phone`, `city`, `categoriesJson`, `purchaseHistoryCount`, `isApproved`
18. **Quotation**: `id`, `proposalId`, `vendorId`, `quotationNumber`, `quoteDate`, `validUntil`, `price`, `installationCost`, `deliveryWeeks`, `warrantyMonths`, `capacityPerHour`, `powerConsumptionKw`, `technicalScore`, `notes`, `fileAttachmentId`, `isRecommended`, `isAccepted`
19. **PurchaseOrder**: `id`, `poNumber`, `proposalId`, `vendorId`, `quotationId`, `totalAmount`, `status` (CREATED, DISPATCHED, DELIVERED, INVOICED, PAID), `issuedDate`, `expectedDeliveryDate`, `actualDeliveryDate`, `paymentTerms`, `createdById`
20. **Delivery**: `id`, `purchaseOrderId`, `trackingNumber`, `carrier`, `dispatchDate`, `deliveryDate`, `installationDate`, `commissioningDate`, `trainingCompletedDate`, `qualityVerifiedById`, `engineeringVerifiedById`, `status`, `notes`
21. **Asset**: `id`, `assetCode`, `name`, `proposalId`, `departmentId`, `vendorId`, `serialNumber`, `category`, `purchaseDate`, `commissioningDate`, `purchaseCost`, `warrantyExpiryDate`, `location`, `status` (ACTIVE, MAINTENANCE, RETIRED)
22. **MaintenanceSchedule**: `id`, `assetId`, `title`, `frequencyType` (CALENDAR, OPERATING_HOURS), `frequencyValue`, `lastServiceDate`, `nextDueDate`, `nextDueHours`, `assignedToId`, `status` (SCHEDULED, DUE, OVERDUE, COMPLETED)
23. **AuditReview**: `id`, `proposalId`, `assetId`, `intervalMonths` (3, 6, 12), `scheduledDate`, `conductedDate`, `status` (PENDING, COMPLETED, OVERDUE), `actualProductionUnits`, `targetProductionUnits`, `actualSavings`, `targetSavings`, `actualRoi`, `targetRoi`, `deviationNotes`, `conductedById`
24. **Document**: `id`, `proposalId`, `entityType`, `entityId`, `fileName`, `fileType`, `fileSize`, `filePath`, `uploadedById`, `createdAt`
25. **Notification**: `id`, `userId`, `title`, `message`, `type` (APPROVAL, ESCALATION, SLA_WARNING, WARRANTY, MAINTENANCE, AUDIT, SYSTEM), `isRead`, `linkUrl`, `createdAt`
26. **SimulatedEmail**: `id`, `toEmail`, `recipientName`, `subject`, `bodyHtml`, `category`, `sentAt`
27. **AuditLog**: `id`, `userId`, `userName`, `entityType`, `entityId`, `action` (CREATE, UPDATE, APPROVE, REJECT, DELETE), `beforeJson`, `afterJson`, `ipAddress`, `timestamp`

---

## 3. Milestones & Verification Steps

- **Milestone 1: Project Scaffold, DB Schema, Auth & Seed Script**
  - Scaffold Vite React + Node Express TypeScript workspaces.
  - Setup Prisma schema with all 24 models, relations, seed data with 5 depts, 10 users across 9 roles, budgets, 6 vendors, 8 proposals, assets, checklists.
  - Implement JWT Auth and RBAC middleware. Verify seed runs and generates database.

- **Milestone 2: Workflow Engine, Threshold Rules, Delegations & Audit Trail**
  - Workflow template and stage evaluator with dynamic thresholds (<= ₹1L, ₹1L-₹10L, > ₹10L).
  - Actions: Approve, Reject, Revision Request, Delegation, SLA Escalations.
  - Version snapshots on revision request.
  - Write unit tests for workflow rules & delegations. Verify in test suite.

- **Milestone 3: Machine Purchase & Replacement Proposals + Live Financial Engine**
  - Implement 14 proposal types registry with schemas.
  - Full New Machine Purchase & Replacement forms with mandatory 5-pillar Betterment Analysis (Production, Financial, Quality, Manpower, Safety/Maintenance).
  - Live calculating Financial Evaluation: Total Investment, Net Benefit, Simple Payback, ROI %, Straight-Line Depreciation, Discounted Payback, NPV, IRR (Newton-Raphson).
  - Real-time Budget check (Allocated vs Utilised, overrun warnings).
  - Unit tests for financial math.

- **Milestone 4: Vendor Quotation Comparison, Machine Matrix & PO Tracking**
  - Vendor directory with ratings, history.
  - Quotation upload & side-by-side comparison with customizable weights (Price, Warranty, Capacity, Power, Vendor Rating).
  - Machine Comparison View (2-4 machines side-by-side highlighting best values).
  - 1-click PO Generation from approved proposal + PO tracking lifecycle (Created -> Dispatched -> Delivered -> Invoiced -> Paid).

- **Milestone 5: Delivery/Commissioning, Asset Register & Maintenance/Warranty Alerts**
  - Delivery and 5-stage commissioning workflow (Delivery, Installation, Commissioning, Operator Training, Quality+Engineering signoff).
  - Auto-creation of Asset in Asset Register upon commissioning.
  - Preventive Maintenance scheduler (calendar & operating hours).
  - Warranty expiration monitoring & alert badges.

- **Milestone 6: 4M Change Management Module, Checklists & Staff Performance**
  - 4M Change Request (Man, Machine, Material, Method) with Risk Matrix (Severity x Probability).
  - Dynamic checklist assignment to technicians with due dates.
  - Completion verification and closure.
  - Staff Performance Dashboard: on-time completion %, overdue items by user and department.

- **Milestone 7: Management CAPEX Dashboard, Post-Investment Audits & Notification Center**
  - Executive CAPEX Dashboard with department filters, budget utilisation, delayed projects, spend breakdown, ROI analytics.
  - Post-Investment Audits at 3, 6, 12 months with actual vs projected savings charts (Recharts).
  - In-app Notification dropdown + Simulated Email Log view for full transparency.

- **Milestone 8: PDF Proposal Export, End-to-End Verification, Demo Walkthrough & README**
  - Executive proposal PDF generation endpoint/client download.
  - Complete testing of all user journeys (Employee, HOD, Finance, Management, Procurement).
  - README.md with architecture diagram, credentials table, and 5-minute hackathon judge demo script.
