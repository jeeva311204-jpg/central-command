import { Router } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';
import { validate, proposalCreateSchema } from '../middleware/validate';
import { calculateFinancialMetrics, evaluateBudgetImpact } from '../services/financial';
import { getApplicableStagesForProposal } from '../services/workflowEngine';
import { logAudit } from '../services/auditLogger';
import { createNotification, sendSimulatedEmail } from '../services/notificationService';
import { generateProposalPdf } from '../services/pdfService';

const router = Router();

// Get all 14 proposal types with schemas
router.get('/types', async (req, res) => {
  const types = await prisma.proposalType.findMany({
    where: { isActive: true },
    include: {
      formSchema: true,
      workflowTemplate: {
        include: {
          stages: { orderBy: { stepOrder: 'asc' } },
        },
      },
    },
    orderBy: { code: 'asc' },
  });
  return res.json(types);
});

// List proposals with filtering
router.get('/', authenticateToken, async (req, res) => {
  const { status, departmentId, proposalTypeId, priority, search, myPendingOnly } = req.query;

  const where: any = {};
  if (status) where.status = String(status);
  if (departmentId) where.departmentId = String(departmentId);
  if (proposalTypeId) where.proposalTypeId = String(proposalTypeId);
  if (priority) where.priority = String(priority);

  if (search) {
    const q = String(search);
    where.OR = [
      { proposalNumber: { contains: q } },
      { title: { contains: q } },
      { machineName: { contains: q } },
      { manufacturer: { contains: q } },
    ];
  }

  // If approver wants pending approvals for their role
  if (myPendingOnly === 'true' && req.user) {
    where.status = 'IN_REVIEW';
    if (req.user.role !== 'Admin') {
      where.currentStage = {
        approverRole: req.user.role,
      };
    }
  }

  const proposals = await prisma.proposal.findMany({
    where,
    include: {
      proposalType: true,
      department: true,
      initiator: {
        select: { id: true, name: true, email: true, role: true },
      },
      currentStage: true,
      approvalActions: {
        include: { approver: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          quotations: true,
          purchaseOrders: true,
          versions: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(proposals);
});

// Excel Export for Proposals List
router.get('/export/excel', authenticateToken, async (req, res) => {
  try {
    const proposals = await prisma.proposal.findMany({
      include: {
        department: true,
        proposalType: true,
        initiator: true,
        currentStage: true,
      },
      orderBy: { createdAt: 'desc' },
    });

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

    proposals.forEach((p) => {
      sheet.addRow({
        proposalNumber: p.proposalNumber,
        title: p.title,
        type: p.proposalType.name,
        department: p.department.name,
        initiator: p.initiator.name,
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

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // Deep Blue
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
  const proposalId = req.params.id as string;
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      proposalType: {
        include: {
          formSchema: true,
          workflowTemplate: {
            include: { stages: { orderBy: { stepOrder: 'asc' } } },
          },
        },
      },
      department: {
        include: {
          budgets: { where: { fiscalYear: 'FY2026-27' } },
        },
      },
      initiator: {
        select: { id: true, name: true, email: true, role: true },
      },
      currentStage: true,
      approvalActions: {
        include: { approver: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
      versions: {
        orderBy: { versionNumber: 'desc' },
      },
      quotations: {
        include: { vendor: true },
        orderBy: { weightedScore: 'desc' },
      },
      purchaseOrders: {
        include: { vendor: true, delivery: true },
      },
      changes4m: {
        include: { tasks: true },
      },
      tasks: {
        include: { assignedTo: true },
      },
      assets: {
        include: { maintenanceSchedules: true },
      },
      auditReviews: {
        orderBy: { intervalMonths: 'asc' },
      },
      documents: {
        include: { uploadedBy: true },
      },
    },
  });

  if (!proposal) {
    return res.status(404).json({ error: 'Proposal not found' });
  }

  // Also calculate applicable stages based on current investment amount
  const applicableStages = await getApplicableStagesForProposal(proposal.id);

  return res.json({
    ...proposal,
    applicableStages,
  });
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

    // 1. Calculate financials live
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

    // 2. Budget evaluation check
    const budget = await prisma.budget.findFirst({
      where: { departmentId, fiscalYear: 'FY2026-27' },
    });
    const budgetAllocated = budget?.allocatedAmount || 10000000;
    const budgetUtilised = budget?.utilisedAmount || 0;
    const budgetCheck = evaluateBudgetImpact(budgetAllocated, budgetUtilised, fin.totalInvestment);

    // Overrun block: reject submissions exceeding available budget unless override provided or privileged role
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

    // 3. Generate Proposal Number (e.g. CF-2026-009)
    const count = await prisma.proposal.count();
    const proposalNumber = `CF-2026-${String(count + 1).padStart(3, '0')}`;

    // 4. Find workflow template and determine initial stage
    const workflowTemplate = await prisma.workflowTemplate.findUnique({
      where: { proposalTypeId },
      include: { stages: { orderBy: { stepOrder: 'asc' } } },
    });

    let initialStageId: string | null = null;
    if (workflowTemplate && workflowTemplate.stages.length > 0) {
      // Find the first stage (always HOD)
      initialStageId = workflowTemplate.stages[0].id;
    }

    // 5. Create proposal
    const proposal = await prisma.proposal.create({
      data: {
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
        bettermentJson: bettermentJson ? (typeof bettermentJson === 'string' ? bettermentJson : JSON.stringify(bettermentJson)) : null,
        customFieldsJson: customFieldsJson ? (typeof customFieldsJson === 'string' ? customFieldsJson : JSON.stringify(customFieldsJson)) : null,
      },
      include: {
        currentStage: true,
        department: true,
      },
    });

    // 6. Log audit
    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      entityType: 'PROPOSAL',
      entityId: proposal.id,
      action: 'CREATE',
      after: { proposalNumber, totalInvestment: fin.totalInvestment, title },
      ipAddress: req.ip,
    });

    // 7. Notify HOD of new proposal submission
    if (proposal.currentStage) {
      const hodUsers = await prisma.user.findMany({
        where: {
          role: { name: proposal.currentStage.approverRole },
          departmentId: proposal.departmentId,
          isActive: true,
        },
      });

      for (const hod of hodUsers) {
        await createNotification(
          hod.id,
          `New Proposal for Approval: ${proposal.proposalNumber}`,
          `${req.user!.name} raised proposal "${proposal.title}" (₹${proposal.totalInvestment.toLocaleString('en-IN')}) for your approval.`,
          'APPROVAL',
          `/proposals/${proposal.id}`
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

    return res.status(201).json(proposal);
  } catch (err: any) {
    console.error('Error creating proposal:', err);
    return res.status(500).json({ error: err.message || 'Failed to create proposal' });
  }
});

// Update / revise proposal
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const proposalId = req.params.id as string;
    const existing = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { currentStage: true },
    });

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

    const budget = await prisma.budget.findFirst({
      where: { departmentId: existing.departmentId, fiscalYear: 'FY2026-27' },
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
      updateData.bettermentJson = typeof bettermentJson === 'string' ? bettermentJson : JSON.stringify(bettermentJson);
    }
    if (customFieldsJson) {
      updateData.customFieldsJson = typeof customFieldsJson === 'string' ? customFieldsJson : JSON.stringify(customFieldsJson);
    }

    // If revision was requested and initiator is resubmitting, advance status back to IN_REVIEW
    if (existing.status === 'REVISION_REQUESTED' && resubmitForApproval) {
      updateData.status = 'IN_REVIEW';
    }

    const updated = await prisma.proposal.update({
      where: { id: proposalId },
      data: updateData,
    });

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      entityType: 'PROPOSAL',
      entityId: existing.id,
      action: 'UPDATE',
      before: { totalInvestment: existing.totalInvestment, status: existing.status },
      after: { totalInvestment: fin.totalInvestment, status: updated.status },
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (err: any) {
    console.error('Error updating proposal:', err);
    return res.status(500).json({ error: err.message || 'Failed to update proposal' });
  }
});

// PDF export endpoint
router.get('/:id/pdf', async (req, res) => {
  try {
    const proposalId = req.params.id as string;
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        proposalType: true,
        department: true,
        initiator: true,
        currentStage: true,
        approvalActions: {
          include: { approver: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const doc = generateProposalPdf(proposal);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${proposal.proposalNumber}-Dossier.pdf"`);
    doc.pipe(res);
  } catch (err: any) {
    console.error('Error generating PDF:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
});

export default router;
