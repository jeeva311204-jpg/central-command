import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  GitPullRequest,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CheckSquare,
  Square,
  ShieldCheck,
  User,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Change4M, Task } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { RiskMatrix } from '../../components/RiskMatrix';
import { Modal } from '../../components/Modal';

export function Change4MDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [change, setChange] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [assignedToId, setAssignedToId] = useState('');

  // Close modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closureNotes, setClosureNotes] = useState('');
  const [closeError, setCloseError] = useState('');

  useEffect(() => {
    loadChange();
    api.getDemoUsers().then(setDemoUsers).catch(console.error);
  }, [id]);

  const loadChange = async () => {
    setLoading(true);
    try {
      if (id) {
        const data = await api.getChange4M(id);
        setChange(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (task: Task) => {
    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.updateTaskStatus(task.id, {
        status: nextStatus,
        verificationNotes: nextStatus === 'COMPLETED' ? 'Verified on line by technician.' : null,
      });
      await loadChange();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !taskTitle || !assignedToId) return;
    try {
      await api.addTaskToChange(id, {
        title: taskTitle,
        assignedToId,
        dueDate: taskDueDate,
      });
      setShowTaskModal(false);
      setTaskTitle('');
      await loadChange();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseChange = async () => {
    if (!id) return;
    setCloseError('');
    try {
      await api.closeChange4M(id, { closureNotes });
      setShowCloseModal(false);
      await loadChange();
    } catch (err: any) {
      setCloseError(err.message || 'Failed to close change');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!change) {
    return <div className="p-8 text-center text-xs text-industrial-400">4M Change record not found.</div>;
  }

  let riskObj: any = {};
  try {
    riskObj = JSON.parse(change.riskAssessmentJson || '{}');
  } catch (e) {}

  const tasks: Task[] = change.tasks || [];
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const allCompleted = tasks.length > 0 && completedCount === tasks.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/changes4m')}
            className="flex items-center gap-1.5 text-xs font-semibold text-industrial-500 hover:text-industrial-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to 4M Changes
          </button>
          <div className="flex items-center gap-2">
            <StatusBadge status={change.status} size="lg" />
            {change.status !== 'CLOSED' && (
              <button
                disabled={!allCompleted}
                onClick={() => setShowCloseModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-all shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                Signoff &amp; Close Change
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded font-mono font-bold text-xs uppercase bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300">
              {change.changeCategory} Change
            </span>
            <span className="text-xs text-industrial-400">
              Logged on {new Date(change.createdAt).toLocaleDateString()}
            </span>
          </div>
          <h1 className="text-lg font-bold text-industrial-950 dark:text-white leading-snug">
            {change.title}
          </h1>
        </div>

        {change.proposal && (
          <div className="text-xs text-industrial-500 flex items-center gap-2 pt-1 border-t border-industrial-100 dark:border-industrial-800">
            <span>Linked Proposal:</span>
            <Link
              to={`/proposals/${change.proposal.id}`}
              className="font-mono font-bold text-brand-600 hover:underline"
            >
              {change.proposal.proposalNumber} — {change.proposal.title}
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Risk Matrix */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-industrial-900 p-5 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300 pb-2 border-b border-industrial-100 dark:border-industrial-800">
              Change Description &amp; Root Cause
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-bold text-industrial-400 block mb-0.5">Scope of Modification</span>
                <p className="text-industrial-800 dark:text-industrial-200 bg-industrial-50 dark:bg-industrial-800/50 p-2.5 rounded-lg">
                  {change.description}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-industrial-400 block mb-0.5">Reason for Change</span>
                <p className="text-industrial-800 dark:text-industrial-200 bg-industrial-50 dark:bg-industrial-800/50 p-2.5 rounded-lg">
                  {change.reasonForChange}
                </p>
              </div>

              {change.closureNotes && (
                <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                    Verification &amp; Closure Signoff Notes
                  </span>
                  <p className="text-emerald-900 dark:text-emerald-200">
                    {change.closureNotes}
                  </p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">
                    Closed on {new Date(change.closedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Risk Matrix Display */}
          <RiskMatrix
            severity={riskObj.severity || 3}
            probability={riskObj.probability || 2}
            interactive={false}
          />
        </div>

        {/* Right Col: Implementation Checklist Tasks */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-industrial-900 p-5 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-industrial-100 dark:border-industrial-800">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300">
                  Implementation Tasks
                </h3>
                <span className="text-[10px] text-industrial-400">
                  {completedCount} of {tasks.length} Completed
                </span>
              </div>
              {change.status !== 'CLOSED' && (
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              )}
            </div>

            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-4 text-xs text-industrial-400">
                  No checklist tasks added yet.
                </div>
              ) : (
                tasks.map((task) => {
                  const isCompleted = task.status === 'COMPLETED';
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                        isCompleted
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 opacity-80'
                          : 'bg-white dark:bg-industrial-800/40 border-industrial-200 dark:border-industrial-700 hover:border-brand-400'
                      }`}
                    >
                      <button type="button" className="mt-0.5 flex-shrink-0">
                        {isCompleted ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-industrial-400" />
                        )}
                      </button>

                      <div className="flex-1">
                        <span className={`font-semibold block ${isCompleted ? 'line-through text-industrial-500' : 'text-industrial-900 dark:text-industrial-100'}`}>
                          {task.title}
                        </span>
                        <div className="flex items-center justify-between text-[10px] text-industrial-400 mt-1">
                          <span>{task.assignedTo?.name || 'Staff member'}</span>
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NEW TASK MODAL */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Add Implementation Checklist Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold mb-1">Task Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Conduct CPK study on 100 pilot parts"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Assign to Staff Member *</label>
            <select
              required
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
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
            <label className="block text-xs font-semibold mb-1">Due Date *</label>
            <input
              type="date"
              required
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowTaskModal(false)}
              className="px-4 py-2 rounded-lg bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold"
            >
              Assign Task
            </button>
          </div>
        </form>
      </Modal>

      {/* CLOSE 4M MODAL */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title="Final Verification & 4M Change Closure"
      >
        <div className="space-y-4 text-xs">
          {closeError && (
            <div className="p-3 rounded bg-rose-50 border border-rose-300 text-rose-700 font-semibold">
              {closeError}
            </div>
          )}

          <p className="text-industrial-600 dark:text-industrial-400">
            All {tasks.length} checklist tasks have been executed. Confirm final signoff and closure.
          </p>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Final Quality / Engineering Verification Notes *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. 100 test parts inspected with CPK > 1.33. Workstation SOP updated. Approved for normal mass production."
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowCloseModal(false)}
              className="px-4 py-2 rounded-lg bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCloseChange}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
            >
              Confirm Closure &amp; Signoff
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
