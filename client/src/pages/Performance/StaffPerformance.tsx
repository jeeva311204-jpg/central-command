import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, Clock, AlertTriangle, User, Percent, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';

export function StaffPerformance() {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformance();
  }, []);

  const loadPerformance = async () => {
    setLoading(true);
    try {
      const data = await api.getStaffPerformance();
      setPerformanceData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const staffList = performanceData?.staffPerformance || [];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
          <Award className="w-6 h-6 text-brand-600" />
          Staff Operational Performance &amp; Checklist Analytics
        </h1>
        <p className="text-xs text-industrial-500">
          Track checklist task completion rates, on-time SLA metrics, and overdue tasks across plant personnel and engineering departments
        </p>
      </div>

      {/* Staff Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : staffList.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-xs text-industrial-400">
            No staff task assignments logged yet.
          </div>
        ) : (
          staffList.map((stat: any) => {
            const hasOverdue = stat.overdueTasks > 0;

            return (
              <div
                key={stat.user.id}
                className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 p-5 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold flex items-center justify-center text-sm">
                      {stat.user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-industrial-950 dark:text-white">
                        {stat.user.name}
                      </h3>
                      <div className="text-[11px] text-industrial-400">
                        {stat.user.role} • {stat.user.department}
                      </div>
                    </div>
                  </div>

                  {hasOverdue ? (
                    <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px] flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {stat.overdueTasks} Overdue
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                      100% On-Time
                    </span>
                  )}
                </div>

                {/* Rates Bar */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-industrial-50 dark:bg-industrial-800/50">
                    <span className="text-[10px] text-industrial-400 block mb-0.5">Completion Rate</span>
                    <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                      {stat.completionRate}%
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-industrial-50 dark:bg-industrial-800/50">
                    <span className="text-[10px] text-industrial-400 block mb-0.5">On-Time SLA Rate</span>
                    <span className="text-base font-extrabold font-mono text-brand-600 dark:text-brand-400">
                      {stat.onTimeRate}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[11px] text-industrial-500 mb-1">
                    <span>Task Progress</span>
                    <span className="font-mono">{stat.completedTasks} / {stat.totalTasks} Completed</span>
                  </div>
                  <div className="w-full bg-industrial-100 dark:bg-industrial-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${stat.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
