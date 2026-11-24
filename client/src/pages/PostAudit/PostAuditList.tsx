import React, { useState, useEffect } from 'react';
import { FileCheck, CheckCircle2, TrendingUp, AlertCircle, BarChart2, Plus, Calendar } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../../lib/api';
import { AuditReview } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';

export function PostAuditList() {
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Conduct audit modal
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [actualUnits, setActualUnits] = useState<number>(0);
  const [actualSavings, setActualSavings] = useState<number>(0);
  const [actualRoi, setActualRoi] = useState<number>(0);
  const [deviationNotes, setDeviationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAudits();
  }, []);

  const loadAudits = async () => {
    setLoading(true);
    try {
      const data = await api.getPostAudits();
      setAudits(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAudit) return;
    setSubmitting(true);
    try {
      await api.conductPostAudit(selectedAudit.id, {
        actualProductionUnits: Number(actualUnits),
        actualSavings: Number(actualSavings),
        actualRoi: Number(actualRoi),
        deviationNotes,
      });
      setSelectedAudit(null);
      await loadAudits();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Prepare chart data for Target vs Actual Savings
  const chartData = audits.map((a) => ({
    name: `${a.proposal?.proposalNumber} (${a.intervalMonths}M)`,
    TargetSavings: Math.round((a.targetSavings || 0) / 1000), // In Thousands
    ActualSavings: Math.round((a.actualSavings || 0) / 1000),
  }));

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-brand-600" />
          Post-Investment CAPEX Audit &amp; Performance Review
        </h1>
        <p className="text-xs text-industrial-500">
          3, 6 and 12-Month Scheduled Audits comparing actual production output, financial savings &amp; ROI against original proposal projections
        </p>
      </div>

      {/* Target vs Actual Savings Chart */}
      <div className="bg-white dark:bg-industrial-900 p-5 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-industrial-100 dark:border-industrial-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-brand-500" />
            Projected vs Actual Cost Savings Realization (₹ in Thousands)
          </h3>
          <span className="text-[10px] font-mono text-industrial-400">Post-CAPEX Variance Analysis</span>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
              <YAxis fontSize={11} stroke="#94a3b8" />
              <Tooltip
                formatter={(val: any) => [`₹${val} Thousand`]}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="TargetSavings" name="Projected Target (₹K)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ActualSavings" name="Actual Realized (₹K)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Audits Table */}
      <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-industrial-100 dark:border-industrial-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300">
            Scheduled Post-CAPEX Audit Reviews ({audits.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : audits.length === 0 ? (
          <div className="p-12 text-center text-xs text-industrial-400">
            No post-investment audits scheduled yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-industrial-50 dark:bg-industrial-800/40 text-industrial-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Interval</th>
                  <th className="p-3.5">Proposal Dossier</th>
                  <th className="p-3.5">Target Savings</th>
                  <th className="p-3.5">Actual Realized</th>
                  <th className="p-3.5">Target vs Actual ROI</th>
                  <th className="p-3.5">Scheduled Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                {audits.map((a) => {
                  const isCompleted = a.status === 'COMPLETED';

                  return (
                    <tr key={a.id} className="hover:bg-industrial-50 dark:hover:bg-industrial-800/50">
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                          {a.intervalMonths} Months
                        </span>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <div className="font-semibold text-industrial-900 dark:text-industrial-100 truncate">
                          {a.proposal?.title}
                        </div>
                        <div className="text-[11px] text-industrial-500 font-mono">
                          {a.proposal?.proposalNumber} • {a.proposal?.department?.name}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono">
                        ₹{(a.targetSavings || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {isCompleted ? `₹${(a.actualSavings || 0).toLocaleString('en-IN')}` : 'Pending Review'}
                      </td>

                      <td className="p-3.5 font-mono">
                        {isCompleted ? (
                          <span>
                            Target: {a.targetRoi}% → <strong>Actual: {a.actualRoi}%</strong>
                          </span>
                        ) : (
                          <span>Target: {a.targetRoi}%</span>
                        )}
                      </td>

                      <td className="p-3.5 text-industrial-500">
                        {new Date(a.scheduledDate).toLocaleDateString()}
                      </td>

                      <td className="p-3.5">
                        <StatusBadge status={a.status} />
                      </td>

                      <td className="p-3.5 text-right">
                        {!isCompleted ? (
                          <button
                            onClick={() => {
                              setSelectedAudit(a);
                              setActualUnits(a.targetProductionUnits || 10000);
                              setActualSavings(a.targetSavings || 500000);
                              setActualRoi(a.targetRoi || 40);
                            }}
                            className="px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-700 text-white font-semibold text-[11px]"
                          >
                            Conduct Audit
                          </button>
                        ) : (
                          <span className="text-emerald-600 font-bold text-[11px] flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Audited
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONDUCT AUDIT MODAL */}
      <Modal
        isOpen={!!selectedAudit}
        onClose={() => setSelectedAudit(null)}
        title={`Conduct ${selectedAudit?.intervalMonths}-Month Post-Investment Review`}
      >
        <form onSubmit={handleConductSubmit} className="space-y-4 text-xs">
          <p className="text-industrial-500">
            Compare actual shop-floor production output and savings against original proposal {selectedAudit?.proposal?.proposalNumber}.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Actual Production Output (Units)</label>
              <input
                type="number"
                value={actualUnits}
                onChange={(e) => setActualUnits(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Actual Net Cost Savings (₹ INR) *</label>
              <input
                type="number"
                required
                value={actualSavings}
                onChange={(e) => setActualSavings(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono font-bold text-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Actual Realized ROI (%) *</label>
              <input
                type="number"
                step="0.1"
                required
                value={actualRoi}
                onChange={(e) => setActualRoi(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Audit Findings &amp; Variance Notes *</label>
            <textarea
              rows={3}
              required
              placeholder="Explain any positive or negative variance vs proposal target (e.g. higher throughput, lower tool wear)..."
              value={deviationNotes}
              onChange={(e) => setDeviationNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setSelectedAudit(null)}
              className="px-4 py-2 rounded-lg bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
            >
              {submitting ? 'Recording Audit...' : 'Save Audit Findings'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
