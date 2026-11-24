import { Router } from 'express';
import { RoleChecklist, IRoleChecklistItem } from '../models/RoleChecklist';
import { User } from '../models/User';
import { Department } from '../models/Department';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Standard templates per role
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

function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// GET today's checklist for current user
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId).populate('roleId').populate('departmentId');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const roleName = (user.roleId as any)?.name || 'Employee';
    const dateStr = getTodayString();

    let checklist = await RoleChecklist.findOne({ userId: user._id, date: dateStr });

    if (!checklist) {
      const templateItems = DEFAULT_ROLE_CHECKLISTS[roleName] || DEFAULT_ROLE_CHECKLISTS['Employee'];
      const items: IRoleChecklistItem[] = templateItems.map((t) => ({
        id: t.id,
        label: t.label,
        completed: false,
      }));

      checklist = await RoleChecklist.create({
        userId: user._id,
        roleName,
        departmentId: user.departmentId?._id || user.departmentId,
        date: dateStr,
        items,
        completionRate: 0,
        isCompleted: false,
      });
    }

    return res.json(checklist);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch checklist' });
  }
});

// POST toggle checklist item
router.post('/toggle', authenticateToken, async (req, res) => {
  try {
    const { itemId, completed, note } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });

    const userId = req.user!.id;
    const dateStr = getTodayString();

    let checklist = await RoleChecklist.findOne({ userId, date: dateStr });
    if (!checklist) return res.status(404).json({ error: 'Checklist for today not found' });

    const item = checklist.items.find((i: any) => i.id === itemId);
    if (!item) return res.status(404).json({ error: 'Item not found in checklist' });

    item.completed = typeof completed === 'boolean' ? completed : !item.completed;
    item.completedAt = item.completed ? new Date() : undefined;
    if (note !== undefined) item.note = note;

    const completedCount = checklist.items.filter((i: any) => i.completed).length;
    checklist.completionRate = Math.round((completedCount / checklist.items.length) * 100);
    checklist.isCompleted = checklist.completionRate === 100;

    await checklist.save();

    return res.json({
      message: 'Checklist updated',
      checklist,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update checklist' });
  }
});

// GET checklist analytics for management, board, and managers
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.id;
    const user = await User.findById(userId);

    const query: any = {};
    // If HOD, filter by their department
    if (userRole === 'HOD' && user?.departmentId) {
      query.departmentId = user.departmentId;
    }

    const checklists = await RoleChecklist.find(query)
      .populate('userId', 'name email roleId departmentId')
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 })
      .limit(100);

    const totalSubmissions = checklists.length;
    const avgCompletion = totalSubmissions > 0
      ? Math.round(checklists.reduce((acc, c) => acc + (c.completionRate || 0), 0) / totalSubmissions)
      : 0;

    const completedCount = checklists.filter((c) => c.isCompleted).length;
    const lowPerformanceCount = checklists.filter((c) => (c.completionRate || 0) < 50).length;

    // By department summary
    const deptMap: Record<string, { name: string; total: number; completed: number; avgRate: number }> = {};
    for (const c of checklists) {
      const deptName = (c.departmentId as any)?.name || 'Operations';
      if (!deptMap[deptName]) {
        deptMap[deptName] = { name: deptName, total: 0, completed: 0, avgRate: 0 };
      }
      deptMap[deptName].total++;
      if (c.isCompleted) deptMap[deptName].completed++;
      deptMap[deptName].avgRate += c.completionRate || 0;
    }

    const departmentStats = Object.values(deptMap).map((d) => ({
      ...d,
      avgRate: Math.round(d.avgRate / d.total),
    }));

    // Low performing staff list for possible warnings
    const lowPerformers = checklists
      .filter((c) => (c.completionRate || 0) < 50 && c.userId)
      .map((c) => ({
        id: (c.userId as any)?._id?.toString(),
        name: (c.userId as any)?.name,
        email: (c.userId as any)?.email,
        role: c.roleName,
        department: (c.departmentId as any)?.name,
        completionRate: c.completionRate,
        date: c.date,
      }));

    return res.json({
      totalSubmissions,
      avgCompletion,
      completedCount,
      lowPerformanceCount,
      departmentStats,
      recentChecklists: checklists.slice(0, 20),
      lowPerformers,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch analytics' });
  }
});

export default router;
