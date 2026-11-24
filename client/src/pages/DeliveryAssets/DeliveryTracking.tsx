import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle2, Clock, ShieldCheck, Plus, ArrowRight, UserCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';

export function DeliveryTracking() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Signoff Modal
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [signoffType, setSignoffType] = useState<'QUALITY' | 'ENGINEERING' | 'BOTH'>('BOTH');
  const [serialNumber, setSerialNumber] = useState('');
  const [location, setLocation] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [signingOff, setSigningOff] = useState(false);

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const data = await api.getDeliveries();
      setDeliveries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStepUpdate = async (id: string, stepField: string) => {
    try {
      await api.updateDeliveryStep(id, {
        [stepField]: new Date(),
        status: stepField === 'commissioningDate' ? 'COMMISSIONED' : stepField === 'installationDate' ? 'INSTALLED' : 'DELIVERED',
      });
      await loadDeliveries();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignoffSubmit = async () => {
    if (!selectedDelivery) return;
    setSigningOff(true);
    try {
      await api.signoffDelivery(selectedDelivery.id, {
        signoffType,
        serialNumber: serialNumber || `SN-${Date.now().toString().slice(-8)}`,
        location: location || 'Main Production Floor Bay 1',
        warrantyMonths: Number(warrantyMonths) || 12,
      });
      setSelectedDelivery(null);
      await loadDeliveries();
    } catch (e) {
      console.error(e);
    } finally {
      setSigningOff(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
          <Truck className="w-6 h-6 text-brand-600" />
          Machinery Delivery, Commissioning &amp; Handover Pipeline
        </h1>
        <p className="text-xs text-industrial-500">
          5-Stage Factory Acceptance Protocol: Delivery → Installation → Commissioning → Operator Training → Dual Quality &amp; Engineering Signoff
        </p>
      </div>

      {/* Deliveries Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="bg-white dark:bg-industrial-900 p-12 rounded-xl border border-industrial-200 dark:border-industrial-800 text-center text-xs text-industrial-400">
            No active deliveries in transit or awaiting commissioning.
          </div>
        ) : (
          deliveries.map((del) => {
            const po = del.purchaseOrder;
            const proposal = po?.proposal;

            const isDelivered = !!del.deliveryDate;
            const isInstalled = !!del.installationDate;
            const isCommissioned = !!del.commissioningDate;
            const isTrained = !!del.trainingCompletedDate;
            const isVerified = del.status === 'VERIFIED';

            return (
              <div
                key={del.id}
                className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-industrial-100 dark:border-industrial-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                        {po?.poNumber}
                      </span>
                      <h3 className="font-bold text-sm text-industrial-950 dark:text-white">
                        {proposal?.machineName || proposal?.title}
                      </h3>
                    </div>
                    <p className="text-xs text-industrial-500 mt-0.5">
                      Vendor: <strong>{po?.vendor?.name}</strong> • Dept: {proposal?.department?.name} • Tracking: {del.trackingNumber || 'Pending'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={del.status} />
                    {!isVerified && isCommissioned && (
                      <button
                        onClick={() => {
                          setSelectedDelivery(del);
                          setSerialNumber(`SN-${Date.now().toString().slice(-8)}`);
                          setLocation(`${proposal?.department?.name} Bay 2`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Final Signoff &amp; Auto-Register Asset
                      </button>
                    )}
                  </div>
                </div>

                {/* 5-Step Pipeline Steps */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
                  {/* Step 1: Delivery */}
                  <div className={`p-3 rounded-lg border text-xs ${isDelivered ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' : 'bg-industrial-50 dark:bg-industrial-800/40 border-industrial-200 dark:border-industrial-700'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[10px] uppercase text-industrial-500">1. Factory Delivery</span>
                      {isDelivered && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    {isDelivered ? (
                      <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 block">
                        {new Date(del.deliveryDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleStepUpdate(del.id, 'deliveryDate')}
                        className="text-[11px] font-bold text-brand-600 hover:underline"
                      >
                        Record Delivery
                      </button>
                    )}
                  </div>

                  {/* Step 2: Installation */}
                  <div className={`p-3 rounded-lg border text-xs ${isInstalled ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' : 'bg-industrial-50 dark:bg-industrial-800/40 border-industrial-200 dark:border-industrial-700'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[10px] uppercase text-industrial-500">2. Foundation &amp; Install</span>
                      {isInstalled && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    {isInstalled ? (
                      <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 block">
                        {new Date(del.installationDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleStepUpdate(del.id, 'installationDate')}
                        className="text-[11px] font-bold text-brand-600 hover:underline"
                      >
                        Confirm Installation
                      </button>
                    )}
                  </div>

                  {/* Step 3: Commissioning */}
                  <div className={`p-3 rounded-lg border text-xs ${isCommissioned ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' : 'bg-industrial-50 dark:bg-industrial-800/40 border-industrial-200 dark:border-industrial-700'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[10px] uppercase text-industrial-500">3. Commissioning Run</span>
                      {isCommissioned && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    {isCommissioned ? (
                      <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 block">
                        {new Date(del.commissioningDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleStepUpdate(del.id, 'commissioningDate')}
                        className="text-[11px] font-bold text-brand-600 hover:underline"
                      >
                        Test Commission
                      </button>
                    )}
                  </div>

                  {/* Step 4: Operator Training */}
                  <div className={`p-3 rounded-lg border text-xs ${isTrained ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' : 'bg-industrial-50 dark:bg-industrial-800/40 border-industrial-200 dark:border-industrial-700'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[10px] uppercase text-industrial-500">4. Operator Training</span>
                      {isTrained && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    {isTrained ? (
                      <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 block">
                        {new Date(del.trainingCompletedDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleStepUpdate(del.id, 'trainingCompletedDate')}
                        className="text-[11px] font-bold text-brand-600 hover:underline"
                      >
                        Complete Training
                      </button>
                    )}
                  </div>

                  {/* Step 5: Verification Signoff */}
                  <div className={`p-3 rounded-lg border text-xs ${isVerified ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-400 dark:border-emerald-700' : 'bg-industrial-50 dark:bg-industrial-800/40 border-industrial-200 dark:border-industrial-700'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[10px] uppercase text-industrial-500">5. QA &amp; Eng Signoff</span>
                      {isVerified && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    {isVerified ? (
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">
                        ✓ Registered in Asset DB
                      </span>
                    ) : (
                      <span className="text-[11px] text-industrial-400">Awaiting Signoff</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FINAL SIGNOFF MODAL */}
      <Modal
        isOpen={!!selectedDelivery}
        onClose={() => setSelectedDelivery(null)}
        title="Final Quality & Engineering Handover Sign-off"
      >
        <div className="space-y-4 text-xs">
          <p className="text-industrial-600 dark:text-industrial-400">
            Confirming final handover will <strong>automatically create a registered asset</strong> in the enterprise Asset Register and schedule 3, 6, and 12-month post-investment audit review tasks.
          </p>

          <div>
            <label className="block text-xs font-semibold mb-1">Sign-off Authority *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSignoffType('QUALITY')}
                className={`p-2 rounded font-semibold border ${signoffType === 'QUALITY' ? 'bg-brand-600 text-white' : 'bg-industrial-50 dark:bg-industrial-800'}`}
              >
                QA Lead
              </button>
              <button
                type="button"
                onClick={() => setSignoffType('ENGINEERING')}
                className={`p-2 rounded font-semibold border ${signoffType === 'ENGINEERING' ? 'bg-brand-600 text-white' : 'bg-industrial-50 dark:bg-industrial-800'}`}
              >
                Engineering Lead
              </button>
              <button
                type="button"
                onClick={() => setSignoffType('BOTH')}
                className={`p-2 rounded font-semibold border ${signoffType === 'BOTH' ? 'bg-emerald-600 text-white font-bold' : 'bg-industrial-50 dark:bg-industrial-800'}`}
              >
                Dual Signoff (Both)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Machinery Physical Serial Number *</label>
            <input
              type="text"
              required
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Installed Shop-Floor Location *</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">OEM Warranty Duration (Months)</label>
            <input
              type="number"
              value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setSelectedDelivery(null)}
              className="px-4 py-2 rounded-lg bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={signingOff}
              onClick={handleSignoffSubmit}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
            >
              {signingOff ? 'Auto-Registering Asset...' : 'Complete Signoff & Auto-Register'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
