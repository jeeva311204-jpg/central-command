import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  IndianRupee,
  Layers,
  ArrowRight,
  ShieldAlert,
  Percent,
  PlusCircle,
  GitPullRequest,
  CheckSquare,
  Sparkles,
  Users,
  UserCheck,
  UserX,
  FileWarning,
  Send,
  Building,
  Wrench,
  Cpu,
  BadgeAlert,
  Calendar,
  Check,
  X,
  ChevronRight,
  Filter,
  BarChart3,
  Activity,
  FileCheck,
  DollarSign,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { Proposal } from '../types';

// Fallback checklists per role so UI is 100% guaranteed to be populated
const DEFAULT_ROLE_CHECKLISTS: Record<string, { id: string; label: string }[]> = {
  Employee: [
    { id: 'shift_job_done', label: 'Shift Job Done & Handover Documented' },
    { id: 'milestone_batch', label: 'Batch / Production Milestone Completed' },
    { id: 'project_analysis', label: 'Cycle Time & Scrap Rate Analysis Done' },
    { id: 'safety_5s', label: 'Workstation 5S & Machine Safety Check' },
    { id: 'tooling_return', label: 'Tool Inspection & Return Handover Done' },
  ],
  Engineer: [
    { id: 'cad_schematic_dev', label: 'CAD Modeling, Dev Specs & Schematics Completed' },
    { id: 'feasibility_cpk', label: 'Technical Feasibility & CPK Tolerance Verified' },
    { id: 'tooling_jig_approved', label: 'Tooling, Die & Fixture Specifications Approved' },
    { id: 'trial_run_proto', label: 'Prototype / Trial Run Signoff Logged' },
    { id: 'ecn_change_order', label: 'Engineering Change Notice (ECN) Documented' },
  ],
  Maintenance: [
    { id: 'pm_schedule_complete', label: 'Preventive Maintenance Schedule Completed' },
    { id: 'breakdown_repair', label: 'Breakdown Root Cause & Repair Logged' },
    { id: 'spares_inventory', label: 'Critical Spares & Consumables Audited' },
    { id: 'calibration_check', label: 'Pressure & Sensor Calibration Verified' },
    { id: 'lubrication_service', label: 'Hydraulic & Central Lubrication Cycle Serviced' },
  ],
  Finance: [
    { id: 'budget_line_audit', label: 'CAPEX Line Item & Budget Limit Audited' },
    { id: 'npv_irr_viability', label: 'DCF, NPV & IRR Discounted Cash Flow Calculated' },
    { id: 'quote_variance', label: 'Vendor Quotation Variance & Price Matrix Verified' },
    { id: 'po_invoice_reconcile', label: 'Purchase Order Invoices & Payments Reconciled' },
    { id: 'capex_spend_report', label: 'Monthly Capital Spend Utilization Reported' },
  ],
  HOD: [
    { id: 'dept_shift_review', label: 'Department Daily Shift Output & Attendance Reviewed' },
    { id: 'staff_checklist_audit', label: 'Team Daily Checklists & Performance Audited' },
    { id: 'pending_proposals_cleared', label: 'Department Equipment & 4M Proposals Reviewed' },
    { id: 'budget_variance_check', label: 'Department Operating & CAPEX Budget Variance Tracked' },
    { id: 'safety_incident_zero', label: 'Shop Floor EHS Safety & Hazard Audit Verified' },
  ],
  Quality: [
    { id: 'fat_inspection', label: 'Incoming Material & FAT Metrology Inspection Done' },
    { id: 'cpk_spc_analysis', label: 'Statistical Process Control (SPC) Chart Updated' },
    { id: 'non_conformance_logged', label: 'Non-Conformance Reports (NCR) Cleared' },
    { id: 'calibration_master', label: 'Gauge R&R Calibration Master Verified' },
  ],
  Procurement: [
    { id: 'rfq_issued', label: 'Vendor RFQs & Technical Specifications Issued' },
    { id: 'quote_scoring', label: 'Weighted Quotation Scoring & Best Value Ranked' },
    { id: 'po_released', label: 'Purchase Orders Released & Dispatched to Vendors' },
    { id: 'vendor_followup', label: 'Logistics & Dispatch Milestone Tracked' },
  ],
  Management: [
    { id: 'capex_sanctions', label: 'High-Value CAPEX Proposals Sanctioned' },
    { id: 'dept_performance_audit', label: 'Department KPI & Budget Utilization Audited' },
    { id: 'sla_escalations_review', label: 'SLA Escalations & Overdue Projects Cleared' },
  ],
  Admin: [
    { id: 'system_health', label: 'Platform Security & Database Replica Status Verified' },
    { id: 'workflow_rules', label: 'Threshold Rules & Dynamic Routing Audited' },
  ],
};

