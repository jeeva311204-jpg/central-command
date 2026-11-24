import { Router } from 'express';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import {
  Proposal,
  ProposalType,
  Budget,
  User,
  WorkflowTemplate,
  Quotation,
  PurchaseOrder,
  Change4M,
  Task,
  Asset,
  AuditReview,
  DocumentModel,
  ProposalVersion,
  ApprovalAction,
  getNextSequence,
} from '../models';
import { authenticateToken } from '../middleware/auth';
import { validate, proposalCreateSchema } from '../middleware/validate';
import { calculateFinancialMetrics, evaluateBudgetImpact } from '../services/financial';
import { getApplicableStagesForProposal } from '../services/workflowEngine';
import { logAudit } from '../services/auditLogger';
import { createNotification, sendSimulatedEmail } from '../services/notificationService';
import { generateProposalPdf } from '../services/pdfService';

const router = Router();

// Helper to attach currentStage object to proposal objects
async function enrichProposalsWithStages(proposals: any[]) {
  const templates = await WorkflowTemplate.find();
  const stageMap = new Map<string, any>();
  for (const t of templates) {
    if (t.stages) {
      for (const s of t.stages) {
        stageMap.set(s._id.toString(), {
          id: s._id.toString(),
          _id: s._id.toString(),
          name: s.name,
          approverRole: s.approverRole,
          slaDays: s.slaDays,
          stepOrder: s.stepOrder,
        });
      }
    }
  }

  return proposals.map((p) => {
    const obj = p.toObject ? p.toObject({ virtuals: true }) : { ...p };
    obj.id = obj._id?.toString() || obj.id;
    if (obj.currentStageId) {
      obj.currentStage = stageMap.get(obj.currentStageId.toString()) || null;
    } else {
      obj.currentStage = null;
    }
    return obj;
  });
}

