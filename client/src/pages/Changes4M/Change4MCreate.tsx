import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitPullRequest, ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { RiskMatrix } from '../../components/RiskMatrix';

export function Change4MCreate() {
  const navigate = useNavigate();

  const [category, setCategory] = useState<'MAN' | 'MACHINE' | 'MATERIAL' | 'METHOD'>('METHOD');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reasonForChange, setReasonForChange] = useState('');
  const [proposalId, setProposalId] = useState('');
  const [proposals, setProposals] = useState<any[]>([]);

  // Risk matrix
  const [severity, setSeverity] = useState(3);
  const [probability, setProbability] = useState(2);
  const [mitigationPlan, setMitigationPlan] = useState('');

  // Impacts
  const [impactProduction, setImpactProduction] = useState('');
  const [impactQuality, setImpactQuality] = useState('');
  const [impactSafety, setImpactSafety] = useState('');

  // Initial tasks
  const [tasks, setTasks] = useState<{ title: string; dueDate: string }[]>([
    { title: 'Revise Standard Operating Procedure (SOP) documentation', dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0] },
    { title: 'Conduct operator safety and tooling briefing', dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getProposals().then(setProposals).catch(console.error);
  }, []);

  const handleAddTask = () => {
    setTasks([...tasks, { title: '', dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] }]);
  };

  const handleRemoveTask = (idx: number) => {
    setTasks(tasks.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const riskScore = severity * probability;
      const riskLevel = riskScore >= 16 ? 'CRITICAL' : riskScore >= 10 ? 'HIGH' : riskScore >= 6 ? 'MEDIUM' : 'LOW';

      const payload = {
        proposalId: proposalId || null,
        changeCategory: category,
        title,
        description,
        reasonForChange,
        riskAssessment: {
          severity,
          probability,
          riskScore,
          riskLevel,
          mitigationPlan: mitigationPlan || 'Engineering containment & pilot trial verification.',
        },
        impactProduction,
        impactQuality,
        impactSafety,
        tasks: tasks.filter((t) => t.title.trim()),
      };

      const res = await api.createChange4M(payload);
      navigate(`/changes4m/${res.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to raise 4M change');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between pb-4 border-b border-industrial-200 dark:border-industrial-800">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
            <GitPullRequest className="w-6 h-6 text-brand-600" />
            Raise 4M Change Request (Man • Machine • Material • Method)
          </h1>
          <p className="text-xs text-industrial-500">
            Enforce containment protocols and risk scoring before executing modifications on shop floor lines
          </p>
        </div>

        <button
          onClick={() => navigate('/changes4m')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 text-industrial-700 dark:text-industrial-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category & Identification */}
        <div className="bg-white dark:bg-industrial-900 p-6 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300 pb-2 border-b border-industrial-100 dark:border-industrial-800">
            1. Change Identification &amp; 4M Classification
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['MAN', 'MACHINE', 'MATERIAL', 'METHOD'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`py-3 px-3 rounded-lg text-xs font-bold border transition-all ${
                  category === cat
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-industrial-50 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 border-industrial-200 dark:border-industrial-700'
                }`}
              >
                {cat === 'MAN' && '👤 Man (Personnel)'}
                {cat === 'MACHINE' && '⚙️ Machine (Tooling)'}
                {cat === 'MATERIAL' && '📦 Material (Grade)'}
                {cat === 'METHOD' && '📐 Method (Process)'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                Change Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Switch from Wet Flood Coolant to Minimum Quantity Lubrication (MQL)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                Link to Related CAPEX Proposal (Optional)
              </label>
              <select
                value={proposalId}
                onChange={(e) => setProposalId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
              >
                <option value="">No linked proposal (Direct shop-floor change)</option>
                {proposals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.proposalNumber} — {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                Detailed Description of Modification *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Technical details of what is being modified, tool codes, batch changes, machine station..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                Root Cause &amp; Reason for Change *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Why is this change necessary? (Cost reduction, quality fix, supplier obsolescence, ergonomics)"
                value={reasonForChange}
                onChange={(e) => setReasonForChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
              />
            </div>
          </div>
        </div>

        {/* 5x5 Severity x Probability Risk Matrix */}
        <div className="bg-white dark:bg-industrial-900 p-6 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300 pb-2 border-b border-industrial-100 dark:border-industrial-800">
            2. Quantitative Risk Matrix &amp; Containment Plan
          </h3>

          <RiskMatrix
            severity={severity}
            probability={probability}
            onChange={(s, p) => {
              setSeverity(s);
              setProbability(p);
            }}
          />

          <div>
            <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
              Risk Mitigation &amp; Containment Plan *
            </label>
            <textarea
              rows={2}
              required
              placeholder="Controls in place to prevent defects during transition (e.g. 100-piece pilot run, gauge R&R verification)"
              value={mitigationPlan}
              onChange={(e) => setMitigationPlan(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
            />
          </div>
        </div>

        {/* Implementation Checklist Tasks */}
        <div className="bg-white dark:bg-industrial-900 p-6 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-industrial-100 dark:border-industrial-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300">
              3. Implementation Checklist Tasks Assigned to Staff
            </h3>
            <button
              type="button"
              onClick={handleAddTask}
              className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </button>
          </div>

          <div className="space-y-2">
            {tasks.map((task, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Task title (e.g. Pilot batch metrology signoff)"
                  value={task.title}
                  onChange={(e) => {
                    const newTasks = [...tasks];
                    newTasks[idx].title = e.target.value;
                    setTasks(newTasks);
                  }}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700"
                />
                <input
                  type="date"
                  value={task.dueDate}
                  onChange={(e) => {
                    const newTasks = [...tasks];
                    newTasks[idx].dueDate = e.target.value;
                    setTasks(newTasks);
                  }}
                  className="w-36 px-2.5 py-1.5 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveTask(idx)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-600/25 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit 4M Change Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
