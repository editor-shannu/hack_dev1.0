'use client';

import React from 'react';
import { Prescription } from '@/types/prescription';
import { checkRefillStatus } from '@/lib/scheduleEngine';
import { SpotlightCard } from '../ui/SpotlightCard';
import { AlertTriangle, PackagePlus, ShoppingBag } from 'lucide-react';

interface RefillInventoryProps {
  prescriptions: Prescription[];
  onRefillPills?: (prescriptionId: string, medicationId: string, addedCount: number) => void;
}

export const RefillInventory: React.FC<RefillInventoryProps> = ({ prescriptions }) => {
  // Aggregate all active medications
  const allMeds = prescriptions.flatMap((p) =>
    p.medications.map((m) => ({
      ...m,
      prescriptionTitle: p.title,
      prescriptionId: p.id,
      doctorName: p.doctorName,
      refillStatus: checkRefillStatus(m),
    }))
  );

  const lowStockMeds = allMeds.filter((m) => m.refillStatus.isLow);

  return (
    <div className="space-y-6">
      {/* Alert Header if low stock */}
      {lowStockMeds.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 animate-bounce text-amber-600" />
          <div>
            <h4 className="text-sm font-bold text-amber-900">Action Required: {lowStockMeds.length} Medication(s) Running Low</h4>
            <p className="text-xs text-amber-800 opacity-90 mt-0.5">
              These medications have 4 or fewer days of supply remaining based on your prescribed dosage schedule.
            </p>
          </div>
        </div>
      )}

      {/* Pill Inventory Grid */}
      {allMeds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allMeds.map((item) => {
            const { isLow, daysRemaining } = item.refillStatus;
            const remaining = item.remainingPills ?? 15;
            const total = item.totalPrescribedPills ?? 30;
            const percentage = Math.min(100, Math.round((remaining / total) * 100));

            return (
              <div
                key={`${item.prescriptionId}-${item.id}`}
                className={`p-5 rounded-2xl bg-white border transition-all shadow-sm ${
                  isLow ? 'border-amber-300' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col justify-between h-full space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 tracking-tight">{item.name}</h4>
                        <p className="text-xs text-slate-500 font-mono">
                          {item.dosage} · {item.frequency}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                          isLow
                            ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isLow ? `Low (${daysRemaining}d)` : `OK (${daysRemaining}d)`}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-2 truncate">
                      Prescribed in: <span className="text-slate-700 font-semibold">{item.prescriptionTitle}</span>
                    </p>
                  </div>

                  {/* Progress bar of remaining supply */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-600">
                      <span>Stock: {remaining} pills</span>
                      <span className="font-bold">{percentage}% remaining</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLow ? 'bg-amber-500' : 'bg-gradient-to-r from-[#0F58B6] to-[#2098F2]'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Refill trigger */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 text-[11px] font-mono">
                      Refill at &le; {item.refillThreshold ?? 4} days
                    </span>
                    <a
                      href={`https://www.google.com/search?q=pharmacy+refill+${encodeURIComponent(item.name)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[#0F58B6] hover:underline font-bold text-[11px]"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Find Pharmacy</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 sm:p-16 rounded-3xl border border-dashed border-slate-200 bg-white text-center space-y-3 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0F58B6] shadow-sm">
            <PackagePlus className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h4 className="text-base font-bold text-slate-900">No Medications In Stock</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your medication pill inventory and automated low-stock warnings will appear here once prescriptions are ingested.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
