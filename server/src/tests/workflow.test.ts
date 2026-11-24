import { describe, it, expect } from 'vitest';
import { isStageApplicable } from '../services/workflowEngine';

describe('Workflow Threshold Rules & Stage Filter Engine', () => {
  const hodStage = { approverRole: 'HOD', minAmount: null, maxAmount: null, conditionExpr: null };
  const engineerStage = { approverRole: 'Engineer', minAmount: 100000, maxAmount: null, conditionExpr: 'amount > 100000' };
  const financeStage = { approverRole: 'Finance', minAmount: 100000, maxAmount: null, conditionExpr: 'amount > 100000' };
  const procurementStage = { approverRole: 'Procurement', minAmount: 1000000, maxAmount: null, conditionExpr: 'amount > 1000000' };
  const managementStage = { approverRole: 'Management', minAmount: 1000000, maxAmount: null, conditionExpr: 'amount > 1000000' };

  it('routes proposals <= ₹1 Lakh (₹1,00,000) only to HOD', () => {
    const smallAmount = 75000; // ₹75K

    expect(isStageApplicable(hodStage, smallAmount)).toBe(true);
    expect(isStageApplicable(engineerStage, smallAmount)).toBe(false);
    expect(isStageApplicable(financeStage, smallAmount)).toBe(false);
    expect(isStageApplicable(procurementStage, smallAmount)).toBe(false);
    expect(isStageApplicable(managementStage, smallAmount)).toBe(false);
  });

  it('routes proposals between ₹1L and ₹10L to HOD, Technical (Engineer) and Finance only', () => {
    const midAmount = 650000; // ₹6.5 Lakhs

    expect(isStageApplicable(hodStage, midAmount)).toBe(true);
    expect(isStageApplicable(engineerStage, midAmount)).toBe(true);
    expect(isStageApplicable(financeStage, midAmount)).toBe(true);
    expect(isStageApplicable(procurementStage, midAmount)).toBe(false);
    expect(isStageApplicable(managementStage, midAmount)).toBe(false);
  });

  it('routes proposals > ₹10 Lakhs to all 5 stages (HOD, Technical, Finance, Procurement, Management)', () => {
    const capexAmount = 3500000; // ₹35 Lakhs

    expect(isStageApplicable(hodStage, capexAmount)).toBe(true);
    expect(isStageApplicable(engineerStage, capexAmount)).toBe(true);
    expect(isStageApplicable(financeStage, capexAmount)).toBe(true);
    expect(isStageApplicable(procurementStage, capexAmount)).toBe(true);
    expect(isStageApplicable(managementStage, capexAmount)).toBe(true);
  });

  it('respects explicit custom minAmount and maxAmount overrides', () => {
    const customStage = {
      approverRole: 'Management',
      minAmount: 5000000, // Explicit 50 Lakhs min
      maxAmount: null,
      conditionExpr: null,
    };

    expect(isStageApplicable(customStage, 2000000)).toBe(false);
    expect(isStageApplicable(customStage, 6000000)).toBe(true);
  });

  it('evaluates dynamic condition expressions accurately', () => {
    const conditionStage = {
      approverRole: 'Management',
      minAmount: null,
      maxAmount: null,
      conditionExpr: 'amount > 2000000',
    };

    expect(isStageApplicable(conditionStage, 1500000)).toBe(false);
    expect(isStageApplicable(conditionStage, 2500000)).toBe(true);
  });
});
