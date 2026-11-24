import React from 'react';
import { CheckCircle2, Clock, AlertCircle, XCircle, ArrowRight } from 'lucide-react';
import { WorkflowStage, ApprovalAction } from '../types';

interface WorkflowTrackerProps {
  stages: WorkflowStage[];
  currentStageId?: string | null;
  status: string;
  approvalActions?: ApprovalAction[];
}

export function WorkflowTracker({
  stages = [],
  currentStageId,
  status,
  approvalActions = [],
}: WorkflowTrackerProps) {
  if (!stages || stages.length === 0) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm text-slate-500">
        No workflow stages configured for this proposal type.
      </div>
    );
  }

  // Find index of current stage
  const currentIndex = currentStageId
    ? stages.findIndex(s => s.id === currentStageId)
    : status === 'APPROVED'
    ? stages.length
    : -1;

  return (
    <div className="w-full bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-industrial-100 dark:border-industrial-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-500" />
          Multi-Stage Workflow Approval Pipeline
        </h3>
        <span className="text-xs text-industrial-500 font-mono">
          {status === 'APPROVED' ? 'All Stages Approved' : status === 'REJECTED' ? 'Proposal Rejected' : `Stage ${currentIndex + 1} of ${stages.length}`}
        </span>
      </div>

      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {stages.map((stage, idx) => {
            const isApproved = status === 'APPROVED' || (currentIndex !== -1 && idx < currentIndex);
            const isCurrent = currentStageId === stage.id && status !== 'APPROVED' && status !== 'REJECTED';
            const isRejected = status === 'REJECTED' && currentStageId === stage.id;
            const isRevision = status === 'REVISION_REQUESTED' && currentStageId === stage.id;
            const isUpcoming = idx > currentIndex && status !== 'APPROVED';

            // Find approval action for this stage if available
            const stageAction = approvalActions.find(a => a.stageId === stage.id);

            let cardBg = 'bg-industrial-50/70 dark:bg-industrial-800/40 border-industrial-200 dark:border-industrial-800 text-industrial-500';
            let icon = <div className="w-6 h-6 rounded-full bg-industrial-200 dark:bg-industrial-700 text-industrial-600 dark:text-industrial-300 flex items-center justify-center text-xs font-bold">{idx + 1}</div>;

            if (isApproved) {
              cardBg = 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200';
              icon = <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />;
            } else if (isCurrent) {
              cardBg = 'bg-brand-50/80 dark:bg-brand-950/40 border-brand-500 dark:border-brand-500 ring-2 ring-brand-500/20 text-brand-900 dark:text-brand-100 animate-pulse-subtle';
              icon = (
                <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-brand-100 dark:ring-brand-900">
                  {idx + 1}
                </div>
              );
            } else if (isRejected) {
              cardBg = 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200';
              icon = <XCircle className="w-6 h-6 text-rose-600" />;
            } else if (isRevision) {
              cardBg = 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200';
              icon = <AlertCircle className="w-6 h-6 text-amber-600" />;
            }

            return (
              <div
                key={stage.id}
                className={`relative p-3 rounded-lg border transition-all duration-200 ${cardBg}`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-xs font-bold uppercase tracking-wider opacity-75">
                      Stage {stage.stepOrder}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/70 dark:bg-industrial-900/70 border border-black/5 dark:border-white/5">
                    {stage.slaDays}d SLA
                  </span>
                </div>

                <div className="font-semibold text-xs leading-tight mb-1 text-industrial-900 dark:text-industrial-100">
                  {stage.name}
                </div>

                <div className="flex items-center justify-between text-[11px] opacity-80 mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                  <span className="font-medium text-industrial-700 dark:text-industrial-300">
                    Role: {stage.approverRole}
                  </span>
                  {isApproved && <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">Approved</span>}
                  {isCurrent && <span className="text-brand-600 dark:text-brand-400 text-[10px] font-bold">Pending Review</span>}
                  {isRejected && <span className="text-rose-600 text-[10px] font-bold">Rejected</span>}
                  {isRevision && <span className="text-amber-600 text-[10px] font-bold">Changes Req.</span>}
                  {isUpcoming && <span className="text-industrial-400 text-[10px]">Upcoming</span>}
                </div>

                {stageAction && stageAction.comments && (
                  <div className="mt-1.5 text-[10px] text-industrial-600 dark:text-industrial-400 italic line-clamp-1" title={stageAction.comments}>
                    "{stageAction.comments}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
