import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Scale, Check, Sliders, Award, Star, IndianRupee, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';

export function QuotationComparison() {
  const [searchParams] = useSearchParams();
  const proposalIdParam = searchParams.get('proposalId');

  const [proposals, setProposals] = useState<any[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string>(proposalIdParam || '');
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Dynamic user-adjustable weights
  const [weights, setWeights] = useState({
    price: 30,
    warranty: 20,
    capacity: 20,
    power: 15,
    rating: 15,
  });

  useEffect(() => {
    api.getProposals().then((props) => {
      setProposals(props);
      if (!selectedProposalId && props.length > 0) {
        // Default to first proposal with quotations or prop 1
        const withQuotes = props.find((p: any) => p._count?.quotations > 0) || props[0];
        setSelectedProposalId(withQuotes.id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedProposalId) {
      loadComparison();
    }
  }, [selectedProposalId, weights]);

  const loadComparison = async () => {
    setLoading(true);
    try {
      const res = await api.compareQuotations({
        proposalId: selectedProposalId,
        weights,
      });
      setComparisonData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuotation = async (quotationId: string) => {
    try {
      await api.acceptQuotation(quotationId);
      await loadComparison();
    } catch (e) {
      console.error(e);
    }
  };

  const quotes = comparisonData?.quotations || [];
  const recommendedId = comparisonData?.recommendedQuotationId;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
            <Scale className="w-6 h-6 text-brand-600" />
            Vendor Quotation Side-by-Side Weighted Evaluation
          </h1>
          <p className="text-xs text-industrial-500">
            Multi-factor scoring algorithm evaluating price, warranty, capacity, power efficiency and vendor track record
          </p>
        </div>

        <div>
          <select
            value={selectedProposalId}
            onChange={(e) => setSelectedProposalId(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100 font-semibold"
          >
            {proposals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.proposalNumber} — {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dynamic Weight Sliders Configuration Box */}
      <div className="bg-white dark:bg-industrial-900 p-5 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-industrial-100 dark:border-industrial-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-500" />
            Configurable Scoring Weight Distribution
          </h3>
          <span className="text-xs font-mono text-industrial-400">
            Total Weight: {weights.price + weights.warranty + weights.capacity + weights.power + weights.rating}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-industrial-700 dark:text-industrial-300">Commercial Price</span>
              <span className="font-mono font-bold text-brand-600">{weights.price}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={weights.price}
              onChange={(e) => setWeights({ ...weights, price: Number(e.target.value) })}
              className="w-full accent-brand-600"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-industrial-700 dark:text-industrial-300">Warranty Coverage</span>
              <span className="font-mono font-bold text-brand-600">{weights.warranty}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={weights.warranty}
              onChange={(e) => setWeights({ ...weights, warranty: Number(e.target.value) })}
              className="w-full accent-brand-600"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-industrial-700 dark:text-industrial-300">Machinery Capacity</span>
              <span className="font-mono font-bold text-brand-600">{weights.capacity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={weights.capacity}
              onChange={(e) => setWeights({ ...weights, capacity: Number(e.target.value) })}
              className="w-full accent-brand-600"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-industrial-700 dark:text-industrial-300">Power Efficiency</span>
              <span className="font-mono font-bold text-brand-600">{weights.power}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={weights.power}
              onChange={(e) => setWeights({ ...weights, power: Number(e.target.value) })}
              className="w-full accent-brand-600"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-industrial-700 dark:text-industrial-300">Vendor Rating</span>
              <span className="font-mono font-bold text-brand-600">{weights.rating}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={weights.rating}
              onChange={(e) => setWeights({ ...weights, rating: Number(e.target.value) })}
              className="w-full accent-brand-600"
            />
          </div>
        </div>
      </div>

      {/* Side-by-Side Quotation Cards */}
      {quotes.length === 0 ? (
        <div className="bg-white dark:bg-industrial-900 p-12 rounded-xl border border-industrial-200 dark:border-industrial-800 text-center text-xs text-industrial-400">
          No quotations uploaded for this proposal yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quotes.map((q: any) => {
            const isRecommended = q.id === recommendedId;

            return (
              <div
                key={q.id}
                className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                  isRecommended
                    ? 'bg-gradient-to-b from-emerald-50/70 to-white dark:from-emerald-950/30 dark:to-industrial-900 border-emerald-400 dark:border-emerald-700 shadow-xl ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-industrial-900 border-industrial-200 dark:border-industrial-800 shadow-sm'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className={`p-5 border-b ${isRecommended ? 'border-emerald-200 dark:border-emerald-800/60' : 'border-industrial-100 dark:border-industrial-800'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-industrial-100 dark:bg-industrial-800 font-bold">
                        {q.quotationNumber}
                      </span>
                      {isRecommended && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm">
                          <Award className="w-3 h-3" />
                          Recommended Vendor
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-base text-industrial-950 dark:text-white">
                      {q.vendor?.name}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-industrial-500 mt-1">
                      <div className="flex items-center text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-current mr-0.5" />
                        {q.vendor?.rating} / 5.0
                      </div>
                      <span>•</span>
                      <span>{q.vendor?.purchaseHistoryCount} Prior POs</span>
                      <span>•</span>
                      <span>{q.vendor?.city}</span>
                    </div>
                  </div>

                  {/* Weighted Score Banner */}
                  <div className="p-4 bg-industrial-950 text-white flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-industrial-400 uppercase tracking-wider block">
                        Composite Weighted Score
                      </span>
                      <span className="text-2xl font-black font-mono text-cyan-400">
                        {q.weightedScore} <span className="text-xs text-industrial-400">/ 100</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-industrial-400 uppercase tracking-wider block">
                        Total Commercial Cost
                      </span>
                      <span className="text-base font-bold font-mono text-emerald-400">
                        ₹{q.totalCost.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Attribute Breakdown */}
                  <div className="p-5 space-y-3 text-xs">
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-industrial-500">Base Machine Price:</span>
                        <span className="font-mono font-semibold">₹{q.price.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-industrial-500">Installation Cost:</span>
                        <span className="font-mono font-semibold">₹{q.installationCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-industrial-500">Warranty Coverage:</span>
                        <span className="font-mono font-semibold">{q.warrantyMonths} Months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-industrial-500">Lead Time:</span>
                        <span className="font-mono font-semibold">{q.deliveryWeeks} Weeks</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-industrial-500">Output Capacity:</span>
                        <span className="font-mono font-semibold">{q.capacityPerHour || 'N/A'} units/hr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-industrial-500">Power Rating:</span>
                        <span className="font-mono font-semibold">{q.powerConsumptionKw || 'N/A'} kW</span>
                      </div>
                    </div>

                    {q.notes && (
                      <p className="p-2.5 rounded-lg bg-industrial-50 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-400 text-[11px] italic">
                        "{q.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-industrial-50 dark:bg-industrial-800/40 border-t border-industrial-100 dark:border-industrial-800">
                  {q.isAccepted ? (
                    <div className="w-full py-2 text-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      Accepted &amp; Selected for PO
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAcceptQuotation(q.id)}
                      className={`w-full py-2 px-3 rounded-lg font-bold text-xs transition-all shadow-sm ${
                        isRecommended
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-white dark:bg-industrial-800 border border-industrial-300 hover:border-brand-500 text-industrial-800 dark:text-industrial-200'
                      }`}
                    >
                      Accept this Quotation
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
