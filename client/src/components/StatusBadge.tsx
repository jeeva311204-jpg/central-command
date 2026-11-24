import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const s = status ? status.toUpperCase() : '';

  let colorClasses = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';

  if (['APPROVED', 'COMPLETED', 'ACTIVE', 'PAID', 'VERIFIED'].includes(s)) {
    colorClasses = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
  } else if (['IN_REVIEW', 'IN_PROGRESS', 'IN_IMPLEMENTATION', 'IN_TRANSIT', 'DISPATCHED'].includes(s)) {
    colorClasses = 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 dark:border-blue-800';
  } else if (['REVISION_REQUESTED', 'WARNING_HIGH_UTILISATION', 'DUE'].includes(s)) {
    colorClasses = 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-800';
  } else if (['REJECTED', 'BUDGET_EXCEEDED', 'OVERDUE'].includes(s)) {
    colorClasses = 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 dark:border-rose-800';
  } else if (['DRAFT', 'CREATED', 'SCHEDULED', 'PENDING'].includes(s)) {
    colorClasses = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  }[size];

  // Friendly display name
  const formatted = s.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${colorClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      {formatted}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const p = priority ? priority.toUpperCase() : 'MEDIUM';

  const config: Record<string, { bg: string; text: string; border: string }> = {
    LOW: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' },
    MEDIUM: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    HIGH: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
    CRITICAL: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  };

  const style = config[p] || config.MEDIUM;

  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}>
      {p}
    </span>
  );
}
