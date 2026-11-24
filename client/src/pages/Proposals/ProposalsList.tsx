import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  PlusCircle,
  Search,
  Filter,
  AlertTriangle,
  FileDown,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Proposal, ProposalType, Department } from '../../types';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';

export function ProposalsList() {
  const navigate = useNavigate();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [types, setTypes] = useState<ProposalType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedStatus, selectedType, selectedDept]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [propsData, typesData] = await Promise.all([
        api.getProposals({
          status: selectedStatus || undefined,
          proposalTypeId: selectedType || undefined,
          departmentId: selectedDept || undefined,
          search: search || undefined,
        }),
        api.getProposalTypes(),
      ]);
      setProposals(propsData);
      setTypes(typesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-brand-600" />
            Capital Expenditure (CAPEX) Proposals
          </h1>
          <p className="text-xs text-industrial-500">
            Multi-stage threshold gated proposals across 14 machinery and industrial change categories
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => api.downloadProposalsExcel()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
            title="Download Proposals Register as Excel Spreadsheet"
          >
            <FileDown className="w-4 h-4" />
            Export Excel
          </button>

          <Link
            to="/proposals/new"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Raise CAPEX Proposal
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-industrial-900 p-4 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-industrial-400" />
          <input
            type="text"
            placeholder="Search by ID, machine, title, manufacturer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100 placeholder-industrial-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-800 dark:text-industrial-200"
          >
            <option value="">All Statuses</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REVISION_REQUESTED">Revision Requested</option>
            <option value="REJECTED">Rejected</option>
            <option value="DRAFT">Draft</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-800 dark:text-industrial-200 max-w-[180px] truncate"
          >
            <option value="">All 14 Categories</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Proposals Table */}
      <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : proposals.length === 0 ? (
          <div className="p-12 text-center text-xs text-industrial-400 space-y-3">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-industrial-300 opacity-60" />
            <p>No proposals matching current filter parameters.</p>
            <button
              onClick={() => {
                setSelectedStatus('');
                setSelectedType('');
                setSelectedDept('');
                setSearch('');
              }}
              className="text-brand-600 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-industrial-50 dark:bg-industrial-800/40 text-industrial-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Proposal ID</th>
                  <th className="p-3.5">Title &amp; Machinery</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Total CAPEX</th>
                  <th className="p-3.5">Payback / ROI</th>
                  <th className="p-3.5">Current Stage</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                {proposals.map((p) => {
                  const isBudgetOverrun = p.budgetImpactStatus === 'BUDGET_EXCEEDED';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/proposals/${p.id}`)}
                      className="hover:bg-industrial-50 dark:hover:bg-industrial-800/50 cursor-pointer transition-colors"
                    >
                      <td className="p-3.5 font-mono font-bold text-brand-600">
                        {p.proposalNumber}
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <div className="font-semibold text-industrial-900 dark:text-industrial-100 truncate">
                          {p.title}
                        </div>
                        <div className="text-[11px] text-industrial-500 truncate mt-0.5">
                          {p.machineName ? `${p.machineName} (${p.manufacturer || 'OEM'})` : p.category || 'Machinery'}
                        </div>
                      </td>

                      <td className="p-3.5 text-industrial-600 dark:text-industrial-400 font-medium">
                        {p.proposalType?.name}
                      </td>

                      <td className="p-3.5 text-industrial-600 dark:text-industrial-400">
                        {p.department?.name}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-industrial-900 dark:text-industrial-100">
                        <div>₹{p.totalInvestment.toLocaleString('en-IN')}</div>
                        {isBudgetOverrun && (
                          <div className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            Overrun Alert
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-[11px]">
                        <div>Payback: <strong>{p.simplePayback > 0 ? `${p.simplePayback}y` : 'N/A'}</strong></div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          ROI: {p.roiPercent}%
                        </div>
                      </td>

                      <td className="p-3.5">
                        {p.currentStage ? (
                          <div className="font-semibold text-brand-600 dark:text-brand-400">
                            {p.currentStage.name}
                            <span className="block text-[10px] text-industrial-400 font-normal">
                              ({p.currentStage.approverRole})
                            </span>
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-semibold">Completed</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <StatusBadge status={p.status} />
                      </td>

                      <td className="p-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700">
                          View Dossier <ArrowRight className="w-3.5 h-3.5" />
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