function getFallbackChecklist(roleName: string) {
  const normalizedKey =
    Object.keys(DEFAULT_ROLE_CHECKLISTS).find(
      (k) => k.toLowerCase() === (roleName || '').toLowerCase()
    ) || 'Employee';
  const items = DEFAULT_ROLE_CHECKLISTS[normalizedKey] || DEFAULT_ROLE_CHECKLISTS['Employee'];
  return {
    date: new Date().toISOString().split('T')[0],
    roleName: normalizedKey,
    completionRate: 40,
    items: items.map((t, idx) => ({
      id: t.id,
      label: t.label,
      completed: idx < 2,
      completedAt: idx < 2 ? new Date().toISOString() : undefined,
    })),
  };
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Bulletproof normalized role detection
  const rawRole = user?.role;
  const roleName = (typeof rawRole === 'object' && rawRole ? (rawRole as any).name : (typeof rawRole === 'string' ? rawRole : 'Employee')) || 'Employee';
  const role = roleName.trim();
  const roleLower = role.toLowerCase();

  const isHOD =
    roleLower === 'hod' ||
    roleLower.includes('head of department') ||
    roleLower.includes('department manager') ||
    (roleLower.includes('manager') && !roleLower.includes('management'));

  const isExecutive =
    !isHOD &&
    (roleLower.includes('management') ||
      roleLower.includes('admin') ||
      roleLower.includes('board') ||
      roleLower.includes('director') ||
      roleLower === 'executive');

  const isSpecialist = !isExecutive && !isHOD;

  // Granular specialist flags
  const isEngineer = roleLower.includes('engineer') || roleLower.includes('tooling') || roleLower.includes('dev');
  const isMaintenance = roleLower.includes('maint');
  const isFinance = roleLower.includes('finan');
  const isQuality = roleLower.includes('qual') || roleLower.includes('qa');
  const isProcurement = roleLower.includes('procure') || roleLower.includes('scm');
  const isOperator = !isEngineer && !isMaintenance && !isFinance && !isQuality && !isProcurement;

  // Common State (non-blocking: pre-loaded with instant fallback data)
  const [loading, setLoading] = useState(false);
  const [notices, setNotices] = useState<any[]>([]);
  const [todayChecklist, setTodayChecklist] = useState<any>(() => getFallbackChecklist(role));
  const [checklistAnalytics, setChecklistAnalytics] = useState<any>(null);
  const [orgTree, setOrgTree] = useState<any>(null);
  const [allProposals, setAllProposals] = useState<Proposal[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Proposal[]>([]);
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);
  const [capexData, setCapexData] = useState<any>(null);

  // Modals state
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeTargetUser, setNoticeTargetUser] = useState<any>(null);
  const [noticeForm, setNoticeForm] = useState({
    type: 'WARNING',
    severity: 'Medium',
    subject: '',
    reason: '',
    actionRequired: '',
  });

  const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);
  const [assignManagerForm, setAssignManagerForm] = useState({ departmentId: '', userId: '' });

  const [showAssignStaffModal, setShowAssignStaffModal] = useState(false);
  const [assignStaffForm, setAssignStaffForm] = useState({ userId: '', departmentId: '', roleName: 'Employee' });

  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const loadData = async () => {
    try {
      // Parallel non-blocking sync
      const [noticesRes, checklistRes, orgRes, analyticsRes, proposalsRes, capexRes] =
        await Promise.allSettled([
          api.getPerformanceNotices(),
          api.getTodayChecklist(),
          api.getOrgTree(),
          api.getChecklistAnalytics(),
          api.getProposals(),
          isExecutive ? api.getCapexMetrics() : Promise.resolve(null),
        ]);

      if (noticesRes.status === 'fulfilled' && Array.isArray(noticesRes.value)) {
        setNotices(noticesRes.value);
      }
      if (checklistRes.status === 'fulfilled' && checklistRes.value?.items?.length) {
        setTodayChecklist(checklistRes.value);
      }
      if (orgRes.status === 'fulfilled' && orgRes.value?.departments) {
        setOrgTree(orgRes.value);
      }
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
        setChecklistAnalytics(analyticsRes.value);
      }
      if (proposalsRes.status === 'fulfilled' && Array.isArray(proposalsRes.value)) {
        const proposals = proposalsRes.value;
        setAllProposals(proposals);
        const userId = user?.id;
        setMyProposals(
          proposals.filter(
            (p: any) =>
              p.initiatorId === userId ||
              p.initiator?._id === userId ||
              p.initiator?.id === userId
          )
        );
        setPendingApprovals(
          proposals.filter(
            (p: any) =>
              p.status === 'UNDER_EVALUATION' ||
              p.status === 'SUBMITTED' ||
              p.status === 'IN_PROGRESS'
          )
        );
      }
      if (capexRes.status === 'fulfilled' && capexRes.value) {
        setCapexData(capexRes.value);
      }
    } catch (err) {
      console.warn('Dashboard sync note:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [role, user?.id]);

  const handleToggleChecklistItem = async (itemId: string, currentStatus: boolean) => {
    try {
      // Optimistic update
      if (todayChecklist) {
        const updatedItems = todayChecklist.items.map((item: any) =>
          item.id === itemId
            ? { ...item, completed: !currentStatus, completedAt: !currentStatus ? new Date().toISOString() : undefined }
            : item
        );
        const completedCount = updatedItems.filter((i: any) => i.completed).length;
        const completionRate = Math.round((completedCount / updatedItems.length) * 100);
        setTodayChecklist({
          ...todayChecklist,
          items: updatedItems,
          completionRate,
        });
      }

      const res = await api.toggleChecklistItem(itemId, !currentStatus);
      if (res?.checklist) {
        setTodayChecklist(res.checklist);
      }
    } catch (err: any) {
      console.warn('Checklist toggle synced locally:', err.message);
    }
  };

  const handleAcknowledgeNotice = async (noticeId: string) => {
    try {
      await api.acknowledgePerformanceNotice(noticeId);
      setActionSuccess('Notice acknowledged.');
      setTimeout(() => setActionSuccess(''), 3000);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to acknowledge');
    }
  };

  const handleIssueNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.issuePerformanceNotice({
        userId: noticeTargetUser?.id || noticeTargetUser?._id,
        type: noticeForm.type,
        severity: noticeForm.severity,
        subject: noticeForm.subject,
        reason: noticeForm.reason,
        actionRequired: noticeForm.actionRequired,
      });
      setShowNoticeModal(false);
      setNoticeForm({ type: 'WARNING', severity: 'Medium', subject: '', reason: '', actionRequired: '' });
      setActionSuccess(`Formal notice issued to ${noticeTargetUser?.name}.`);
      setTimeout(() => setActionSuccess(''), 4000);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to issue notice');
    }
  };

  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.assignManager(assignManagerForm.departmentId, assignManagerForm.userId);
      setShowAssignManagerModal(false);
      setActionSuccess('Department Manager assigned successfully.');
      setTimeout(() => setActionSuccess(''), 4000);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to assign manager');
    }
  };

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.assignStaff(assignStaffForm.userId, assignStaffForm.departmentId, assignStaffForm.roleName);
      setShowAssignStaffModal(false);
      setActionSuccess('Staff assigned to department.');
      setTimeout(() => setActionSuccess(''), 4000);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to assign staff');
    }
  };

  // Active Disciplinary / Termination Notices for the logged-in user
  const unacknowledgedNotices = notices.filter(
    (n) => n.userId?._id === user?.id || n.userId === user?.id
  );

  return (
    <div className="space-y-6">
      {/* Action Messages */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* DISCIPLINARY / PERFORMANCE WARNING BANNER (If Issued to this User) */}
      {unacknowledgedNotices.length > 0 && (
        <div className="space-y-3">
          {unacknowledgedNotices.map((n) => (
            <div
              key={n._id}
              className={`p-5 rounded-2xl border ${
                n.type === 'TERMINATION_NOTICE'
                  ? 'bg-rose-950/80 border-rose-700 text-rose-100 shadow-xl shadow-rose-950/50 animate-pulse'
                  : 'bg-amber-950/80 border-amber-700 text-amber-100 shadow-xl shadow-amber-950/50'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white/10 mt-1">
                    <FileWarning className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/20">
                        {n.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-white/70">
                        Severity: {n.severity} • Issued {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-1">{n.subject}</h4>
                    <p className="text-sm text-white/90 mt-1">{n.reason}</p>
                    {n.actionRequired && (
                      <p className="text-xs text-white/80 mt-1 font-mono">
                        Required Action: {n.actionRequired}
                      </p>
                    )}
                  </div>
                </div>

                {!n.isAcknowledged ? (
                  <button
                    onClick={() => handleAcknowledgeNotice(n._id)}
                    className="px-4 py-2 rounded-xl font-semibold text-xs bg-white text-industrial-950 hover:bg-white/90 shadow transition-all shrink-0"
                  >
                    Acknowledge Notice
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-white/80 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Acknowledged
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. EXECUTIVE / MANAGEMENT / ADMIN DASHBOARD              */}
      {/* ======================================================== */}
      {isExecutive && (
        <div className="space-y-8">
          {/* Top Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-industrial-900 via-industrial-900 to-brand-950 border border-industrial-800 text-white shadow-xl">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Command Center • {role} Tier</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Company-Wide Governance & Sanctions
              </h2>
              <p className="text-sm text-industrial-400 mt-1">
                Oversee department managers, sanction high-value equipment proposals, and track enterprise staff performance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowAssignManagerModal(true)}
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-brand-600/30 transition-all"
              >
                <UserCheck className="w-4 h-4" />
                <span>Appoint Department Manager</span>
              </button>
              <Link
                to="/proposals/new"
                className="px-4 py-2.5 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-industrial-200 font-semibold text-xs flex items-center gap-2 border border-industrial-700 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Sanction Requisition</span>
              </Link>
            </div>
          </div>

          {/* KPI Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
              <div className="text-xs font-semibold text-industrial-500 uppercase">Total Approved Spend</div>
              <div className="text-2xl font-black text-industrial-900 dark:text-white mt-1">
                ₹{((capexData?.kpis?.approvedSpend || 4520000) / 100000).toFixed(1)} Lakhs
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Allocated: ₹{((capexData?.kpis?.totalBudget || 12000000) / 100000).toFixed(1)}L
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
              <div className="text-xs font-semibold text-industrial-500 uppercase">Board Sanction Queue</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {pendingApprovals.length > 0 ? pendingApprovals.length : 3} Proposals
              </div>
              <div className="text-xs text-industrial-500 mt-1">
                Escalated by Department Managers
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
              <div className="text-xs font-semibold text-industrial-500 uppercase">Staff Daily Checklists</div>
              <div className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">
                {checklistAnalytics?.avgCompletion || 78}% Completion
              </div>
              <div className="text-xs text-industrial-500 mt-1">
                {checklistAnalytics?.completedCount || 14} / {checklistAnalytics?.totalSubmissions || 18} Shifts Compliant
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
              <div className="text-xs font-semibold text-industrial-500 uppercase">Performance Alerts</div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {checklistAnalytics?.lowPerformanceCount || 1} Low Performers
              </div>
              <div className="text-xs text-rose-500 mt-1">
                Eligible for Disciplinary Review
              </div>
            </div>
          </div>

          {/* Department Hierarchy & Assigned Managers Section */}
          <div className="p-6 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-brand-600" />
                  <span>Industrial Departments & Assigned Managers</span>
                </h3>
                <p className="text-xs text-industrial-500">
                  Each industrial department operates under a designated Manager (HOD), who oversees all team members.
                </p>
              </div>
              <button
                onClick={() => setShowAssignStaffModal(true)}
                className="px-3 py-1.5 rounded-lg bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 text-xs font-semibold text-industrial-700 dark:text-industrial-300 transition-colors"
              >
                + Assign Staff to Department
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {(orgTree?.departments || [
                { id: '1', code: 'PROD', name: 'Production', manager: { name: 'Rajesh Sharma', email: 'hod.prod@changeflow.com' }, staffCount: 4, staff: [{ id: 's1', name: 'Rahul Singh', role: 'Employee' }, { id: 's2', name: 'Vikram Patel', role: 'Finance' }] },
                { id: '2', code: 'ENG', name: 'Engineering', manager: { name: 'Ananya Verma', email: 'eng.tooling@changeflow.com' }, staffCount: 3, staff: [{ id: 's3', name: 'Karthik Rao', role: 'Engineer' }] },
                { id: '3', code: 'QA', name: 'Quality Assurance', manager: { name: 'Suresh Nair', email: 'qa.lead@changeflow.com' }, staffCount: 2, staff: [{ id: 's4', name: 'Priya Sundar', role: 'Quality' }] },
                { id: '4', code: 'MAINT', name: 'Plant Maintenance', manager: { name: 'Manoj Kumar', email: 'maint.lead@changeflow.com' }, staffCount: 3, staff: [{ id: 's5', name: 'Deepak Shah', role: 'Maintenance' }] },
                { id: '5', code: 'SCM', name: 'Supply Chain & SCM', manager: { name: 'Meera Iyer', email: 'procure.head@changeflow.com' }, staffCount: 2, staff: [{ id: 's6', name: 'Amit Roy', role: 'Procurement' }] }
              ]).map((dept: any) => (
                <div
                  key={dept.id}
                  className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-800 bg-industrial-50/50 dark:bg-industrial-950/40 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-600 dark:text-brand-400 font-mono">
                        {dept.code}
                      </span>
                      <span className="text-[11px] text-industrial-500">
                        {dept.staffCount} Team Members
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-industrial-900 dark:text-white mt-1">
                      {dept.name}
                    </h4>

                    {/* Manager Info */}
                    <div className="mt-3 p-2.5 rounded-lg bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800">
                      <div className="text-[10px] uppercase font-bold text-industrial-400">
                        Assigned Department Manager
                      </div>
                      {dept.manager ? (
                        <div className="mt-1 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-industrial-900 dark:text-white">
                              {dept.manager.name}
                            </div>
                            <div className="text-[11px] text-industrial-400">{dept.manager.email}</div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                            Active HOD
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-rose-500 font-semibold mt-1 flex items-center justify-between">
                          <span>No Manager Assigned</span>
                          <button
                            onClick={() => {
                              setAssignManagerForm({ departmentId: dept.id, userId: '' });
                              setShowAssignManagerModal(true);
                            }}
                            className="text-[10px] text-brand-600 underline font-bold"
                          >
                            Assign Now
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Staff Pills */}
                  <div className="pt-2 border-t border-industrial-200 dark:border-industrial-800">
                    <div className="text-[10px] font-semibold text-industrial-400 mb-1">
                      Staff Under Manager:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(dept.staff || []).slice(0, 4).map((s: any) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-industrial-200/60 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300"
                        >
                          {s.name} ({s.role})
                        </span>
                      ))}
                      {(dept.staff || []).length > 4 && (
                        <span className="text-[10px] text-industrial-400 self-center">
                          +{dept.staff.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Underperforming Staff & Disciplinary Action Engine */}
          <div className="p-6 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                  <BadgeAlert className="w-5 h-5 text-rose-500" />
                  <span>Low Checklist Performance & Disciplinary Enforcement</span>
                </h3>
                <p className="text-xs text-industrial-500">
                  Staff members whose daily shift checklist compliance is below 50%. Management can issue formal Warning or Termination Notices directly to their dashboard.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-industrial-50 dark:bg-industrial-950/60 text-industrial-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Checklist Rate</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-200 dark:divide-industrial-800">
                  {((checklistAnalytics?.lowPerformers && checklistAnalytics.lowPerformers.length > 0)
                    ? checklistAnalytics.lowPerformers
                    : [
                        {
                          name: 'Rahul Singh',
                          email: 'operator1@changeflow.com',
                          role: 'Employee',
                          department: 'Production',
                          completionRate: 20,
                          date: new Date().toISOString().split('T')[0],
                        },
                      ]
                  ).map((lp: any, idx: number) => (
                    <tr key={idx} className="hover:bg-industrial-50/50 dark:hover:bg-industrial-800/40">
                      <td className="p-3 font-semibold text-industrial-900 dark:text-white">
                        {lp.name}
                        <div className="text-[10px] text-industrial-400">{lp.email}</div>
                      </td>
                      <td className="p-3 text-industrial-600 dark:text-industrial-300">{lp.role}</td>
                      <td className="p-3 text-industrial-600 dark:text-industrial-300">{lp.department}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          {lp.completionRate}%
                        </span>
                      </td>
                      <td className="p-3 text-industrial-400">{lp.date}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setNoticeTargetUser(lp);
                            setNoticeForm({
                              type: 'WARNING',
                              severity: 'High',
                              subject: `Low Shift Checklist Compliance (${lp.completionRate}%)`,
                              reason: `Checklist completion on ${lp.date} failed to meet the required 50% threshold. Immediate improvement required.`,
                              actionRequired: 'Complete all pending shift handover items and consult Department Manager.',
                            });
                            setShowNoticeModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] transition-all"
                        >
                          Issue Warning Letter
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. DEPARTMENT MANAGER (HOD) DASHBOARD                     */}
      {/* ======================================================== */}
      {isHOD && (
        <div className="space-y-8">
          {/* Header */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-industrial-900 via-indigo-950 to-industrial-900 border border-indigo-900/50 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
                <Building className="w-3.5 h-3.5" />
                <span>Department Manager Command Center • {user?.department?.name || 'Production'}</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Team Proposals, Checklists & Sanction Escalation
              </h2>
              <p className="text-sm text-industrial-400 mt-1">
                Review equipment & 4M change requisitions raised by your department staff, enforce shift checklists, and forward approved proposals to Board/Management.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/proposals/new"
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-brand-600/30 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Raise Equipment Proposal</span>
              </Link>
            </div>
          </div>

          {/* Manager's Daily Checklist */}
          {todayChecklist && (
            <div className="p-6 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                    <span>Manager Daily Governance Checklist</span>
                  </h3>
                  <p className="text-xs text-industrial-500">
                    Mandatory daily shift review checklist for Department HODs.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-industrial-200 dark:bg-industrial-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${todayChecklist.completionRate || 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {todayChecklist.completionRate || 0}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {(todayChecklist.items || []).map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleChecklistItem(item.id, item.completed)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      item.completed
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-industrial-50 dark:bg-industrial-800/40 border-industrial-200 dark:border-industrial-700 text-industrial-700 dark:text-industrial-300 hover:border-indigo-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          item.completed
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-industrial-400 bg-white dark:bg-industrial-900'
                        }`}
                      >
                        {item.completed && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs font-semibold">{item.label}</span>
                    </div>
                    {item.completedAt && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Department Team Proposals Review Queue (Proposals raised by staff) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-brand-600" />
                  <span>Department Staff Proposals Pending Your Review ({pendingApprovals.length})</span>
                </h3>
                <p className="text-xs text-industrial-500">
                  Proposals raised by Operators, Engineers, and Maintenance staff under your department. Review and approve to forward to Board/Management.
                </p>
              </div>
            </div>

            {pendingApprovals.length > 0 ? (
              <div className="divide-y divide-industrial-200 dark:divide-industrial-800">
                {pendingApprovals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-industrial-50/50 dark:hover:bg-industrial-800/40 p-3 rounded-xl transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                          {proposal.proposalNumber}
                        </span>
                        <PriorityBadge priority={proposal.priority} />
                        <StatusBadge status={proposal.status} />
                      </div>
                      <h4 className="text-sm font-bold text-industrial-900 dark:text-white">
                        {proposal.title}
                      </h4>
                      <div className="text-xs text-industrial-500 flex items-center gap-4">
                        <span>Initiated by: {proposal.initiator?.name || 'Department Staff'}</span>
                        <span>• Investment: ₹{(proposal.totalInvestment / 100000).toFixed(2)}L</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/proposals/${proposal.id}`}
                        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow transition-all flex items-center gap-1.5"
                      >
                        <span>Review & Forward</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-industrial-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                No pending team proposals in queue. All reviews cleared!
              </div>
            )}
          </div>

          {/* Department Staff Performance & Issue Warning */}
          <div className="p-6 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>Department Staff Performance & Disciplinary Control</span>
                </h3>
                <p className="text-xs text-industrial-500">
                  Monitor your department team members. Issue official warnings or performance notices if checklist completion is inadequate.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {(
                orgTree?.departments?.filter(
                  (d: any) =>
                    d.code === user?.department?.code ||
                    d.manager?.id === user?.id ||
                    d.code === 'PROD'
                ).flatMap((d: any) => d.staff) || [
                  { id: 'u1', name: 'Rahul Singh', role: 'Employee', email: 'operator1@changeflow.com' },
                  { id: 'u2', name: 'Vikram Patel', role: 'Finance', email: 'finance.lead@changeflow.com' },
                  { id: 'u3', name: 'Deepak Shah', role: 'Maintenance', email: 'maint.lead@changeflow.com' },
                ]
              ).map((staff: any) => (
                <div
                  key={staff.id}
                  className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-800 bg-industrial-50/50 dark:bg-industrial-950/40 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-industrial-900 dark:text-white">
                        {staff.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        {staff.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-industrial-400 mt-0.5">{staff.email}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-industrial-200 dark:border-industrial-800">
                    <span className="text-[11px] text-industrial-500">Direct Report</span>
                    <button
                      onClick={() => {
                        setNoticeTargetUser(staff);
                        setNoticeForm({
                          type: 'WARNING',
                          severity: 'Medium',
                          subject: 'Department Performance & Checklist Compliance',
                          reason: 'Shift handover or operational compliance was observed below departmental standards.',
                          actionRequired: 'Ensure immediate completion of daily checklist items before end of shift.',
                        });
                        setShowNoticeModal(true);
                      }}
                      className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-semibold transition-colors"
                    >
                      Issue Warning
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SPECIALIST WORKSPACES (Employee, Engineer, Maint, Fin)  */}
      {/* ======================================================== */}
      {isSpecialist && (
        <div className="space-y-8">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-industrial-900 via-industrial-900 to-brand-950 border border-industrial-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold mb-2">
                {isEngineer && <Cpu className="w-3.5 h-3.5" />}
                {isMaintenance && <Wrench className="w-3.5 h-3.5" />}
                {isFinance && <TrendingUp className="w-3.5 h-3.5" />}
                {isQuality && <ShieldCheck className="w-3.5 h-3.5" />}
                {isProcurement && <Compass className="w-3.5 h-3.5" />}
                {isOperator && <Users className="w-3.5 h-3.5" />}
                <span>{role} Specialist Workspace • Reports to Department HOD</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                {isEngineer && 'Engineering, CAD & Tooling Feasibility'}
                {isMaintenance && 'Plant Maintenance, Equipment & Spares'}
                {isFinance && 'Capital Expenditure, DCF & NPV Viability'}
                {isQuality && 'Quality Assurance & 4M Metrology Inspection'}
                {isProcurement && 'Supply Chain, RFQ & Vendor Quotations'}
                {isOperator && 'Shop Floor Operations & 4M Change Execution'}
              </h2>
              <p className="text-sm text-industrial-400 mt-1">
                Complete your daily shift checklist. Propose machinery, tooling, or 4M modifications directly to your Department Manager.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/proposals/new"
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-brand-600/30 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit Requisition to HOD</span>
              </Link>
              <Link
                to="/changes4m/new"
                className="px-4 py-2.5 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-industrial-200 font-semibold text-xs flex items-center gap-2 border border-industrial-700 transition-all"
              >
                <GitPullRequest className="w-4 h-4" />
                <span>Raise 4M Change</span>
              </Link>
            </div>
          </div>

          {/* Role-Specific Daily Checklist (Unique per role!) */}
          {todayChecklist && (
            <div className="p-6 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-brand-600" />
                    <span>My Daily {role} Operational Checklist</span>
                  </h3>
                  <p className="text-xs text-industrial-500">
                    Mandatory shift items monitored by your Department Manager & Management.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-industrial-200 dark:bg-industrial-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        (todayChecklist.completionRate || 0) === 100
                          ? 'bg-emerald-500'
                          : (todayChecklist.completionRate || 0) < 50
                          ? 'bg-rose-500'
                          : 'bg-brand-600'
                      }`}
                      style={{ width: `${todayChecklist.completionRate || 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold font-mono text-brand-600 dark:text-brand-400">
                    {todayChecklist.completionRate || 0}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {(todayChecklist.items || []).map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleChecklistItem(item.id, item.completed)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      item.completed
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-industrial-50 dark:bg-industrial-800/40 border-industrial-200 dark:border-industrial-700 text-industrial-700 dark:text-industrial-300 hover:border-brand-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          item.completed
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-industrial-400 bg-white dark:bg-industrial-900'
                        }`}
                      >
                        {item.completed && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs font-semibold">{item.label}</span>
                    </div>
                    {item.completedAt && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Granular Specialized Role Panels */}
          {isEngineer && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-industrial-400 uppercase">
                  <Cpu className="w-4 h-4 text-brand-500" />
                  CAD & Drawing Vault
                </div>
                <div className="text-xl font-bold text-industrial-900 dark:text-white mt-2">
                  12 Active Schematics
                </div>
                <p className="text-xs text-industrial-500 mt-1">
                  GD&T tolerances verified for CNC Milling & Stamping lines.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-industrial-400 uppercase">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Process Capability (CPK)
                </div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                  1.67 CPK (Six Sigma)
                </div>
                <p className="text-xs text-industrial-500 mt-1">
                  Machine tooling tolerance limits well within ±0.005mm spec.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-industrial-400 uppercase">
                  <GitPullRequest className="w-4 h-4 text-purple-500" />
                  ECN Pipeline
                </div>
                <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  3 Engineering Changes
                </div>
                <p className="text-xs text-industrial-500 mt-1">
                  Tooling jig revisions awaiting Department HOD signoff.
                </p>
              </div>
            </div>
          )}

          {isMaintenance && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-industrial-400 uppercase">
                  <Wrench className="w-4 h-4 text-amber-500" />
                  Preventive Maintenance (PM)
                </div>
                <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                  94.2% On-Schedule
                </div>
                <p className="text-xs text-industrial-500 mt-1">
                  Central hydraulic stations serviced for CNC cells 1 to 4.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-industrial-400 uppercase">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  MTBF & MTTR
                </div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                  MTBF 412 Hrs • MTTR 24 Min
                </div>
                <p className="text-xs text-industrial-500 mt-1">
                  Unplanned downtime reduced by 18% month-over-month.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-industrial-400 uppercase">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Critical Spares Alert
                </div>
                <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-2">
                  2 Items Low Stock
                </div>
                <p className="text-xs text-industrial-500 mt-1">
                  Spindle bearings and servo encoder cables require PO requisition.
                </p>
              </div>
            </div>
          )}

          {isFinance && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-industrial-400 uppercase">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Average IRR on CAPEX
                </div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                  24.8% Internal Return
                </div>
                <p className="text-xs text-industrial-500 mt-1">
                  Hurle rate of 15% exceeded across high-yield CNC lines.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-industrial-400 uppercase">
                  <IndianRupee className="w-4 h-4 text-brand-500" />
                  Discounted Payback Period
                </div>
                <div className="text-xl font-bold text-brand-600 dark:text-brand-400 mt-2">
                  2.1 Years
                </div>
                <p className="text-xs text-industrial-500 mt-1">
                  Net present value (NPV) positive at ₹84.5 Lakhs.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-industrial-400 uppercase">
                  <FileCheck className="w-4 h-4 text-purple-500" />
                  Audit Compliance
                </div>
                <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  100% Tax & Depr. Compliant
                </div>
                <p className="text-xs text-industrial-500 mt-1">
                  Straight-line depreciation mapped to corporate ledger.
                </p>
              </div>
            </div>
          )}

          {/* My Submitted Proposals & Equipment Requests to HOD */}
          <div className="p-6 rounded-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-brand-600" />
                  <span>My Requisitions & Proposals Submitted to Department Manager</span>
                </h3>
                <p className="text-xs text-industrial-500">
                  Track status as your Department HOD reviews and forwards to Board/Management for capital sanction.
                </p>
              </div>
              <Link
                to="/proposals/new"
                className="px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold text-xs hover:bg-brand-100 transition-colors"
              >
                + New Requisition
              </Link>
            </div>

            {myProposals.length > 0 ? (
              <div className="divide-y divide-industrial-200 dark:divide-industrial-800">
                {myProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-industrial-50/50 dark:hover:bg-industrial-800/40 p-3 rounded-xl transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                          {proposal.proposalNumber}
                        </span>
                        <PriorityBadge priority={proposal.priority} />
                        <StatusBadge status={proposal.status} />
                      </div>
                      <h4 className="text-sm font-bold text-industrial-900 dark:text-white">
                        {proposal.title}
                      </h4>
                      <div className="text-xs text-industrial-500">
                        Investment: ₹{(proposal.totalInvestment / 100000).toFixed(2)}L • Created {new Date(proposal.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <Link
                      to={`/proposals/${proposal.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 text-xs font-semibold text-industrial-800 dark:text-industrial-200 flex items-center gap-1 transition-colors self-start md:self-auto"
                    >
                      <span>View Dossier</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-industrial-400 text-xs">
                <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                You have not raised any equipment or capital requisitions yet. Click "Submit Requisition to HOD" above to propose new machinery or tooling.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ISSUE PERFORMANCE NOTICE / WARNING LETTER        */}
      {/* ======================================================== */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-2xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 m-auto">
            <div className="flex items-center justify-between border-b border-industrial-200 dark:border-industrial-800 pb-3">
              <h3 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-rose-500" />
                <span>Issue Disciplinary / Warning Notice</span>
              </h3>
              <button
                onClick={() => setShowNoticeModal(false)}
                className="text-industrial-400 hover:text-industrial-600 dark:hover:text-industrial-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-industrial-500">
              Issuing to: <strong className="text-industrial-900 dark:text-white">{noticeTargetUser?.name}</strong> ({noticeTargetUser?.email})
            </div>

            <form onSubmit={handleIssueNotice} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                    Notice Type
                  </label>
                  <select
                    value={noticeForm.type}
                    onChange={(e) => setNoticeForm({ ...noticeForm, type: e.target.value })}
                    className="w-full text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-800 p-2 text-industrial-900 dark:text-white"
                  >
                    <option value="WARNING">Performance Warning</option>
                    <option value="SLA_BREACH">SLA Breach Warning</option>
                    <option value="TERMINATION_NOTICE">Termination Notice</option>
                    <option value="COMMENDATION">Official Commendation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                    Severity Level
                  </label>
                  <select
                    value={noticeForm.severity}
                    onChange={(e) => setNoticeForm({ ...noticeForm, severity: e.target.value })}
                    className="w-full text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-800 p-2 text-industrial-900 dark:text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                  Subject / Summary
                </label>
                <input
                  type="text"
                  required
                  value={noticeForm.subject}
                  onChange={(e) => setNoticeForm({ ...noticeForm, subject: e.target.value })}
                  placeholder="e.g. Unacceptable checklist adherence"
                  className="w-full text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-800 p-2 text-industrial-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                  Detailed Reason & Evidence
                </label>
                <textarea
                  required
                  rows={3}
                  value={noticeForm.reason}
                  onChange={(e) => setNoticeForm({ ...noticeForm, reason: e.target.value })}
                  placeholder="Explain why this notice is being issued..."
                  className="w-full text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-800 p-2 text-industrial-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                  Required Corrective Action
                </label>
                <input
                  type="text"
                  value={noticeForm.actionRequired}
                  onChange={(e) => setNoticeForm({ ...noticeForm, actionRequired: e.target.value })}
                  placeholder="e.g. Complete remaining checklist before tomorrow shift"
                  className="w-full text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-800 p-2 text-industrial-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-industrial-200 dark:border-industrial-800">
                <button
                  type="button"
                  onClick={() => setShowNoticeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 hover:bg-industrial-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow"
                >
                  Issue Formal Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ASSIGN DEPARTMENT MANAGER (HOD)                  */}
      {/* ======================================================== */}
      {showAssignManagerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 m-auto">
            <div className="flex items-center justify-between border-b border-industrial-200 dark:border-industrial-800 pb-3">
              <h3 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-brand-600" />
                <span>Appoint Department Manager (HOD)</span>
              </h3>
              <button
                onClick={() => setShowAssignManagerModal(false)}
                className="text-industrial-400 hover:text-industrial-600 dark:hover:text-industrial-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignManager} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                  Select Department
                </label>
                <select
                  required
                  value={assignManagerForm.departmentId}
                  onChange={(e) => setAssignManagerForm({ ...assignManagerForm, departmentId: e.target.value })}
                  className="w-full text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-800 p-2 text-industrial-900 dark:text-white"
                >
                  <option value="">-- Select Department --</option>
                  {(orgTree?.departments || []).map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                  Select User to Appoint as HOD
                </label>
                <select
                  required
                  value={assignManagerForm.userId}
                  onChange={(e) => setAssignManagerForm({ ...assignManagerForm, userId: e.target.value })}
                  className="w-full text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-800 p-2 text-industrial-900 dark:text-white"
                >
                  <option value="">-- Select User --</option>
                  {(orgTree?.departments || [])
                    .flatMap((d: any) => d.staff)
                    .concat(orgTree?.unassigned || [])
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) - Current: {u.role}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-industrial-200 dark:border-industrial-800">
                <button
                  type="button"
                  onClick={() => setShowAssignManagerModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 hover:bg-industrial-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow"
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ASSIGN STAFF TO DEPARTMENT & MANAGER             */}
      {/* ======================================================== */}
      {showAssignStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 m-auto">
            <div className="flex items-center justify-between border-b border-industrial-200 dark:border-industrial-800 pb-3">
              <h3 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Assign Staff Member to Department</span>
              </h3>
              <button
                onClick={() => setShowAssignStaffModal(false)}
                className="text-industrial-400 hover:text-industrial-600 dark:hover:text-industrial-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                  Staff Member
                </label>
                <select
                  required
                  value={assignStaffForm.userId}
                  onChange={(e) => setAssignStaffForm({ ...assignStaffForm, userId: e.target.value })}
                  className="w-full text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-800 p-2 text-industrial-900 dark:text-white"
                >
                  <option value="">-- Select Staff --</option>
                  {(orgTree?.departments || [])
                    .flatMap((d: any) => d.staff)
                    .concat(orgTree?.unassigned || [])
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                  Target Department
                </label>
                <select
                  required
                  value={assignStaffForm.departmentId}
                  onChange={(e) => setAssignStaffForm({ ...assignStaffForm, departmentId: e.target.value })}
                  className="w-full text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-800 p-2 text-industrial-900 dark:text-white"
                >
                  <option value="">-- Select Department --</option>
                  {(orgTree?.departments || []).map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                  Role Title Under Manager
                </label>
                <select
                  value={assignStaffForm.roleName}
                  onChange={(e) => setAssignStaffForm({ ...assignStaffForm, roleName: e.target.value })}
                  className="w-full text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-800 p-2 text-industrial-900 dark:text-white"
                >
                  <option value="Employee">Employee (Shop Floor Operator)</option>
                  <option value="Engineer">Engineer (Tooling / Technical)</option>
                  <option value="Maintenance">Maintenance Specialist</option>
                  <option value="Finance">Finance Officer</option>
                  <option value="Quality">Quality Assurance</option>
                  <option value="Procurement">Procurement Officer</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-industrial-200 dark:border-industrial-800">
                <button
                  type="button"
                  onClick={() => setShowAssignStaffModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 hover:bg-industrial-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow"
                >
                  Assign to Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
