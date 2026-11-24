import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GitPullRequest, PlusCircle, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { Change4M } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';

export function Changes4MList() {
  const navigate = useNavigate();
  const [changes, setChanges] = useState<Change4M[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getChanges4M({ category: selectedCategory || undefined });
      setChanges(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    const c = cat.toUpperCase();
    if (c === 'MAN') return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
    if (c === 'MACHINE') return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
    if (c === 'MATERIAL') return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
            <GitPullRequest className="w-6 h-6 text-brand-600" />
            4M Industrial Change Management (Man • Machine • Material • Method)
          </h1>
          <p className="text-xs text-industrial-500">
            Control shop-floor deviations, evaluate severity × probability risks, assign implementation tasks, and complete verification
          </p>
        </div>

        <Link
          to="/changes4m/new"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Raise 4M Change Request
        </Link>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-industrial-200 dark:border-industrial-800 pb-2 text-xs font-bold">
        {[
          { key: '', label: 'All 4M Changes' },
          { key: 'MAN', label: 'Man (Operator/Skill)' },
          { key: 'MACHINE', label: 'Machine (Tooling/Fixture)' },
          { key: 'MATERIAL', label: 'Material (Grade/Batch)' },
          { key: 'METHOD', label: 'Method (SOP/Process)' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedCategory(tab.key)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedCategory === tab.key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-industrial-600 dark:text-industrial-400 hover:bg-industrial-100 dark:hover:bg-industrial-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Changes List */}
      <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : changes.length === 0 ? (
          <div className="p-12 text-center text-xs text-industrial-400">
            No 4M change requests recorded in this category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-industrial-50 dark:bg-industrial-800/40 text-industrial-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Title &amp; Justification</th>
                  <th className="p-3.5">Linked Proposal</th>
                  <th className="p-3.5">Risk Score</th>
                  <th className="p-3.5">Checklist Tasks</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                {changes.map((c) => {
                  let riskObj: any = {};
                  try {
                    riskObj = JSON.parse(c.riskAssessmentJson || '{}');
                  } catch (e) {}

                  const completedTasks = (c.tasks || []).filter((t: any) => t.status === 'COMPLETED').length;
                  const totalTasks = c.tasks?.length || 0;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/changes4m/${c.id}`)}
                      className="hover:bg-industrial-50 dark:hover:bg-industrial-800/50 cursor-pointer transition-colors"
                    >
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded font-bold text-[10px] uppercase font-mono ${getCategoryColor(c.changeCategory)}`}>
                          {c.changeCategory}
                        </span>
                      </td>

                      <td className="p-3.5 max-w-sm">
                        <div className="font-semibold text-industrial-900 dark:text-industrial-100 truncate">
                          {c.title}
                        </div>
                        <div className="text-[11px] text-industrial-500 truncate mt-0.5">
                          {c.reasonForChange}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-[11px]">
                        {c.proposal ? (
                          <span className="text-brand-600 font-bold">{c.proposal.proposalNumber}</span>
                        ) : (
                          <span className="text-industrial-400">Direct Change</span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono font-bold">
                        <span className="px-2 py-0.5 rounded bg-industrial-100 dark:bg-industrial-800">
                          {riskObj.riskScore ? `${riskObj.riskScore}/25` : 'N/A'}
                        </span>
                      </td>

                      <td className="p-3.5 text-industrial-600 dark:text-industrial-400 font-medium">
                        {totalTasks > 0 ? (
                          <span>{completedTasks} / {totalTasks} Completed</span>
                        ) : (
                          <span className="text-industrial-400">0 Tasks</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <StatusBadge status={c.status} />
                      </td>

                      <td className="p-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
                          Inspect &amp; Verify <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
