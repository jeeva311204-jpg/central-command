# ChangeFlow Enterprise
### Integrated 4M Change Management, CAPEX & Procurement Automation Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-000000.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Mongoose-47A248.svg)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-10%2F10%20Passing-success.svg)]()

---

## 🏗️ Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND: React + Vite + TypeScript                      │
│   Tailwind CSS  │  Recharts  │  Lucide Icons  │  React Router  │  Context State  │
├──────────────────────────────────────────────────────────────────────────────────┤
│ • Role-Based Dashboards (Employee / Approver / Management CAPEX Command Center)  │
│ • Proposal Engine (14 types, Full Machine Purchase & Replacement Wizards)        │
│ • Live Financial Modeling (DCF, NPV, IRR, Payback, ROI, Budget Overrun Alerts)   │
│ • 4M Change Management & 5×5 Interactive Severity×Probability Risk Matrix        │
│ • Visual Dynamic Workflow Pipeline & Admin-Editable Threshold Matrix             │
│ • Multi-Vendor Quotation Evaluation & Machine Comparison Matrix (Row Highlights) │
│ • 5-Step Commissioning Pipeline → Auto-Registration in Asset Register            │
│ • Post-Investment 3/6/12 Month Audits & Staff Performance Metrics                │
│ • Notification Center & Simulated Email Dispatch Log & Immutable Audit Trail     │
└──────────────────────────────────────┬───────────────────────────────────────────┘
                                       │ HTTP / REST APIs + JWT Auth
┌──────────────────────────────────────▼───────────────────────────────────────────┐
│                       BACKEND: Node.js + Express + TypeScript                    │
├──────────────────────────────────────────────────────────────────────────────────┤
│ • RBAC Middleware (9 Roles) & Multer File Uploads (Type & Size Validation)       │
│ • Security Layer: express-mongo-sanitize & Zod NoSQL Injection Guards            │
│ • Core Workflow Engine: Threshold Rules (≤₹1L, ₹1L-₹10L, >₹10L), Delegation,     │
│   SLA Escalation Engine & Revision Snapshot Versioning                           │
│ • Multi-Document ACID Transactions (session.withTransaction): Approvals, POs,   │
│   Asset Auto-Registration & Commissioning                                        │
│ • Financial Evaluation Service: Total Cost, Net Benefit, Simple Payback, ROI,    │
│   NPV, IRR (Newton-Raphson), Discounted Payback, Straight-Line Depreciation      │
│ • Procurement Service: Weighted Quotation Scoring, Best-Value Recommendation,    │
│   PO Lifecycle (Created → Dispatched → Delivered → Invoiced → Paid)              │
│ • Asset Lifecycle Service: Auto-Asset Creation → Warranty Expiration Reminders    │
│   & Preventive Maintenance Schedules (Calendar / Operating Hours)                │
│ • Post-Investment Audit Engine: 3, 6, 12-Month Variance Tracking vs Targets      │
│ • Notification & Nodemailer / Simulated Email Dispatcher                         │
│ • Immutable Audit Logger (Mongoose Pre-Hooks blocking Update & Delete)           │
│ • PDF & Excel Generation Services: Dossiers & Multi-Sheet Excel Workbooks        │
└──────────────────────────────────────┬───────────────────────────────────────────┘
                                       │ Mongoose ODM
┌──────────────────────────────────────▼───────────────────────────────────────────┐
│              DATABASE: MongoDB Atlas (Replica Set / Multi-Document ACID)         │
│   25 Collections: User, Role, Department, Budget, Proposal, ProposalVersion,     │
│   WorkflowTemplate, ApprovalAction, Delegation, ChecklistTemplate, Task,         │
│   Change4M, Vendor, Quotation, PurchaseOrder, Delivery, Asset,                   │
│   MaintenanceSchedule, AuditReview, DocumentModel, Notification, SimulatedEmail, │
│   AuditLog, Counter                                                              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start (Single Command)

### Prerequisites
- Node.js >= 18
- npm >= 9
- A running MongoDB instance (Local MongoDB or MongoDB Atlas)

### 1. Environment Configuration
Create a `.env` file in the project root (or inside `server/`):
```bash
cp .env.example .env
```
Set your `MONGODB_URI`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=changeflow-enterprise-hackathon-jwt-secret-key-2026-secure!
MONGODB_URI=mongodb://127.0.0.1:27017/changeflow
SLA_CRON_SCHEDULE=0 * * * *
```

#### Using MongoDB Atlas (Free Tier):
1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0 Sandbox** cluster (comes with automatic replica set support for multi-document ACID transactions).
3. Under **Security → Network Access**, add `0.0.0.0/0` (Allow Access from Anywhere) or your server IP.
4. Under **Security → Database Access**, create a user with read/write privileges.
5. Click **Connect → Drivers** and copy the connection string into `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/changeflow?retryWrites=true&w=majority
   ```

### 2. Run the Platform
```bash
# Concurrently starts both backend API (port 5000) and frontend (port 5173)
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 👥 Demo Logins & Roles

