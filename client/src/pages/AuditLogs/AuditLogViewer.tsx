import React, { useState, useEffect } from 'react';
import { History, Search, Filter, ShieldCheck, Eye } from 'lucide-react';
import { api } from '../../lib/api';
import { AuditLogItem } from '../../types';
import { Modal } from '../../components/Modal';

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Filters
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLogs();
  }, [selectedEntity, selectedAction]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({
        entityType: selectedEntity || undefined,
        action: selectedAction || undefined,
        search: search || undefined,
      });
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
          <History className="w-6 h-6 text-brand-600" />
          Enterprise Immutable Audit Trail
        </h1>
        <p className="text-xs text-industrial-500">
          Complete regulatory traceability: Who • What • When • Before &amp; After JSON Diffs for every proposal, workflow action and change
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-industrial-900 p-4 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-industrial-400" />
          <input
            type="text"
            placeholder="Search by user name, record ID, or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100 placeholder-industrial-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-800 dark:text-industrial-200"
          >
            <option value="">All Entities</option>
            <option value="PROPOSAL">Proposals</option>
            <option value="WORKFLOW_STAGE">Workflow Stages</option>
            <option value="CHANGE4M">4M Changes</option>
            <option value="PURCHASE_ORDER">Purchase Orders</option>
            <option value="ASSET">Assets</option>
            <option value="DELEGATION">Delegations</option>
          </select>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-800 dark:text-industrial-200"
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="APPROVE">APPROVE</option>
            <option value="REJECT">REJECT</option>
            <option value="REQUEST_REVISION">REQUEST_REVISION</option>
            <option value="DELEGATE">DELEGATE</option>
            <option value="STATUS_CHANGE">STATUS_CHANGE</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-industrial-400">
            No audit records found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-industrial-50 dark:bg-industrial-800/40 text-industrial-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Actor / User</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Entity Type</th>
                  <th className="p-3.5">Record ID</th>
                  <th className="p-3.5 text-right">Inspect Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800 font-mono">
                {logs.map((log) => {
                  let actionColor = 'bg-slate-100 text-slate-700';
                  if (log.action === 'APPROVE') actionColor = 'bg-emerald-100 text-emerald-800';
                  else if (log.action === 'REJECT') actionColor = 'bg-rose-100 text-rose-800';
                  else if (log.action === 'REQUEST_REVISION') actionColor = 'bg-amber-100 text-amber-800';
                  else if (log.action === 'CREATE') actionColor = 'bg-blue-100 text-blue-800';

                  return (
                    <tr key={log.id} className="hover:bg-industrial-50 dark:hover:bg-industrial-800/50">
                      <td className="p-3.5 text-industrial-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      <td className="p-3.5 font-sans font-bold text-industrial-900 dark:text-industrial-100">
                        {log.userName || 'System Automated'}
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${actionColor}`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="p-3.5 text-industrial-600 dark:text-industrial-400 font-sans">
                        {log.entityType}
                      </td>

                      <td className="p-3.5 text-industrial-400 text-[11px] truncate max-w-xs">
                        {log.entityId}
                      </td>

                      <td className="p-3.5 text-right font-sans">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Diff
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECT DIFF MODAL */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Inspection: ${selectedLog?.action} on ${selectedLog?.entityType}`}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between text-industrial-500 font-mono text-[11px] pb-2 border-b border-industrial-100 dark:border-industrial-800">
            <span>By: <strong>{selectedLog?.userName}</strong></span>
            <span>{new Date(selectedLog?.timestamp || '').toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-bold text-[11px] text-industrial-400 uppercase tracking-wider block mb-1">
                Before State (Snapshot)
              </span>
              <div className="bg-industrial-950 text-rose-400 p-3 rounded-lg font-mono text-[11px] max-h-64 overflow-y-auto">
                <pre>{selectedLog?.beforeJson ? JSON.stringify(JSON.parse(selectedLog.beforeJson), null, 2) : 'null (Created fresh)'}</pre>
              </div>
            </div>

            <div>
              <span className="font-bold text-[11px] text-industrial-400 uppercase tracking-wider block mb-1">
                After State (Snapshot)
              </span>
              <div className="bg-industrial-950 text-emerald-400 p-3 rounded-lg font-mono text-[11px] max-h-64 overflow-y-auto">
                <pre>{selectedLog?.afterJson ? JSON.stringify(JSON.parse(selectedLog.afterJson), null, 2) : 'null'}</pre>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
