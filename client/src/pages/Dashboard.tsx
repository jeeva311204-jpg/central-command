import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  IndianRupee,
  Layers,
  ArrowRight,
  ShieldAlert,
  Percent,
  PlusCircle,
  GitPullRequest,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { Proposal } from '../types';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role?.name || user?.role || 'Employee';

  const [capexData, setCapexData] = useState<any>(null);
  const [pendingApprovals, setPendingApprovals] = useState<Proposal[]>([]);
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDept, setSelectedDept] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        if (role === 'Management' || role === 'Admin' || role === 'Finance') {
          const metrics = await api.getCapexMetrics({ departmentId: selectedDept });
          setCapexData(metrics);
        }

        if (role !== 'Employee') {
          const pending = await api.getProposals({ myPendingOnly: 'true' });
          setPendingApprovals(pending);
        }

        const mine = await api.getProposals();
        setMyProposals(mine.filter((p: any) => p.initiatorId === user?.id || role === 'Employee'));

        // Load tasks
        const perf = await api.getStaffPerformance();
        const userTasks = (perf.recentTasks || []).filter((t: any) => t.assignedToId === user?.id);
        setMyTasks(userTasks);
      } catch (e) {
        console.error('Error loading dashboard:', e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [role, selectedDept, user?.id]);

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e', '#64748b'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  // 1. EXECUTIVE / MANAGEMENT CAPEX DASHBOARD
  if (role === 'Management' || role === 'Admin' || role === 'Finance') {
    const kpis = capexData?.kpis || {};
    const deptData = capexData?.departmentBreakdown || [];
    const typeData = capexData?.typeDistribution || [];
    const delayedProjects = capexData?.delayedProjects || [];

    const chartData = deptData.map((d: any) => ({
      name: d.departmentCode,
      Allocated: d.allocated / 100000, // In Lakhs
      Utilised: d.utilised / 100000,
      Pending: (d.pendingProposalsValue || 0) / 100000,
    }));

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-brand-600" />
              Enterprise CAPEX & Investment Command Center
            </h1>
            <p className="text-xs text-industrial-500">
              FY2026-27 Corporate Capital Expenditure, Budget Allocation & Hurdle Rate Analytics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-800 dark:text-industrial-200"
            >
              <option value="">All Departments</option>
              {deptData.map((d: any) => (
                <option key={d.departmentId} value={d.departmentId}>
                  {d.departmentName}
                </option>
              ))}
            </select>

            <button
              onClick={() => api.downloadCapexExcel()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
              title="Download CAPEX Executive Excel Workbook"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel
            </button>

            <Link
              to="/proposals/new"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              New Proposal
            </Link>
          </div>
        </div>

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
            <div className="text-[11px] font-bold uppercase text-industrial-400">Total CAPEX Budget</div>
            <div className="text-xl font-bold font-mono text-industrial-900 dark:text-industrial-100 mt-1">
              ₹{((kpis.totalAllocatedBudget || 0) / 10000000).toFixed(2)} Cr
            </div>
            <div className="text-[10px] text-industrial-500 mt-1 font-mono">
              Utilised: ₹{((kpis.totalUtilisedBudget || 0) / 10000000).toFixed(2)} Cr ({kpis.overallUtilisationPercent}%)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
            <div className="text-[11px] font-bold uppercase text-industrial-400">Approved Investments</div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{((kpis.totalApprovedAmount || 0) / 100000).toFixed(1)} Lakhs
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
              {kpis.approvedProposalsCount} Capital Projects
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
            <div className="text-[11px] font-bold uppercase text-industrial-400">Pending Approvals</div>
            <div className="text-xl font-bold font-mono text-brand-600 dark:text-brand-400 mt-1">
              ₹{((kpis.totalPendingAmount || 0) / 100000).toFixed(1)} Lakhs
            </div>
            <div className="text-[10px] text-brand-600 dark:text-brand-400 mt-1">
              {kpis.pendingProposalsCount} Under Stage Review
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm">
            <div className="text-[11px] font-bold uppercase text-industrial-400">Expected Annual Savings</div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{((kpis.totalExpectedAnnualSavings || 0) / 100000).toFixed(1)} Lakhs
            </div>
            <div className="text-[10px] text-industrial-500 mt-1">
              Avg ROI: <strong>{kpis.avgRoi}%</strong> | Payback: <strong>{kpis.avgPayback}y</strong>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 shadow-sm col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold uppercase text-industrial-400">Actual SCM Spend</div>
            <div className="text-xl font-bold font-mono text-industrial-900 dark:text-industrial-100 mt-1">
              ₹{((kpis.totalActualSpend || 0) / 100000).toFixed(1)} Lakhs
            </div>
            <div className="text-[10px] text-industrial-500 mt-1">
              Invoiced &amp; Paid POs
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Department Budget Bar Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-industrial-900 p-5 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300">
                Departmental Budget Allocation vs Utilised (₹ Lakhs)
              </h3>
              <span className="text-[10px] font-mono text-industrial-400">FY2026-27</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                  <YAxis fontSize={11} stroke="#94a3b8" />
                  <Tooltip
                    formatter={(val: any) => [`₹${val} Lakhs`]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Allocated" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Utilised" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pending" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Proposal Type Distribution Pie Chart */}
          <div className="bg-white dark:bg-industrial-900 p-5 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300 mb-4">
              CAPEX Proposals by Category
            </h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="totalAmount"
                    nameKey="name"
                  >
                    {typeData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`₹${(Number(val) / 100000).toFixed(1)} Lakhs`]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Delayed Projects Alert Table (breaching SLA) */}
        {delayedProjects.length > 0 && (
          <div className="bg-white dark:bg-industrial-900 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-sm overflow-hidden">
            <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-200">
                  Delayed Projects Breaching Workflow SLA ({delayedProjects.length})
                </h3>
              </div>
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded">
                Action Overdue
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-industrial-50 dark:bg-industrial-800/40 text-industrial-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Proposal ID</th>
                    <th className="p-3">Project Title</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Current Stage</th>
                    <th className="p-3">Delay</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                  {delayedProjects.map((p: any) => (
                    <tr key={p.id} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/10">
                      <td className="p-3 font-mono font-bold text-brand-600">{p.proposalNumber}</td>
                      <td className="p-3 font-medium text-industrial-900 dark:text-industrial-100">{p.title}</td>
                      <td className="p-3 text-industrial-500">{p.department}</td>
                      <td className="p-3 font-mono font-semibold">₹{p.amount.toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <span className="font-semibold text-industrial-700 dark:text-industrial-300">{p.currentStage}</span>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                          <Clock className="w-3.5 h-3.5" />
                          +{p.daysOverdue} Days Overdue
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => navigate(`/proposals/${p.id}`)}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px]"
                        >
                          Review &amp; Escalate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending Approvals Table */}
        {pendingApprovals.length > 0 && (
          <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-industrial-100 dark:border-industrial-800 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-500" />
                Action Required: Proposals Pending Your Review ({pendingApprovals.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-industrial-50 dark:bg-industrial-800/40 text-industrial-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Stage</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                  {pendingApprovals.map((p) => (
                    <tr key={p.id} className="hover:bg-industrial-50 dark:hover:bg-industrial-800/50">
                      <td className="p-3 font-mono font-bold text-brand-600">{p.proposalNumber}</td>
                      <td className="p-3 font-medium text-industrial-900 dark:text-industrial-100">{p.title}</td>
                      <td className="p-3 text-industrial-500">{p.department?.name}</td>
                      <td className="p-3 font-mono font-semibold">₹{p.totalInvestment.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-industrial-600 dark:text-industrial-400 font-medium">{p.currentStage?.name}</td>
                      <td className="p-3">
                        <StatusBadge status={p.budgetImpactStatus === 'BUDGET_EXCEEDED' ? 'BUDGET_EXCEEDED' : p.status} />
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => navigate(`/proposals/${p.id}`)}
                          className="px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-700 text-white font-semibold text-[11px]"
                        >
                          Review Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. APPROVER DASHBOARD (HOD, Engineer, QA, Maintenance, Procurement)
  if (role !== 'Employee') {
    const roleTitle = typeof role === 'object' ? (role as any).name : role;
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
              <Clock className="w-6 h-6 text-brand-600" />
              Approver Action Portal — {roleTitle} Review Queue
            </h1>
            <p className="text-xs text-industrial-500">
              Proposals and 4M changes assigned to your stage review and evaluation checklist
            </p>
          </div>
          <Link
            to="/proposals/new"
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Raise Proposal
          </Link>
        </div>

        {/* Pending Approvals Table & Mobile Card View */}
        <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-industrial-100 dark:border-industrial-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300">
              Pending Approvals Assigned to {roleTitle} ({pendingApprovals.length})
            </h3>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center text-xs text-industrial-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              All clear! No proposals currently pending your approval.
            </div>
          ) : (
            <>
              {/* Mobile Card View (optimized for 375px screens) */}
              <div className="block sm:hidden p-3 space-y-3">
                {pendingApprovals.map((p) => (
                  <div key={p.id} className="p-3.5 bg-industrial-50/70 dark:bg-industrial-800/40 border border-industrial-200 dark:border-industrial-700/60 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-xs text-brand-600">{p.proposalNumber}</span>
                      <PriorityBadge priority={p.priority} />
                    </div>
                    <div className="font-semibold text-xs text-industrial-900 dark:text-industrial-100 leading-snug">
                      {p.title}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-industrial-500 pt-1 border-t border-industrial-200/50 dark:border-industrial-700/50">
                      <span>{p.department?.name}</span>
                      <span className="font-mono font-bold text-industrial-900 dark:text-industrial-100">₹{p.totalInvestment.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <span className="text-[10px] font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded border border-brand-200 dark:border-brand-800 truncate max-w-[170px]">
                        {p.currentStage?.name}
                      </span>
                      <button
                        onClick={() => navigate(`/proposals/${p.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm flex-shrink-0"
                      >
                        Review &amp; Act
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-industrial-50 dark:bg-industrial-800/40 text-industrial-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Proposal ID</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Investment</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Stage</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                    {pendingApprovals.map((p) => (
                      <tr key={p.id} className="hover:bg-industrial-50 dark:hover:bg-industrial-800/50">
                        <td className="p-3 font-mono font-bold text-brand-600">{p.proposalNumber}</td>
                        <td className="p-3 font-medium text-industrial-900 dark:text-industrial-100">{p.title}</td>
                        <td className="p-3 text-industrial-500">{p.department?.name}</td>
                        <td className="p-3 font-mono font-semibold">₹{p.totalInvestment.toLocaleString('en-IN')}</td>
                        <td className="p-3"><PriorityBadge priority={p.priority} /></td>
                        <td className="p-3 font-medium text-brand-600">{p.currentStage?.name}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => navigate(`/proposals/${p.id}`)}
                            className="px-3 py-1 rounded bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs"
                          >
                            Review &amp; Act
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Department Recent Proposals */}
        <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300 mb-3">
            All Recent Department Proposals
          </h3>
          <div className="space-y-2">
            {myProposals.slice(0, 5).map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/proposals/${p.id}`)}
                className="p-3 rounded-lg border border-industrial-100 dark:border-industrial-800 hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-brand-600 mr-2">{p.proposalNumber}</span>
                  <span className="font-semibold text-industrial-900 dark:text-industrial-100">{p.title}</span>
                  <div className="text-[11px] text-industrial-400 mt-0.5">
                    {p.department?.name} • ₹{p.totalInvestment.toLocaleString('en-IN')} • {p.proposalType?.name}
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. EMPLOYEE / OPERATOR LANDING PAGE
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
            <Layers className="w-6 h-6 text-brand-600" />
            Operator Portal — My Proposals &amp; 4M Checklists
          </h1>
          <p className="text-xs text-industrial-500">
            Track your initiated CAPEX proposals, raised 4M changes, and assigned verification tasks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/changes4m/new"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-industrial-100 dark:bg-industrial-800 text-industrial-800 dark:text-industrial-200 hover:bg-industrial-200"
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            Raise 4M Change
          </Link>
          <Link
            to="/proposals/new"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Proposal
          </Link>
        </div>
      </div>

      {/* Operator Tasks Queue */}
      <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300 mb-3 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-emerald-500" />
          My Assigned Implementation Tasks ({myTasks.length})
        </h3>
        {myTasks.length === 0 ? (
          <div className="p-6 text-center text-xs text-industrial-400">
            No pending tasks assigned to you.
          </div>
        ) : (
          <div className="space-y-2">
            {myTasks.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-lg border border-industrial-100 dark:border-industrial-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-industrial-900 dark:text-industrial-100">{t.title}</div>
                  <div className="text-[11px] text-industrial-500">{t.description || 'Checklist execution'}</div>
                  <div className="text-[10px] text-industrial-400 mt-1">
                    Due: {new Date(t.dueDate).toLocaleDateString()}
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Proposals */}
      <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300 mb-3">
          My Initiated Proposals ({myProposals.length})
        </h3>
        <div className="space-y-2">
          {myProposals.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/proposals/${p.id}`)}
              className="p-3 rounded-lg border border-industrial-100 dark:border-industrial-800 hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-mono font-bold text-brand-600 mr-2">{p.proposalNumber}</span>
                <span className="font-semibold text-industrial-900 dark:text-industrial-100">{p.title}</span>
                <div className="text-[11px] text-industrial-400 mt-0.5">
                  ₹{p.totalInvestment.toLocaleString('en-IN')} • Current: {p.currentStage?.name || 'Approved'}
                </div>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
