'use client';

import React from 'react';
import { Prescription } from '@/types/prescription';
import { PrescriptionDiffResult } from '@/lib/prescriptionDiff';
import {
  X,
  PlusCircle,
  MinusCircle,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  Clock,
  Sparkles,
  ArrowLeftRight,
  User,
  Building2,
  Stethoscope
} from 'lucide-react';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';

interface PrescriptionDiffViewProps {
  oldRx: Prescription;
  newRx: Prescription;
  diffResult: PrescriptionDiffResult;
  onClose: () => void;
}

export const PrescriptionDiffView: React.FC<PrescriptionDiffViewProps> = ({
  oldRx,
  newRx,
  diffResult,
  onClose,
}) => {
  useBodyScrollLock(true);

  const { added, removed, changed, unchanged, matchedPairs, patientMismatch } = diffResult;

  const totalChanges = added.length + removed.length + changed.length;
  const verificationAlerts = matchedPairs.filter((p) => p.needsVerification);

  // Determine if this is a cross-patient comparison (e.g. family member vs user)
  const isDifferentPatients = 
    oldRx.patientName && 
    newRx.patientName && 
    oldRx.patientName.trim().toLowerCase() !== newRx.patientName.trim().toLowerCase();

  // Group changes by medication name
  const changesByMed = changed.reduce<Record<string, typeof changed>>((acc, c) => {
    if (!acc[c.medicineName]) acc[c.medicineName] = [];
    acc[c.medicineName].push(c);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
      data-lenis-prevent="true"
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-900 my-auto"
        data-lenis-prevent="true"
      >
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-slate-100 flex items-start justify-between gap-3 sm:gap-4 bg-gradient-to-r from-blue-50/50 to-purple-50/30 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#0F58B6] text-white flex items-center justify-center shadow-sm flex-shrink-0">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 break-words">Prescription Comparison (Diff)</h3>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0F58B6] whitespace-nowrap">
                {totalChanges} change{totalChanges === 1 ? '' : 's'} detected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
              Neutral comparison between two prescription records showing whose medications are adjusted, added, or discontinued.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prescription & Patient Metadata Comparison Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-50 border-b border-slate-200 text-xs flex-shrink-0">
          {/* Previous Prescription Profile */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-sm min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Prior Prescription</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">Old Rx</span>
            </div>
            <span className="font-bold text-slate-900 text-sm break-words block">{oldRx.title}</span>
            <div className="space-y-1 pt-1 text-[11px] text-slate-600 border-t border-slate-100">
              <div className="flex items-center gap-1.5 min-w-0">
                <User className="w-3.5 h-3.5 text-[#0F58B6] flex-shrink-0" />
                <span className="font-bold text-slate-800 break-words">
                  Patient: {oldRx.patientName || 'Primary Account Holder'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 min-w-0">
                <Stethoscope className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                <span className="break-words">Dr: {oldRx.doctorName || 'Physician'}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between text-slate-400 text-[10px] font-mono pt-0.5 gap-1">
                <span>{oldRx.clinicOrHospital || 'Medical Clinic'}</span>
                <span>{oldRx.date}</span>
              </div>
            </div>
          </div>

          {/* Latest Prescription Profile */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-[#0F58B6] font-bold block">Latest Prescription</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#0F58B6] font-bold border border-blue-200">New Rx</span>
            </div>
            <span className="font-bold text-slate-900 text-sm break-words block">{newRx.title}</span>
            <div className="space-y-1 pt-1 text-[11px] text-slate-600 border-t border-blue-50">
              <div className="flex items-center gap-1.5 min-w-0">
                <User className="w-3.5 h-3.5 text-[#0F58B6] flex-shrink-0" />
                <span className="font-bold text-slate-800 break-words">
                  Patient: {newRx.patientName || 'Primary Account Holder'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 min-w-0">
                <Stethoscope className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                <span className="break-words">Dr: {newRx.doctorName || 'Physician'}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between text-slate-400 text-[10px] font-mono pt-0.5 gap-1">
                <span>{newRx.clinicOrHospital || 'Medical Clinic'}</span>
                <span>{newRx.date}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cross-Patient Warning Banner if comparing records from two different family members */}
        {isDifferentPatients && (
          <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-3 sm:p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-2.5 text-xs text-amber-950 flex-shrink-0 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-900 block">Cross-Patient Medication Comparison</span>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                You are comparing medications between two different individuals: <strong className="font-semibold text-amber-950">{oldRx.patientName}</strong> (Prior Rx) and <strong className="font-semibold text-amber-950">{newRx.patientName}</strong> (Latest Rx). Each medication listed below is clearly marked with who it was prescribed for.
              </p>
            </div>
          </div>
        )}

        {/* Main Content Area — flex-1 with native scroll on mobile & desktop */}
        <div
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6"
          data-lenis-prevent="true"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehavior: 'contain' }}
        >

          {/* Verification Warning Alert if similarity was between 0.85 and 0.95 */}
          {verificationAlerts.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900 shadow-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Fuzzy Match Notice (Verify Manually):</span>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  The following medication name(s) had slight OCR spelling variations across uploads and were matched based on high similarity:
                </p>
                <ul className="mt-1 space-y-0.5 list-disc list-inside text-[11px] font-mono">
                  {verificationAlerts.map((p, idx) => (
                    <li key={idx}>
                      <span className="font-semibold">{p.oldMedicineName}</span> ≈ <span className="font-semibold">{p.newMedicineName}</span> ({Math.round(p.similarity * 100)}% match)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Section 1: Added Medications (Green) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Added Medications ({added.length})
                </h4>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                New in latest Rx
              </span>
            </div>

            {added.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 rounded-xl bg-slate-50 border border-slate-100">
                No new medications were added.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {added.map((med, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-sm space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-emerald-950">{med.name}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-200/60 text-emerald-800">
                        + Added
                      </span>
                    </div>
                    <div className="text-xs text-emerald-800 space-y-0.5 font-medium">
                      <p>Dose: <span className="font-semibold">{med.dosage || '1 unit'}</span> · {med.frequency || 'Daily'}</p>
                      {med.timing && <p>Timing: <span className="capitalize">{med.timing.replace('_', ' ')}</span></p>}
                      {med.instructions && <p className="text-[11px] opacity-90">{med.instructions}</p>}
                    </div>

                    {/* Patient Ownership Badge */}
                    <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between text-[10px] font-mono text-emerald-900">
                      <span className="flex items-center gap-1 font-bold">
                        <User className="w-3 h-3 text-emerald-700" />
                        Prescribed for: {newRx.patientName || 'Primary Patient'}
                      </span>
                      <span className="text-emerald-700/80 truncate max-w-[140px]">
                        {newRx.doctorName ? `Dr. ${newRx.doctorName}` : newRx.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Removed / Discontinued Medications (Red) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MinusCircle className="w-4 h-4 text-rose-600" />
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Discontinued / Removed Medications ({removed.length})
                </h4>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Omitted in latest Rx
              </span>
            </div>

            {removed.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 rounded-xl bg-slate-50 border border-slate-100">
                No medications were discontinued.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {removed.map((med, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 shadow-sm space-y-2 opacity-90"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-rose-950 line-through decoration-rose-400">{med.name}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-200/60 text-rose-800">
                        - Removed
                      </span>
                    </div>
                    <div className="text-xs text-rose-800 space-y-0.5 font-medium">
                      <p>Prior Dose: {med.dosage || '1 unit'} · {med.frequency || 'Daily'}</p>
                      {med.instructions && <p className="text-[11px] opacity-90">{med.instructions}</p>}
                    </div>

                    {/* Patient Ownership Badge */}
                    <div className="pt-2 border-t border-rose-200/80 flex items-center justify-between text-[10px] font-mono text-rose-900">
                      <span className="flex items-center gap-1 font-bold">
                        <User className="w-3 h-3 text-rose-700" />
                        Originally for: {oldRx.patientName || 'Primary Patient'}
                      </span>
                      <span className="text-rose-700/80 truncate max-w-[140px]">
                        {oldRx.doctorName ? `Dr. ${oldRx.doctorName}` : oldRx.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Changed / Modified Medications (Orange) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Modified Dosages &amp; Routines ({Object.keys(changesByMed).length})
                </h4>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Adjusted values
              </span>
            </div>

            {Object.keys(changesByMed).length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 rounded-xl bg-slate-50 border border-slate-100">
                No dosage or schedule modifications detected.
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(changesByMed).map(([medName, changesList], idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-amber-950">{medName}</span>
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-amber-200/60 text-amber-800">
                        {changesList.length} field adjustment{changesList.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {changesList.map((ch, chIdx) => (
                        <div
                          key={chIdx}
                          className="p-2.5 rounded-xl bg-white border border-amber-200/80 space-y-1 text-xs"
                        >
                          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block capitalize">
                            {ch.field} Change
                          </span>
                          <div className="flex items-center gap-2 font-medium flex-wrap min-w-0">
                            <span className="text-slate-500 line-through break-words min-w-0">{ch.oldValue}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <span className="font-bold text-amber-900 break-words min-w-0">{ch.newValue}</span>
                          </div>
                          {ch.verificationNote && (
                            <span className="text-[10px] text-amber-700 font-mono block pt-0.5 break-words">
                              {ch.verificationNote}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Patient Ownership Badge */}
                    <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono text-amber-900">
                      <span className="flex items-center gap-1 font-bold">
                        <User className="w-3 h-3 text-amber-700" />
                        Patient: {newRx.patientName || oldRx.patientName || 'Primary Patient'}
                      </span>
                      <span className="text-amber-700/80 break-words">
                        {oldRx.title} ➔ {newRx.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Unchanged Medications (Neutral) */}
          {unchanged.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Unchanged Medications ({unchanged.length})</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {unchanged.map((med, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium flex flex-wrap items-center gap-2"
                  >
                    <span className="font-semibold">{med.name}</span>{' '}
                    <span className="text-slate-400">({med.dosage}, {med.frequency})</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 font-bold ml-auto">
                      👤 {newRx.patientName || oldRx.patientName || 'Patient'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 px-4 sm:px-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs flex-shrink-0">
          <span className="text-slate-500 text-center sm:text-left">
            {totalChanges === 0
              ? 'Both prescriptions prescribe identical medications and dosages.'
              : `${totalChanges} changes across active prescriptions.`}
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0F58B6] hover:bg-[#0c4897] text-white font-bold transition-all shadow-sm text-center"
          >
            Acknowledge &amp; Return to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};
