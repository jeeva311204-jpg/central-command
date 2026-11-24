import React, { useState, useEffect } from 'react';
import { Sliders, Clock, ShieldCheck, UserCheck, Edit3, Plus, AlertCircle, ArrowRight, Zap, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { WorkflowTemplate, WorkflowStage, Delegation } from '../../types';
import { Modal } from '../../components/Modal';

export function WorkflowAdmin() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Stage Modal
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null);
  const [stageName, setStageName] = useState('');
  const [approverRole, setApproverRole] = useState('');
  const [slaDays, setSlaDays] = useState(3);
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [conditionExpr, setConditionExpr] = useState('');
  const [savingStage, setSavingStage] = useState(false);

  // New Delegation Modal
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [delegateeId, setDelegateeId] = useState('');
  const [delegationRole, setDelegationRole] = useState('HOD');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [delegationReason, setDelegationReason] = useState('Approver on technical plant audit. Delegating review authority.');

  // SLA Check Feedback
  const [slaFeedback, setSlaFeedback] = useState<string>('');
  const [runningSla, setRunningSla] = useState(false);

  useEffect(() => {
    loadAll();
    api.getDemoUsers().then(setDemoUsers).catch(console.error);
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tData, dData] = await Promise.all([
        api.getWorkflowTemplates(),
        api.getDelegations(),
      ]);
      setTemplates(tData);
      setDelegations(dData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStage = (stage: WorkflowStage) => {
    setEditingStage(stage);
    setStageName(stage.name);
    setApproverRole(stage.approverRole);
    setSlaDays(stage.slaDays);
    setMinAmount(stage.minAmount !== null && stage.minAmount !== undefined ? String(stage.minAmount) : '');
    setMaxAmount(stage.maxAmount !== null && stage.maxAmount !== undefined ? String(stage.maxAmount) : '');
    setConditionExpr(stage.conditionExpr || '');
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStage) return;
    setSavingStage(true);
    try {
      await api.updateWorkflowStage(editingStage.id, {
        name: stageName,
        approverRole,
        slaDays: Number(slaDays),
        minAmount: minAmount ? Number(minAmount) : null,
        maxAmount: maxAmount ? Number(maxAmount) : null,
        conditionExpr: conditionExpr || null,
      });
      setEditingStage(null);
      await loadAll();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingStage(false);
    }
  };

  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateeId) return;
    try {
      await api.createDelegation({
        delegateeId,
        role: delegationRole,
        startDate,
        endDate,
        reason: delegationReason,
      });
      setShowDelegationModal(false);
      await loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevokeDelegation = async (id: string) => {
    try {
      await api.revokeDelegation(id);
      await loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerSla = async () => {
    setRunningSla(true);
    setSlaFeedback('');
    try {
      const res = await api.runSlaCheck();
      setSlaFeedback(`SLA Escalation engine finished: ${res.escalatedCount} delayed proposal(s) flagged and escalated to Management.`);
    } catch (err: any) {
      setSlaFeedback(`SLA Check error: ${err.message}`);
    } finally {
      setRunningSla(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-brand-600" />
            Configurable Workflow Engine &amp; Threshold Rules
          </h1>
          <p className="text-xs text-industrial-500">
            Workflows are DATA, not hardcoded. Configure multi-tier threshold rules (&lt;= ₹1L, ₹1L-₹10L, &gt; ₹10L), SLA escalation triggers, and delegations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerSla}
            disabled={runningSla}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all"
            title="Runs automated check for overdue proposals and triggers immediate escalation emails"
          >
            <Zap className="w-4 h-4" />
            {runningSla ? 'Evaluating SLAs...' : 'Trigger SLA Escalation Check'}
          </button>

          <button
            onClick={() => setShowDelegationModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all"
          >
            <UserCheck className="w-4 h-4" />
            New Delegation
          </button>
        </div>
      </div>

      {slaFeedback && (
        <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{slaFeedback}</span>
        </div>
      )}

      {/* Threshold Business Rule Explainer Banner */}
      <div className="p-4 rounded-xl bg-brand-50/70 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 text-brand-950 dark:text-brand-100 text-xs space-y-1.5 shadow-sm">
        <span className="font-extrabold text-sm block flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          Active Enterprise Financial Threshold Matrix (Admin-Editable)
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px]">
          <div className="p-2.5 rounded bg-white dark:bg-industrial-900 border border-brand-200 dark:border-brand-800">
            <strong>Tier 1: ≤ ₹1,00,000 (₹1 Lakh)</strong>
            <p className="text-industrial-500 mt-0.5">Expedited fast-track: HOD Department Approval only.</p>
          </div>
          <div className="p-2.5 rounded bg-white dark:bg-industrial-900 border border-brand-200 dark:border-brand-800">
            <strong>Tier 2: ₹1,00,000 – ₹10,00,000 (₹1L – ₹10L)</strong>
            <p className="text-industrial-500 mt-0.5">HOD + Technical Engineering Lead + Finance Evaluation.</p>
          </div>
          <div className="p-2.5 rounded bg-white dark:bg-industrial-900 border border-brand-200 dark:border-brand-800">
            <strong>Tier 3: &gt; ₹10,00,000 (&gt; ₹10 Lakhs)</strong>
            <p className="text-industrial-500 mt-0.5">HOD + Technical + Finance + Procurement + Director / Management Sanction.</p>
          </div>
        </div>
      </div>

      {/* Templates & Stages List */}
      <div className="space-y-4">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-industrial-100 dark:border-industrial-800">
              <div>
                <h3 className="font-extrabold text-sm text-industrial-950 dark:text-white">
                  {tpl.name}
                </h3>
                <span className="text-[11px] text-industrial-400 font-mono">
                  Linked Proposal Category: {tpl.proposalType?.name}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Active Template
              </span>
            </div>

            {/* Stages Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-industrial-50 dark:bg-industrial-800/40 text-industrial-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 w-16">Step</th>
                    <th className="p-2.5">Stage Name</th>
                    <th className="p-2.5">Approver Role</th>
                    <th className="p-2.5">SLA Days</th>
                    <th className="p-2.5">Threshold / Condition</th>
                    <th className="p-2.5 text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                  {tpl.stages.map((stage) => (
                    <tr key={stage.id} className="hover:bg-industrial-50 dark:hover:bg-industrial-800/50">
                      <td className="p-2.5 font-bold font-mono text-brand-600">
                        #{stage.stepOrder}
                      </td>
                      <td className="p-2.5 font-semibold text-industrial-900 dark:text-industrial-100">
                        {stage.name}
                      </td>
                      <td className="p-2.5 font-medium">
                        <span className="px-2 py-0.5 rounded bg-industrial-100 dark:bg-industrial-800 text-industrial-800 dark:text-industrial-200 font-mono">
                          {stage.approverRole}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono">
                        {stage.slaDays} Days
                      </td>
                      <td className="p-2.5 font-mono text-industrial-600 dark:text-industrial-400">
                        {stage.conditionExpr || (stage.minAmount ? `amount >= ₹${stage.minAmount.toLocaleString('en-IN')}` : 'All Values')}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => handleEditStage(stage)}
                          className="p-1 rounded text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors"
                          title="Edit Stage Rules"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Active Delegations Table */}
      <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-industrial-100 dark:border-industrial-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-brand-500" />
            Active Approval Authority Delegations ({delegations.length})
          </h3>
          <span className="text-[10px] text-industrial-400">
            Allows delegatees to act on proposals during approver leave or audits
          </span>
        </div>

        {delegations.length === 0 ? (
          <div className="text-center py-4 text-xs text-industrial-400">
            No active approval delegations recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-industrial-50 dark:bg-industrial-800/40 text-industrial-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Delegator</th>
                  <th className="p-2.5">Delegatee</th>
                  <th className="p-2.5">Delegated Role</th>
                  <th className="p-2.5">Duration</th>
                  <th className="p-2.5">Reason</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                {delegations.map((d) => (
                  <tr key={d.id} className="hover:bg-industrial-50 dark:hover:bg-industrial-800/50">
                    <td className="p-2.5 font-semibold text-industrial-900 dark:text-industrial-100">
                      {d.delegator?.name}
                    </td>
                    <td className="p-2.5 font-semibold text-brand-600">
                      {d.delegatee?.name}
                    </td>
                    <td className="p-2.5 font-mono">
                      <span className="px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold">
                        {d.role}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-industrial-600 dark:text-industrial-400">
                      {new Date(d.startDate).toLocaleDateString()} → {new Date(d.endDate).toLocaleDateString()}
                    </td>
                    <td className="p-2.5 text-industrial-500 italic max-w-xs truncate">
                      "{d.reason}"
                    </td>
                    <td className="p-2.5 text-right">
                      {d.isActive ? (
                        <button
                          onClick={() => handleRevokeDelegation(d.id)}
                          className="px-2 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 text-[11px] font-bold"
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="text-industrial-400 font-bold text-[11px]">Revoked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT STAGE MODAL */}
      <Modal
        isOpen={!!editingStage}
        onClose={() => setEditingStage(null)}
        title={`Edit Workflow Stage Rules: ${editingStage?.name}`}
      >
        <form onSubmit={handleSaveStage} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold mb-1">Stage Name *</label>
            <input
              type="text"
              required
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Approver Role *</label>
              <select
                value={approverRole}
                onChange={(e) => setApproverRole(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
              >
                <option value="HOD">HOD</option>
                <option value="Engineer">Engineer</option>
                <option value="Finance">Finance</option>
                <option value="Procurement">Procurement</option>
                <option value="Management">Management</option>
                <option value="Quality">Quality</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">SLA Limit (Days) *</label>
              <input
                type="number"
                min="1"
                max="30"
                required
                value={slaDays}
                onChange={(e) => setSlaDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Min Threshold Amount (₹)</label>
              <input
                type="number"
                placeholder="e.g. 100000"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Max Threshold Amount (₹)</label>
              <input
                type="number"
                placeholder="Optional upper cap"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Condition Expression</label>
            <input
              type="text"
              placeholder="e.g. amount > 1000000"
              value={conditionExpr}
              onChange={(e) => setConditionExpr(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setEditingStage(null)}
              className="px-4 py-2 rounded-lg bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingStage}
              className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold"
            >
              {savingStage ? 'Saving...' : 'Update Stage Rules'}
            </button>
          </div>
        </form>
      </Modal>

      {/* NEW DELEGATION MODAL */}
      <Modal
        isOpen={showDelegationModal}
        onClose={() => setShowDelegationModal(false)}
        title="Create Approval Authority Delegation"
      >
        <form onSubmit={handleCreateDelegation} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold mb-1">Select Delegatee (Staff Member) *</label>
            <select
              required
              value={delegateeId}
              onChange={(e) => setDelegateeId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
            >
              <option value="">Select Staff...</option>
              {demoUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role}) — {u.department}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Role Authority to Delegate *</label>
            <select
              value={delegationRole}
              onChange={(e) => setDelegationRole(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
            >
              <option value="HOD">HOD</option>
              <option value="Engineer">Engineer</option>
              <option value="Finance">Finance</option>
              <option value="Procurement">Procurement</option>
              <option value="Management">Management</option>
              <option value="Quality">Quality</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">End Date *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Reason for Delegation *</label>
            <input
              type="text"
              required
              value={delegationReason}
              onChange={(e) => setDelegationReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowDelegationModal(false)}
              className="px-4 py-2 rounded-lg bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold"
            >
              Activate Delegation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
