export interface FinancialInputs {
  purchasePrice: number;
  installationCost?: number;
  transportCost?: number;
  trainingCost?: number;
  toolingCost?: number;
  otherCost?: number;
  annualSavings: number;
  extraRevenue?: number;
  extraOpex?: number;
  usefulLifeYears: number; // e.g. 5 or 10
  discountRate: number;    // e.g. 10 for 10%
  salvageValue?: number;   // residual value at end of life
}

export interface FinancialOutputs {
  totalInvestment: number;
  annualNetBenefit: number;
  simplePayback: number;       // in years
  roiPercent: number;          // in %
  annualDepreciation: number;  // straight-line per year
  npv: number;                 // Net Present Value
  irr: number;                 // Internal Rate of Return in %
  discountedPayback: number;   // in years
}

export interface BudgetCheckResult {
  allocatedAmount: number;
  utilisedAmount: number;
  availableAmount: number;
  currentUtilisationPercent: number;
  requestedAmount: number;
  projectedUtilisedAmount: number;
  projectedUtilisationPercent: number;
  isOverrun: boolean;
  budgetImpactStatus: 'WITHIN_BUDGET' | 'WARNING_HIGH_UTILISATION' | 'BUDGET_EXCEEDED';
  message: string;
}

/**
 * Calculates complete financial metrics for CAPEX proposal evaluation
 */
export function calculateFinancialMetrics(inputs: FinancialInputs): FinancialOutputs {
  const purchasePrice = Number(inputs.purchasePrice) || 0;
  const installationCost = Number(inputs.installationCost) || 0;
  const transportCost = Number(inputs.transportCost) || 0;
  const trainingCost = Number(inputs.trainingCost) || 0;
  const toolingCost = Number(inputs.toolingCost) || 0;
  const otherCost = Number(inputs.otherCost) || 0;

  const totalInvestment = purchasePrice + installationCost + transportCost + trainingCost + toolingCost + otherCost;

  const annualSavings = Number(inputs.annualSavings) || 0;
  const extraRevenue = Number(inputs.extraRevenue) || 0;
  const extraOpex = Number(inputs.extraOpex) || 0;
  const annualNetBenefit = annualSavings + extraRevenue - extraOpex;

  const usefulLifeYears = Math.max(1, Number(inputs.usefulLifeYears) || 5);
  const salvageValue = Math.max(0, Number(inputs.salvageValue) || 0);
  const discountRatePercent = Number(inputs.discountRate) >= 0 ? Number(inputs.discountRate) : 10;
  const r = discountRatePercent / 100;

  // 1. Simple Payback Period (years)
  const simplePayback = annualNetBenefit > 0 && totalInvestment > 0
    ? Number((totalInvestment / annualNetBenefit).toFixed(2))
    : 0;

  // 2. ROI % (Annual Net Benefit / Total Investment * 100)
  const roiPercent = totalInvestment > 0
    ? Number(((annualNetBenefit / totalInvestment) * 100).toFixed(2))
    : 0;

  // 3. Straight-line Depreciation
  const depreciableAmount = Math.max(0, totalInvestment - salvageValue);
  const annualDepreciation = Number((depreciableAmount / usefulLifeYears).toFixed(2));

  // 4. Net Present Value (NPV)
  // NPV = -totalInvestment + sum(t=1..N, annualNetBenefit / (1+r)^t) + salvageValue / (1+r)^N
  let presentValueOfCashFlows = 0;
  const discountedCashFlows: number[] = [];

  for (let t = 1; t <= usefulLifeYears; t++) {
    const dcf = annualNetBenefit / Math.pow(1 + r, t);
    discountedCashFlows.push(dcf);
    presentValueOfCashFlows += dcf;
  }
  const discountedSalvage = salvageValue / Math.pow(1 + r, usefulLifeYears);
  presentValueOfCashFlows += discountedSalvage;

  const npv = Number((presentValueOfCashFlows - totalInvestment).toFixed(2));

  // 5. Discounted Payback Period (years)
  let cumulativeDcf = 0;
  let discountedPayback = 0;
  let recovered = false;

  for (let t = 1; t <= usefulLifeYears; t++) {
    let cashFlow = discountedCashFlows[t - 1];
    if (t === usefulLifeYears) {
      cashFlow += discountedSalvage;
    }

    const prevCumulative = cumulativeDcf;
    cumulativeDcf += cashFlow;

    if (cumulativeDcf >= totalInvestment && !recovered) {
      recovered = true;
      const fraction = (totalInvestment - prevCumulative) / cashFlow;
      discountedPayback = Number((t - 1 + fraction).toFixed(2));
      break;
    }
  }

  if (!recovered) {
    // If not recovered within useful life, set to usefulLifeYears + 1 or 0
    discountedPayback = annualNetBenefit > 0 ? Number((usefulLifeYears + 1).toFixed(2)) : 0;
  }

  // 6. Internal Rate of Return (IRR) via Newton-Raphson root finding
  const irr = calculateIRR(totalInvestment, annualNetBenefit, usefulLifeYears, salvageValue);

  return {
    totalInvestment: Number(totalInvestment.toFixed(2)),
    annualNetBenefit: Number(annualNetBenefit.toFixed(2)),
    simplePayback,
    roiPercent,
    annualDepreciation,
    npv,
    irr: Number(irr.toFixed(2)),
    discountedPayback,
  };
}

