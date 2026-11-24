import { Router } from 'express';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import { Budget, Proposal, PurchaseOrder, WorkflowTemplate } from '../models';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Management CAPEX Dashboard metrics
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const { departmentId, proposalTypeId, fiscalYear } = req.query;

    const fy = String(fiscalYear || 'FY2026-27');
    const budgetQuery: any = { fiscalYear: fy };
    if (departmentId) budgetQuery.departmentId = new mongoose.Types.ObjectId(String(departmentId));

    const proposalQuery: any = {};
    if (departmentId) proposalQuery.departmentId = new mongoose.Types.ObjectId(String(departmentId));
    if (proposalTypeId) proposalQuery.proposalTypeId = new mongoose.Types.ObjectId(String(proposalTypeId));

    // 1. Department budgets & utilisation
    const budgets = await Budget.find(budgetQuery).populate('department');

    const totalAllocatedBudget = budgets.reduce((acc, b) => acc + (b.allocatedAmount || 0), 0);
    const totalUtilisedBudget = budgets.reduce((acc, b) => acc + (b.utilisedAmount || 0), 0);
    const totalAvailableBudget = Math.max(0, totalAllocatedBudget - totalUtilisedBudget);
    const overallUtilisationPercent =
      totalAllocatedBudget > 0
        ? Number(((totalUtilisedBudget / totalAllocatedBudget) * 100).toFixed(1))
        : 0;

    // 2. Proposals breakdown
    const proposals = await Proposal.find(proposalQuery)
      .populate('department')
      .populate('proposalType');

    // Stage lookup map
    const templates = await WorkflowTemplate.find();
    const stageMap = new Map<string, any>();
    for (const t of templates) {
      if (t.stages) {
        for (const s of t.stages) {
          stageMap.set(s._id.toString(), {
            id: s._id.toString(),
            name: s.name,
            approverRole: s.approverRole,
            slaDays: s.slaDays,
          });
        }
      }
    }

    const totalProposedAmount = proposals.reduce((acc, p) => acc + (p.totalInvestment || 0), 0);

    const approvedProposals = proposals.filter((p) => p.status === 'APPROVED');
    const totalApprovedAmount = approvedProposals.reduce((acc, p) => acc + (p.totalInvestment || 0), 0);

    const pendingProposals = proposals.filter((p) => p.status === 'IN_REVIEW');
    const totalPendingAmount = pendingProposals.reduce((acc, p) => acc + (p.totalInvestment || 0), 0);

    const totalExpectedAnnualSavings = approvedProposals.reduce((acc, p) => acc + (p.annualSavings || 0), 0);

    // Actual spend from purchase orders
    const purchaseOrders = await PurchaseOrder.find({
      status: { $in: ['DELIVERED', 'INVOICED', 'PAID'] },
    });
    const totalActualSpend = purchaseOrders.reduce((acc, po) => acc + (po.totalAmount || 0), 0);

    // 3. Delayed proposals (breaching SLA)
    const now = new Date();
    const delayedProjects = pendingProposals
      .filter((p) => {
        const stage = p.currentStageId ? stageMap.get(p.currentStageId.toString()) : null;
        if (!stage) return false;
        const sla = stage.slaDays || 3;
        const ageDays = (now.getTime() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        return ageDays > sla;
      })
      .map((p) => {
        const stage = p.currentStageId ? stageMap.get(p.currentStageId.toString()) : null;
        const dept = (p as any).department;
        const sla = stage?.slaDays || 3;
        const ageDays = (now.getTime() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        return {
          id: p._id.toString(),
          proposalNumber: p.proposalNumber,
          title: p.title,
          department: dept?.name || 'N/A',
          amount: p.totalInvestment,
          currentStage: stage?.name,
          daysOverdue: Math.floor(ageDays - sla),
        };
      });

    // 4. Department-wise Spend & Budget distribution
    const departmentBreakdown = budgets.map((b) => {
      const bDeptId = b.departmentId.toString();
      const deptProposals = proposals.filter((p) => p.departmentId.toString() === bDeptId);
      const approvedVal = deptProposals
        .filter((p) => p.status === 'APPROVED')
        .reduce((sum, p) => sum + (p.totalInvestment || 0), 0);
      const pendingVal = deptProposals
        .filter((p) => p.status === 'IN_REVIEW')
        .reduce((sum, p) => sum + (p.totalInvestment || 0), 0);
      const utilPct =
        b.allocatedAmount > 0 ? Number(((b.utilisedAmount / b.allocatedAmount) * 100).toFixed(1)) : 0;
      const dept = (b as any).department;

      return {
        departmentId: b.departmentId.toString(),
        departmentName: dept?.name || 'N/A',
        departmentCode: dept?.code || 'N/A',
        allocated: b.allocatedAmount,
        utilised: b.utilisedAmount,
        available: Math.max(0, b.allocatedAmount - b.utilisedAmount),
        approvedProposalsValue: approvedVal,
        pendingProposalsValue: pendingVal,
        utilisationPercent: utilPct,
      };
    });

    // 5. Category / Proposal Type Distribution
    const typeMap: Record<string, { count: number; totalAmount: number; name: string }> = {};
    for (const p of proposals) {
      const typeName = (p as any).proposalType?.name || 'Standard';
      if (!typeMap[typeName]) {
        typeMap[typeName] = { count: 0, totalAmount: 0, name: typeName };
      }
      typeMap[typeName].count += 1;
      typeMap[typeName].totalAmount += p.totalInvestment || 0;
    }
    const typeDistribution = Object.values(typeMap);

    // 6. Average ROI and Payback across approved projects
    const avgRoi =
      approvedProposals.length > 0
        ? Number(
            (
              approvedProposals.reduce((sum, p) => sum + (p.roiPercent || 0), 0) /
              approvedProposals.length
            ).toFixed(1)
          )
        : 0;
    const avgPayback =
      approvedProposals.length > 0
        ? Number(
            (
              approvedProposals.reduce((sum, p) => sum + (p.simplePayback || 0), 0) /
              approvedProposals.length
            ).toFixed(2)
          )
        : 0;

    return res.json({
      kpis: {
        totalAllocatedBudget,
        totalUtilisedBudget,
        totalAvailableBudget,
        overallUtilisationPercent,
        totalProposedAmount,
        totalApprovedAmount,
        totalPendingAmount,
        totalActualSpend,
        totalExpectedAnnualSavings,
        totalProposalsCount: proposals.length,
        approvedProposalsCount: approvedProposals.length,
        pendingProposalsCount: pendingProposals.length,
        delayedProjectsCount: delayedProjects.length,
        avgRoi,
        avgPayback,
      },
      delayedProjects,
      departmentBreakdown,
      typeDistribution,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Excel Export for CAPEX Dashboard
router.get('/export/excel', authenticateToken, async (req, res) => {
  try {
    const fy = 'FY2026-27';
    const budgets = await Budget.find({ fiscalYear: fy }).populate('department');
    const proposals = await Proposal.find().populate('department').populate('proposalType');
    const purchaseOrders = await PurchaseOrder.find({
      status: { $in: ['DELIVERED', 'INVOICED', 'PAID'] },
    });

    const totalAllocated = budgets.reduce((acc, b) => acc + (b.allocatedAmount || 0), 0);
    const totalUtilised = budgets.reduce((acc, b) => acc + (b.utilisedAmount || 0), 0);
    const totalActualSpend = purchaseOrders.reduce((acc, po) => acc + (po.totalAmount || 0), 0);

    const approved = proposals.filter((p) => p.status === 'APPROVED');
    const totalApproved = approved.reduce((acc, p) => acc + (p.totalInvestment || 0), 0);
    const pending = proposals.filter((p) => p.status === 'IN_REVIEW');
    const totalPending = pending.reduce((acc, p) => acc + (p.totalInvestment || 0), 0);
    const totalSavings = approved.reduce((acc, p) => acc + (p.annualSavings || 0), 0);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ChangeFlow Enterprise';
    workbook.created = new Date();

    // Sheet 1: Executive KPI Summary
    const summarySheet = workbook.addWorksheet('Executive Summary');
    summarySheet.columns = [
      { header: 'CAPEX Metric', key: 'metric', width: 35 },
      { header: 'Value (INR / Metric)', key: 'val', width: 25 },
    ];
    summarySheet.addRows([
      { metric: 'Fiscal Year', val: fy },
      { metric: 'Total Allocated CAPEX Budget', val: totalAllocated },
      { metric: 'Total Budget Utilised', val: totalUtilised },
      {
        metric: 'Overall Budget Utilisation %',
        val: `${totalAllocated > 0 ? ((totalUtilised / totalAllocated) * 100).toFixed(1) : 0}%`,
      },
      { metric: 'Total Actual Spend (POs Invoiced/Paid)', val: totalActualSpend },
      { metric: 'Total Approved CAPEX', val: totalApproved },
      { metric: 'Total Pending Approvals Value', val: totalPending },
      { metric: 'Expected Annual Recurring Savings', val: totalSavings },
      { metric: 'Total Proposals Submitted', val: proposals.length },
      { metric: 'Approved Proposals Count', val: approved.length },
      { metric: 'Pending Review Count', val: pending.length },
    ]);
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    // Sheet 2: Department Budgets
    const deptSheet = workbook.addWorksheet('Department Budgets');
    deptSheet.columns = [
      { header: 'Department', key: 'name', width: 30 },
      { header: 'Code', key: 'code', width: 12 },
      { header: 'Allocated Budget (₹)', key: 'allocated', width: 22 },
      { header: 'Utilised Budget (₹)', key: 'utilised', width: 22 },
      { header: 'Available Budget (₹)', key: 'available', width: 22 },
      { header: 'Utilisation %', key: 'utilPercent', width: 16 },
    ];
    budgets.forEach((b) => {
      const avail = Math.max(0, b.allocatedAmount - b.utilisedAmount);
      const utilPct = b.allocatedAmount > 0 ? (b.utilisedAmount / b.allocatedAmount) * 100 : 0;
      const dept = (b as any).department;
      deptSheet.addRow({
        name: dept?.name || 'N/A',
        code: dept?.code || 'N/A',
        allocated: b.allocatedAmount,
        utilised: b.utilisedAmount,
        available: avail,
        utilPercent: `${utilPct.toFixed(1)}%`,
      });
    });
    deptSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    deptSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

    // Sheet 3: Proposals Pipeline
    const propSheet = workbook.addWorksheet('Proposals Breakdown');
    propSheet.columns = [
      { header: 'Proposal #', key: 'num', width: 16 },
      { header: 'Title', key: 'title', width: 35 },
      { header: 'Department', key: 'dept', width: 25 },
      { header: 'Type', key: 'type', width: 22 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Investment (₹)', key: 'invest', width: 18 },
      { header: 'Annual Savings (₹)', key: 'savings', width: 18 },
      { header: 'ROI %', key: 'roi', width: 12 },
      { header: 'Payback (Yrs)', key: 'payback', width: 14 },
    ];
    proposals.forEach((p) => {
      const dept = (p as any).department;
      const propType = (p as any).proposalType;
      propSheet.addRow({
        num: p.proposalNumber,
        title: p.title,
        dept: dept?.name || 'N/A',
        type: propType?.name || 'Standard',
        status: p.status,
        invest: p.totalInvestment,
        savings: p.annualSavings,
        roi: `${p.roiPercent}%`,
        payback: p.simplePayback,
      });
    });
    propSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    propSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ChangeFlow-CAPEX-Dashboard.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Failed to export CAPEX excel:', err);
    res.status(500).json({ error: 'Excel export generation failed' });
  }
});

export default router;
