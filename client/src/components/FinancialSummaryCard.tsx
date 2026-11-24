import React from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, IndianRupee, Clock, Percent, ShieldCheck } from 'lucide-react';

interface FinancialSummaryCardProps {
  totalInvestment: number;
  annualNetBenefit: number;
  simplePayback: number;
  roiPercent: number;
  npv: number;
  irr: number;
  discountedPayback: number;
  annualDepreciation: number;
  budgetImpactStatus?: string;
  budgetAvailable?: number;
  budgetAllocated?: number;
  isOverrun?: boolean;
}

export function FinancialSummaryCard({
  totalInvestment,
  annualNetBenefit,
  simplePayback,
  roiPercent,
  npv,
  irr,
  discountedPayback,
  annualDepreciation,
  budgetImpactStatus = 'WITHIN_BUDGET',
  budgetAvailable,
  budgetAllocated,
  isOverrun = false,
}: FinancialSummaryCardProps) {
  const isBudgetExceeded = budgetImpactStatus === 'BUDGET_EXCEEDED' || isOverrun;
  const isWarningHigh = budgetImpactStatus === 'WARNING_HIGH_UTILISATION';

  return (
    <div className="bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-industrial-100 dark:border-industrial-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-industrial-900 dark:text-industrial-100">
              Financial Evaluation &amp; CAPEX Viability
            </h3>
            <p className="text-xs text-industrial-500">Live DCF &amp; Discounted Cash Flow Metrics</p>
          </div>
        </div>

        {isBudgetExceeded ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            BUDGET OVERRUN ALERT
          </span>
        ) : isWarningHigh ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            &gt; 90% UTILISATION WARNING
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            WITHIN DEPT BUDGET
          </span>
        )}
      </div>

      {/* Grid of Key Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-industrial-50 dark:bg-industrial-800/50 border border-industrial-100 dark:border-industrial-700/50">
          <div className="text-[11px] font-medium text-industrial-500 uppercase tracking-wider mb-1">
            Total Investment
          </div>
          <div className="text-lg font-bold text-industrial-900 dark:text-industrial-100 font-mono">
            ₹{totalInvestment.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-industrial-50 dark:bg-industrial-800/50 border border-industrial-100 dark:border-industrial-700/50">
          <div className="text-[11px] font-medium text-industrial-500 uppercase tracking-wider mb-1">
            Annual Net Benefit
          </div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            ₹{annualNetBenefit.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-industrial-50 dark:bg-industrial-800/50 border border-industrial-100 dark:border-industrial-700/50">
          <div className="text-[11px] font-medium text-industrial-500 uppercase tracking-wider mb-1">
            Simple Payback
          </div>
          <div className="text-lg font-bold text-brand-600 dark:text-brand-400 font-mono">
            {simplePayback > 0 ? `${simplePayback} Years` : 'N/A'}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-industrial-50 dark:bg-industrial-800/50 border border-industrial-100 dark:border-industrial-700/50">
          <div className="text-[11px] font-medium text-industrial-500 uppercase tracking-wider mb-1">
            Return on Inv. (ROI)
          </div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {roiPercent}%
          </div>
        </div>
      </div>

      {/* Advanced DCF Metrics Bar */}
      <div className="p-3.5 rounded-lg bg-industrial-950 text-white dark:bg-black/60 border border-industrial-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-industrial-400 block mb-0.5">NPV (@ 10% Hurdle)</span>
          <span className={`font-mono font-bold text-sm ${npv >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ₹{npv.toLocaleString('en-IN')}
          </span>
        </div>
        <div>
          <span className="text-industrial-400 block mb-0.5">Internal Rate of Return (IRR)</span>
          <span className="font-mono font-bold text-sm text-cyan-400">
            {irr}%
          </span>
        </div>
        <div>
          <span className="text-industrial-400 block mb-0.5">Discounted Payback</span>
          <span className="font-mono font-bold text-sm text-amber-400">
            {discountedPayback > 0 ? `${discountedPayback} Yrs` : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-industrial-400 block mb-0.5">Straight-Line Depr. / Yr</span>
          <span className="font-mono font-bold text-sm text-slate-300">
            ₹{annualDepreciation.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {budgetAvailable !== undefined && budgetAllocated !== undefined && (
        <div className="text-xs text-industrial-500 flex items-center justify-between pt-1">
          <span>
            Dept Allocated Budget: <strong>₹{budgetAllocated.toLocaleString('en-IN')}</strong> | Available: <strong>₹{budgetAvailable.toLocaleString('en-IN')}</strong>
          </span>
          {isBudgetExceeded && (
            <span className="text-rose-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Overrun by ₹{(totalInvestment - budgetAvailable).toLocaleString('en-IN')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
