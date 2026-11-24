import React from 'react';

interface RiskMatrixProps {
  severity: number;
  probability: number;
  onChange?: (severity: number, probability: number) => void;
  interactive?: boolean;
}

export function RiskMatrix({
  severity,
  probability,
  onChange,
  interactive = true,
}: RiskMatrixProps) {
  const severities = [
    { level: 5, label: '5 - Catastrophic' },
    { level: 4, label: '4 - Major' },
    { level: 3, label: '3 - Moderate' },
    { level: 2, label: '2 - Minor' },
    { level: 1, label: '1 - Negligible' },
  ];

  const probabilities = [
    { level: 1, label: '1 - Rare' },
    { level: 2, label: '2 - Unlikely' },
    { level: 3, label: '3 - Possible' },
    { level: 4, label: '4 - Likely' },
    { level: 5, label: '5 - Frequent' },
  ];

  const getCellColor = (sev: number, prob: number) => {
    const score = sev * prob;
    const isSelected = sev === severity && prob === probability;

    let base = '';
    if (score >= 16) base = 'bg-rose-500 text-white';
    else if (score >= 10) base = 'bg-amber-500 text-white';
    else if (score >= 6) base = 'bg-yellow-400 text-industrial-900';
    else base = 'bg-emerald-500 text-white';

    const selectedRing = isSelected ? 'ring-4 ring-offset-2 ring-brand-500 scale-105 z-10 shadow-lg font-black' : 'opacity-85 hover:opacity-100';

    return `${base} ${selectedRing}`;
  };

  const riskScore = severity * probability;
  let riskLevel = 'LOW';
  let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
  if (riskScore >= 16) {
    riskLevel = 'CRITICAL RISK';
    badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
  } else if (riskScore >= 10) {
    riskLevel = 'HIGH RISK';
    badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
  } else if (riskScore >= 6) {
    riskLevel = 'MEDIUM RISK';
    badgeColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300';
  }

  return (
    <div className="bg-white dark:bg-industrial-900 p-4 rounded-xl border border-industrial-200 dark:border-industrial-800 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300">
          4M Severity × Probability Risk Matrix
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-industrial-500">
            Score: <strong className="font-mono text-sm">{riskScore}</strong> / 25
          </span>
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badgeColor}`}>
            {riskLevel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-1.5 text-xs text-center font-mono">
        <div className="text-[10px] text-industrial-400 font-bold self-center">SEVERITY ↓</div>
        {probabilities.map(p => (
          <div key={p.level} className="text-[10px] text-industrial-500 font-medium pb-1 truncate" title={p.label}>
            P{p.level}
          </div>
        ))}

        {severities.map(s => (
          <React.Fragment key={s.level}>
            <div className="text-[10px] text-industrial-500 font-medium self-center text-left truncate" title={s.label}>
              S{s.level}
            </div>
            {probabilities.map(p => {
              const score = s.level * p.level;
              return (
                <button
                  type="button"
                  key={`${s.level}-${p.level}`}
                  disabled={!interactive}
                  onClick={() => onChange && onChange(s.level, p.level)}
                  className={`h-9 rounded flex items-center justify-center font-bold text-xs transition-all ${getCellColor(
                    s.level,
                    p.level
                  )}`}
                >
                  {score}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="text-[11px] text-industrial-400 text-right">
        {interactive && 'Click any cell to update 4M risk classification'}
      </div>
    </div>
  );
}
