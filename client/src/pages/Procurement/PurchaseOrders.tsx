import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingCart, CheckCircle2, Truck, FileText, ArrowRight, PlusCircle, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { PurchaseOrder } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';

export function PurchaseOrders() {
  const [searchParams] = useSearchParams();
  const proposalIdParam = searchParams.get('proposalId');

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // New PO Modal
  const [showCreateModal, setShowCreateModal] = useState(!!proposalIdParam);
  const [approvedProposals, setApprovedProposals] = useState<any[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState(proposalIdParam || '');
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [availableQuotes, setAvailableQuotes] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState('30% Advance, 60% on Delivery, 10% after Commissioning');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrders();
    loadApprovedProposals();
  }, []);

  useEffect(() => {
    if (selectedProposalId) {
      api.getQuotationsForProposal(selectedProposalId).then((quotes) => {
        setAvailableQuotes(quotes);
        const accepted = quotes.find((q: any) => q.isAccepted || q.isRecommended);
        if (accepted) {
          setSelectedQuotationId(accepted.id);
        } else if (quotes.length > 0) {
          setSelectedQuotationId(quotes[0].id);
        }
      });
    }
  }, [selectedProposalId]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getPurchaseOrders();
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadApprovedProposals = async () => {
    const props = await api.getProposals({ status: 'APPROVED' });
    setApprovedProposals(props);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const selectedQuote = availableQuotes.find((q) => q.id === selectedQuotationId);
      await api.generatePO({
        proposalId: selectedProposalId,
        vendorId: selectedQuote?.vendorId || selectedQuote?.vendor?.id,
        quotationId: selectedQuotationId || undefined,
        paymentTerms,
      });
      setShowCreateModal(false);
      await loadOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to create PO');
    } finally {
      setCreating(false);
    }
  };

  const handleAdvanceStatus = async (order: PurchaseOrder) => {
    const nextStatusMap: Record<string, string> = {
      CREATED: 'DISPATCHED',
      DISPATCHED: 'DELIVERED',
      DELIVERED: 'INVOICED',
      INVOICED: 'PAID',
    };
    const next = nextStatusMap[order.status];
    if (!next) return;

    try {
      await api.updatePOStatus(order.id, {
        status: next,
        trackingNumber: next === 'DISPATCHED' ? `TRK-EXP-${Date.now().toString().slice(-6)}` : undefined,
        carrier: next === 'DISPATCHED' ? 'VRL Logistics Logistics Express' : undefined,
      });
      await loadOrders();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-brand-600" />
            Purchase Order (PO) Management &amp; SCM Tracking
          </h1>
          <p className="text-xs text-industrial-500">
            Generate official POs from approved CAPEX proposals and track lifecycle from dispatch to invoice payment
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Generate PO from Approved Proposal
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-industrial-400">
            No purchase orders created yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-industrial-50 dark:bg-industrial-800/40 text-industrial-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">PO Number</th>
                  <th className="p-3.5">Proposal Dossier</th>
                  <th className="p-3.5">Vendor Supplier</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5">Issued Date</th>
                  <th className="p-3.5">Status Pipeline</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                {orders.map((po) => (
                  <tr key={po.id} className="hover:bg-industrial-50 dark:hover:bg-industrial-800/50">
                    <td className="p-3.5 font-mono font-bold text-brand-600">
                      {po.poNumber}
                    </td>

                    <td className="p-3.5 max-w-xs">
                      <div className="font-semibold text-industrial-900 dark:text-industrial-100 truncate">
                        {po.proposal?.title}
                      </div>
                      <div className="text-[11px] text-industrial-400 font-mono">
                        {po.proposal?.proposalNumber} • {po.proposal?.department?.name}
                      </div>
                    </td>

                    <td className="p-3.5 font-medium text-industrial-800 dark:text-industrial-200">
                      {po.vendor?.name}
                    </td>

                    <td className="p-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{po.totalAmount.toLocaleString('en-IN')}
                    </td>

                    <td className="p-3.5 text-industrial-500">
                      {new Date(po.issuedDate).toLocaleDateString()}
                    </td>

                    <td className="p-3.5">
                      <StatusBadge status={po.status} />
                    </td>

                    <td className="p-3.5 text-right">
                      {po.status !== 'PAID' ? (
                        <button
                          onClick={() => handleAdvanceStatus(po)}
                          className="px-3 py-1 rounded bg-brand-600 hover:bg-brand-700 text-white font-semibold text-[11px]"
                        >
                          {po.status === 'CREATED' && 'Dispatch'}
                          {po.status === 'DISPATCHED' && 'Mark Delivered'}
                          {po.status === 'DELIVERED' && 'Receive Invoice'}
                          {po.status === 'INVOICED' && 'Record Payment'}
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-bold text-[11px] flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE PO MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Generate Official Purchase Order (PO)"
      >
        <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded bg-rose-50 border border-rose-300 text-rose-700 font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1">Approved CAPEX Proposal *</label>
            <select
              required
              value={selectedProposalId}
              onChange={(e) => setSelectedProposalId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
            >
              <option value="">Select Approved Proposal...</option>
              {approvedProposals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.proposalNumber} — {p.title} (₹{p.totalInvestment.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Select Supplier Quotation *</label>
            <select
              required
              value={selectedQuotationId}
              onChange={(e) => setSelectedQuotationId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
            >
              <option value="">Select Quotation...</option>
              {availableQuotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.vendor?.name} — Quote {q.quotationNumber} (₹{(q.price + q.installationCost).toLocaleString('en-IN')})
                  {q.isRecommended ? ' [RECOMMENDED]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Commercial Payment Terms</label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-lg bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold disabled:opacity-50"
            >
              {creating ? 'Generating PO...' : 'Issue Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
