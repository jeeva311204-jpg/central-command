# ChangeFlow Enterprise — Architecture, Data Model & Implementation Plan

## Executive Summary
**ChangeFlow Enterprise** is an Integrated 4M Change Management, CAPEX & Procurement Automation Platform engineered for industrial enterprises. It unifies machinery investment proposals, 4M changes (Man, Machine, Material, Method), dynamic threshold-based workflows, live financial modeling (NPV, IRR, Payback, ROI, Depreciation), vendor quotation comparisons with multi-factor scoring, asset lifecycle tracking, post-investment audit reviews, and complete audit logging into a single cohesive, auditable system.

---

## 1. System Architecture (MongoDB & Mongoose)

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
│ • Security Layer: express-mongo-sanitize, Zod NoSQL Injection Guards, Bcrypt    │
│ • Core Workflow Engine: Dynamic Stage Evaluator, Threshold Rules, Delegation,    │
│   SLA Escalation Engine, Version Control, ACID Transaction Management            │
│ • Financial Evaluation Service: Total Cost, Net Benefit, Simple Payback, ROI,    │
│   NPV, IRR (Newton-Raphson), Discounted Payback, Straight-Line Depreciation      │
│ • Procurement Service: Weighted Quotation Scoring, Best-Value Recommendation,    │
│   Purchase Order Lifecycle (Created -> Dispatched -> Delivered -> Invoiced)     │
│ • Asset Lifecycle Service: Commissioning -> Auto-Asset Registration -> Warranties │
│   & Preventive Maintenance Schedules                                             │
│ • Post-Investment Audit Engine: 3, 6, 12-Month Scheduled Reviews vs Projections  │
│ • Notification & Outbound Nodemailer / Fallback Email Dispatcher                 │
│ • Immutable Audit Logger (Mongoose Pre-Hooks blocking Update & Delete)           │
│ • PDF & Excel Generation Services: Dossier & Multi-Sheet Excel Registers         │
└──────────────────────────────────────┬───────────────────────────────────────────┘
                                       │ Mongoose ODM (Replica Set ACID Transactions)
┌──────────────────────────────────────▼───────────────────────────────────────────┐
│                      DATABASE: MongoDB Atlas / Local MongoDB                     │
│   25 Collections, Atomic Counters, Embedded Documents, Reference Population     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. MongoDB Data Model & Design Decisions

### A. Embedding vs Referencing Strategy
- **Embedded Subdocuments (bounded in size, tightly-coupled lifecycle)**:
  - `betterment` inside `Proposal` (production, financial, quality, manpower, safetyMaintenance sections)
  - `customFields` inside `Proposal` (type-specific dynamic form answers)
  - `stages` inside `WorkflowTemplate` (ordered approval steps with SLAs, thresholds, and conditions)
  - `formSchema` inside `ProposalType` (field definitions and required financial inputs)
  - `items` inside `ChecklistTemplate` (ordered checklist questions)
  - `riskAssessment` and `impactAreas` inside `Change4M`
- **Referenced Documents (shared across modules, unbounded growth, queryable independently)**:
  - `User`, `Department`, `Budget`, `Vendor`, `Quotation`, `PurchaseOrder`, `Delivery`, `Asset`, `MaintenanceSchedule`, `AuditReview`, `Task`, `ApprovalAction`, `AuditLog`, `ProposalVersion`, `Notification`, `SimulatedEmail`.
  - Stored with `ObjectId` references and populated dynamically via Mongoose virtuals.

### B. Integer Currency Enforcement
All currency figures (purchasePrice, installationCost, totalInvestment, annualSavings, budget amounts, etc.) are strictly stored as rounded integers (`set: (v) => Math.round(v)`) to eliminate floating-point arithmetic errors.

### C. Sequential Human-Readable Identifiers
An atomic counter collection (`Counter`) with `getNextSequence(name, session)` generates collision-free, monotonic identifiers:
- Proposals: `CF-2026-001`, `CF-2026-002`, ...
- 4M Changes: `CHG-2026-001`, `CHG-2026-002`, ...
- Purchase Orders: `PO-2026-001`, `PO-2026-002`, ...
- Assets: `AST-PROD-001`, `AST-ENG-002`, ...