/**
 * Calculates IRR using Newton-Raphson approximation
 */
export function calculateIRR(
  initialInvestment: number,
  annualCashFlow: number,
  years: number,
  salvageValue: number = 0
): number {
  if (initialInvestment <= 0 || (annualCashFlow <= 0 && salvageValue <= 0)) {
    return 0;
  }

  // If total undiscounted cash flows don't even cover initial investment, return negative or 0
  const totalUndiscounted = annualCashFlow * years + salvageValue;
  if (totalUndiscounted <= initialInvestment) {
    return Number((((totalUndiscounted - initialInvestment) / initialInvestment) * 100 / years).toFixed(2));
  }

  let rate = 0.15; // Initial guess 15%
  const maxIterations = 100;
  const tolerance = 1e-6;

  for (let iter = 0; iter < maxIterations; iter++) {
    if (rate <= -0.99) rate = -0.9;

    let f = -initialInvestment;
    let fPrime = 0;

    for (let t = 1; t <= years; t++) {
      const denom = Math.pow(1 + rate, t);
      f += annualCashFlow / denom;
      fPrime -= (t * annualCashFlow) / Math.pow(1 + rate, t + 1);
    }

    if (salvageValue > 0) {
      const denomSalvage = Math.pow(1 + rate, years);
      f += salvageValue / denomSalvage;
      fPrime -= (years * salvageValue) / Math.pow(1 + rate, years + 1);
    }

    if (Math.abs(f) < tolerance) {
      return rate * 100;
    }

    if (Math.abs(fPrime) < 1e-10) {
      break;
    }

    const nextRate = rate - f / fPrime;
    if (Math.abs(nextRate - rate) < tolerance) {
      return nextRate * 100;
    }
    rate = nextRate;
  }

  // Fallback to binary search if Newton-Raphson didn't converge
  let low = -0.5;
  let high = 5.0;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    let npvMid = -initialInvestment;
    for (let t = 1; t <= years; t++) {
      npvMid += annualCashFlow / Math.pow(1 + mid, t);
    }
    npvMid += salvageValue / Math.pow(1 + mid, years);

    if (Math.abs(npvMid) < 0.01) {
      return mid * 100;
    }
    if (npvMid > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return ((low + high) / 2) * 100;
}

/**
 * Checks proposal against department budget and returns overrun status
 */
export function evaluateBudgetImpact(
  allocatedAmount: number,
  utilisedAmount: number,
  requestedAmount: number
): BudgetCheckResult {
  const availableAmount = Math.max(0, allocatedAmount - utilisedAmount);
  const currentUtilisationPercent = allocatedAmount > 0 ? (utilisedAmount / allocatedAmount) * 100 : 0;
  const projectedUtilisedAmount = utilisedAmount + requestedAmount;
  const projectedUtilisationPercent = allocatedAmount > 0 ? (projectedUtilisedAmount / allocatedAmount) * 100 : 0;
  const isOverrun = requestedAmount > availableAmount;

  let budgetImpactStatus: 'WITHIN_BUDGET' | 'WARNING_HIGH_UTILISATION' | 'BUDGET_EXCEEDED' = 'WITHIN_BUDGET';
  let message = `Requested ₹${requestedAmount.toLocaleString('en-IN')} is within available budget ₹${availableAmount.toLocaleString('en-IN')}.`;

  if (isOverrun) {
    budgetImpactStatus = 'BUDGET_EXCEEDED';
    message = `BUDGET OVERRUN ALERT: Requested ₹${requestedAmount.toLocaleString('en-IN')} exceeds available budget ₹${availableAmount.toLocaleString('en-IN')} by ₹${(requestedAmount - availableAmount).toLocaleString('en-IN')} (${projectedUtilisationPercent.toFixed(1)}% total utilisation). Requires Special Management Approval.`;
  } else if (projectedUtilisationPercent > 90) {
    budgetImpactStatus = 'WARNING_HIGH_UTILISATION';
    message = `HIGH UTILISATION WARNING: This proposal will push department budget utilisation to ${projectedUtilisationPercent.toFixed(1)}% (₹${projectedUtilisedAmount.toLocaleString('en-IN')} of ₹${allocatedAmount.toLocaleString('en-IN')}).`;
  }

  return {
    allocatedAmount,
    utilisedAmount,
    availableAmount,
    currentUtilisationPercent: Number(currentUtilisationPercent.toFixed(1)),
    requestedAmount,
    projectedUtilisedAmount,
    projectedUtilisationPercent: Number(projectedUtilisationPercent.toFixed(1)),
    isOverrun,
    budgetImpactStatus,
    message,
  };
}
