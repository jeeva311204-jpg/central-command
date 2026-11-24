import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  TrendingUp,
  Cpu,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { api } from '../../lib/api';
import { ProposalType } from '../../types';
import { FinancialSummaryCard } from '../../components/FinancialSummaryCard';

export function ProposalCreate() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [types, setTypes] = useState<ProposalType[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [proposalTypeId, setProposalTypeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  // Machine Details
  const [machineName, setMachineName] = useState('');
  const [category, setCategory] = useState('CNC Milling');
  const [manufacturer, setManufacturer] = useState('');
  const [supplier, setSupplier] = useState('');
  const [currentMachineDetails, setCurrentMachineDetails] = useState('');
  const [proposedMachineDetails, setProposedMachineDetails] = useState('');
  const [expectedDeliveryWeeks, setExpectedDeliveryWeeks] = useState(6);

  // Financial Inputs
  const [purchasePrice, setPurchasePrice] = useState<number>(3500000);
  const [installationCost, setInstallationCost] = useState<number>(200000);
  const [transportCost, setTransportCost] = useState<number>(50000);
  const [trainingCost, setTrainingCost] = useState<number>(80000);
  const [toolingCost, setToolingCost] = useState<number>(120000);
  const [otherCost, setOtherCost] = useState<number>(0);

  const [annualSavings, setAnnualSavings] = useState<number>(1500000);
  const [extraRevenue, setExtraRevenue] = useState<number>(300000);
  const [extraOpex, setExtraOpex] = useState<number>(100000);
  const [usefulLifeYears, setUsefulLifeYears] = useState<number>(7);
  const [discountRate, setDiscountRate] = useState<number>(10);
  const [salvageValue, setSalvageValue] = useState<number>(300000);

  // Live Financial Outputs State
  const [financialMetrics, setFinancialMetrics] = useState<any>({
    totalInvestment: 3950000,
    annualNetBenefit: 1700000,
    simplePayback: 2.32,
    roiPercent: 43.04,
    annualDepreciation: 521428,
    npv: 4725000,
    irr: 39.5,
    discountedPayback: 2.8,
  });

  const [budgetCheckResult, setBudgetCheckResult] = useState<any>(null);

  // 5-Pillar Betterment Analysis State (Mandatory)
  const [betterment, setBetterment] = useState({
    production: {
      capacityBefore: '400 parts/shift',
      capacityAfter: '950 parts/shift',
      cycleTimeReductionSec: 420,
      outputPerShift: '950 parts',
      rejectionRateReductionPercent: 60,
      notes: 'Eliminates 2 manual re-clamping operations.',
    },
    financial: {
      expectedAnnualSavings: 1500000,
      extraRevenuePerYear: 300000,
      additionalOpexPerYear: 100000,
      paybackMonths: 27.8,
      notes: 'Production contract secured with tier-1 OEM.',
    },
    quality: {
      defectReductionPercent: 75,
      precisionToleranceImprovement: '+/- 0.005 mm precision',
      reworkReductionHoursPerMonth: 40,
      customerComplaintsRisk: 'Near-zero risk of dimensional non-conformance.',
    },
    manpower: {
      operatorsRequiredBefore: 4,
      operatorsRequiredAfter: 2,
      trainingRequiredDays: 5,
      manualWorkReductionPercent: 55,
      ergonomicsImprovement: 'Auto pallet changer eliminates operator physical lifting.',
    },
    safetyMaintenance: {
      safetyHazardReduction: 'Category 4 interlocked safety curtain and enclosure.',
      energySavingKwPerMonth: 300,
      maintenanceDowntimeReductionPercent: 45,
      sparesAvailability: 'Local OEM regional warehouse in India.',
    },
  });

  // Dynamic custom fields for other 12 proposal types
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  useEffect(() => {
    async function init() {
      try {
        const typesData = await api.getProposalTypes();
        setTypes(typesData);
        if (typesData.length > 0) {
          setProposalTypeId(typesData[0].id);
        }
        // Load department budgets to get department IDs
        const capex = await api.getCapexMetrics();
        const depts = capex.departmentBreakdown || [];
        setDepartments(depts);
        if (depts.length > 0) {
          setDepartmentId(depts[0].departmentId);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Recalculate financials and check budget live whenever inputs change
  useEffect(() => {
    const total =
      Number(purchasePrice || 0) +
      Number(installationCost || 0) +
      Number(transportCost || 0) +
      Number(trainingCost || 0) +
      Number(toolingCost || 0) +
      Number(otherCost || 0);

    api
      .calculateFinancials({
        purchasePrice,
        installationCost,
        transportCost,
        trainingCost,
        toolingCost,
        otherCost,
        annualSavings,
        extraRevenue,
        extraOpex,
        usefulLifeYears,
        discountRate,
        salvageValue,
      })
      .then(setFinancialMetrics)
      .catch(console.error);

    if (departmentId) {
      api
        .checkBudget({ departmentId, amount: total })
        .then(setBudgetCheckResult)
        .catch(console.error);
    }
  }, [
    purchasePrice,
    installationCost,
    transportCost,
    trainingCost,
    toolingCost,
    otherCost,
    annualSavings,
    extraRevenue,
    extraOpex,
    usefulLifeYears,
    discountRate,
    salvageValue,
    departmentId,
  ]);

  const selectedTypeObj = types.find((t) => t.id === proposalTypeId);
  const isMachinePurchaseOrReplacement =
    selectedTypeObj?.code === 'NEW_MACHINE' || selectedTypeObj?.code === 'REPLACEMENT';

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        proposalTypeId,
        departmentId,
        title: title || `${selectedTypeObj?.name}: ${machineName || 'Machinery Asset'}`,
        priority,
        machineName,
        category,
        manufacturer,
        supplier,
        currentMachineDetails,
        proposedMachineDetails,
        expectedDeliveryWeeks: Number(expectedDeliveryWeeks),
        purchasePrice: Number(purchasePrice),
        installationCost: Number(installationCost),
        transportCost: Number(transportCost),
        trainingCost: Number(trainingCost),
        toolingCost: Number(toolingCost),
        otherCost: Number(otherCost),
        usefulLifeYears: Number(usefulLifeYears),
        discountRate: Number(discountRate),
        salvageValue: Number(salvageValue),
        annualSavings: Number(annualSavings),
        extraRevenue: Number(extraRevenue),
        extraOpex: Number(extraOpex),
        bettermentJson: isMachinePurchaseOrReplacement ? betterment : null,
        customFieldsJson: !isMachinePurchaseOrReplacement ? customFields : null,
      };

      const created = await api.createProposal(payload);
      navigate(`/proposals/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit proposal');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-industrial-200 dark:border-industrial-800">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-brand-600" />
            Raise Capital Expenditure (CAPEX) Proposal
          </h1>
          <p className="text-xs text-industrial-500">
            Configure technical specs, evaluate DCF financials, conduct mandatory 5-pillar betterment analysis, and submit to workflow engine
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                step === s
                  ? 'bg-brand-600 text-white'
                  : step > s
                  ? 'bg-emerald-600 text-white'
                  : 'bg-industrial-100 dark:bg-industrial-800 text-industrial-500'
              }`}
            >
              {step > s ? '✓' : s}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: PROPOSAL TYPE SELECTOR */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-industrial-900 dark:text-industrial-100 uppercase tracking-wider">
              Step 1: Select CAPEX &amp; Change Proposal Category (14 Types)
            </h3>
            <span className="text-xs text-brand-600 font-semibold">
              Selected: {selectedTypeObj?.name}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {types.map((t) => {
              const isSelected = t.id === proposalTypeId;
              return (
                <div
                  key={t.id}
                  onClick={() => setProposalTypeId(t.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-brand-50/80 dark:bg-brand-950/40 border-brand-500 ring-2 ring-brand-500/20 shadow-md'
                      : 'bg-white dark:bg-industrial-900 border-industrial-200 dark:border-industrial-800 hover:border-brand-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-xs text-industrial-900 dark:text-industrial-100">
                      {t.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-industrial-100 dark:bg-industrial-800 text-industrial-500">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-industrial-500 mt-1 line-clamp-2">
                    {t.description || 'Standard industrial CAPEX workflow'}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm"
            >
              Continue to Technical Specs
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: TECHNICAL & ASSET DETAILS */}
      {step === 2 && (
        <div className="bg-white dark:bg-industrial-900 p-6 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-industrial-900 dark:text-industrial-100 uppercase tracking-wider pb-2 border-b border-industrial-100 dark:border-industrial-800">
            Step 2: Technical Specifications &amp; Operational Justification
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                Proposal Title *
              </label>
              <input
                type="text"
                placeholder="e.g. High-Speed 5-Axis CNC Milling Center for Aerospace Brackets"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100 focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100 focus:ring-2 focus:ring-brand-500"
              >
                {departments.map((d: any) => (
                  <option key={d.departmentId} value={d.departmentId}>
                    {d.departmentName} (Available: ₹{(d.available / 100000).toFixed(1)}L)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                Machine / Asset Model Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Makino D200Z 5-Axis VMC"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100 focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                Asset Category &amp; Priority
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
                >
                  <option value="CNC Milling">CNC Milling</option>
                  <option value="Turning Center">Turning Center</option>
                  <option value="Hydraulic Press">Hydraulic Press</option>
                  <option value="Robotics">Robotics &amp; Automation</option>
                  <option value="Laser Cutting">Laser Cutting</option>
                  <option value="Inspection / CMM">Inspection / CMM</option>
                  <option value="Auxiliary">Auxiliary Utility</option>
                </select>

                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
                >
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="CRITICAL">Critical Priority</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                Manufacturer (OEM) &amp; Supplier
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="OEM (e.g. Makino)"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
                />
                <input
                  type="text"
                  placeholder="Supplier Vendor"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                Expected Lead Time (Weeks)
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={expectedDeliveryWeeks}
                onChange={(e) => setExpectedDeliveryWeeks(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100 font-mono"
              />
            </div>

            {selectedTypeObj?.code === 'REPLACEMENT' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                  Current Aging Machine Details (To be replaced)
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe existing machine age, breakdown history, downtime hours, repair costs..."
                  value={currentMachineDetails}
                  onChange={(e) => setCurrentMachineDetails(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
                />
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-industrial-100 dark:border-industrial-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 text-industrial-700 dark:text-industrial-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm"
            >
              Continue to Financial Evaluation
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: FINANCIAL ENGINE & BUDGET AUDIT */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-industrial-900 p-6 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-industrial-100 dark:border-industrial-800">
              <h3 className="text-sm font-bold text-industrial-900 dark:text-industrial-100 uppercase tracking-wider">
                Step 3: CAPEX Investment Breakdown &amp; Cash Flow Forecast
              </h3>
              <span className="text-xs text-emerald-600 font-mono font-bold">Live DCF Calculation Active</span>
            </div>

            {/* Cost Breakdown Inputs */}
            <div>
              <h4 className="text-xs font-bold text-industrial-600 dark:text-industrial-400 uppercase tracking-wider mb-2">
                Capital Expenditure (CAPEX) Cost Components (₹ INR)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-industrial-500 mb-1">Base Purchase Price *</label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-industrial-500 mb-1">Installation &amp; Foundation</label>
                  <input
                    type="number"
                    value={installationCost}
                    onChange={(e) => setInstallationCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-industrial-500 mb-1">Freight &amp; Transit Insurance</label>
                  <input
                    type="number"
                    value={transportCost}
                    onChange={(e) => setTransportCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-industrial-500 mb-1">Operator &amp; Maintenance Training</label>
                  <input
                    type="number"
                    value={trainingCost}
                    onChange={(e) => setTrainingCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-industrial-500 mb-1">Tooling, Fixtures &amp; Jigs</label>
                  <input
                    type="number"
                    value={toolingCost}
                    onChange={(e) => setToolingCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-industrial-500 mb-1">Other Initial Ancillary Cost</label>
                  <input
                    type="number"
                    value={otherCost}
                    onChange={(e) => setOtherCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Financial Returns Inputs */}
            <div className="pt-3 border-t border-industrial-100 dark:border-industrial-800">
              <h4 className="text-xs font-bold text-industrial-600 dark:text-industrial-400 uppercase tracking-wider mb-2">
                Annual Financial Benefits &amp; DCF Model Parameters
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-industrial-500 mb-1">Annual Savings (Labor + Scrap + Energy) *</label>
                  <input
                    type="number"
                    value={annualSavings}
                    onChange={(e) => setAnnualSavings(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-industrial-500 mb-1">Extra Revenue per Year</label>
                  <input
                    type="number"
                    value={extraRevenue}
                    onChange={(e) => setExtraRevenue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-industrial-500 mb-1">Additional Annual OPEX (Power/Consumables)</label>
                  <input
                    type="number"
                    value={extraOpex}
                    onChange={(e) => setExtraOpex(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-industrial-500 mb-1">Useful Asset Life (Years) *</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={usefulLifeYears}
                    onChange={(e) => setUsefulLifeYears(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-industrial-500 mb-1">Hurdle / Discount Rate (%) *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={discountRate}
                    onChange={(e) => setDiscountRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-industrial-500 mb-1">Salvage / Residual Value at End of Life</label>
                  <input
                    type="number"
                    value={salvageValue}
                    onChange={(e) => setSalvageValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Financial Engine Output Widget */}
          <FinancialSummaryCard
            totalInvestment={financialMetrics.totalInvestment}
            annualNetBenefit={financialMetrics.annualNetBenefit}
            simplePayback={financialMetrics.simplePayback}
            roiPercent={financialMetrics.roiPercent}
            npv={financialMetrics.npv}
            irr={financialMetrics.irr}
            discountedPayback={financialMetrics.discountedPayback}
            annualDepreciation={financialMetrics.annualDepreciation}
            budgetImpactStatus={budgetCheckResult?.budgetImpactStatus}
            budgetAvailable={budgetCheckResult?.availableAmount}
            budgetAllocated={budgetCheckResult?.allocatedAmount}
            isOverrun={budgetCheckResult?.isOverrun}
          />

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 text-industrial-700 dark:text-industrial-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm"
            >
              Continue to 5-Pillar Betterment Analysis
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: 5-PILLAR BETTERMENT ANALYSIS (Mandatory for Machine Purchase/Replacement) */}
      {step === 4 && (
        <div className="bg-white dark:bg-industrial-900 p-6 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-industrial-900 dark:text-industrial-100 uppercase tracking-wider">
              Step 4: Mandatory 5-Pillar Betterment Analysis
            </h3>
            <p className="text-xs text-industrial-500">
              Rigorous comparative data required across Production, Financial, Quality, Manpower, and Safety/Maintenance
            </p>
          </div>

          {/* Pillar 1: Production */}
          <div className="p-4 rounded-lg bg-industrial-50 dark:bg-industrial-800/40 border border-industrial-200 dark:border-industrial-800 space-y-3">
            <h4 className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
              1. Production &amp; Throughput Betterment
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-industrial-500 block mb-1">Capacity Before</label>
                <input
                  type="text"
                  value={betterment.production.capacityBefore}
                  onChange={(e) => setBetterment({ ...betterment, production: { ...betterment.production, capacityBefore: e.target.value } })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700"
                />
              </div>
              <div>
                <label className="text-[11px] text-industrial-500 block mb-1">Capacity After</label>
                <input
                  type="text"
                  value={betterment.production.capacityAfter}
                  onChange={(e) => setBetterment({ ...betterment, production: { ...betterment.production, capacityAfter: e.target.value } })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700"
                />
              </div>
              <div>
                <label className="text-[11px] text-industrial-500 block mb-1">Cycle Time Reduction (Sec)</label>
                <input
                  type="number"
                  value={betterment.production.cycleTimeReductionSec}
                  onChange={(e) => setBetterment({ ...betterment, production: { ...betterment.production, cycleTimeReductionSec: Number(e.target.value) } })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-industrial-500 block mb-1">Rejection Reduction (%)</label>
                <input
                  type="number"
                  value={betterment.production.rejectionRateReductionPercent}
                  onChange={(e) => setBetterment({ ...betterment, production: { ...betterment.production, rejectionRateReductionPercent: Number(e.target.value) } })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Pillar 2: Quality */}
          <div className="p-4 rounded-lg bg-industrial-50 dark:bg-industrial-800/40 border border-industrial-200 dark:border-industrial-800 space-y-3">
            <h4 className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
              2. Quality &amp; Defect Mitigation Betterment
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-industrial-500 block mb-1">Defect Reduction (%)</label>
                <input
                  type="number"
                  value={betterment.quality.defectReductionPercent}
                  onChange={(e) => setBetterment({ ...betterment, quality: { ...betterment.quality, defectReductionPercent: Number(e.target.value) } })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-industrial-500 block mb-1">Precision Tolerance Improvement</label>
                <input
                  type="text"
                  value={betterment.quality.precisionToleranceImprovement}
                  onChange={(e) => setBetterment({ ...betterment, quality: { ...betterment.quality, precisionToleranceImprovement: e.target.value } })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700"
                />
              </div>
              <div>
                <label className="text-[11px] text-industrial-500 block mb-1">Rework Saved (Hrs/Month)</label>
                <input
                  type="number"
                  value={betterment.quality.reworkReductionHoursPerMonth}
                  onChange={(e) => setBetterment({ ...betterment, quality: { ...betterment.quality, reworkReductionHoursPerMonth: Number(e.target.value) } })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Pillar 3: Manpower */}
          <div className="p-4 rounded-lg bg-industrial-50 dark:bg-industrial-800/40 border border-industrial-200 dark:border-industrial-800 space-y-3">
            <h4 className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
              3. Manpower, Training &amp; Ergonomics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-industrial-500 block mb-1">Operators Before</label>
                <input
                  type="number"
                  value={betterment.manpower.operatorsRequiredBefore}
                  onChange={(e) => setBetterment({ ...betterment, manpower: { ...betterment.manpower, operatorsRequiredBefore: Number(e.target.value) } })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-industrial-500 block mb-1">Operators After</label>
                <input
                  type="number"
                  value={betterment.manpower.operatorsRequiredAfter}
                  onChange={(e) => setBetterment({ ...betterment, manpower: { ...betterment.manpower, operatorsRequiredAfter: Number(e.target.value) } })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-industrial-500 block mb-1">Training Days Needed</label>
                <input
                  type="number"
                  value={betterment.manpower.trainingRequiredDays}
                  onChange={(e) => setBetterment({ ...betterment, manpower: { ...betterment.manpower, trainingRequiredDays: Number(e.target.value) } })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-industrial-500 block mb-1">Manual Work Reduction (%)</label>
                <input
                  type="number"
                  value={betterment.manpower.manualWorkReductionPercent}
                  onChange={(e) => setBetterment({ ...betterment, manpower: { ...betterment.manpower, manualWorkReductionPercent: Number(e.target.value) } })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Pillar 4: Safety & Maintenance */}
          <div className="p-4 rounded-lg bg-industrial-50 dark:bg-industrial-800/40 border border-industrial-200 dark:border-industrial-800 space-y-3">
            <h4 className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
              4. Safety, Energy &amp; Maintenance Downtime
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-industrial-500 block mb-1">Energy Saving (kWh/month)</label>
                <input
                  type="number"
                  value={betterment.safetyMaintenance.energySavingKwPerMonth}
                  onChange={(e) => setBetterment({ ...betterment, safetyMaintenance: { ...betterment.safetyMaintenance, energySavingKwPerMonth: Number(e.target.value) } })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-industrial-500 block mb-1">Maintenance Downtime Reduction (%)</label>
                <input
                  type="number"
                  value={betterment.safetyMaintenance.maintenanceDowntimeReductionPercent}
                  onChange={(e) => setBetterment({ ...betterment, safetyMaintenance: { ...betterment.safetyMaintenance, maintenanceDowntimeReductionPercent: Number(e.target.value) } })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-industrial-500 block mb-1">Safety Hazard Reduction</label>
                <input
                  type="text"
                  value={betterment.safetyMaintenance.safetyHazardReduction}
                  onChange={(e) => setBetterment({ ...betterment, safetyMaintenance: { ...betterment.safetyMaintenance, safetyHazardReduction: e.target.value } })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 text-industrial-700 dark:text-industrial-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(5)}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm"
            >
              Review Dossier &amp; Submit
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: FINAL REVIEW & WORKFLOW ENGINE SUBMISSION */}
      {step === 5 && (
        <div className="bg-white dark:bg-industrial-900 p-6 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-industrial-900 dark:text-industrial-100 uppercase tracking-wider">
              Step 5: Review Proposal Dossier &amp; Threshold Routing
            </h3>
            <p className="text-xs text-industrial-500">
              The workflow engine will automatically evaluate the threshold rules and assign the initial stage
            </p>
          </div>

          {/* Summary Box */}
          <div className="p-4 rounded-xl bg-industrial-50 dark:bg-industrial-800/50 border border-industrial-200 dark:border-industrial-800 space-y-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-industrial-400 block text-[10px] uppercase font-bold">Category</span>
                <span className="font-semibold text-industrial-900 dark:text-industrial-100">{selectedTypeObj?.name}</span>
              </div>
              <div>
                <span className="text-industrial-400 block text-[10px] uppercase font-bold">Machine Model</span>
                <span className="font-semibold text-industrial-900 dark:text-industrial-100">{machineName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-industrial-400 block text-[10px] uppercase font-bold">Total CAPEX</span>
                <span className="font-mono font-bold text-brand-600 text-sm">₹{financialMetrics.totalInvestment.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-industrial-400 block text-[10px] uppercase font-bold">Expected Payback / ROI</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">{financialMetrics.simplePayback}y / {financialMetrics.roiPercent}%</span>
              </div>
            </div>

            {/* Threshold Routing Notification */}
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200">
              <span className="font-bold">Workflow Routing Evaluation:</span>{' '}
              {financialMetrics.totalInvestment <= 100000 ? (
                <span>Value is ≤ ₹1 Lakh. Routes directly to <strong>HOD Approval Only</strong>.</span>
              ) : financialMetrics.totalInvestment <= 1000000 ? (
                <span>Value is ₹1L - ₹10L. Routes through <strong>HOD → Technical (Engineer) → Finance Evaluation</strong>.</span>
              ) : (
                <span>Value &gt; ₹10 Lakhs. Routes through full 5-stage pipeline: <strong>HOD → Technical → Finance → Procurement → Management / Director Sanction</strong>.</span>
              )}
            </div>

            {budgetCheckResult?.isOverrun && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{budgetCheckResult.message}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-industrial-100 dark:border-industrial-800">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 text-industrial-700 dark:text-industrial-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Submitting to Workflow Engine...' : 'Confirm & Submit for Approval'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
