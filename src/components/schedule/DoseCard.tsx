'use client';

import React, { useRef } from 'react';
import { ScheduledDose } from '@/types/prescription';
import { PillDoseBadge } from '../ui/PillDoseBadge';
import { Check, Clock, X, Bell, Utensils, User } from 'lucide-react';
import gsap from 'gsap';
import { getFamilyRelationBadge } from '@/lib/familyMembers';

interface DoseCardProps {
  dose: ScheduledDose;
  onStatusChange: (doseId: string, status: 'taken' | 'skipped' | 'snoozed' | 'pending') => void;
  onDeleteDose?: (doseId: string) => void;
}

export const DoseCard: React.FC<DoseCardProps> = ({ dose, onStatusChange, onDeleteDose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [optimisticStatus, setOptimisticStatus] = React.useState<ScheduledDose['status'] | null>(null);

  // Only clear optimistic status once incoming dose.status confirms the optimistic transition
  React.useEffect(() => {
    if (dose.status === optimisticStatus) {
      setOptimisticStatus(null);
    }
  }, [dose.status, optimisticStatus]);

  const effectiveStatus = optimisticStatus || dose.status;
  const isCompleted = effectiveStatus === 'taken';

  const handleTake = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOptimisticStatus('taken');
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { scale: 1 },
        { scale: 1.03, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' }
      );
    }
    onStatusChange(dose.id, 'taken');
  };

  const handleSkip = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOptimisticStatus('skipped');
    onStatusChange(dose.id, 'skipped');
  };

  const handleSnooze = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onStatusChange(dose.id, 'snoozed');
  };

  return (
    <div
      ref={cardRef}
      id={`dose-card-${dose.id}`}
      data-testid="dose-card"
      className={`p-4 rounded-2xl border transition-all ${
        isCompleted
          ? 'bg-slate-50 border-emerald-300 shadow-sm opacity-90'
          : effectiveStatus === 'skipped'
          ? 'bg-slate-100 border-slate-200 opacity-60'
          : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Medicine Details */}
        <div className="space-y-1">
          {/* Family Member & Patient Badge */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(() => {
              const badge = getFamilyRelationBadge(dose.familyMember || 'self');
              const label = dose.familyMember === 'other' && dose.patientName ? dose.patientName : badge.label;
              return (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${badge.badgeBg}`}>
                  <span>{badge.icon}</span>
                  <span>{label}</span>
                  {dose.patientName && <span className="font-semibold text-slate-700 dark:text-slate-200">({dose.patientName})</span>}
                </span>
              );
            })()}
          </div>

          <div className="flex items-center gap-2">
            <h4
              className={`text-sm font-bold tracking-tight ${
                isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'
              }`}
            >
              {dose.medicationName}
            </h4>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0F58B6] font-mono font-bold border border-blue-200">
              {dose.dosage}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {dose.scheduledTime && (
              <span
                className={`flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                  dose.reminderEnabled !== false
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
                title={dose.reminderEnabled !== false ? 'Notification reminder enabled' : 'Notification reminder muted'}
              >
                <Bell className={`w-3 h-3 ${dose.reminderEnabled !== false ? 'fill-blue-600 text-blue-600' : ''}`} />
                <span>{dose.scheduledTime}</span>
              </span>
            )}
            {dose.timingNotes && (
              <span className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold">
                <Utensils className="w-3 h-3" />
                <span className="capitalize">{dose.timingNotes}</span>
              </span>
            )}
            {dose.instructions && (
              <span className="text-[11px] text-slate-500">· {dose.instructions}</span>
            )}
          </div>
        </div>

        {/* Status Badge & Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <PillDoseBadge status={effectiveStatus} time={dose.takenAt || dose.scheduledTime} />

          {effectiveStatus === 'pending' || effectiveStatus === 'snoozed' ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleTake}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0F58B6] hover:bg-[#0c4897] text-white text-xs font-bold shadow-md shadow-blue-900/10 active:scale-95 transition-all"
                title="Mark dose as taken"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Take</span>
              </button>

              <button
                type="button"
                onClick={handleSnooze}
                className="p-1.5 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                title="Snooze 15 minutes"
              >
                <Bell className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDeleteDose) {
                    onDeleteDose(dose.id);
                  } else {
                    handleSkip(e);
                  }
                }}
                id={`delete-dose-${dose.id}`}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Remove from routine"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOptimisticStatus('pending');
                  onStatusChange(dose.id, 'pending');
                }}
                className="text-[11px] text-slate-500 hover:text-blue-600 underline font-mono ml-2 transition-colors font-medium"
              >
                Undo
              </button>
              {onDeleteDose && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDose(dose.id);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Remove from routine"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