### D. Optimistic Concurrency Control
`versionKey: '__v'` is maintained on `Proposal` and `WorkflowTemplate`. Approval action submissions verify the stage hasn't already advanced concurrently.

### E. Append-Only Immutability via Mongoose Hooks
`AuditLog` and `ProposalVersion` models register strict Mongoose pre-hooks (`updateOne`, `updateMany`, `findOneAndUpdate`, `deleteOne`, `deleteMany`, `findOneAndDelete`) throwing runtime errors if any code attempts to alter or purge historical audit records.

### F. Multi-Document ACID Transactions
Using `withTransaction(async (session) => { ... })`:
- Approval actions + stage progression + budget utilisation update + audit logging
- Purchase Order generation + Delivery creation + Vendor purchase history update + audit logging
- Delivery sign-off + Commissioning + Asset auto-registration + Maintenance schedule + Post-investment audits

---

## 3. Collections & Schema Indexing Reference

1. **User**: `{ email: 1 }` (unique), `{ roleName: 1 }`, `{ departmentId: 1 }`, soft delete (`isActive: true`).
2. **Department**: `{ code: 1 }` (unique), `{ isActive: 1 }`.
3. **Budget**: `{ departmentId: 1, fiscalYear: 1 }` (unique compound index).
4. **ProposalType**: `{ code: 1 }` (unique), `{ isActive: 1 }`.
5. **WorkflowTemplate**: `{ proposalTypeId: 1 }`, embedded `stages`.
6. **Proposal**: `{ proposalNumber: 1 }` (unique), `{ departmentId: 1, createdAt: -1 }`, `{ status: 1, currentStageId: 1 }`, `{ createdAt: -1 }`.
7. **ProposalVersion**: `{ proposalId: 1, versionNumber: -1 }`, append-only.
8. **ApprovalAction**: `{ proposalId: 1, createdAt: 1 }`.
9. **Delegation**: `{ delegateeId: 1, role: 1, isActive: 1, startDate: 1, endDate: 1 }`.
10. **ChecklistTemplate**: `{ category: 1 }`.
11. **Task**: `{ change4mId: 1 }`, `{ proposalId: 1 }`, `{ assignedToId: 1 }`, `{ status: 1 }`.
12. **Change4M**: `{ changeNumber: 1 }` (unique), `{ changeCategory: 1 }`, `{ status: 1 }`.
13. **Vendor**: `{ code: 1 }` (unique), `{ rating: -1 }`, `{ isActive: 1 }`.
14. **Quotation**: `{ proposalId: 1, weightedScore: -1 }`, `{ vendorId: 1 }`.
15. **PurchaseOrder**: `{ poNumber: 1 }` (unique), `{ status: 1 }`, `{ proposalId: 1 }`.
16. **Delivery**: `{ purchaseOrderId: 1 }` (unique), `{ status: 1 }`.
17. **Asset**: `{ assetCode: 1 }` (unique), `{ warrantyExpiryDate: 1 }`, `{ departmentId: 1 }`.
18. **MaintenanceSchedule**: `{ assetId: 1, nextDueDate: 1 }`, `{ status: 1 }`.
19. **AuditReview**: `{ proposalId: 1, intervalMonths: 1 }`, `{ assetId: 1 }`.
20. **DocumentModel**: `{ proposalId: 1 }`, `{ entityType: 1 }`.
21. **Notification**: `{ userId: 1, isRead: 1, createdAt: -1 }`.
22. **SimulatedEmail**: `{ toEmail: 1, sentAt: -1 }`, `{ category: 1 }`.
23. **AuditLog**: `{ entityId: 1, timestamp: -1 }`, `{ entityType: 1 }`, append-only.
24. **Role**: `{ name: 1 }` (unique).
25. **Counter**: `{ name: 1 }` (unique).