// Get all 14 proposal types with schemas
router.get('/types', async (req, res) => {
  try {
    const types = await ProposalType.find({ isActive: true })
      .populate('workflowTemplate')
      .sort({ code: 1 });
    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// List proposals with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, departmentId, proposalTypeId, priority, search, myPendingOnly } = req.query;

    const query: any = {};
    if (status) query.status = String(status);
    if (departmentId) query.departmentId = new mongoose.Types.ObjectId(String(departmentId));
    if (proposalTypeId) query.proposalTypeId = new mongoose.Types.ObjectId(String(proposalTypeId));
    if (priority) query.priority = String(priority);

    if (search) {
      const q = String(search);
      query.$or = [
        { proposalNumber: { $regex: q, $options: 'i' } },
        { title: { $regex: q, $options: 'i' } },
        { machineName: { $regex: q, $options: 'i' } },
        { manufacturer: { $regex: q, $options: 'i' } },
      ];
    }

    if (myPendingOnly === 'true' && req.user) {
      query.status = 'IN_REVIEW';
      if (req.user.role !== 'Admin') {
        const templates = await WorkflowTemplate.find({ 'stages.approverRole': req.user.role });
        const matchingStageIds: any[] = [];
        for (const t of templates) {
          for (const s of t.stages) {
            if (s.approverRole === req.user.role) {
              matchingStageIds.push(s._id);
            }
          }
        }
        query.currentStageId = { $in: matchingStageIds };
      }
    }

    const proposals = await Proposal.find(query)
      .populate('proposalType')
      .populate('department')
      .populate('initiator', 'name email role')
      .sort({ createdAt: -1 });

    const enriched = await enrichProposalsWithStages(proposals);

    // Also populate counts for quotations, purchaseOrders, versions
    for (const p of enriched) {
      const [quotationsCount, poCount, verCount] = await Promise.all([
        Quotation.countDocuments({ proposalId: p._id }),
        PurchaseOrder.countDocuments({ proposalId: p._id }),
        ProposalVersion.countDocuments({ proposalId: p._id }),
      ]);
      p._count = {
        quotations: quotationsCount,
        purchaseOrders: poCount,
        versions: verCount,
      };
    }

    return res.json(enriched);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Excel Export for Proposals List
router.get('/export/excel', authenticateToken, async (req, res) => {
  try {
    const proposals = await Proposal.find()
      .populate('department')
      .populate('proposalType')
      .populate('initiator')
      .sort({ createdAt: -1 });

    const enriched = await enrichProposalsWithStages(proposals);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ChangeFlow Enterprise';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Proposals Register');
    sheet.columns = [
      { header: 'Proposal #', key: 'proposalNumber', width: 16 },
      { header: 'Title', key: 'title', width: 36 },
      { header: 'Type', key: 'type', width: 22 },
      { header: 'Department', key: 'department', width: 22 },
      { header: 'Initiator', key: 'initiator', width: 20 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Machine Name', key: 'machineName', width: 26 },
      { header: 'Investment (₹)', key: 'totalInvestment', width: 18 },
      { header: 'Annual Savings (₹)', key: 'annualSavings', width: 18 },
      { header: 'ROI (%)', key: 'roiPercent', width: 12 },
      { header: 'Payback (Yrs)', key: 'simplePayback', width: 14 },
      { header: 'NPV (₹)', key: 'npv', width: 16 },
      { header: 'IRR (%)', key: 'irr', width: 12 },
      { header: 'Budget Impact', key: 'budgetImpactStatus', width: 20 },
      { header: 'Created Date', key: 'createdAt', width: 16 },
    ];

    enriched.forEach((p) => {
      sheet.addRow({
        proposalNumber: p.proposalNumber,
        title: p.title,
        type: p.proposalType?.name || 'N/A',
        department: p.department?.name || 'N/A',
        initiator: p.initiator?.name || 'N/A',
        status: p.status,
        priority: p.priority,
        machineName: p.machineName || 'N/A',
        totalInvestment: p.totalInvestment,
        annualSavings: p.annualSavings,
        roiPercent: `${p.roiPercent}%`,
        simplePayback: p.simplePayback,
        npv: p.npv,
        irr: `${p.irr}%`,
        budgetImpactStatus: p.budgetImpactStatus,
        createdAt: new Date(p.createdAt).toISOString().split('T')[0],
      });
    });

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ChangeFlow-Proposals-Register.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Failed to export proposals to Excel:', err);
    res.status(500).json({ error: 'Excel export generation failed' });
  }
});

// Get proposal details by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const proposalId = req.params.id as string;
    const proposal = await Proposal.findById(proposalId)
      .populate({
        path: 'proposalType',
        populate: { path: 'workflowTemplate' },
      })
      .populate('department')
      .populate('initiator', 'name email role');

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const enrichedList = await enrichProposalsWithStages([proposal]);
    const enriched = enrichedList[0];

    // Fetch related documents in parallel
    const [
      approvalActions,
      versions,
      quotations,
      purchaseOrders,
      changes4m,
      tasks,
      assets,
      auditReviews,
      documents,
      departmentBudgets,
    ] = await Promise.all([
      ApprovalAction.find({ proposalId: proposal._id })
        .populate('approver', 'name role')
        .sort({ createdAt: 1 }),
      ProposalVersion.find({ proposalId: proposal._id }).sort({ versionNumber: -1 }),
      Quotation.find({ proposalId: proposal._id }).populate('vendor').sort({ weightedScore: -1 }),
      PurchaseOrder.find({ proposalId: proposal._id }).populate('vendor').populate('delivery'),
      Change4M.find({ proposalId: proposal._id }),
      Task.find({ proposalId: proposal._id }).populate('assignedTo', 'name role'),
      Asset.find({ proposalId: proposal._id }).populate('maintenanceSchedules'),
      AuditReview.find({ proposalId: proposal._id }).sort({ intervalMonths: 1 }),
      DocumentModel.find({ proposalId: proposal._id }).populate('uploadedBy', 'name role'),
      Budget.find({ departmentId: proposal.departmentId, fiscalYear: 'FY2026-27' }),
    ]);

    // Populate tasks inside changes4m
    const changeIds = changes4m.map((c) => c._id);
    const changeTasks = await Task.find({ change4MId: { $in: changeIds } });
    const changesWithTasks = changes4m.map((c) => {
      const obj = c.toObject({ virtuals: true });
      obj.tasks = changeTasks.filter((t) => t.change4MId?.toString() === c._id.toString());
      return obj;
    });

    const applicableStages = await getApplicableStagesForProposal(proposal._id.toString());

    if (enriched.department) {
      enriched.department.budgets = departmentBudgets;
    }

    return res.json({
      ...enriched,
      approvalActions,
      versions,
      quotations,
      purchaseOrders,
      changes4m: changesWithTasks,
      tasks,
      assets,
      auditReviews,
      documents,
      applicableStages,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create new proposal
router.post('/', authenticateToken, validate(proposalCreateSchema), async (req, res) => {
  try {
    const {
      title,
      proposalTypeId,
      departmentId,
      priority,
      machineName,
      category,
      manufacturer,
      supplier,
      currentMachineDetails,
      proposedMachineDetails,
      expectedDeliveryWeeks,
      purchasePrice,
      installationCost,
      transportCost,
      trainingCost,
      toolingCost,
      otherCost,
      usefulLifeYears,
      discountRate,
      salvageValue,
      annualSavings,
      extraRevenue,
      extraOpex,
      bettermentJson,
      customFieldsJson,
    } = req.body;

    if (!title || !proposalTypeId || !departmentId) {
      return res.status(400).json({ error: 'Title, proposal type, and department are required' });
    }

    const fin = calculateFinancialMetrics({
      purchasePrice: Number(purchasePrice) || 0,
      installationCost: Number(installationCost) || 0,
      transportCost: Number(transportCost) || 0,
      trainingCost: Number(trainingCost) || 0,
      toolingCost: Number(toolingCost) || 0,
      otherCost: Number(otherCost) || 0,
      annualSavings: Number(annualSavings) || 0,
      extraRevenue: Number(extraRevenue) || 0,
      extraOpex: Number(extraOpex) || 0,
      usefulLifeYears: Number(usefulLifeYears) || 5,
      discountRate: Number(discountRate) || 10,
      salvageValue: Number(salvageValue) || 0,
    });

    const budget = await Budget.findOne({ departmentId, fiscalYear: 'FY2026-27' });
    const budgetAllocated = budget?.allocatedAmount || 10000000;
    const budgetUtilised = budget?.utilisedAmount || 0;
    const budgetCheck = evaluateBudgetImpact(budgetAllocated, budgetUtilised, fin.totalInvestment);

    if (
      budgetCheck.budgetImpactStatus === 'BUDGET_EXCEEDED' &&
      !req.body.allowOverrun &&
      req.user?.role !== 'Admin' &&
      req.user?.role !== 'Management'
    ) {
      return res.status(400).json({
        error: `Submission blocked: ${budgetCheck.message}`,
        budgetCheck,
        blocked: true,
      });
    }

    const seq = await getNextSequence('proposalNumber');
    const proposalNumber = `CF-2026-${String(seq).padStart(3, '0')}`;

    const workflowTemplate = await WorkflowTemplate.findOne({ proposalTypeId });
    let initialStageId: any = null;
    let initialStage: any = null;
    if (workflowTemplate && workflowTemplate.stages && workflowTemplate.stages.length > 0) {
      initialStage = workflowTemplate.stages[0];
      initialStageId = initialStage._id;
    }

    let bettermentObj: any = {};
    if (bettermentJson) {
      bettermentObj = typeof bettermentJson === 'string' ? JSON.parse(bettermentJson) : bettermentJson;
    }
    let customFieldsObj: any = {};
    if (customFieldsJson) {
      customFieldsObj = typeof customFieldsJson === 'string' ? JSON.parse(customFieldsJson) : customFieldsJson;
    }

    const proposal = await Proposal.create({
      proposalNumber,
      title,
      proposalTypeId,
      departmentId,
      initiatorId: req.user!.id,
      currentStageId: initialStageId,
      status: initialStageId ? 'IN_REVIEW' : 'DRAFT',
      priority: priority || 'MEDIUM',
      machineName,
      category,
      manufacturer,
      supplier,
      currentMachineDetails,
      proposedMachineDetails,
      expectedDeliveryWeeks: Number(expectedDeliveryWeeks) || 4,
      purchasePrice: Number(purchasePrice) || 0,
      installationCost: Number(installationCost) || 0,
      transportCost: Number(transportCost) || 0,
      trainingCost: Number(trainingCost) || 0,
      toolingCost: Number(toolingCost) || 0,
      otherCost: Number(otherCost) || 0,
      totalInvestment: fin.totalInvestment,
      usefulLifeYears: Number(usefulLifeYears) || 5,
      discountRate: Number(discountRate) || 10,
      salvageValue: Number(salvageValue) || 0,
      annualSavings: Number(annualSavings) || 0,
      extraRevenue: Number(extraRevenue) || 0,
      extraOpex: Number(extraOpex) || 0,
      annualNetBenefit: fin.annualNetBenefit,
      simplePayback: fin.simplePayback,
      roiPercent: fin.roiPercent,
      npv: fin.npv,
      irr: fin.irr,
      discountedPayback: fin.discountedPayback,
      annualDepreciation: fin.annualDepreciation,
      budgetImpactStatus: budgetCheck.budgetImpactStatus,
      betterment: bettermentObj,
      customFields: customFieldsObj,
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      entityType: 'PROPOSAL',
      entityId: proposal._id.toString(),
      action: 'CREATE',
      after: { proposalNumber, totalInvestment: fin.totalInvestment, title },
      ipAddress: req.ip,
    });

    if (initialStage) {
      const hodUsers = await User.find({
        roleName: initialStage.approverRole,
        departmentId: proposal.departmentId,
        isActive: true,
      });

      for (const hod of hodUsers) {
        await createNotification(
          hod._id.toString(),
          `New Proposal for Approval: ${proposal.proposalNumber}`,
          `${req.user!.name} raised proposal "${proposal.title}" (₹${proposal.totalInvestment.toLocaleString('en-IN')}) for your approval.`,
          'APPROVAL',
          `/proposals/${proposal._id}`
        );

        await sendSimulatedEmail(
          hod.email,
          hod.name,
          `[ChangeFlow Approval] New Proposal ${proposal.proposalNumber}`,
          `<p>Proposal <strong>${proposal.proposalNumber} - ${proposal.title}</strong> has been submitted and is waiting for your review.</p><p>Total Investment: ₹${proposal.totalInvestment.toLocaleString('en-IN')}</p>`,
          'APPROVAL_REQUEST'
        );
      }
    }

    const populated = await Proposal.findById(proposal._id)
      .populate('department')
      .populate('proposalType');
    const enrichedList = await enrichProposalsWithStages([populated]);
    return res.status(201).json(enrichedList[0]);
  } catch (err: any) {
    console.error('Error creating proposal:', err);
    return res.status(500).json({ error: err.message || 'Failed to create proposal' });
  }
});

// Update / revise proposal
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const proposalId = req.params.id as string;
    const existing = await Proposal.findById(proposalId);

    if (!existing) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const {
      title,
      priority,
      machineName,
      category,
      manufacturer,
      supplier,
      currentMachineDetails,
      proposedMachineDetails,
      expectedDeliveryWeeks,
      purchasePrice,
      installationCost,
      transportCost,
      trainingCost,
      toolingCost,
      otherCost,
      usefulLifeYears,
      discountRate,
      salvageValue,
      annualSavings,
      extraRevenue,
      extraOpex,
      bettermentJson,
      customFieldsJson,
      resubmitForApproval,
    } = req.body;

    const fin = calculateFinancialMetrics({
      purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : existing.purchasePrice,
      installationCost: installationCost !== undefined ? Number(installationCost) : existing.installationCost,
      transportCost: transportCost !== undefined ? Number(transportCost) : existing.transportCost,
      trainingCost: trainingCost !== undefined ? Number(trainingCost) : existing.trainingCost,
      toolingCost: toolingCost !== undefined ? Number(toolingCost) : existing.toolingCost,
      otherCost: otherCost !== undefined ? Number(otherCost) : existing.otherCost,
      annualSavings: annualSavings !== undefined ? Number(annualSavings) : existing.annualSavings,
      extraRevenue: extraRevenue !== undefined ? Number(extraRevenue) : existing.extraRevenue,
      extraOpex: extraOpex !== undefined ? Number(extraOpex) : existing.extraOpex,
      usefulLifeYears: usefulLifeYears !== undefined ? Number(usefulLifeYears) : existing.usefulLifeYears,
      discountRate: discountRate !== undefined ? Number(discountRate) : existing.discountRate,
      salvageValue: salvageValue !== undefined ? Number(salvageValue) : existing.salvageValue,
    });

    const budget = await Budget.findOne({
      departmentId: existing.departmentId,
      fiscalYear: 'FY2026-27',
    });
    const budgetAllocated = budget?.allocatedAmount || 10000000;
    const budgetUtilised = budget?.utilisedAmount || 0;
    const budgetCheck = evaluateBudgetImpact(budgetAllocated, budgetUtilised, fin.totalInvestment);

    const updateData: any = {
      title: title || existing.title,
      priority: priority || existing.priority,
      machineName: machineName !== undefined ? machineName : existing.machineName,
      category: category !== undefined ? category : existing.category,
      manufacturer: manufacturer !== undefined ? manufacturer : existing.manufacturer,
      supplier: supplier !== undefined ? supplier : existing.supplier,
      currentMachineDetails: currentMachineDetails !== undefined ? currentMachineDetails : existing.currentMachineDetails,
      proposedMachineDetails: proposedMachineDetails !== undefined ? proposedMachineDetails : existing.proposedMachineDetails,
      expectedDeliveryWeeks: expectedDeliveryWeeks !== undefined ? Number(expectedDeliveryWeeks) : existing.expectedDeliveryWeeks,
      purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : existing.purchasePrice,
      installationCost: installationCost !== undefined ? Number(installationCost) : existing.installationCost,
      transportCost: transportCost !== undefined ? Number(transportCost) : existing.transportCost,
      trainingCost: trainingCost !== undefined ? Number(trainingCost) : existing.trainingCost,
      toolingCost: toolingCost !== undefined ? Number(toolingCost) : existing.toolingCost,
      otherCost: otherCost !== undefined ? Number(otherCost) : existing.otherCost,
      totalInvestment: fin.totalInvestment,
      usefulLifeYears: usefulLifeYears !== undefined ? Number(usefulLifeYears) : existing.usefulLifeYears,
      discountRate: discountRate !== undefined ? Number(discountRate) : existing.discountRate,
      salvageValue: salvageValue !== undefined ? Number(salvageValue) : existing.salvageValue,
      annualSavings: annualSavings !== undefined ? Number(annualSavings) : existing.annualSavings,
      extraRevenue: extraRevenue !== undefined ? Number(extraRevenue) : existing.extraRevenue,
      extraOpex: extraOpex !== undefined ? Number(extraOpex) : existing.extraOpex,
      annualNetBenefit: fin.annualNetBenefit,
      simplePayback: fin.simplePayback,
      roiPercent: fin.roiPercent,
      npv: fin.npv,
      irr: fin.irr,
      discountedPayback: fin.discountedPayback,
      annualDepreciation: fin.annualDepreciation,
      budgetImpactStatus: budgetCheck.budgetImpactStatus,
    };

    if (bettermentJson) {
      updateData.betterment = typeof bettermentJson === 'string' ? JSON.parse(bettermentJson) : bettermentJson;
    }
    if (customFieldsJson) {
      updateData.customFields = typeof customFieldsJson === 'string' ? JSON.parse(customFieldsJson) : customFieldsJson;
    }

    if (existing.status === 'REVISION_REQUESTED' && resubmitForApproval) {
      updateData.status = 'IN_REVIEW';
    }

    const updated = await Proposal.findByIdAndUpdate(proposalId, updateData, { new: true })
      .populate('department')
      .populate('proposalType');

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      entityType: 'PROPOSAL',
      entityId: existing._id.toString(),
      action: 'UPDATE',
      before: { totalInvestment: existing.totalInvestment, status: existing.status },
      after: { totalInvestment: fin.totalInvestment, status: updated?.status },
      ipAddress: req.ip,
    });

    const enrichedList = await enrichProposalsWithStages([updated]);
    return res.json(enrichedList[0]);
  } catch (err: any) {
    console.error('Error updating proposal:', err);
    return res.status(500).json({ error: err.message || 'Failed to update proposal' });
  }
});

// PDF export endpoint
router.get('/:id/pdf', async (req, res) => {
  try {
    const proposalId = req.params.id as string;
    const proposal = await Proposal.findById(proposalId)
      .populate('proposalType')
      .populate('department')
      .populate('initiator');

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const approvalActions = await ApprovalAction.find({ proposalId: proposal._id })
      .populate('approver')
      .sort({ createdAt: 1 });

    const enrichedList = await enrichProposalsWithStages([proposal]);
    const enriched = {
      ...enrichedList[0],
      approvalActions,
    };

    const doc = generateProposalPdf(enriched as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${proposal.proposalNumber}-Dossier.pdf"`);
    doc.pipe(res);
  } catch (err: any) {
    console.error('Error generating PDF:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
});

export default router;
