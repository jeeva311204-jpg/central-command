import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  Clock,
  IndianRupee,
  Cpu,
  Layers,
  FileText,
  TrendingUp,
  Building,
  Calendar,
  Share2,
  Eye,
  PlusCircle,
  ShoppingCart,
  Upload,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { WorkflowTracker } from '../../components/WorkflowTracker';
import { FinancialSummaryCard } from '../../components/FinancialSummaryCard';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';

export function ProposalDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'betterment' | 'quotations' | 'versions' | 'documents'>('overview');

  // Approval Modal State
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'APPROVE' | 'REJECT' | 'REQUEST_REVISION' | 'DELEGATE'>('APPROVE');
  const [actionComments, setActionComments] = useState('');
  const [delegatedToId, setDelegatedToId] = useState('');
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  // Selected Version for comparison
  const [selectedVersion, setSelectedVersion] = useState<any>(null);

  useEffect(() => {
    loadProposal();
    api.getDemoUsers().then(setDemoUsers).catch(console.error);
  }, [id]);

  const loadProposal = async () => {
    setLoading(true);
    try {
      if (id) {
        const data = await api.getProposal(id);
        setProposal(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!id) return;
    setActionError('');
    setSubmittingAction(true);
    try {
      await api.executeApprovalAction(id, {
        action: selectedAction,
        comments: actionComments,
        delegatedToId: selectedAction === 'DELEGATE' ? delegatedToId : undefined,
      });
      setShowActionModal(false);
      setActionComments('');
      await loadProposal();
    } catch (err: any) {
      setActionError(err.message || 'Failed to execute action');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!id) return;
    window.open(`/api/proposals/${id}/pdf`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="p-8 text-center text-xs text-industrial-400">
        Proposal not found.
      </div>
    );
  }

  // Check if current logged-in user can act on the current stage
  const currentRole = typeof user?.role === 'object' ? user.role.name : (user?.role || '');
  const canAct =
    proposal.status === 'IN_REVIEW' &&
    proposal.currentStage &&
    (currentRole === 'Admin' || currentRole.toLowerCase() === proposal.currentStage.approverRole.toLowerCase());

  let bettermentObj: any = null;
  if (proposal.bettermentJson) {
    try {
      bettermentObj = JSON.parse(proposal.bettermentJson);
    } catch (e) {}
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Dossier Header Card */}
      <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 p-3.5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-extrabold text-sm px-2.5 py-0.5 rounded bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 border border-brand-300 dark:border-brand-800">
                {proposal.proposalNumber}
              </span>
              <StatusBadge status={proposal.status} size="lg" />
              <PriorityBadge priority={proposal.priority} />
              <span className="text-xs text-industrial-500 font-medium">
                {proposal.proposalType?.name}
              </span>
            </div>

            <h1 className="text-base sm:text-lg font-bold text-industrial-950 dark:text-white leading-snug">
              {proposal.title}
            </h1>

            <div className="flex items-center gap-3 sm:gap-4 text-xs text-industrial-500 flex-wrap pt-1">
              <span>Dept: <strong>{proposal.department?.name}</strong></span>
              <span>Initiator: <strong>{proposal.initiator?.name}</strong></span>
              <span>Submitted: {new Date(proposal.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Action Buttons: PDF Export & Workflow Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 text-industrial-800 dark:text-industrial-200 border border-industrial-200 dark:border-industrial-700 transition-all shadow-sm w-full sm:w-auto"
            >
              <Download className="w-4 h-4 text-brand-600" />
              Export PDF Dossier
            </button>

            {canAct && (
              <button
                onClick={() => {
                  setSelectedAction('APPROVE');
                  setShowActionModal(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition-all hover:scale-[1.02] w-full sm:w-auto"
              >
                <CheckCircle2 className="w-4 h-4" />
                Review &amp; Act as {proposal.currentStage?.approverRole}
              </button>
            )}

            {proposal.status === 'APPROVED' && (
              <Link
                to={`/procurement/orders?proposalId=${proposal.id}`}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/25 transition-all w-full sm:w-auto"
              >
                <ShoppingCart className="w-4 h-4" />
                Generate Purchase Order
              </Link>
            )}
          </div>
        </div>

        {/* Visual Workflow Tracker Pipeline */}
        <WorkflowTracker
          stages={proposal.applicableStages || []}
          currentStageId={proposal.currentStageId}
          status={proposal.status}
          approvalActions={proposal.approvalActions || []}
        />
      </div>

      {/* Tabs Navigation (Horizontally scrollable for 375px screens) */}
      <div className="flex items-center gap-1.5 border-b border-industrial-200 dark:border-industrial-800 pb-px text-xs font-bold overflow-x-auto whitespace-nowrap scrollbar-none">
        {[
          { key: 'overview', label: 'Financials & Tech Specs' },
          { key: 'betterment', label: '5-Pillar Betterment' },
          { key: 'quotations', label: `Quotations (${proposal.quotations?.length || 0})` },
          { key: 'versions', label: `Versions (${proposal.versions?.length || 0})` },
          { key: 'documents', label: `Docs (${proposal.documents?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3 sm:px-4 py-2 rounded-t-lg transition-colors flex-shrink-0 ${
              activeTab === tab.key
                ? 'bg-white dark:bg-industrial-900 border-t-2 border-x border-industrial-200 dark:border-industrial-800 border-t-brand-600 text-brand-600 dark:text-brand-400 font-extrabold'
                : 'text-industrial-500 hover:text-industrial-900 dark:hover:text-industrial-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: FINANCIALS & TECH SPECS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <FinancialSummaryCard
            totalInvestment={proposal.totalInvestment}
            annualNetBenefit={proposal.annualNetBenefit}
            simplePayback={proposal.simplePayback}
            roiPercent={proposal.roiPercent}
            npv={proposal.npv}
            irr={proposal.irr}
            discountedPayback={proposal.discountedPayback}
            annualDepreciation={proposal.annualDepreciation}
            budgetImpactStatus={proposal.budgetImpactStatus}
            budgetAvailable={proposal.department?.budgets?.[0]?.allocatedAmount - proposal.department?.budgets?.[0]?.utilisedAmount}
            budgetAllocated={proposal.department?.budgets?.[0]?.allocatedAmount}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cost Breakdown */}
            <div className="bg-white dark:bg-industrial-900 p-5 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300 pb-2 border-b border-industrial-100 dark:border-industrial-800">
                CAPEX Cost Breakdown Components
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-industrial-50 dark:border-industrial-800/50">
                  <span className="text-industrial-500">Base Purchase Price</span>
                  <span className="font-mono font-semibold">₹{proposal.purchasePrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-industrial-50 dark:border-industrial-800/50">
                  <span className="text-industrial-500">Installation &amp; Foundation</span>
                  <span className="font-mono font-semibold">₹{proposal.installationCost.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-industrial-50 dark:border-industrial-800/50">
                  <span className="text-industrial-500">Freight &amp; Transport</span>
                  <span className="font-mono font-semibold">₹{proposal.transportCost.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-industrial-50 dark:border-industrial-800/50">
                  <span className="text-industrial-500">Training &amp; Documentation</span>
                  <span className="font-mono font-semibold">₹{proposal.trainingCost.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-industrial-50 dark:border-industrial-800/50">
                  <span className="text-industrial-500">Tooling &amp; Initial Fixtures</span>
                  <span className="font-mono font-semibold">₹{proposal.toolingCost.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-2 font-bold text-sm text-industrial-900 dark:text-white">
                  <span>Total Capital Outlay</span>
                  <span className="font-mono text-brand-600">₹{proposal.totalInvestment.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Technical Machinery Specs */}
            <div className="bg-white dark:bg-industrial-900 p-5 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300 pb-2 border-b border-industrial-100 dark:border-industrial-800">
                Machinery Specifications &amp; Procurement
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-industrial-50 dark:border-industrial-800/50">
                  <span className="text-industrial-500">Machine Model</span>
                  <span className="font-semibold text-industrial-900 dark:text-industrial-100">{proposal.machineName || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-industrial-50 dark:border-industrial-800/50">
                  <span className="text-industrial-500">Asset Category</span>
                  <span className="font-semibold">{proposal.category || 'Machinery'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-industrial-50 dark:border-industrial-800/50">
                  <span className="text-industrial-500">Manufacturer (OEM)</span>
                  <span className="font-semibold">{proposal.manufacturer || 'OEM Specified'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-industrial-50 dark:border-industrial-800/50">
                  <span className="text-industrial-500">Recommended Supplier</span>
                  <span className="font-semibold">{proposal.supplier || 'Competitive Bidding'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-industrial-50 dark:border-industrial-800/50">
                  <span className="text-industrial-500">Lead Time</span>
                  <span className="font-mono font-semibold">{proposal.expectedDeliveryWeeks || 4} Weeks</span>
                </div>
              </div>

              {proposal.currentMachineDetails && (
                <div className="pt-2 text-xs">
                  <span className="text-[11px] font-bold text-industrial-400 block mb-1">Current Machine Details:</span>
                  <p className="text-industrial-600 dark:text-industrial-400 bg-industrial-50 dark:bg-industrial-800 p-2 rounded">
                    {proposal.currentMachineDetails}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 5-PILLAR BETTERMENT ANALYSIS */}
      {activeTab === 'betterment' && (
        <div className="space-y-4">
          {!bettermentObj ? (
            <div className="bg-white dark:bg-industrial-900 p-8 rounded-xl border border-industrial-200 dark:border-industrial-800 text-center text-xs text-industrial-400">
              No Betterment Analysis recorded for this proposal.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pillar 1 */}
              <div className="bg-white dark:bg-industrial-900 p-5 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-2 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5 pb-2 border-b border-industrial-100 dark:border-industrial-800">
                  1. Production &amp; Throughput Betterment
                </h4>
                <div className="space-y-1.5 pt-1">
                  <div><strong>Capacity Before:</strong> {bettermentObj.production?.capacityBefore}</div>
                  <div><strong>Capacity After:</strong> {bettermentObj.production?.capacityAfter}</div>
                  <div><strong>Cycle Time Reduction:</strong> {bettermentObj.production?.cycleTimeReductionSec} Seconds</div>
                  <div><strong>Rejection Reduction:</strong> {bettermentObj.production?.rejectionRateReductionPercent}%</div>
                  {bettermentObj.production?.notes && <p className="italic text-industrial-500 text-[11px] pt-1">"{bettermentObj.production.notes}"</p>}
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="bg-white dark:bg-industrial-900 p-5 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-2 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pb-2 border-b border-industrial-100 dark:border-industrial-800">
                  2. Financial Betterment &amp; Cost Savings
                </h4>
                <div className="space-y-1.5 pt-1">
                  <div><strong>Annual Savings:</strong> ₹{(bettermentObj.financial?.expectedAnnualSavings || 0).toLocaleString('en-IN')}/yr</div>
                  <div><strong>Extra Revenue:</strong> ₹{(bettermentObj.financial?.extraRevenuePerYear || 0).toLocaleString('en-IN')}/yr</div>
                  <div><strong>Additional OPEX:</strong> ₹{(bettermentObj.financial?.additionalOpexPerYear || 0).toLocaleString('en-IN')}/yr</div>
                  <div><strong>Simple Payback:</strong> {bettermentObj.financial?.paybackMonths} Months</div>
                  {bettermentObj.financial?.notes && <p className="italic text-industrial-500 text-[11px] pt-1">"{bettermentObj.financial.notes}"</p>}
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="bg-white dark:bg-industrial-900 p-5 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-2 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5 pb-2 border-b border-industrial-100 dark:border-industrial-800">
                  3. Quality &amp; Precision Betterment
                </h4>
                <div className="space-y-1.5 pt-1">
                  <div><strong>Defect Rate Reduction:</strong> {bettermentObj.quality?.defectReductionPercent}%</div>
                  <div><strong>Tolerance Improvement:</strong> {bettermentObj.quality?.precisionToleranceImprovement}</div>
                  <div><strong>Rework Reduction:</strong> {bettermentObj.quality?.reworkReductionHoursPerMonth} Hours / Month</div>
                  <div><strong>Customer Complaint Risk:</strong> {bettermentObj.quality?.customerComplaintsRisk}</div>
                </div>
              </div>

              {/* Pillar 4 */}
              <div className="bg-white dark:bg-industrial-900 p-5 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-2 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pb-2 border-b border-industrial-100 dark:border-industrial-800">
                  4. Manpower, Training &amp; Ergonomics
                </h4>
                <div className="space-y-1.5 pt-1">
                  <div><strong>Operators Required:</strong> {bettermentObj.manpower?.operatorsRequiredBefore} → {bettermentObj.manpower?.operatorsRequiredAfter}</div>
                  <div><strong>Training Days:</strong> {bettermentObj.manpower?.trainingRequiredDays} Days</div>
                  <div><strong>Manual Work Reduction:</strong> {bettermentObj.manpower?.manualWorkReductionPercent}%</div>
                  <div><strong>Ergonomics Improvement:</strong> {bettermentObj.manpower?.ergonomicsImprovement}</div>
                </div>
              </div>

              {/* Pillar 5 */}
              <div className="bg-white dark:bg-industrial-900 p-5 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-2 text-xs md:col-span-2">
                <h4 className="font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pb-2 border-b border-industrial-100 dark:border-industrial-800">
                  5. Safety, Maintenance &amp; Energy Betterment
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div><strong>Hazard Reduction:</strong> {bettermentObj.safetyMaintenance?.safetyHazardReduction}</div>
                  <div><strong>Energy Saved:</strong> {bettermentObj.safetyMaintenance?.energySavingKwPerMonth} kWh / Month</div>
                  <div><strong>Downtime Reduction:</strong> {bettermentObj.safetyMaintenance?.maintenanceDowntimeReductionPercent}%</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: QUOTATIONS & SCM */}
      {activeTab === 'quotations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300">
              Vendor Quotations &amp; Multi-Attribute Scoring
            </h3>
            <Link
              to={`/procurement/comparison?proposalId=${proposal.id}`}
              className="text-xs font-bold text-brand-600 hover:underline"
            >
              Open Full Side-by-Side Scoring Comparison →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(proposal.quotations || []).map((q: any) => (
              <div
                key={q.id}
                className={`p-5 rounded-xl border transition-all text-xs space-y-3 ${
                  q.isRecommended
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-800 ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-industrial-900 border-industrial-200 dark:border-industrial-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-sm text-industrial-900 dark:text-white">
                      {q.vendor?.name}
                    </span>
                    <span className="text-[11px] text-industrial-400 block font-mono">
                      Quote: {q.quotationNumber}
                    </span>
                  </div>
                  {q.isRecommended && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                      Recommended Best Value
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <span className="text-[10px] text-industrial-400 block">Quoted Price</span>
                    <strong className="text-sm">₹{q.price.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-industrial-400 block">Weighted Score</span>
                    <strong className="text-sm text-brand-600">{q.weightedScore || q.technicalScore} / 100</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-industrial-400 block">Warranty</span>
                    <span>{q.warrantyMonths} Months</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-industrial-400 block">Delivery Weeks</span>
                    <span>{q.deliveryWeeks} Weeks</span>
                  </div>
                </div>

                {q.notes && (
                  <p className="text-[11px] text-industrial-500 bg-industrial-50 dark:bg-industrial-800 p-2 rounded">
                    {q.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: VERSION HISTORY */}
      {activeTab === 'versions' && (
        <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300">
            Immutable Revision Snapshots &amp; Version History
          </h3>
          {(!proposal.versions || proposal.versions.length === 0) ? (
            <div className="text-center py-6 text-xs text-industrial-400">
              No prior revision snapshots recorded. This is the initial version.
            </div>
          ) : (
            <div className="space-y-3">
              {proposal.versions.map((v: any) => (
                <div
                  key={v.id}
                  className="p-4 rounded-lg border border-industrial-200 dark:border-industrial-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 font-mono">
                        Version {v.versionNumber}
                      </span>
                      <span>Snapshot saved on {new Date(v.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-industrial-500 mt-1">
                      Reason: "{v.changeSummary || 'Revision requested by approver'}"
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedVersion(v)}
                    className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect Snapshot
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DOCUMENTS & ATTACHMENTS */}
      {activeTab === 'documents' && (
        <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300">
              Proposal Attachments (Quotations, Specs &amp; Invoices)
            </h3>
            <Link
              to="/documents"
              className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Files in Document Repository →
            </Link>
          </div>

          {(!proposal.documents || proposal.documents.length === 0) ? (
            <div className="text-center py-6 text-xs text-industrial-400">
              No uploaded documents attached yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {proposal.documents.map((d: any) => (
                <div
                  key={d.id}
                  className="p-3 rounded-lg border border-industrial-200 dark:border-industrial-800 flex items-center justify-between text-xs"
                >
                  <div className="truncate mr-2">
                    <span className="font-semibold block truncate">{d.fileName}</span>
                    <span className="text-[10px] text-industrial-400 font-mono">
                      {(d.fileSize / 1024).toFixed(1)} KB • {d.entityType}
                    </span>
                  </div>
                  <a
                    href={d.filePath}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded bg-brand-50 text-brand-600 hover:bg-brand-100"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* APPROVAL ACTION MODAL */}
      <Modal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        title={`Execute Workflow Action: ${proposal.currentStage?.name}`}
      >
        <div className="space-y-4 text-xs">
          {actionError && (
            <div className="p-3 rounded bg-rose-50 border border-rose-300 text-rose-700 font-semibold">
              {actionError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1.5">
              Select Action *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectedAction('APPROVE')}
                className={`py-2 px-3 rounded-lg font-bold border transition-all ${
                  selectedAction === 'APPROVE'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                    : 'bg-white dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 border-industrial-200 dark:border-industrial-700'
                }`}
              >
                Approve
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('REQUEST_REVISION')}
                className={`py-2 px-3 rounded-lg font-bold border transition-all ${
                  selectedAction === 'REQUEST_REVISION'
                    ? 'bg-amber-600 text-white border-amber-600 shadow'
                    : 'bg-white dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 border-industrial-200 dark:border-industrial-700'
                }`}
              >
                Request Revision
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('REJECT')}
                className={`py-2 px-3 rounded-lg font-bold border transition-all ${
                  selectedAction === 'REJECT'
                    ? 'bg-rose-600 text-white border-rose-600 shadow'
                    : 'bg-white dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 border-industrial-200 dark:border-industrial-700'
                }`}
              >
                Reject
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('DELEGATE')}
                className={`py-2 px-3 rounded-lg font-bold border transition-all ${
                  selectedAction === 'DELEGATE'
                    ? 'bg-brand-600 text-white border-brand-600 shadow'
                    : 'bg-white dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 border-industrial-200 dark:border-industrial-700'
                }`}
              >
                Delegate
              </button>
            </div>
          </div>

          {selectedAction === 'DELEGATE' && (
            <div>
              <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                Delegate To Staff Member *
              </label>
              <select
                value={delegatedToId}
                onChange={(e) => setDelegatedToId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
              >
                <option value="">Select Delegatee...</option>
                {demoUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) - {u.department}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
              Comments &amp; Verification Signoff Notes *
            </label>
            <textarea
              rows={3}
              placeholder={
                selectedAction === 'APPROVE'
                  ? 'e.g. Technical compliance verified. Recommended for sanction.'
                  : selectedAction === 'REQUEST_REVISION'
                  ? 'e.g. Please update coolant chiller specification and foundation drawing.'
                  : 'State reasons clearly for rejection or delegation.'
              }
              value={actionComments}
              onChange={(e) => setActionComments(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-industrial-100 dark:border-industrial-800">
            <button
              type="button"
              onClick={() => setShowActionModal(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submittingAction}
              onClick={handleExecuteAction}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm disabled:opacity-50"
            >
              {submittingAction ? 'Processing...' : 'Confirm Action'}
            </button>
          </div>
        </div>
      </Modal>

      {/* VERSION INSPECT MODAL */}
      <Modal
        isOpen={!!selectedVersion}
        onClose={() => setSelectedVersion(null)}
        title={`Inspect Snapshot: Version ${selectedVersion?.versionNumber}`}
        maxWidth="2xl"
      >
        <div className="space-y-3 text-xs">
          <p className="text-industrial-500">
            Created on {new Date(selectedVersion?.createdAt || '').toLocaleString()} by{' '}
            {selectedVersion?.changedById}
          </p>
          <div className="max-h-96 overflow-y-auto bg-industrial-950 text-emerald-400 p-4 rounded-lg font-mono text-[11px]">
            <pre>{JSON.stringify(JSON.parse(selectedVersion?.snapshotJson || '{}'), null, 2)}</pre>
          </div>
        </div>
      </Modal>
    </div>
  );
}
