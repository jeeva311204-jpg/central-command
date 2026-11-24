import React, { useState, useEffect } from 'react';
import { Box, AlertTriangle, ShieldCheck, Clock, Calendar, CheckCircle2, Wrench, PlusCircle, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { Asset, MaintenanceSchedule } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';

export function AssetRegister() {
  const [assets, setAssets] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Maintenance Modal
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [maintTitle, setMaintTitle] = useState('');
  const [frequencyType, setFrequencyType] = useState<'CALENDAR' | 'OPERATING_HOURS'>('CALENDAR');
  const [frequencyValue, setFrequencyValue] = useState(90);
  const [nextDueDate, setNextDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetsData, schedulesData] = await Promise.all([
        api.getAssets(),
        api.getMaintenanceSchedules(),
      ]);
      setAssets(assetsData);
      setSchedules(schedulesData);
      if (assetsData.length > 0 && !selectedAssetId) {
        setSelectedAssetId(assetsData[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMaintenance = async (scheduleId: string) => {
    try {
      await api.completeMaintenance(scheduleId);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !maintTitle) return;
    try {
      await api.createMaintenanceSchedule({
        assetId: selectedAssetId,
        title: maintTitle,
        frequencyType,
        frequencyValue: Number(frequencyValue),
        nextDueDate,
      });
      setShowMaintModal(false);
      setMaintTitle('');
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Find assets with warranty expiring soon (< 30 days)
  const expiringSoonAssets = assets.filter((a) => a.isWarrantyExpiringSoon);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
            <Box className="w-6 h-6 text-brand-600" />
            Enterprise Machinery Asset Register &amp; Maintenance
          </h1>
          <p className="text-xs text-industrial-500">
            Commissioned machinery tracking, OEM warranty expiration monitoring &amp; preventive maintenance scheduler
          </p>
        </div>

        <button
          onClick={() => setShowMaintModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Schedule Preventive Maintenance
        </button>
      </div>

      {/* Warranty Expiring Soon Alert Banner */}
      {expiringSoonAssets.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-extrabold text-sm block">
              ⚠️ Urgent OEM Warranty Expiration Notice ({expiringSoonAssets.length} Machinery Assets)
            </span>
            <p>
              The following production machinery OEM warranty expires within the next 30 days. Review Annual Maintenance Contract (AMC) renewal:
            </p>
            <div className="flex items-center gap-3 pt-1 flex-wrap font-mono">
              {expiringSoonAssets.map((a) => (
                <span key={a.id} className="bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded font-bold">
                  {a.assetCode} ({a.name}): Expires in <strong>{a.daysUntilWarrantyExpiry} days</strong>!
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assets Grid */}
      <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-industrial-100 dark:border-industrial-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300">
            Registered Industrial Assets ({assets.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-industrial-50 dark:bg-industrial-800/40 text-industrial-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Asset Code</th>
                  <th className="p-3.5">Machine Name &amp; Category</th>
                  <th className="p-3.5">Department &amp; Location</th>
                  <th className="p-3.5">Serial Number</th>
                  <th className="p-3.5">Purchase Cost</th>
                  <th className="p-3.5">Warranty Expiry</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-industrial-50 dark:hover:bg-industrial-800/50">
                    <td className="p-3.5 font-mono font-bold text-brand-600">
                      {a.assetCode}
                    </td>

                    <td className="p-3.5 max-w-xs">
                      <div className="font-semibold text-industrial-900 dark:text-industrial-100 truncate">
                        {a.name}
                      </div>
                      <div className="text-[11px] text-industrial-500">
                        {a.category} • OEM: {a.vendor?.name || 'OEM'}
                      </div>
                    </td>

                    <td className="p-3.5 text-industrial-600 dark:text-industrial-400">
                      <div>{a.department?.name}</div>
                      <div className="text-[10px] text-industrial-400">{a.location || 'Shop Floor'}</div>
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-industrial-700 dark:text-industrial-300">
                      {a.serialNumber || 'SN-N/A'}
                    </td>

                    <td className="p-3.5 font-mono font-semibold">
                      ₹{a.purchaseCost.toLocaleString('en-IN')}
                    </td>

                    <td className="p-3.5">
                      {a.warrantyExpiryDate ? (
                        <div>
                          <span className="font-mono text-industrial-700 dark:text-industrial-300 block">
                            {new Date(a.warrantyExpiryDate).toLocaleDateString()}
                          </span>
                          {a.isWarrantyExpiringSoon ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              Expires in {a.daysUntilWarrantyExpiry} days!
                            </span>
                          ) : a.isWarrantyExpired ? (
                            <span className="text-[10px] font-bold text-rose-600">Expired</span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-semibold">Under Active Warranty</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-industrial-400">N/A</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preventive Maintenance Schedule Table */}
      <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-industrial-100 dark:border-industrial-800 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-industrial-700 dark:text-industrial-300 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-brand-500" />
            Preventive Maintenance Schedules &amp; Service Due Alerts ({schedules.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-industrial-50 dark:bg-industrial-800/40 text-industrial-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Asset Code</th>
                <th className="p-3.5">Service Task</th>
                <th className="p-3.5">Frequency Cycle</th>
                <th className="p-3.5">Next Due Date / Hours</th>
                <th className="p-3.5">Assignee</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
              {schedules.map((s) => (
                <tr key={s.id} className="hover:bg-industrial-50 dark:hover:bg-industrial-800/50">
                  <td className="p-3.5 font-mono font-bold text-brand-600">
                    {s.asset?.assetCode}
                  </td>

                  <td className="p-3.5 max-w-sm">
                    <div className="font-semibold text-industrial-900 dark:text-industrial-100">
                      {s.title}
                    </div>
                    <div className="text-[11px] text-industrial-500">{s.asset?.name}</div>
                  </td>

                  <td className="p-3.5 font-mono text-[11px]">
                    Every {s.frequencyValue} {s.frequencyType === 'CALENDAR' ? 'Days' : 'Operating Hours'}
                  </td>

                  <td className="p-3.5 font-mono text-[11px]">
                    {s.nextDueDate ? new Date(s.nextDueDate).toLocaleDateString() : 'N/A'}
                    {s.nextDueHours && <span className="block text-industrial-400">@ {s.nextDueHours} Hrs</span>}
                  </td>

                  <td className="p-3.5 text-industrial-600 dark:text-industrial-400">
                    {s.assignedTo?.name || 'Maintenance Lead'}
                  </td>

                  <td className="p-3.5">
                    <StatusBadge status={s.status} />
                  </td>

                  <td className="p-3.5 text-right">
                    {s.status !== 'COMPLETED' ? (
                      <button
                        onClick={() => handleCompleteMaintenance(s.id)}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px]"
                      >
                        Mark Done
                      </button>
                    ) : (
                      <span className="text-emerald-600 font-bold text-[11px]">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SCHEDULE MAINTENANCE MODAL */}
      <Modal
        isOpen={showMaintModal}
        onClose={() => setShowMaintModal(false)}
        title="Schedule Preventive Maintenance Calibration"
      >
        <form onSubmit={handleCreateMaintenance} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold mb-1">Target Asset *</label>
            <select
              required
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.assetCode} — {a.name} ({a.department?.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Maintenance Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Quarterly Spindle Taper Runout & Dynamic Vibration Balancing"
              value={maintTitle}
              onChange={(e) => setMaintTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Frequency Base</label>
              <select
                value={frequencyType}
                onChange={(e) => setFrequencyType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
              >
                <option value="CALENDAR">Calendar Days</option>
                <option value="OPERATING_HOURS">Operating Hours</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Interval Value</label>
              <input
                type="number"
                value={frequencyValue}
                onChange={(e) => setFrequencyValue(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Next Due Date *</label>
            <input
              type="date"
              required
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowMaintModal(false)}
              className="px-4 py-2 rounded-lg bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold"
            >
              Save Schedule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