> **Password for all demo accounts:** `ChangeFlow2026!`  
> *(Note: The top navigation bar includes an **Instant 1-Click Demo Persona Switcher** dropdown for effortless judging during live presentations!)*

| Persona | Role | Department | Email | Focus & Privileges |
| :--- | :--- | :--- | :--- | :--- |
| **Aditya Birla** | **Management** | Production | `director@changeflow.com` | Executive CAPEX Dashboard, Sanction proposals > ₹10L |
| **Rajesh Sharma** | **HOD** | Production | `hod.prod@changeflow.com` | Departmental budget owner, HOD stage approvals |
| **Ananya Verma** | **Engineer** | Engineering | `eng.tooling@changeflow.com` | Technical & tooling evaluations, CPK verification |
| **Vikram Patel** | **Finance** | Production | `finance.lead@changeflow.com` | Financial viability signoff, IRR/NPV & budget audit |
| **Meera Iyer** | **Procurement** | Logistics | `procure.head@changeflow.com` | Vendor quotation scoring, recommended quotes, PO issue |
| **Suresh Nair** | **Quality** | Quality Assurance | `qa.lead@changeflow.com` | 4M change inspection, FAT & metrology verification |
| **Manoj Kumar** | **Maintenance** | Plant Maintenance | `maint.lead@changeflow.com` | Asset register, warranty expirations, preventive maintenance |
| **Rahul Singh** | **Employee** | Production | `operator1@changeflow.com` | Raise CAPEX proposals, submit 4M change requests |
| **System Admin** | **Admin** | Engineering | `admin@changeflow.com` | Full platform administration, threshold editor, user delegation |

---

## 🚀 Deployment Guide

### Option 1: Docker & Docker Compose (Zero-Setup)
Spin up MongoDB with replica set + ChangeFlow Enterprise in one command:

```bash
# 1. Build and start containers
docker compose up -d --build

# 2. View logs
docker compose logs -f

# 3. Access platform
# Web & API are live at http://localhost:5000
```

### Option 2: Cloud Deployment (Render / Railway)
- **Render**: Connect your GitHub repository. Set `NODE_ENV=production`, `MONGODB_URI` (Atlas connection string), and `JWT_SECRET`. Render builds and runs the containerized app.
- **Railway**: Connect repository. Attach a MongoDB plugin or provide Atlas `MONGODB_URI`. Deploy with one click.

---

## 🧪 Automated Test Suite

```bash
npm test
```

### Test Coverage Highlights:
1. **Financial Modeling Engine (`src/tests/financial.test.ts`)**: Total investment, net annual benefit, simple & discounted payback, ROI %, straight-line depreciation, NPV, IRR via Newton-Raphson approximation, and budget overrun warnings.
2. **Workflow Engine (`src/tests/workflow.test.ts`)**: Dynamic threshold routing (≤ ₹1L HOD only, ₹1L–₹10L HOD+Engineer+Finance, > ₹10L adding Procurement+Management).
3. **Workflow-as-Data (`src/tests/workflowAsData.test.ts`)**: Dynamic modification of threshold rules in MongoDB database without code changes.
4. **SLA Escalations (`src/tests/slaEscalation.test.ts`)**: Automatic escalation of overdue review requests.
5. **Audit Trail Immutability (`src/tests/auditIntegrity.test.ts`)**: Verifies Mongoose pre-hooks strictly block updates and deletions on `AuditLog` and `ProposalVersion`.
6. **Role-Based Authorization (`src/tests/authorization.test.ts`)**: Proves endpoints return 403 Forbidden on unauthorized roles; role spoofing via request headers or body is blocked.
7. **Edge Cases (`src/tests/edgeCases.test.ts`)**: Revision snapshots & resubmission, rejection at each stage, delegation expiration, budget overrun blocks, and concurrent approval race condition protection.
8. **Security & NoSQL Injection Protection (`src/tests/security.test.ts`)**: Bcrypt password hashing, Zod validation, `express-mongo-sanitize` blocking `{"$ne": null}` operator injections, and upload extension filtering.
9. **Email Notifications (`src/tests/emailNotification.test.ts`)**: Nodemailer SMTP dispatch with graceful fallback to persistent `SimulatedEmail` collection.
10. **Excel Workbook Exports (`src/tests/excelExport.test.ts`)**: Multi-sheet workbook verification for CAPEX Dashboard and 16-column Proposals Register.

---

## 🔒 Security & Data Integrity
- **ACID Transactions**: Multi-document atomic transactions ensure consistency across approvals, budgets, POs, and asset creation.
- **Integer Currency**: Currency figures are rounded and stored as whole numbers in the smallest currency unit to prevent floating-point anomalies.
- **Append-Only Auditing**: Mongoose middleware pre-hooks reject updates and deletions on historical logs.
- **NoSQL Injection Sanitization**: Sanitization middleware + strict Zod schema validation.

---

## 📄 License
MIT License. Built for the Hackathon by senior full-stack engineering team.
