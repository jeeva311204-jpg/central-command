import React, { useState } from 'react';
import { Box, Check, Award, Sliders, Zap, IndianRupee } from 'lucide-react';

interface MachineOption {
  id: string;
  name: string;
  oem: string;
  price: number;
  installation: number;
  capacityPerHour: number;
  powerKw: number;
  annualSavings: number;
  warrantyMonths: number;
  paybackYears: number;
}

export function MachineComparison() {
  const predefinedMachines: MachineOption[] = [
    {
      id: 'm1',
      name: 'Makino D200Z 5-Axis VMC',
      oem: 'Makino Japan',
      price: 4200000,
      installation: 350000,
      capacityPerHour: 6.5,
      powerKw: 22,
      annualSavings: 1950000,
      warrantyMonths: 24,
      paybackYears: 2.33,
    },
    {
      id: 'm2',
      name: 'DMG Mori DMU 50 3rd Gen',
      oem: 'DMG Mori Germany',
      price: 4650000,
      installation: 400000,
      capacityPerHour: 6.2,
      powerKw: 25,
      annualSavings: 1800000,
      warrantyMonths: 18,
      paybackYears: 2.81,
    },
    {
      id: 'm3',
      name: 'LMW JV 55 Vertical Machining',
      oem: 'LMW India',
      price: 3100000,
      installation: 200000,
      capacityPerHour: 4.8,
      powerKw: 18,
      annualSavings: 1300000,
      warrantyMonths: 12,
      paybackYears: 2.54,
    },
    {
      id: 'm4',
      name: 'Fanuc Robodrill α-D21LiB5',
      oem: 'Fanuc Robotics',
      price: 3600000,
      installation: 250000,
      capacityPerHour: 5.8,
      powerKw: 15,
      annualSavings: 1650000,
      warrantyMonths: 24,
      paybackYears: 2.33,
    },
  ];

  const [selectedIds, setSelectedIds] = useState<string[]>(['m1', 'm2', 'm3', 'm4']);

  const activeMachines = predefinedMachines.filter((m) => selectedIds.includes(m.id));

  // Determine best value per row
  const lowestPrice = Math.min(...activeMachines.map((m) => m.price));
  const lowestInstallation = Math.min(...activeMachines.map((m) => m.installation));
  const highestCapacity = Math.max(...activeMachines.map((m) => m.capacityPerHour));
  const lowestPower = Math.min(...activeMachines.map((m) => m.powerKw));
  const highestSavings = Math.max(...activeMachines.map((m) => m.annualSavings));
  const highestWarranty = Math.max(...activeMachines.map((m) => m.warrantyMonths));
  const lowestPayback = Math.min(...activeMachines.map((m) => m.paybackYears));

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      if (selectedIds.length < 4) setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
            <Box className="w-6 h-6 text-brand-600" />
            Machine Side-by-Side Comparison Matrix
          </h1>
          <p className="text-xs text-industrial-500">
            Compare 2 to 4 competitive industrial machinery models with dynamic best-value row highlights
          </p>
        </div>

        {/* Machine Selector Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-industrial-500">Select Models (2-4):</span>
          {predefinedMachines.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleSelect(m.id)}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold border transition-all ${
                selectedIds.includes(m.id)
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white dark:bg-industrial-800 text-industrial-600 dark:text-industrial-400 border-industrial-200 dark:border-industrial-700'
              }`}
            >
              {m.oem}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="bg-white dark:bg-industrial-900 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            {/* Table Header: Machine Names & OEMs */}
            <thead className="bg-industrial-50 dark:bg-industrial-800/60 border-b border-industrial-200 dark:border-industrial-800">
              <tr>
                <th className="p-4 w-52 font-bold uppercase tracking-wider text-[11px] text-industrial-400">
                  Specification Parameter
                </th>
                {activeMachines.map((m) => (
                  <th key={m.id} className="p-4 min-w-[200px]">
                    <div className="text-[10px] font-mono uppercase text-brand-600 dark:text-brand-400 font-bold">
                      {m.oem}
                    </div>
                    <div className="text-sm font-extrabold text-industrial-950 dark:text-white mt-0.5">
                      {m.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800 font-mono">
              {/* Row 1: Purchase Base Price */}
              <tr className="hover:bg-industrial-50/50 dark:hover:bg-industrial-800/30">
                <td className="p-4 font-sans font-semibold text-industrial-700 dark:text-industrial-300">
                  Base Purchase Price
                </td>
                {activeMachines.map((m) => {
                  const isBest = m.price === lowestPrice;
                  return (
                    <td key={m.id} className={`p-4 ${isBest ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-black' : 'text-industrial-900 dark:text-industrial-100'}`}>
                      <div className="flex items-center gap-1.5">
                        <span>₹{m.price.toLocaleString('en-IN')}</span>
                        {isBest && <span className="text-[10px] uppercase font-sans font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white">Lowest</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Row 2: Installation Cost */}
              <tr className="hover:bg-industrial-50/50 dark:hover:bg-industrial-800/30">
                <td className="p-4 font-sans font-semibold text-industrial-700 dark:text-industrial-300">
                  Installation &amp; Foundation
                </td>
                {activeMachines.map((m) => {
                  const isBest = m.installation === lowestInstallation;
                  return (
                    <td key={m.id} className={`p-4 ${isBest ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-black' : 'text-industrial-900 dark:text-industrial-100'}`}>
                      <div className="flex items-center gap-1.5">
                        <span>₹{m.installation.toLocaleString('en-IN')}</span>
                        {isBest && <span className="text-[10px] uppercase font-sans font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white">Best</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Row 3: Output Capacity */}
              <tr className="hover:bg-industrial-50/50 dark:hover:bg-industrial-800/30">
                <td className="p-4 font-sans font-semibold text-industrial-700 dark:text-industrial-300">
                  Output Capacity / Hour
                </td>
                {activeMachines.map((m) => {
                  const isBest = m.capacityPerHour === highestCapacity;
                  return (
                    <td key={m.id} className={`p-4 ${isBest ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-black' : 'text-industrial-900 dark:text-industrial-100'}`}>
                      <div className="flex items-center gap-1.5">
                        <span>{m.capacityPerHour} units/hr</span>
                        {isBest && <span className="text-[10px] uppercase font-sans font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white">Highest</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Row 4: Power Rating */}
              <tr className="hover:bg-industrial-50/50 dark:hover:bg-industrial-800/30">
                <td className="p-4 font-sans font-semibold text-industrial-700 dark:text-industrial-300">
                  Power Consumption (kW)
                </td>
                {activeMachines.map((m) => {
                  const isBest = m.powerKw === lowestPower;
                  return (
                    <td key={m.id} className={`p-4 ${isBest ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-black' : 'text-industrial-900 dark:text-industrial-100'}`}>
                      <div className="flex items-center gap-1.5">
                        <span>{m.powerKw} kW</span>
                        {isBest && <span className="text-[10px] uppercase font-sans font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white">Most Efficient</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Row 5: Expected Annual Savings */}
              <tr className="hover:bg-industrial-50/50 dark:hover:bg-industrial-800/30">
                <td className="p-4 font-sans font-semibold text-industrial-700 dark:text-industrial-300">
                  Projected Annual Net Savings
                </td>
                {activeMachines.map((m) => {
                  const isBest = m.annualSavings === highestSavings;
                  return (
                    <td key={m.id} className={`p-4 ${isBest ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-black' : 'text-industrial-900 dark:text-industrial-100'}`}>
                      <div className="flex items-center gap-1.5">
                        <span>₹{m.annualSavings.toLocaleString('en-IN')}/yr</span>
                        {isBest && <span className="text-[10px] uppercase font-sans font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white">Maximum</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Row 6: Warranty Duration */}
              <tr className="hover:bg-industrial-50/50 dark:hover:bg-industrial-800/30">
                <td className="p-4 font-sans font-semibold text-industrial-700 dark:text-industrial-300">
                  OEM Warranty Period
                </td>
                {activeMachines.map((m) => {
                  const isBest = m.warrantyMonths === highestWarranty;
                  return (
                    <td key={m.id} className={`p-4 ${isBest ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-black' : 'text-industrial-900 dark:text-industrial-100'}`}>
                      <div className="flex items-center gap-1.5">
                        <span>{m.warrantyMonths} Months</span>
                        {isBest && <span className="text-[10px] uppercase font-sans font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white">Longest</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Row 7: Simple Payback Period */}
              <tr className="hover:bg-industrial-50/50 dark:hover:bg-industrial-800/30">
                <td className="p-4 font-sans font-semibold text-industrial-700 dark:text-industrial-300">
                  Simple Payback Period
                </td>
                {activeMachines.map((m) => {
                  const isBest = m.paybackYears === lowestPayback;
                  return (
                    <td key={m.id} className={`p-4 ${isBest ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-black' : 'text-industrial-900 dark:text-industrial-100'}`}>
                      <div className="flex items-center gap-1.5">
                        <span>{m.paybackYears} Years</span>
                        {isBest && <span className="text-[10px] uppercase font-sans font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white">Fastest</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
