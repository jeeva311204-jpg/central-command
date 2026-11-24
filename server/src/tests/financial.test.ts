import { describe, it, expect } from 'vitest';
import { calculateFinancialMetrics, calculateIRR, evaluateBudgetImpact } from '../services/financial';

describe('Financial Evaluation Engine', () => {
  it('calculates total investment correctly with all auxiliary cost components', () => {
    const metrics = calculateFinancialMetrics({
      purchasePrice: 2000000,
      installationCost: 150000,
      transportCost: 50000,
      trainingCost: 60000,
      toolingCost: 140000,
      otherCost: 0,
      annualSavings: 800000,
      extraRevenue: 200000,
      extraOpex: 100000,
      usefulLifeYears: 5,
      discountRate: 10,
      salvageValue: 200000,
    });

    // 20L + 1.5L + 0.5L + 0.6L + 1.4L = 24,00,000
    expect(metrics.totalInvestment).toBe(2400000);
    // 8L + 2L - 1L = 9,00,000
    expect(metrics.annualNetBenefit).toBe(900000);
    // Simple payback: 24,00,000 / 9,00,000 = 2.67 years
    expect(metrics.simplePayback).toBe(2.67);
    // ROI: (900000 / 2400000) * 100 = 37.5%
    expect(metrics.roiPercent).toBe(37.5);
    // Straight line depreciation: (2400000 - 200000) / 5 = 4,40,000 / year
    expect(metrics.annualDepreciation).toBe(440000);
  });

  it('calculates positive NPV and IRR for viable investments', () => {
    const metrics = calculateFinancialMetrics({
      purchasePrice: 1000000,
      installationCost: 0,
      annualSavings: 400000,
      usefulLifeYears: 5,
      discountRate: 10,
      salvageValue: 100000,
    });

    // Cash flows: 4L per year for 5 years + 1L salvage at year 5 with r=10%
    // PV of annuity (400,000 * 3.79078) ~ 1,516,314 + PV(100,000) ~ 62,092 = 1,578,406 - 1,000,000 = 578,406
    expect(metrics.npv).toBeGreaterThan(500000);
    expect(metrics.irr).toBeGreaterThan(25); // ~ 30% IRR
    expect(metrics.discountedPayback).toBeGreaterThan(2.5);
    expect(metrics.discountedPayback).toBeLessThan(4.0);
  });

  it('calculates zero/negative metrics gracefully when net benefit is zero or negative', () => {
    const metrics = calculateFinancialMetrics({
      purchasePrice: 500000,
      annualSavings: 0,
      extraRevenue: 0,
      extraOpex: 50000,
      usefulLifeYears: 5,
      discountRate: 10,
    });

    expect(metrics.annualNetBenefit).toBe(-50000);
    expect(metrics.simplePayback).toBe(0);
    expect(metrics.roiPercent).toBe(-10);
    expect(metrics.npv).toBeLessThan(0);
    expect(metrics.irr).toBeLessThanOrEqual(0);
  });

  it('evaluates budget impact accurately: within budget, high utilisation warning, and overrun', () => {
    // 1. Within budget
    const resultNormal = evaluateBudgetImpact(10000000, 2000000, 3000000);
    expect(resultNormal.availableAmount).toBe(8000000);
    expect(resultNormal.isOverrun).toBe(false);
    expect(resultNormal.budgetImpactStatus).toBe('WITHIN_BUDGET');

    // 2. High utilisation warning (> 90%)
    const resultWarning = evaluateBudgetImpact(10000000, 7000000, 2500000);
    expect(resultWarning.isOverrun).toBe(false);
    expect(resultWarning.projectedUtilisationPercent).toBe(95);
    expect(resultWarning.budgetImpactStatus).toBe('WARNING_HIGH_UTILISATION');

    // 3. Overrun exceeded
    const resultExceeded = evaluateBudgetImpact(10000000, 8500000, 2500000);
    expect(resultExceeded.isOverrun).toBe(true);
    expect(resultExceeded.budgetImpactStatus).toBe('BUDGET_EXCEEDED');
    expect(resultExceeded.message).toContain('BUDGET OVERRUN ALERT');
  });
});
