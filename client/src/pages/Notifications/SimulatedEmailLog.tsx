import React, { useState, useEffect } from 'react';
import { Mail, Search, Clock, ExternalLink, ShieldAlert, Award } from 'lucide-react';
import { api } from '../../lib/api';
import { SimulatedEmailItem } from '../../types';
import { Modal } from '../../components/Modal';

export function SimulatedEmailLog() {
  const [emails, setEmails] = useState<SimulatedEmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<SimulatedEmailItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    loadEmails();
  }, [categoryFilter]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const data = await api.getSimulatedEmails({ category: categoryFilter || undefined });
      setEmails(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
            <Mail className="w-6 h-6 text-brand-600" />
            Simulated Enterprise Email Dispatch Log
          </h1>
          <p className="text-xs text-industrial-500">
            Real-time audit log of automated corporate email dispatches: Stage approvals, SLA escalations, revision notices, warranty warnings &amp; POs
          </p>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
        >
          <option value="">All Email Categories</option>
          <option value="APPROVAL_REQUEST">Approval Requests</option>
          <option value="SLA_ESCALATION">SLA Escalations</option>
          <option value="REVISION_REQUEST">Revision Requests</option>
          <option value="WARRANTY_ALERT">Warranty Alerts</option>
          <option value="PO_ISSUED">Purchase Orders</option>
        </select>
      </div>

      {/* Emails Table */}
      <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center text-xs text-industrial-400">
            No simulated emails dispatched matching category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-industrial-50 dark:bg-industrial-800/40 text-industrial-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Recipient</th>
                  <th className="p-3.5">Subject</th>
                  <th className="p-3.5">Dispatched At</th>
                  <th className="p-3.5 text-right">View Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                {emails.map((m) => {
                  let badgeColor = 'bg-blue-100 text-blue-800';
                  if (m.category === 'SLA_ESCALATION') badgeColor = 'bg-rose-100 text-rose-800';
                  else if (m.category === 'WARRANTY_ALERT') badgeColor = 'bg-amber-100 text-amber-800';
                  else if (m.category === 'PO_ISSUED') badgeColor = 'bg-emerald-100 text-emerald-800';

                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedEmail(m)}
                      className="hover:bg-industrial-50 dark:hover:bg-industrial-800/50 cursor-pointer transition-colors"
                    >
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${badgeColor}`}>
                          {m.category}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-industrial-900 dark:text-industrial-100">
                          {m.recipientName || 'Corporate Staff'}
                        </div>
                        <div className="text-[11px] text-industrial-400 font-mono">{m.toEmail}</div>
                      </td>

                      <td className="p-3.5 max-w-md">
                        <div className="font-semibold text-industrial-900 dark:text-industrial-100 truncate">
                          {m.subject}
                        </div>
                      </td>

                      <td className="p-3.5 text-industrial-400 text-[11px] font-mono">
                        {new Date(m.sentAt).toLocaleString()}
                      </td>

                      <td className="p-3.5 text-right">
                        <span className="text-brand-600 font-bold text-xs hover:underline">
                          Read Email →
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

      {/* VIEW EMAIL MODAL */}
      <Modal
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        title={selectedEmail?.subject || 'Email Preview'}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-industrial-50 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 space-y-1 font-mono text-[11px]">
            <div><strong>To:</strong> {selectedEmail?.recipientName} &lt;{selectedEmail?.toEmail}&gt;</div>
            <div><strong>Subject:</strong> {selectedEmail?.subject}</div>
            <div><strong>Sent:</strong> {new Date(selectedEmail?.sentAt || '').toLocaleString()}</div>
          </div>

          <div
            className="p-4 rounded-lg bg-white dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 text-industrial-900 dark:text-industrial-100 prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: selectedEmail?.bodyHtml || '' }}
          />

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setSelectedEmail(null)}
              className="px-4 py-2 rounded-lg bg-industrial-100 dark:bg-industrial-800 text-industrial-800 dark:text-industrial-200 font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
