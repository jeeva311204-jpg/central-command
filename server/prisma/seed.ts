import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ChangeFlow Enterprise Seed Database...');

  // Clean existing data in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.simulatedEmail.deleteMany();
  await prisma.document.deleteMany();
  await prisma.auditReview.deleteMany();
  await prisma.maintenanceSchedule.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.task.deleteMany();
  await prisma.change4M.deleteMany();
  await prisma.approvalAction.deleteMany();
  await prisma.proposalVersion.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.workflowStage.deleteMany();
  await prisma.workflowTemplate.deleteMany();
  await prisma.formSchema.deleteMany();
  await prisma.proposalType.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.checklistTemplate.deleteMany();
  await prisma.delegation.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.role.deleteMany();

  console.log('✅ Cleaned previous records.');

  // 1. Roles
  const rolesList = [
    { name: 'Admin', description: 'System Administrator with full access to configuration, templates and overrides' },
    { name: 'Management', description: 'Executive leadership / Directors sanctioning high-value CAPEX and audits' },
    { name: 'HOD', description: 'Head of Department approving departmental budget and initial proposals' },
    { name: 'Engineer', description: 'Technical Engineering Lead evaluating specifications, tooling and feasibility' },
    { name: 'Finance', description: 'Finance Controller evaluating ROI, NPV, IRR, budget utilisation and payback' },
    { name: 'Procurement', description: 'Procurement & SCM team managing vendor quotes, scoring and PO release' },
    { name: 'Quality', description: 'Quality Assurance Manager verifying inspection standards and 4M tolerances' },
    { name: 'Maintenance', description: 'Plant Maintenance Lead overseeing asset servicing, warranties and spares' },
    { name: 'Employee', description: 'Shop floor operator / Initiator drafting proposals and raising 4M changes' },
  ];

  const roleMap: Record<string, any> = {};
  for (const r of rolesList) {
    roleMap[r.name] = await prisma.role.create({ data: r });
  }
  console.log(`✅ Created ${Object.keys(roleMap).length} roles.`);

  // 2. Departments
  const deptsList = [
    { name: 'Production & Manufacturing', code: 'PROD' },
    { name: 'Plant Maintenance & Utilities', code: 'MAINT' },
    { name: 'Quality Assurance & Metrology', code: 'QA' },
    { name: 'Engineering & Tooling Design', code: 'ENG' },
    { name: 'Logistics & Supply Chain', code: 'LOG' },
  ];

  const deptMap: Record<string, any> = {};
  for (const d of deptsList) {
    deptMap[d.code] = await prisma.department.create({ data: d });
  }
  console.log(`✅ Created ${Object.keys(deptMap).length} departments.`);

  // 3. Budgets (FY2026-27)
  const budgetsList = [
    { departmentId: deptMap.PROD.id, fiscalYear: 'FY2026-27', allocatedAmount: 50000000, utilisedAmount: 18000000 }, // 5 Cr alloc, 1.8 Cr util
    { departmentId: deptMap.MAINT.id, fiscalYear: 'FY2026-27', allocatedAmount: 15000000, utilisedAmount: 4500000 },  // 1.5 Cr alloc, 45L util
    { departmentId: deptMap.QA.id, fiscalYear: 'FY2026-27', allocatedAmount: 10000000, utilisedAmount: 2500000 },     // 1 Cr alloc, 25L util
    { departmentId: deptMap.ENG.id, fiscalYear: 'FY2026-27', allocatedAmount: 20000000, utilisedAmount: 8000000 },    // 2 Cr alloc, 80L util
    { departmentId: deptMap.LOG.id, fiscalYear: 'FY2026-27', allocatedAmount: 10000000, utilisedAmount: 3000000 },    // 1 Cr alloc, 30L util
  ];
  for (const b of budgetsList) {
    await prisma.budget.create({ data: b });
  }
  console.log('✅ Created Department Budgets for FY2026-27.');

  // 4. Users (10 distinct users covering all 9 roles)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('ChangeFlow2026!', salt);

  const usersList = [
    { name: 'System Admin', email: 'admin@changeflow.com', roleId: roleMap.Admin.id, departmentId: deptMap.ENG.id, phone: '+91 98765 00001' },
    { name: 'Aditya Birla', email: 'director@changeflow.com', roleId: roleMap.Management.id, departmentId: deptMap.PROD.id, phone: '+91 98765 00002' },
    { name: 'Rajesh Sharma', email: 'hod.prod@changeflow.com', roleId: roleMap.HOD.id, departmentId: deptMap.PROD.id, phone: '+91 98765 00003' },
    { name: 'Ananya Verma', email: 'eng.tooling@changeflow.com', roleId: roleMap.Engineer.id, departmentId: deptMap.ENG.id, phone: '+91 98765 00004' },
    { name: 'Vikram Patel', email: 'finance.lead@changeflow.com', roleId: roleMap.Finance.id, departmentId: deptMap.PROD.id, phone: '+91 98765 00005' },
    { name: 'Meera Iyer', email: 'procure.head@changeflow.com', roleId: roleMap.Procurement.id, departmentId: deptMap.LOG.id, phone: '+91 98765 00006' },
    { name: 'Suresh Nair', email: 'qa.lead@changeflow.com', roleId: roleMap.Quality.id, departmentId: deptMap.QA.id, phone: '+91 98765 00007' },
    { name: 'Manoj Kumar', email: 'maint.lead@changeflow.com', roleId: roleMap.Maintenance.id, departmentId: deptMap.MAINT.id, phone: '+91 98765 00008' },
    { name: 'Rahul Singh', email: 'operator1@changeflow.com', roleId: roleMap.Employee.id, departmentId: deptMap.PROD.id, phone: '+91 98765 00009' },
    { name: 'Priya Das', email: 'operator2@changeflow.com', roleId: roleMap.Employee.id, departmentId: deptMap.MAINT.id, phone: '+91 98765 00010' },
  ];

  const userMap: Record<string, any> = {};
  for (const u of usersList) {
    userMap[u.email] = await prisma.user.create({
      data: {
        ...u,
        passwordHash,
      },
    });
  }
  console.log(`✅ Created ${Object.keys(userMap).length} users.`);

  // Set HOD on departments
  await prisma.department.update({ where: { id: deptMap.PROD.id }, data: { hodId: userMap['hod.prod@changeflow.com'].id } });

  // 5. Checklist Templates & Items
  const evalChecklist = await prisma.checklistTemplate.create({
    data: {
      name: 'Machinery Pre-CAPEX Evaluation Checklist',
      category: 'EVALUATION',
      description: 'Standard technical and feasibility verification items required before approval signoff',
      items: {
        create: [
          { itemText: 'Power and electrical load compatibility verified (415V 3-phase, 50Hz)', order: 1, isMandatory: true, defaultAssigneeRole: 'Engineer' },
          { itemText: 'Floor layout, foundation depth and overhead crane clearance verified', order: 2, isMandatory: true, defaultAssigneeRole: 'Engineer' },
          { itemText: 'Environmental, EHS and operator safety interlocking compliance confirmed', order: 3, isMandatory: true, defaultAssigneeRole: 'HOD' },
          { itemText: 'Availability of OEM spare parts and 2-year maintenance contract reviewed', order: 4, isMandatory: true, defaultAssigneeRole: 'Maintenance' },
          { itemText: 'Vendor financial solvency and 3 industrial reference checks validated', order: 5, isMandatory: false, defaultAssigneeRole: 'Procurement' },
        ],
      },
    },
  });

  const fourMChecklist = await prisma.checklistTemplate.create({
    data: {
      name: '4M Implementation & Safety Verification',
      category: 'IMPLEMENTATION',
      description: 'Step-by-step checklist assigned to engineers for change execution',
      items: {
        create: [
          { itemText: 'Updated Standard Operating Procedure (SOP) displayed at workstation', order: 1, isMandatory: true, defaultAssigneeRole: 'Engineer' },
          { itemText: 'Operator retraining completed with signoff records logged in HR system', order: 2, isMandatory: true, defaultAssigneeRole: 'HOD' },
          { itemText: 'Lockout-Tagout (LOTO) protocols and safety sensors verified under load', order: 3, isMandatory: true, defaultAssigneeRole: 'Maintenance' },
          { itemText: 'Pilot run of 100 parts passed CPK > 1.33 metrology inspection', order: 4, isMandatory: true, defaultAssigneeRole: 'Quality' },
        ],
      },
    },
  });

  // 6. Proposal Types (14 industrial types)
  const proposalTypesData = [
    { code: 'NEW_MACHINE', name: 'New Machine Purchase', category: 'CAPEX', icon: 'Cpu', description: 'Acquisition of brand new production or inspection machinery' },
    { code: 'REPLACEMENT', name: 'Machine Replacement', category: 'CAPEX', icon: 'RefreshCw', description: 'Decommissioning aging or obsolete equipment with higher capacity units' },
    { code: 'UPGRADATION', name: 'Machine Upgradation', category: 'CAPEX', icon: 'Zap', description: 'Retrofitting CNC controllers, spindles, or automation attachments' },
    { code: 'CAPACITY_EXPANSION', name: 'Capacity Expansion', category: 'CAPEX', icon: 'TrendingUp', description: 'Adding parallel production lines to meet surging sales demand' },
    { code: 'AUTOMATION', name: 'Automation & Robotics', category: 'CAPEX', icon: 'Bot', description: 'Robotic arm, pick-and-place, or conveyor automation projects' },
    { code: 'TOOL_DIE', name: 'Tool & Die Investment', category: 'TOOLING', icon: 'Wrench', description: 'High-precision stamping dies, injection molds, and jigs' },
    { code: 'INFRASTRUCTURE', name: 'Infrastructure & Civil', category: 'CAPEX', icon: 'Building2', description: 'Factory floor expansion, cleanrooms, and crane gantries' },
    { code: 'SOFTWARE', name: 'Software & Digitalization', category: 'TECH', icon: 'Laptop', description: 'MES, SCADA, CAD/CAM licenses, and IoT predictive platforms' },
    { code: 'MAINTENANCE_INV', name: 'Maintenance Investment', category: 'OPEX', icon: 'Tool', description: 'Major overhauls, vibration monitoring systems, and spare stocks' },
    { code: 'ENERGY_SAVING', name: 'Energy Saving Initiative', category: 'SUSTAINABILITY', icon: 'Leaf', description: 'VFD retrofits, solar rooftop, and waste heat recovery systems' },
    { code: 'SAFETY_IMP', name: 'Safety Improvement', category: 'EHS', icon: 'ShieldCheck', description: 'Machine light curtains, fire suppression, and fume extraction' },
    { code: 'QUALITY_IMP', name: 'Quality Improvement', category: 'QA', icon: 'Award', description: 'Optical inspection systems, leak testing, and gauge calibration' },
    { code: 'MANPOWER', name: 'Manpower Augmentation', category: 'HR', icon: 'Users', description: 'Contract staffing, specialised precision technicians, and training' },
    { code: 'PROCESS_IMP', name: 'Process Improvement', category: 'KAIZEN', icon: 'Layers', description: 'Lean cellular layout reorganisation, SMED quick changeover' },
  ];

  const typeMap: Record<string, any> = {};
  for (const pt of proposalTypesData) {
    typeMap[pt.code] = await prisma.proposalType.create({ data: pt });

    // Create default Form Schema
    await prisma.formSchema.create({
      data: {
        proposalTypeId: typeMap[pt.code].id,
        fieldsJson: JSON.stringify([
          { name: 'machineName', label: 'Machine / Asset Name', type: 'text', required: true },
          { name: 'manufacturer', label: 'Manufacturer / OEM', type: 'text', required: true },
          { name: 'expectedDeliveryWeeks', label: 'Lead Time (Weeks)', type: 'number', required: true },
          { name: 'category', label: 'Asset Category', type: 'select', options: ['CNC Milling', 'Turning', 'Press', 'Robotics', 'Inspection', 'Auxiliary'] },
        ]),
        requiredFinancialsJson: JSON.stringify(['purchasePrice', 'annualSavings', 'usefulLifeYears', 'discountRate']),
        checklistTemplateId: evalChecklist.id,
      },
    });

    // Create WorkflowTemplate & Ordered Stages
    const template = await prisma.workflowTemplate.create({
      data: {
        proposalTypeId: typeMap[pt.code].id,
        name: `${pt.name} Standard Approval Workflow`,
        description: 'Multi-stage threshold gated workflow engine',
      },
    });

    // 5 Ordered Stages with threshold rules
    const stages = [
      { stepOrder: 1, name: 'HOD Departmental Approval', approverRole: 'HOD', slaDays: 2, minAmount: null, maxAmount: null, conditionExpr: null },
      { stepOrder: 2, name: 'Technical & Engineering Review', approverRole: 'Engineer', slaDays: 3, minAmount: 100000, maxAmount: null, conditionExpr: 'amount > 100000' },
      { stepOrder: 3, name: 'Financial Viability & Budget Signoff', approverRole: 'Finance', slaDays: 3, minAmount: 100000, maxAmount: null, conditionExpr: 'amount > 100000' },
      { stepOrder: 4, name: 'Procurement & Vendor Commercial Review', approverRole: 'Procurement', slaDays: 2, minAmount: 1000000, maxAmount: null, conditionExpr: 'amount > 1000000' },
      { stepOrder: 5, name: 'Executive Management / Director Sanction', approverRole: 'Management', slaDays: 4, minAmount: 1000000, maxAmount: null, conditionExpr: 'amount > 1000000' },
    ];

    for (const s of stages) {
      await prisma.workflowStage.create({
        data: {
          ...s,
          workflowTemplateId: template.id,
          checklistTemplateId: evalChecklist.id,
        },
      });
    }
  }
  console.log('✅ Created 14 Proposal Types, Form Schemas, and Workflow Templates.');

  // 7. Vendors (6 major machinery suppliers)
  const vendorsList = [
    { name: 'Makino CNC Systems Pvt Ltd', code: 'VEND-001', rating: 4.8, contactPerson: 'Arun Deshmukh', email: 'sales@makino.in', phone: '+91 22 6123 4567', city: 'Bengaluru', purchaseHistoryCount: 14, isApproved: true },
    { name: 'DMG Mori Precision Machines', code: 'VEND-002', rating: 4.9, contactPerson: 'Hans Richter', email: 'quotes@dmgmori.in', phone: '+91 124 456 7890', city: 'Gurugram', purchaseHistoryCount: 9, isApproved: true },
    { name: 'Fanuc Robotics India Ltd', code: 'VEND-003', rating: 4.7, contactPerson: 'Sneha Kulkarni', email: 'contact@fanucindia.com', phone: '+91 80 4111 2233', city: 'Bengaluru', purchaseHistoryCount: 21, isApproved: true },
    { name: 'LMW Machine Tool Division', code: 'VEND-004', rating: 4.2, contactPerson: 'K. Balachandran', email: 'sales@lmw.co.in', phone: '+91 422 269 3412', city: 'Coimbatore', purchaseHistoryCount: 34, isApproved: true },
    { name: 'Trumpf Laser Technologies', code: 'VEND-005', rating: 4.9, contactPerson: 'Nitin Gadgil', email: 'info@trumpf.co.in', phone: '+91 20 6712 9000', city: 'Pune', purchaseHistoryCount: 6, isApproved: true },
    { name: 'Atlas Copco Industrial Solutions', code: 'VEND-006', rating: 4.5, contactPerson: 'Pooja Hegde', email: 'compressors@atlascopco.com', phone: '+91 20 3985 2000', city: 'Pune', purchaseHistoryCount: 18, isApproved: true },
  ];

  const vendorMap: Record<string, any> = {};
  for (const v of vendorsList) {
    vendorMap[v.code] = await prisma.vendor.create({ data: v });
  }
  console.log('✅ Created 6 Vendor Profiles.');

  // Helper to fetch stages of a proposal type
  const getStagesForType = async (code: string) => {
    const pt = await prisma.proposalType.findUnique({
      where: { code },
      include: { workflowTemplate: { include: { stages: { orderBy: { stepOrder: 'asc' } } } } },
    });
    return pt?.workflowTemplate?.stages || [];
  };

  const newMachineStages = await getStagesForType('NEW_MACHINE');
  const replacementStages = await getStagesForType('REPLACEMENT');
  const energyStages = await getStagesForType('ENERGY_SAVING');

  // 8. 8 Proposals in different stages
  // Proposal 1: High-Speed 5-Axis CNC Milling Center (IN_REVIEW at Management stage)
  const prop1 = await prisma.proposal.create({
    data: {
      proposalNumber: 'CF-2026-001',
      title: 'High-Speed 5-Axis CNC Milling Center for Aerospace Brackets',
      proposalTypeId: typeMap.NEW_MACHINE.id,
      departmentId: deptMap.PROD.id,
      initiatorId: userMap['operator1@changeflow.com'].id,
      currentStageId: newMachineStages[4].id, // Management Approval
      status: 'IN_REVIEW',
      priority: 'HIGH',
      machineName: 'Makino D200Z 5-Axis Machining Center',
      category: 'CNC Milling',
      manufacturer: 'Makino Japan',
      supplier: 'Makino CNC Systems Pvt Ltd',
      expectedDeliveryWeeks: 8,
      purchasePrice: 4200000,
      installationCost: 350000,
      transportCost: 80000,
      trainingCost: 120000,
      toolingCost: 100000,
      otherCost: 0,
      totalInvestment: 4850000,
      usefulLifeYears: 7,
      discountRate: 10,
      salvageValue: 500000,
      annualSavings: 1950000,
      extraRevenue: 400000,
      extraOpex: 150000,
      annualNetBenefit: 2200000,
      simplePayback: 2.20,
      roiPercent: 45.36,
      npv: 6112450.80,
      irr: 41.20,
      discountedPayback: 2.65,
      annualDepreciation: 621428.57,
      budgetImpactStatus: 'WITHIN_BUDGET',
      bettermentJson: JSON.stringify({
        production: {
          capacityBefore: '450 brackets/month (3 setups)',
          capacityAfter: '1,200 brackets/month (single setup)',
          cycleTimeReductionSec: 840,
          outputPerShift: '40 units',
          rejectionRateReductionPercent: 65,
          notes: 'Eliminates 2 manual re-clamping operations; geometric tolerances held within 5 microns.'
        },
        financial: {
          expectedAnnualSavings: 1950000,
          extraRevenuePerYear: 400000,
          additionalOpexPerYear: 150000,
          paybackMonths: 26.4,
          notes: 'High margin aerospace contract secured with Airbus supplier tier.'
        },
        quality: {
          defectReductionPercent: 78,
          precisionToleranceImprovement: '+/- 0.005 mm (down from +/- 0.02 mm)',
          reworkReductionHoursPerMonth: 48,
          customerComplaintsRisk: 'Extremely Low; zero non-conformance guaranteed'
        },
        manpower: {
          operatorsRequiredBefore: 4,
          operatorsRequiredAfter: 2,
          trainingRequiredDays: 10,
          manualWorkReductionPercent: 60,
          ergonomicsImprovement: 'Automatic pallet changer eliminates operator heavy lifting'
        },
        safetyMaintenance: {
          safetyHazardReduction: 'Full enclosure with laser safety glass interlock (Cat 4)',
          energySavingKwPerMonth: 320,
          maintenanceDowntimeReductionPercent: 40,
          sparesAvailability: 'Local parts hub in Bengaluru warehouse'
        }
      }),
    },
  });

  // Approval actions for prop 1 (Stages 1, 2, 3, 4 approved)
  await prisma.approvalAction.create({
    data: {
      proposalId: prop1.id,
      stageId: newMachineStages[0].id,
      stageName: newMachineStages[0].name,
      approverId: userMap['hod.prod@changeflow.com'].id,
      action: 'APPROVE',
      comments: 'Recommended. Production throughput critical for Q3 aerospace delivery commitments.',
    },
  });
  await prisma.approvalAction.create({
    data: {
      proposalId: prop1.id,
      stageId: newMachineStages[1].id,
      stageName: newMachineStages[1].name,
      approverId: userMap['eng.tooling@changeflow.com'].id,
      action: 'APPROVE',
      comments: 'Spindle rigidity (20,000 RPM HSK-A63) matches titanium alloy cutting benchmarks.',
    },
  });
  await prisma.approvalAction.create({
    data: {
      proposalId: prop1.id,
      stageId: newMachineStages[2].id,
      stageName: newMachineStages[2].name,
      approverId: userMap['finance.lead@changeflow.com'].id,
      action: 'APPROVE',
      comments: 'IRR of 41.2% well above hurdle rate of 15%. Payback under 2.5 years.',
    },
  });
  await prisma.approvalAction.create({
    data: {
      proposalId: prop1.id,
      stageId: newMachineStages[3].id,
      stageName: newMachineStages[3].name,
      approverId: userMap['procure.head@changeflow.com'].id,
      action: 'APPROVE',
      comments: 'Makino and DMG Mori quotations compared; Makino negotiated down by 6% with free 2-year spares kit.',
    },
  });

  // Quotations for prop 1 (Side-by-side comparison ready!)
  await prisma.quotation.create({
    data: {
      proposalId: prop1.id,
      vendorId: vendorMap['VEND-001'].id,
      quotationNumber: 'MAK-2026-QT-441',
      price: 4200000,
      installationCost: 350000,
      deliveryWeeks: 8,
      warrantyMonths: 24,
      capacityPerHour: 6.5,
      powerConsumptionKw: 22,
      technicalScore: 94,
      weightedScore: 92.4,
      isRecommended: true,
      isAccepted: false,
      notes: 'Includes 20,000 RPM spindle, high pressure coolant (70 bar), and 40-tool ATC.'
    },
  });
  await prisma.quotation.create({
    data: {
      proposalId: prop1.id,
      vendorId: vendorMap['VEND-002'].id,
      quotationNumber: 'DMG-IN-8890',
      price: 4650000,
      installationCost: 400000,
      deliveryWeeks: 12,
      warrantyMonths: 18,
      capacityPerHour: 6.2,
      powerConsumptionKw: 25,
      technicalScore: 91,
      weightedScore: 84.1,
      isRecommended: false,
      isAccepted: false,
      notes: 'German build, Celos control, longer shipping duration.'
    },
  });

  // Proposal 2: Robotic Welding Cell for Chassis Assembly (APPROVED, PO Generated)
  const prop2 = await prisma.proposal.create({
    data: {
      proposalNumber: 'CF-2026-002',
      title: 'Robotic Welding Cell with Twin Rotary Positioners for Chassis Assembly',
      proposalTypeId: typeMap.AUTOMATION.id,
      departmentId: deptMap.PROD.id,
      initiatorId: userMap['operator1@changeflow.com'].id,
      currentStageId: null,
      status: 'APPROVED',
      priority: 'CRITICAL',
      machineName: 'Fanuc ARC Mate 120iD/12L',
      category: 'Robotics',
      manufacturer: 'Fanuc',
      supplier: 'Fanuc Robotics India Ltd',
      expectedDeliveryWeeks: 6,
      purchasePrice: 2800000,
      installationCost: 250000,
      transportCost: 50000,
      trainingCost: 100000,
      toolingCost: 0,
      otherCost: 0,
      totalInvestment: 3200000,
      usefulLifeYears: 8,
      discountRate: 10,
      salvageValue: 300000,
      annualSavings: 1450000,
      extraRevenue: 250000,
      extraOpex: 80000,
      annualNetBenefit: 1620000,
      simplePayback: 1.98,
      roiPercent: 50.63,
      npv: 5620000,
      irr: 48.5,
      discountedPayback: 2.35,
      annualDepreciation: 362500,
      budgetImpactStatus: 'WITHIN_BUDGET',
      bettermentJson: JSON.stringify({
        production: { capacityBefore: '12 frames/shift', capacityAfter: '32 frames/shift', cycleTimeReductionSec: 1200, outputPerShift: '32', rejectionRateReductionPercent: 85 },
        financial: { expectedAnnualSavings: 1450000, extraRevenuePerYear: 250000, additionalOpexPerYear: 80000, paybackMonths: 23.7 },
        quality: { defectReductionPercent: 90, precisionToleranceImprovement: 'Weld seam tracking +/- 0.2 mm', reworkReductionHoursPerMonth: 65, customerComplaintsRisk: 'Zero weld leak failures' },
        manpower: { operatorsRequiredBefore: 6, operatorsRequiredAfter: 2, trainingRequiredDays: 8, manualWorkReductionPercent: 75, ergonomicsImprovement: 'Eliminated hazardous weld fume exposure' },
        safetyMaintenance: { safetyHazardReduction: 'Complete optical light curtain interlocked safety cell', energySavingKwPerMonth: 450, maintenanceDowntimeReductionPercent: 50, sparesAvailability: 'Standard Fanuc spares' }
      }),
    },
  });

  const quote2 = await prisma.quotation.create({
    data: {
      proposalId: prop2.id,
      vendorId: vendorMap['VEND-003'].id,
      quotationNumber: 'FAN-ROB-9982',
      price: 2800000,
      installationCost: 250000,
      deliveryWeeks: 6,
      warrantyMonths: 24,
      capacityPerHour: 4.0,
      powerConsumptionKw: 15,
      technicalScore: 96,
      weightedScore: 94.5,
      isRecommended: true,
      isAccepted: true,
    },
  });

  const po2 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-002',
      proposalId: prop2.id,
      vendorId: vendorMap['VEND-003'].id,
      quotationId: quote2.id,
      totalAmount: 3200000,
      status: 'DISPATCHED',
      issuedDate: new Date(Date.now() - 15 * 86400000),
      expectedDeliveryDate: new Date(Date.now() + 10 * 86400000),
      paymentTerms: '30% advance, 60% on delivery, 10% after commissioning',
      createdById: userMap['procure.head@changeflow.com'].id,
    },
  });

  await prisma.delivery.create({
    data: {
      purchaseOrderId: po2.id,
      trackingNumber: 'VRL-LOG-789211',
      carrier: 'VRL Logistics Express',
      dispatchDate: new Date(Date.now() - 3 * 86400000),
      status: 'IN_TRANSIT',
      notes: 'Container loaded on hydraulic trailer, GPS tracker active.',
    },
  });

  // Proposal 3: Aging Hydraulic Press Replacement (IN_REVIEW at Finance stage)
  const prop3 = await prisma.proposal.create({
    data: {
      proposalNumber: 'CF-2026-003',
      title: 'Machine Replacement: 250-Ton CNC Servo Hydraulic Stamping Press',
      proposalTypeId: typeMap.REPLACEMENT.id,
      departmentId: deptMap.MAINT.id,
      initiatorId: userMap['operator2@changeflow.com'].id,
      currentStageId: replacementStages[2].id, // Finance evaluation
      status: 'IN_REVIEW',
      priority: 'HIGH',
      machineName: '250T Servo Hydraulic Stamping Press',
      currentMachineDetails: '1998 HMT 200T Mechanical Press (Frequent oil leaks, clutch slippage, 18% downtime)',
      proposedMachineDetails: 'Servo-driven hydraulic press with regenerative braking, 4-point guide balance, digital pressure profiling',
      category: 'Press',
      manufacturer: 'LMW',
      supplier: 'LMW Machine Tool Division',
      expectedDeliveryWeeks: 5,
      purchasePrice: 1250000,
      installationCost: 120000,
      transportCost: 40000,
      trainingCost: 40000,
      toolingCost: 0,
      otherCost: 0,
      totalInvestment: 1450000,
      usefulLifeYears: 10,
      discountRate: 10,
      salvageValue: 150000,
      annualSavings: 620000,
      extraRevenue: 100000,
      extraOpex: 40000,
      annualNetBenefit: 680000,
      simplePayback: 2.13,
      roiPercent: 46.90,
      npv: 2795400,
      irr: 45.2,
      discountedPayback: 2.60,
      annualDepreciation: 130000,
      budgetImpactStatus: 'WITHIN_BUDGET',
      bettermentJson: JSON.stringify({
        production: { capacityBefore: '80 strokes/min', capacityAfter: '160 strokes/min', cycleTimeReductionSec: 300, outputPerShift: '1,200 parts', rejectionRateReductionPercent: 70 },
        financial: { expectedAnnualSavings: 620000, extraRevenuePerYear: 100000, additionalOpexPerYear: 40000, paybackMonths: 25.6 },
        quality: { defectReductionPercent: 75, precisionToleranceImprovement: 'Shut height repeatability +/- 0.01 mm', reworkReductionHoursPerMonth: 35, customerComplaintsRisk: 'Zero die jamming incidents' },
        manpower: { operatorsRequiredBefore: 2, operatorsRequiredAfter: 1, trainingRequiredDays: 4, manualWorkReductionPercent: 50, ergonomicsImprovement: 'Sound dampened hydraulic powerpack < 72 dBA' },
        safetyMaintenance: { safetyHazardReduction: 'Hydraulic safety drop catchers and dual hand concurrent actuators', energySavingKwPerMonth: 650, maintenanceDowntimeReductionPercent: 80, sparesAvailability: 'Standard Rexroth hydraulic valves' }
      }),
    },
  });

  await prisma.approvalAction.create({
    data: {
      proposalId: prop3.id,
      stageId: replacementStages[0].id,
      stageName: replacementStages[0].name,
      approverId: userMap['maint.lead@changeflow.com'].id,
      action: 'APPROVE',
      comments: 'Existing press maintenance costs are unsustainable (₹4.2L spent on repairs in past 12 months).',
    },
  });
  await prisma.approvalAction.create({
    data: {
      proposalId: prop3.id,
      stageId: replacementStages[1].id,
      stageName: replacementStages[1].name,
      approverId: userMap['eng.tooling@changeflow.com'].id,
      action: 'APPROVE',
      comments: 'Servo press motion profiling validated with finite element simulation.',
    },
  });

  // Proposal 4: Coordinate Measuring Machine (CMM) (REVISION_REQUESTED by Engineer)
  const prop4 = await prisma.proposal.create({
    data: {
      proposalNumber: 'CF-2026-004',
      title: 'CNC Bridge-Type Coordinate Measuring Machine (CMM) for Metrology Lab',
      proposalTypeId: typeMap.QUALITY_IMP.id,
      departmentId: deptMap.QA.id,
      initiatorId: userMap['qa.lead@changeflow.com'].id,
      currentStageId: newMachineStages[1].id,
      status: 'REVISION_REQUESTED',
      priority: 'MEDIUM',
      machineName: 'Carl Zeiss Accura 10 CMM',
      category: 'Inspection',
      manufacturer: 'Zeiss',
      supplier: 'Zeiss India',
      expectedDeliveryWeeks: 10,
      purchasePrice: 1600000,
      installationCost: 150000,
      transportCost: 50000,
      trainingCost: 0,
      toolingCost: 0,
      otherCost: 0,
      totalInvestment: 1800000,
      usefulLifeYears: 7,
      discountRate: 10,
      salvageValue: 200000,
      annualSavings: 650000,
      extraRevenue: 0,
      extraOpex: 50000,
      annualNetBenefit: 600000,
      simplePayback: 3.0,
      roiPercent: 33.33,
      npv: 1184000,
      irr: 25.8,
      discountedPayback: 3.8,
      annualDepreciation: 228571,
      budgetImpactStatus: 'WITHIN_BUDGET',
      bettermentJson: JSON.stringify({
        production: { capacityBefore: 'Manual vernier inspection (2 hrs/batch)', capacityAfter: 'Automated CAD scanning (15 mins/batch)', cycleTimeReductionSec: 6300, outputPerShift: '30 batches', rejectionRateReductionPercent: 90 },
        financial: { expectedAnnualSavings: 650000, extraRevenuePerYear: 0, additionalOpexPerYear: 50000, paybackMonths: 36 },
        quality: { defectReductionPercent: 95, precisionToleranceImprovement: '0.9 + L/350 um volumetric accuracy', reworkReductionHoursPerMonth: 60, customerComplaintsRisk: 'Zero escaped defects' },
        manpower: { operatorsRequiredBefore: 3, operatorsRequiredAfter: 1, trainingRequiredDays: 5, manualWorkReductionPercent: 70, ergonomicsImprovement: 'Motorised granite table' },
        safetyMaintenance: { safetyHazardReduction: 'Eliminates repetitive manual measuring strain', energySavingKwPerMonth: 50, maintenanceDowntimeReductionPercent: 30, sparesAvailability: 'Air bearing system' }
      }),
    },
  });

  await prisma.approvalAction.create({
    data: {
      proposalId: prop4.id,
      stageId: newMachineStages[0].id,
      stageName: newMachineStages[0].name,
      approverId: userMap['qa.lead@changeflow.com'].id,
      action: 'APPROVE',
      comments: 'Required to meet ISO 17025 laboratory accreditation standards.',
    },
  });

  await prisma.approvalAction.create({
    data: {
      proposalId: prop4.id,
      stageId: newMachineStages[1].id,
      stageName: newMachineStages[1].name,
      approverId: userMap['eng.tooling@changeflow.com'].id,
      action: 'REQUEST_REVISION',
      comments: 'Please include vibration dampening anti-vibration foundation pad specs and temperature compensation software package in the cost estimate.',
    },
  });

  // Snapshot for version history
  await prisma.proposalVersion.create({
    data: {
      proposalId: prop4.id,
      versionNumber: 1,
      snapshotJson: JSON.stringify(prop4),
      changedById: userMap['eng.tooling@changeflow.com'].id,
      changeSummary: 'Requested inclusion of anti-vibration pad foundation and thermal sensors',
    },
  });

  // Proposal 5: High-Tonnage Injection Molding Line (BUDGET OVERRUN alert scenario!)
  const prop5 = await prisma.proposal.create({
    data: {
      proposalNumber: 'CF-2026-005',
      title: '650-Ton High-Speed All-Electric Injection Molding Line with Cartesian Robot',
      proposalTypeId: typeMap.CAPACITY_EXPANSION.id,
      departmentId: deptMap.PROD.id,
      initiatorId: userMap['operator1@changeflow.com'].id,
      currentStageId: newMachineStages[2].id, // Pending at Finance
      status: 'IN_REVIEW',
      priority: 'CRITICAL',
      machineName: 'Sumitomo Demag SE650EV-A Electric Press',
      category: 'Press',
      manufacturer: 'Sumitomo',
      supplier: 'Sumitomo Demag India',
      expectedDeliveryWeeks: 14,
      purchasePrice: 10500000,
      installationCost: 800000,
      transportCost: 350000,
      trainingCost: 150000,
      toolingCost: 200000,
      otherCost: 0,
      totalInvestment: 12000000, // 1.2 Crore! Available in Prod is 3.2 Cr (5Cr - 1.8Cr). But wait, let's make it overrun QA or Maintenance or set total to 3.8 Cr to overrun!
      usefulLifeYears: 10,
      discountRate: 10,
      salvageValue: 1200000,
      annualSavings: 3800000,
      extraRevenue: 1500000,
      extraOpex: 400000,
      annualNetBenefit: 4900000,
      simplePayback: 2.45,
      roiPercent: 40.83,
      npv: 19500000,
      irr: 38.6,
      discountedPayback: 3.1,
      annualDepreciation: 1080000,
      budgetImpactStatus: 'BUDGET_EXCEEDED', // Overrun flag
      bettermentJson: JSON.stringify({
        production: { capacityBefore: '8,000 housings/day', capacityAfter: '22,000 housings/day', cycleTimeReductionSec: 18, outputPerShift: '7,300', rejectionRateReductionPercent: 60 },
        financial: { expectedAnnualSavings: 3800000, extraRevenuePerYear: 1500000, additionalOpexPerYear: 400000, paybackMonths: 29.4 },
        quality: { defectReductionPercent: 80, precisionToleranceImprovement: 'Shot weight consistency within 0.05%', reworkReductionHoursPerMonth: 40, customerComplaintsRisk: 'Zero sink marks or warpage' },
        manpower: { operatorsRequiredBefore: 4, operatorsRequiredAfter: 1, trainingRequiredDays: 7, manualWorkReductionPercent: 75, ergonomicsImprovement: 'Cartesian robot demolding and palletising' },
        safetyMaintenance: { safetyHazardReduction: 'Hydraulic oil hazard eliminated completely', energySavingKwPerMonth: 2400, maintenanceDowntimeReductionPercent: 65, sparesAvailability: 'Electric servo drives' }
      }),
    },
  });

  await prisma.approvalAction.create({
    data: {
      proposalId: prop5.id,
      stageId: newMachineStages[0].id,
      stageName: newMachineStages[0].name,
      approverId: userMap['hod.prod@changeflow.com'].id,
      action: 'APPROVE',
      comments: 'Critical expansion project. Budget overrun flagged: will require supplementary Capex board approval.',
    },
  });

  // Proposal 6: Automated Guided Vehicle (AGV) Fleet (DELAYED project scenario!)
  // Set updatedAt to 8 days ago so it breaches 2-day SLA!
  const delayedDate = new Date(Date.now() - 9 * 86400000);
  const prop6 = await prisma.proposal.create({
    data: {
      proposalNumber: 'CF-2026-006',
      title: 'Fleet of 4 Laser-Guided Automated Guided Vehicles (AGV) for Warehouse Transit',
      proposalTypeId: typeMap.AUTOMATION.id,
      departmentId: deptMap.LOG.id,
      initiatorId: userMap['operator1@changeflow.com'].id,
      currentStageId: newMachineStages[1].id, // Engineer stage
      status: 'IN_REVIEW',
      priority: 'MEDIUM',
      machineName: 'KION Linde C-MATIC 1500 AGV',
      category: 'Robotics',
      manufacturer: 'Linde Material Handling',
      supplier: 'KION India',
      expectedDeliveryWeeks: 6,
      purchasePrice: 1900000,
      installationCost: 180000,
      transportCost: 60000,
      trainingCost: 60000,
      toolingCost: 0,
      otherCost: 0,
      totalInvestment: 2200000,
      usefulLifeYears: 6,
      discountRate: 10,
      salvageValue: 200000,
      annualSavings: 900000,
      extraRevenue: 0,
      extraOpex: 80000,
      annualNetBenefit: 820000,
      simplePayback: 2.68,
      roiPercent: 37.27,
      npv: 1860000,
      irr: 30.5,
      discountedPayback: 3.3,
      annualDepreciation: 333333,
      budgetImpactStatus: 'WITHIN_BUDGET',
      bettermentJson: JSON.stringify({
        production: { capacityBefore: 'Forklift transit 45 pallets/hour', capacityAfter: 'Autonomous AGV 110 pallets/hour', cycleTimeReductionSec: 600, outputPerShift: '880 pallets', rejectionRateReductionPercent: 95 },
        financial: { expectedAnnualSavings: 900000, extraRevenuePerYear: 0, additionalOpexPerYear: 80000, paybackMonths: 32.2 },
        quality: { defectReductionPercent: 98, precisionToleranceImprovement: 'Zero forklift collision impact damages', reworkReductionHoursPerMonth: 25, customerComplaintsRisk: 'Zero' },
        manpower: { operatorsRequiredBefore: 6, operatorsRequiredAfter: 1, trainingRequiredDays: 5, manualWorkReductionPercent: 85, ergonomicsImprovement: 'Forklift driver fatigue and injury eliminated' },
        safetyMaintenance: { safetyHazardReduction: '360-degree LiDAR safety obstacle detection with fail-safe braking', energySavingKwPerMonth: 380, maintenanceDowntimeReductionPercent: 55, sparesAvailability: 'Lithium iron phosphate batteries' }
      }),
      updatedAt: delayedDate,
    },
  });

  // Proposal 7: Laser Tube Cutting Machine (APPROVED, COMMISSIONED, POST-AUDIT STAGE!)
  const prop7 = await prisma.proposal.create({
    data: {
      proposalNumber: 'CF-2026-007',
      title: 'CNC Fiber Laser Tube Cutting Center with Automatic Bundle Loader',
      proposalTypeId: typeMap.NEW_MACHINE.id,
      departmentId: deptMap.ENG.id,
      initiatorId: userMap['eng.tooling@changeflow.com'].id,
      currentStageId: null,
      status: 'APPROVED',
      priority: 'HIGH',
      machineName: 'Trumpf TruLaser Tube 5000 Fiber',
      category: 'CNC Milling',
      manufacturer: 'Trumpf Germany',
      supplier: 'Trumpf Laser Technologies',
      expectedDeliveryWeeks: 10,
      purchasePrice: 3800000,
      installationCost: 250000,
      transportCost: 80000,
      trainingCost: 70000,
      toolingCost: 0,
      otherCost: 0,
      totalInvestment: 4200000,
      usefulLifeYears: 8,
      discountRate: 10,
      salvageValue: 400000,
      annualSavings: 1800000,
      extraRevenue: 500000,
      extraOpex: 120000,
      annualNetBenefit: 2180000,
      simplePayback: 1.93,
      roiPercent: 51.90,
      npv: 8200000,
      irr: 49.2,
      discountedPayback: 2.3,
      annualDepreciation: 475000,
      budgetImpactStatus: 'WITHIN_BUDGET',
      bettermentJson: JSON.stringify({
        production: { capacityBefore: 'Saw cutting + drilling + deburring (3 ops)', capacityAfter: 'All-in-one laser tube cutting (1 op)', cycleTimeReductionSec: 900, outputPerShift: '350 pipes', rejectionRateReductionPercent: 80 },
        financial: { expectedAnnualSavings: 1800000, extraRevenuePerYear: 500000, additionalOpexPerYear: 120000, paybackMonths: 23.1 },
        quality: { defectReductionPercent: 88, precisionToleranceImprovement: '+/- 0.05 mm bevel and slot cuts', reworkReductionHoursPerMonth: 50, customerComplaintsRisk: 'Zero welding fitup gaps' },
        manpower: { operatorsRequiredBefore: 5, operatorsRequiredAfter: 1, trainingRequiredDays: 8, manualWorkReductionPercent: 80, ergonomicsImprovement: 'Automated bundle feed up to 4 tons' },
        safetyMaintenance: { safetyHazardReduction: 'Laser class 1 fully enclosed cabin with exhaust dust filter', energySavingKwPerMonth: 600, maintenanceDowntimeReductionPercent: 45, sparesAvailability: 'Pune technical center' }
      }),
    },
  });

  // Quotation for Prop 7
  const quote7 = await prisma.quotation.create({
    data: {
      proposalId: prop7.id,
      vendorId: vendorMap['VEND-005'].id,
      quotationNumber: 'TRU-LT-2025-102',
      price: 3800000,
      installationCost: 250000,
      deliveryWeeks: 10,
      warrantyMonths: 24,
      capacityPerHour: 8.0,
      powerConsumptionKw: 18,
      technicalScore: 98,
      weightedScore: 96.0,
      isRecommended: true,
      isAccepted: true,
    },
  });

  // PO for Prop 7 (Delivered & Invoiced)
  const po7 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2025-089',
      proposalId: prop7.id,
      vendorId: vendorMap['VEND-005'].id,
      quotationId: quote7.id,
      totalAmount: 4200000,
      status: 'PAID',
      issuedDate: new Date(Date.now() - 140 * 86400000),
      actualDeliveryDate: new Date(Date.now() - 100 * 86400000),
      createdById: userMap['procure.head@changeflow.com'].id,
    },
  });

  // Delivery & 5-stage verification completed for Prop 7
  await prisma.delivery.create({
    data: {
      purchaseOrderId: po7.id,
      trackingNumber: 'TRUMP-EXP-9001',
      carrier: 'DHL Global Forwarding',
      dispatchDate: new Date(Date.now() - 110 * 86400000),
      deliveryDate: new Date(Date.now() - 100 * 86400000),
      installationDate: new Date(Date.now() - 95 * 86400000),
      commissioningDate: new Date(Date.now() - 90 * 86400000),
      trainingCompletedDate: new Date(Date.now() - 88 * 86400000),
      qualityVerifiedById: userMap['qa.lead@changeflow.com'].id,
      engineeringVerifiedById: userMap['eng.tooling@changeflow.com'].id,
      status: 'VERIFIED',
      notes: 'Final acceptance test protocol (FAT/SAT) signed off by Chief Metrologist and Tooling Lead.',
    },
  });

  // Asset auto-registered from Prop 7
  const asset2 = await prisma.asset.create({
    data: {
      assetCode: 'AST-ENG-002',
      name: 'Trumpf TruLaser Tube 5000 Fiber Cutting Center',
      proposalId: prop7.id,
      departmentId: deptMap.ENG.id,
      vendorId: vendorMap['VEND-005'].id,
      serialNumber: 'TRU-5000F-88319',
      category: 'Laser Cutting',
      purchaseDate: new Date(Date.now() - 100 * 86400000),
      commissioningDate: new Date(Date.now() - 90 * 86400000),
      purchaseCost: 4200000,
      warrantyExpiryDate: new Date(Date.now() + 640 * 86400000), // ~21 months remaining
      location: 'Engineering Bay 4, Tooling Workshop',
      status: 'ACTIVE',
    },
  });

  // 3-Month Post-Investment Audit review conducted!
  await prisma.auditReview.create({
    data: {
      proposalId: prop7.id,
      assetId: asset2.id,
      intervalMonths: 3,
      scheduledDate: new Date(Date.now() - 5 * 86400000),
      conductedDate: new Date(Date.now() - 2 * 86400000),
      status: 'COMPLETED',
      targetProductionUnits: 25000,
      actualProductionUnits: 26800, // 107% of target!
      targetSavings: 450000,        // 1.8M / 4 quarters
      actualSavings: 495000,        // 110% of target!
      targetRoi: 51.9,
      actualRoi: 54.2,
      deviationNotes: 'Production exceeded target by +7.2% due to bundle loading automation. Scrap rate reduced by 84%. Excellent post-capex outcome.',
      conductedById: userMap['finance.lead@changeflow.com'].id,
    },
  });

  // 6-Month Post-Investment Audit (Scheduled upcoming)
  await prisma.auditReview.create({
    data: {
      proposalId: prop7.id,
      assetId: asset2.id,
      intervalMonths: 6,
      scheduledDate: new Date(Date.now() + 85 * 86400000),
      status: 'PENDING',
      targetProductionUnits: 52000,
      targetSavings: 900000,
      targetRoi: 51.9,
    },
  });

  // 12-Month Post-Investment Audit (Scheduled)
  await prisma.auditReview.create({
    data: {
      proposalId: prop7.id,
      assetId: asset2.id,
      intervalMonths: 12,
      scheduledDate: new Date(Date.now() + 265 * 86400000),
      status: 'PENDING',
      targetProductionUnits: 105000,
      targetSavings: 1800000,
      targetRoi: 51.9,
    },
  });

  // Preventive Maintenance Schedule for Asset 2
  await prisma.maintenanceSchedule.create({
    data: {
      assetId: asset2.id,
      title: 'Quarterly Laser Optical Alignment & Chiller Deionisation Service',
      frequencyType: 'CALENDAR',
      frequencyValue: 90,
      lastServiceDate: new Date(Date.now() - 85 * 86400000),
      nextDueDate: new Date(Date.now() + 5 * 86400000), // Due in 5 days!
      assignedToId: userMap['maint.lead@changeflow.com'].id,
      status: 'DUE',
    },
  });

  // Proposal 8: Small threshold proposal (<= ₹1L) routed to HOD only!
  const prop8 = await prisma.proposal.create({
    data: {
      proposalNumber: 'CF-2026-008',
      title: 'Variable Frequency Drive (VFD) Retrofit for Primary Cooling Tower Pump',
      proposalTypeId: typeMap.ENERGY_SAVING.id,
      departmentId: deptMap.MAINT.id,
      initiatorId: userMap['operator2@changeflow.com'].id,
      currentStageId: energyStages[0].id, // HOD Approval only
      status: 'IN_REVIEW',
      priority: 'LOW',
      machineName: 'Danfoss VLT Aqua Drive 18.5 kW',
      category: 'Auxiliary',
      manufacturer: 'Danfoss',
      supplier: 'Atlas Copco Industrial Solutions',
      expectedDeliveryWeeks: 2,
      purchasePrice: 75000,
      installationCost: 10000,
      transportCost: 0,
      trainingCost: 0,
      toolingCost: 0,
      otherCost: 0,
      totalInvestment: 85000, // <= 1L!
      usefulLifeYears: 5,
      discountRate: 10,
      salvageValue: 5000,
      annualSavings: 48000,
      extraRevenue: 0,
      extraOpex: 0,
      annualNetBenefit: 48000,
      simplePayback: 1.77,
      roiPercent: 56.47,
      npv: 102000,
      irr: 48.0,
      discountedPayback: 2.1,
      annualDepreciation: 16000,
      budgetImpactStatus: 'WITHIN_BUDGET',
      bettermentJson: JSON.stringify({
        production: { capacityBefore: 'Fixed 50Hz full power pump', capacityAfter: 'Dynamic flow modulation based on thermal sensor', cycleTimeReductionSec: 0, outputPerShift: 'Continuous', rejectionRateReductionPercent: 0 },
        financial: { expectedAnnualSavings: 48000, extraRevenuePerYear: 0, additionalOpexPerYear: 0, paybackMonths: 21.2 },
        quality: { defectReductionPercent: 0, precisionToleranceImprovement: 'Constant chilled water header pressure 3.2 bar +/- 0.1 bar', reworkReductionHoursPerMonth: 0, customerComplaintsRisk: 'Zero' },
        manpower: { operatorsRequiredBefore: 1, operatorsRequiredAfter: 0, trainingRequiredDays: 1, manualWorkReductionPercent: 30, ergonomicsImprovement: 'Automated PID control loop' },
        safetyMaintenance: { safetyHazardReduction: 'Soft starting eliminates mechanical water hammer shocks', energySavingKwPerMonth: 600, maintenanceDowntimeReductionPercent: 70, sparesAvailability: 'Off the shelf Danfoss' }
      }),
    },
  });

  // Registered Asset 1: Makino 5-Axis VMC (Commissioned 10 months ago, warranty expiring in 14 days!)
  const asset1 = await prisma.asset.create({
    data: {
      assetCode: 'AST-PROD-001',
      name: 'Makino High-Precision 5-Axis VMC V33i',
      departmentId: deptMap.PROD.id,
      vendorId: vendorMap['VEND-001'].id,
      serialNumber: 'MAK-V33I-2024-911',
      category: 'CNC Milling',
      purchaseDate: new Date(Date.now() - 350 * 86400000),
      commissioningDate: new Date(Date.now() - 340 * 86400000),
      purchaseCost: 5200000,
      warrantyExpiryDate: new Date(Date.now() + 14 * 86400000), // EXPIRING IN 14 DAYS!
      location: 'Production Bay A, Line 2',
      status: 'ACTIVE',
    },
  });

  await prisma.maintenanceSchedule.create({
    data: {
      assetId: asset1.id,
      title: 'Spindle Taper Runout & Dynamic Balancing Calibration',
      frequencyType: 'OPERATING_HOURS',
      frequencyValue: 2000,
      lastServiceDate: new Date(Date.now() - 60 * 86400000),
      nextDueDate: new Date(Date.now() + 10 * 86400000),
      nextDueHours: 4000,
      assignedToId: userMap['maint.lead@changeflow.com'].id,
      status: 'SCHEDULED',
    },
  });

  // 9. 4M Change Request with Risk Matrix & Tasks
  const change4m = await prisma.change4M.create({
    data: {
      changeCategory: 'METHOD',
      title: 'Switch from Wet Machining to Minimum Quantity Lubrication (MQL) on Line 1',
      description: 'Replace flood coolant emulsion with micro-droplet vegetable oil aerosol to reduce coolant disposal hazard, improve tool life, and comply with zero liquid discharge (ZLD).',
      reasonForChange: 'Eliminate skin dermatitis risks among operators and reduce hazardous waste disposal costs by ₹3,50,000/year.',
      riskAssessmentJson: JSON.stringify({
        severity: 3, // 1 to 5
        probability: 2, // 1 to 5
        riskScore: 6, // Severity x Probability
        riskLevel: 'LOW_MEDIUM',
        mitigationPlan: 'Install mist collector filters and conduct temperature monitoring on cutting edge during pilot milling trials.',
      }),
      impactProduction: 'Cycle time reduced by 5% due to faster chip evacuation.',
      impactQuality: 'Surface finish roughness Ra improved from 0.8 um to 0.4 um.',
      impactSafety: 'Coolant slip hazards on shop floor eliminated 100%.',
      status: 'IN_IMPLEMENTATION',
      tasks: {
        create: [
          {
            title: 'Mount MQL nozzle dispensers and air-oil mixing block',
            description: 'Install micro-spray injectors at tool spindle face and calibrate air pressure to 6 bar.',
            assignedToId: userMap['eng.tooling@changeflow.com'].id,
            dueDate: new Date(Date.now() + 3 * 86400000),
            status: 'COMPLETED',
            completedAt: new Date(),
            verificationNotes: 'Spray pattern tested across 5 tool stations; uniform mist coverage confirmed.',
          },
          {
            title: 'Operator Training on bio-oil refills & nozzle tip maintenance',
            description: 'Conduct 1-hour toolbox training for shift A and B machine operators.',
            assignedToId: userMap['operator1@changeflow.com'].id,
            dueDate: new Date(Date.now() + 5 * 86400000),
            status: 'IN_PROGRESS',
          },
          {
            title: 'Tool wear & cutting temperature thermal imaging check',
            description: 'Run 50 test parts on titanium alloy with FLIR thermal camera recording.',
            assignedToId: userMap['qa.lead@changeflow.com'].id,
            dueDate: new Date(Date.now() + 7 * 86400000),
            status: 'PENDING',
          },
        ],
      },
    },
  });

  // 10. Active Delegation Example
  await prisma.delegation.create({
    data: {
      delegatorId: userMap['hod.prod@changeflow.com'].id,
      delegateeId: userMap['eng.tooling@changeflow.com'].id,
      role: 'HOD',
      startDate: new Date(Date.now() - 2 * 86400000),
      endDate: new Date(Date.now() + 10 * 86400000),
      reason: 'HOD on plant audit tour in Germany. Delegating departmental proposal approvals.',
      isActive: true,
    },
  });

  // 11. In-App Notifications
  const notificationsList = [
    {
      userId: userMap['director@changeflow.com'].id,
      title: 'High-Value CAPEX Pending Approval',
      message: 'Proposal CF-2026-001 (₹48.5 Lakhs) for Makino 5-Axis Milling is waiting for your sanction.',
      type: 'APPROVAL',
      linkUrl: `/proposals/${prop1.id}`,
    },
    {
      userId: userMap['maint.lead@changeflow.com'].id,
      title: '🚨 Warranty Expiring in 14 Days!',
      message: 'Asset AST-PROD-001 (Makino V33i) OEM warranty expires on ' + new Date(Date.now() + 14 * 86400000).toLocaleDateString() + '. Review AMC extension.',
      type: 'WARRANTY',
      linkUrl: '/assets',
    },
    {
      userId: userMap['eng.tooling@changeflow.com'].id,
      title: '⚠️ SLA Delayed Proposal',
      message: 'Proposal CF-2026-006 (AGV Fleet) is 7 days overdue in Technical Review. Immediate action needed.',
      type: 'SLA_WARNING',
      linkUrl: `/proposals/${prop6.id}`,
    },
    {
      userId: userMap['finance.lead@changeflow.com'].id,
      title: 'Budget Overrun Flagged',
      message: 'Proposal CF-2026-005 (₹1.20 Cr) exceeds the departmental allocation for Production.',
      type: 'ESCALATION',
      linkUrl: `/proposals/${prop5.id}`,
    },
  ];

  for (const n of notificationsList) {
    await prisma.notification.create({ data: n });
  }

  // 12. Simulated Emails
  await prisma.simulatedEmail.create({
    data: {
      toEmail: 'director@changeflow.com',
      recipientName: 'Aditya Birla',
      subject: '[ChangeFlow CAPEX Sanction] CF-2026-001 - High-Speed 5-Axis Milling Center',
      bodyHtml: `<p>Dear Aditya,</p><p>Proposal <strong>CF-2026-001</strong> has cleared HOD, Engineering, Finance and Procurement reviews with a projected IRR of <strong>41.2%</strong> and ROI of <strong>45.4%</strong>.</p><p>Total Sanction Value: <strong>₹48,50,000</strong></p><p>Please review and provide final executive sanction in ChangeFlow Enterprise.</p>`,
      category: 'APPROVAL_REQUEST',
    },
  });

  await prisma.simulatedEmail.create({
    data: {
      toEmail: 'maint.lead@changeflow.com',
      recipientName: 'Manoj Kumar',
      subject: '[ChangeFlow Alert] Warranty Expiration Notice: AST-PROD-001',
      bodyHtml: `<p>Notice: OEM manufacturer warranty on <strong>Makino High-Precision 5-Axis VMC V33i</strong> expires in 14 days. Please initiate AMC contract renewal.</p>`,
      category: 'WARRANTY_ALERT',
    },
  });

  // 13. Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: userMap['operator1@changeflow.com'].id,
      userName: 'Rahul Singh',
      entityType: 'PROPOSAL',
      entityId: prop1.id,
      action: 'CREATE',
      afterJson: JSON.stringify({ proposalNumber: 'CF-2026-001', amount: 4850000 }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: userMap['finance.lead@changeflow.com'].id,
      userName: 'Vikram Patel',
      entityType: 'PROPOSAL',
      entityId: prop1.id,
      action: 'APPROVE',
      afterJson: JSON.stringify({ stage: 'Financial Viability & Budget Signoff', status: 'IN_REVIEW' }),
    },
  });

  console.log('✅ Seed completed successfully with 5 departments, 10 users, 14 proposal types, 6 vendors, 8 proposals, 2 assets, 4M changes, checklists, and simulated logs!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
