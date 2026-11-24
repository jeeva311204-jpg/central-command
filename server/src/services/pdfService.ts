import PDFDocument from 'pdfkit';
import { Proposal, Department, User, WorkflowStage, ApprovalAction, ProposalType } from '@prisma/client';

type FullProposal = Proposal & {
  proposalType: ProposalType;
  department: Department;
  initiator: User;
  currentStage: WorkflowStage | null;
  approvalActions: (ApprovalAction & { approver: User })[];
};

export function generateProposalPdf(proposal: FullProposal): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  // Header Banner
  doc.rect(40, 40, 515, 60).fill('#1e293b');
  doc.fillColor('#ffffff').fontSize(18).text('CHANGEFLOW ENTERPRISE', 55, 52, { bold: true } as any);
  doc.fontSize(10).fillColor('#94a3b8').text('INTEGRATED 4M CHANGE & CAPEX DOSSIER', 55, 75);
  doc.fontSize(12).fillColor('#38bdf8').text(proposal.proposalNumber, 440, 60, { align: 'right' });

  let y = 115;

  // Title & Status
  doc.fillColor('#0f172a').fontSize(14).text(proposal.title, 40, y, { width: 515, bold: true } as any);
  y += 35;

  doc.fontSize(9).fillColor('#64748b').text('STATUS:', 40, y);
  doc.fillColor(proposal.status === 'APPROVED' ? '#16a34a' : proposal.status === 'REJECTED' ? '#dc2626' : '#2563eb')
     .fontSize(10).text(proposal.status, 90, y);

  doc.fillColor('#64748b').fontSize(9).text('PRIORITY:', 220, y);
  doc.fillColor('#0f172a').fontSize(9).text(proposal.priority, 275, y);

  doc.fillColor('#64748b').fontSize(9).text('DEPARTMENT:', 370, y);
  doc.fillColor('#0f172a').fontSize(9).text(proposal.department.name, 450, y);
  y += 20;

  doc.fillColor('#64748b').fontSize(9).text('INITIATOR:', 40, y);
  doc.fillColor('#0f172a').fontSize(9).text(proposal.initiator.name, 95, y);

  doc.fillColor('#64748b').fontSize(9).text('TYPE:', 220, y);
  doc.fillColor('#0f172a').fontSize(9).text(proposal.proposalType.name, 255, y);

  doc.fillColor('#64748b').fontSize(9).text('DATE:', 370, y);
  doc.fillColor('#0f172a').fontSize(9).text(new Date(proposal.createdAt).toLocaleDateString(), 450, y);
  y += 30;

  // Section 1: Machine & Technical Specification
  doc.rect(40, y, 515, 20).fill('#f1f5f9');
  doc.fillColor('#1e293b').fontSize(10).text('1. ASSET & TECHNICAL SPECIFICATIONS', 48, y + 5, { bold: true } as any);
  y += 28;

  doc.fillColor('#475569').fontSize(9);
  doc.text(`Machine / Asset: ${proposal.machineName || 'N/A'}`, 48, y);
  doc.text(`Manufacturer / OEM: ${proposal.manufacturer || 'N/A'}`, 300, y);
  y += 16;
  doc.text(`Asset Category: ${proposal.category || 'N/A'}`, 48, y);
  doc.text(`Lead Time: ${proposal.expectedDeliveryWeeks || 4} Weeks`, 300, y);
  y += 16;

  if (proposal.currentMachineDetails) {
    doc.text(`Current Machine: ${proposal.currentMachineDetails}`, 48, y, { width: 500 });
    y += 20;
  }
  y += 10;

  // Section 2: Capital Investment Breakdown
  doc.rect(40, y, 515, 20).fill('#f1f5f9');
  doc.fillColor('#1e293b').fontSize(10).text('2. CAPITAL EXPENDITURE (CAPEX) BREAKDOWN', 48, y + 5, { bold: true } as any);
  y += 28;

  const costItems = [
    ['Purchase Base Price', `₹${proposal.purchasePrice.toLocaleString('en-IN')}`],
    ['Installation & Civil Works', `₹${proposal.installationCost.toLocaleString('en-IN')}`],
    ['Freight & Transport', `₹${proposal.transportCost.toLocaleString('en-IN')}`],
    ['Operator & Maintenance Training', `₹${proposal.trainingCost.toLocaleString('en-IN')}`],
    ['Tooling, Jigs & Fixtures', `₹${proposal.toolingCost.toLocaleString('en-IN')}`],
    ['TOTAL SANCTIONED INVESTMENT', `₹${proposal.totalInvestment.toLocaleString('en-IN')}`],
  ];

  costItems.forEach(([label, val], idx) => {
    const isTotal = idx === costItems.length - 1;
    if (isTotal) {
      doc.rect(45, y - 2, 505, 18).fill('#e2e8f0');
      doc.fillColor('#0f172a').fontSize(10).text(label, 50, y + 2, { bold: true } as any);
      doc.text(val, 430, y + 2, { bold: true, align: 'right' } as any);
      y += 24;
    } else {
      doc.fillColor('#475569').fontSize(9).text(label, 50, y);
      doc.text(val, 430, y, { align: 'right' });
      y += 15;
    }
  });

  y += 10;

  // Section 3: Financial Feasibility
  doc.rect(40, y, 515, 20).fill('#f1f5f9');
  doc.fillColor('#1e293b').fontSize(10).text('3. FINANCIAL EVALUATION (DISCOUNTED CASH FLOW & ROI)', 48, y + 5, { bold: true } as any);
  y += 28;

  const finMetrics = [
    ['Annual Net Benefit', `₹${proposal.annualNetBenefit.toLocaleString('en-IN')}`],
    ['Simple Payback Period', `${proposal.simplePayback} Years`],
    ['Return on Investment (ROI)', `${proposal.roiPercent}%`],
    ['Net Present Value (NPV @ 10%)', `₹${proposal.npv.toLocaleString('en-IN')}`],
    ['Internal Rate of Return (IRR)', `${proposal.irr}%`],
    ['Discounted Payback Period', `${proposal.discountedPayback} Years`],
    ['Straight-Line Depreciation / Yr', `₹${proposal.annualDepreciation.toLocaleString('en-IN')}`],
    ['Department Budget Status', proposal.budgetImpactStatus],
  ];

  finMetrics.forEach(([label, val]) => {
    doc.fillColor('#475569').fontSize(9).text(label, 50, y);
    doc.fillColor('#0f172a').text(val, 430, y, { align: 'right', bold: true } as any);
    y += 15;
  });

  y += 15;

  // Section 4: 5-Pillar Betterment Analysis
  doc.rect(40, y, 515, 20).fill('#f1f5f9');
  doc.fillColor('#1e293b').fontSize(10).text('4. 5-PILLAR BETTERMENT ANALYSIS SUMMARY', 48, y + 5, { bold: true } as any);
  y += 28;

  if (proposal.bettermentJson) {
    try {
      const b = JSON.parse(proposal.bettermentJson);
      doc.fillColor('#0f172a').fontSize(9);
      if (b.production) {
        doc.text(`• Production: Capacity Before: ${b.production.capacityBefore || 'N/A'} -> After: ${b.production.capacityAfter || 'N/A'} (Rejection -${b.production.rejectionRateReductionPercent || 0}%)`, 50, y);
        y += 14;
      }
      if (b.financial) {
        doc.text(`• Financial: Expected Savings: ₹${(b.financial.expectedAnnualSavings || 0).toLocaleString('en-IN')}/yr | Payback: ${b.financial.paybackMonths || 0} mos`, 50, y);
        y += 14;
      }
      if (b.quality) {
        doc.text(`• Quality: Defect Reduction: ${b.quality.defectReductionPercent || 0}% | Precision: ${b.quality.precisionToleranceImprovement || 'N/A'}`, 50, y);
        y += 14;
      }
      if (b.manpower) {
        doc.text(`• Manpower: Operators Before: ${b.manpower.operatorsRequiredBefore || 0} -> After: ${b.manpower.operatorsRequiredAfter || 0} | Ergonomics: ${b.manpower.ergonomicsImprovement || 'N/A'}`, 50, y);
        y += 14;
      }
      if (b.safetyMaintenance) {
        doc.text(`• Safety & Maintenance: Hazard: ${b.safetyMaintenance.safetyHazardReduction || 'N/A'} | Energy Saved: ${b.safetyMaintenance.energySavingKwPerMonth || 0} kWh/mo`, 50, y);
        y += 14;
      }
    } catch (e) {
      doc.text('Betterment analysis data attached in digital repository.', 50, y);
      y += 14;
    }
  }

  y += 15;

  // Section 5: Audit & Approval Trail
  if (y > 680) {
    doc.addPage();
    y = 50;
  }

  doc.rect(40, y, 515, 20).fill('#f1f5f9');
  doc.fillColor('#1e293b').fontSize(10).text('5. DIGITAL AUDIT & APPROVAL SIGN-OFF TRAIL', 48, y + 5, { bold: true } as any);
  y += 28;

  if (proposal.approvalActions && proposal.approvalActions.length > 0) {
    proposal.approvalActions.forEach(action => {
      doc.fillColor('#0f172a').fontSize(9).text(`${action.stageName} — ${action.action}`, 50, y, { bold: true } as any);
      doc.fillColor('#64748b').fontSize(8).text(new Date(action.createdAt).toLocaleString(), 400, y, { align: 'right' });
      y += 13;
      doc.fillColor('#475569').fontSize(8).text(`Approver: ${action.approver.name} (${action.approver.email}) | Comments: "${action.comments || 'Approved'}"`, 60, y);
      y += 18;
    });
  } else {
    doc.fillColor('#64748b').fontSize(9).text('Awaiting first stage approval.', 50, y);
    y += 20;
  }

  // Footer on current page
  doc.fontSize(8).fillColor('#94a3b8').text('Confidential — ChangeFlow Enterprise Industrial Platform — Immutable Audit Record', 40, 780, { align: 'center', width: 515 });

  doc.end();
  return doc;
}
