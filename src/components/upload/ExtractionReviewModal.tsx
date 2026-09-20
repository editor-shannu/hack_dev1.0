'use client';

import React, { useState, useEffect } from 'react';
import { ExtractedData, Medication, FamilyMemberRelation } from '@/types/prescription';
import { Plus, Trash2, Check, User, Hospital, Calendar, Activity, Pill, ShieldAlert, Stethoscope } from 'lucide-react';
import { FamilyMemberSelector } from './FamilyMemberSelector';

/**
 * Normalizes clinical frequency shorthand into canonical dropdown option values.
 */
export function normalizeFrequency(freq?: string): string {
  if (!freq) return 'OD';
  const norm = freq.toLowerCase().trim();

  // As needed / PRN / SOS
  if (
    norm.includes('prn') ||
    norm.includes('sos') ||
    norm.includes('as needed') ||
    norm.includes('when required') ||
    norm.includes('as_needed')
  ) {
    return 'PRN';
  }
  // Three times daily (TID / TDS / 1-1-1 / thrice)
  if (norm.includes('tid')) {
    return 'TID';
  }
  if (norm.includes('tds') || norm.includes('three') || norm.includes('1-1-1') || norm.includes('thrice') || norm.includes('3 times')) {
    return 'TDS';
  }
  // Four times daily (QID / QDS / 1-1-1-1)
  if (norm.includes('qid')) {
    return 'QID';
  }
  if (norm.includes('qds') || norm.includes('four') || norm.includes('1-1-1-1') || norm.includes('4 times')) {
    return 'QDS';
  }
  // Twice daily (BD / BID / 1-0-1)
  if (norm.includes('bd') || norm.includes('bid') || norm.includes('twice') || norm.includes('1-0-1') || norm.includes('2 times')) {
    return 'BD';
  }
  // Bedtime (HS / 0-0-1)
  if (norm.includes('hs') || norm.includes('bedtime') || norm.includes('night') || norm.includes('0-0-1')) {
    return 'HS';
  }
  // Once daily (OD / 1-0-0)
  if (norm.includes('od') || norm.includes('once') || norm.includes('morning') || norm.includes('1-0-0') || norm.includes('daily')) {
    return 'OD';
  }

  return freq;
}

/**
 * Normalizes clinical food timing into canonical option values.
 */
export function normalizeTiming(timing?: string): 'after_food' | 'before_food' | 'with_food' | 'anytime' | string {
  if (!timing) return 'anytime';
  const norm = timing.toLowerCase().trim();
  if (norm.includes('before') || norm.includes('empty') || norm.includes('ac') || norm.includes('a.c.')) {
    return 'before_food';
  }
  if (norm.includes('after') || norm.includes('post') || norm.includes('pc') || norm.includes('p.c.')) {
    return 'after_food';
  }
  if (norm.includes('with') || norm.includes('during')) {
    return 'with_food';
  }
  if (norm.includes('anytime') || norm.includes('prn') || norm.includes('sos')) {
    return 'anytime';
  }
  // Preserve explicit clock times (e.g. 10AM, 8PM, 10 PM, 9 AM, 5 PM)
  if (/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(timing.trim())) {
    return timing.trim();
  }
  if (norm === 'before_food' || norm === 'after_food' || norm === 'with_food' || norm === 'anytime') {
    return norm as any;
  }
  return 'anytime';
}

interface ExtractionReviewModalProps {
  initialData: ExtractedData;
  onConfirm: (finalData: ExtractedData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ExtractionReviewModal: React.FC<ExtractionReviewModalProps> = ({
  initialData,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [data, setData] = useState<ExtractedData>(initialData);
  const [familyMember, setFamilyMember] = useState<FamilyMemberRelation>(initialData.family_member || 'self');
  const [patientName, setPatientName] = useState<string>(initialData.patient_name || '');
  const [customRelation, setCustomRelation] = useState<string>(initialData.patient_relation || '');
  const [medications, setMedications] = useState<Medication[]>(
    (initialData.medications || []).map((m, idx) => ({
      ...m,
      id: m.id || `med-extracted-${idx}-${Date.now()}`,
      frequency: normalizeFrequency(m.frequency),
      timing: normalizeTiming(m.timing),
      remainingPills: m.remainingPills ?? 15,
      totalPrescribedPills: m.totalPrescribedPills ?? 30,
      refillThreshold: m.refillThreshold ?? 4,
    }))
  );

  useEffect(() => {
    setData(initialData);
    if (initialData.family_member) setFamilyMember(initialData.family_member);
    if (initialData.patient_name) setPatientName(initialData.patient_name);
    if (initialData.patient_relation) setCustomRelation(initialData.patient_relation);
    setMedications(
      (initialData.medications || []).map((m, idx) => ({
        ...m,
        id: m.id || `med-extracted-${idx}-${Date.now()}`,
        frequency: normalizeFrequency(m.frequency),
        timing: normalizeTiming(m.timing),
        remainingPills: m.remainingPills ?? 15,
        totalPrescribedPills: m.totalPrescribedPills ?? 30,
        refillThreshold: m.refillThreshold ?? 4,
      }))
    );
  }, [initialData]);

  const handleMedChange = (index: number, field: keyof Medication, value: any) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleAddMedication = () => {
    const newMed: Medication = {
      id: `med-custom-${Date.now()}`,
      name: '',
      dosage: '500 mg',
      frequency: 'OD',
      timing: 'after_food',
      duration: '7 days',
      instructions: 'Take after meals',
      remainingPills: 14,
      totalPrescribedPills: 14,
      refillThreshold: 3,
    };
    setMedications([...medications, newMed]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      ...data,
      patient_name: patientName.trim() || data.patient_name,
      family_member: familyMember,
      patient_relation: familyMember === 'other' ? customRelation.trim() : undefined,
      medications,
    });
  };

  return (
    <form
      onSubmit={handleFinalSubmit}
      className="flex flex-col flex-1 min-h-0 overflow-hidden text-slate-900"
      data-lenis-prevent="true"
    >
      {/* Pinned Header Info */}
      <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Verify Extracted Prescription Data</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0F58B6] border border-blue-200 font-mono font-bold">
              AI Parsed
            </span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Review and adjust medicine dosages and timing before generating schedules.
          </p>
        </div>
      </div>

      {/* Scrollable Form Content */}
      <div
        className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-6"
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Document Classification Verification Banner */}
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 flex-shrink-0 shadow-sm">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 tracking-wide">Document Classification:</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                    {data.classification?.categoryLabel || "Doctor's Prescription"}
                  </span>
                  <span className="text-[11px] font-mono text-[#0F58B6] font-bold">
                    {Math.round((data.classification?.confidence || 0.98) * 100)}% Confidence
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 mt-0.5 font-medium">
                  {data.classification?.verdictSummary || "Prescription verified with active medication dosing orders."}
                </p>
              </div>
            </div>
          </div>

          {data.classification?.keyIndicators && data.classification.keyIndicators.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-emerald-200/60">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Key Evidence:</span>
              {data.classification.keyIndicators.map((indicator, idx) => (
                <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 font-medium">
                  ✓ {indicator}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Family Member & Patient Attribution */}
        <FamilyMemberSelector
          selectedRelation={familyMember}
          onSelectRelation={setFamilyMember}
          patientName={patientName}
          onPatientNameChange={(name) => {
            setPatientName(name);
            setData((prev) => ({ ...prev, patient_name: name }));
          }}
          customRelation={customRelation}
          onCustomRelationChange={setCustomRelation}
          title="Whose prescription is this?"
        />

        {/* Doctor & Hospital Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Doctor Name */}
          <div>
            <label className="text-xs font-mono text-slate-700 font-bold flex items-center gap-1.5 mb-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-[#0F58B6]" />
              <span>Doctor Name</span>
            </label>
            <input
              type="text"
              value={data.doctor_name || ''}
              onChange={(e) => setData({ ...data, doctor_name: e.target.value })}
              placeholder="e.g. Dr. Jane Doe"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#0F58B6] focus:bg-white transition-all shadow-sm"
            />
          </div>

          {/* Clinic / Hospital */}
          <div>
            <label className="text-xs font-mono text-slate-700 font-bold flex items-center gap-1.5 mb-1.5">
              <Hospital className="w-3.5 h-3.5 text-[#0F58B6]" />
              <span>Clinic / Hospital</span>
            </label>
            <input
              type="text"
              value={data.clinic_or_hospital || ''}
              onChange={(e) => setData({ ...data, clinic_or_hospital: e.target.value })}
              placeholder="e.g. City General Hospital"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#0F58B6] focus:bg-white transition-all shadow-sm"
            />
          </div>

          {/* Prescription Date */}
          <div>
            <label className="text-xs font-mono text-slate-700 font-bold flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0F58B6]" />
              <span>Prescription Date</span>
            </label>
            <input
              type="date"
              value={data.date || new Date().toISOString().split('T')[0]}
              onChange={(e) => setData({ ...data, date: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#0F58B6] focus:bg-white transition-all shadow-sm"
            />
          </div>

          {/* Clinical Diagnosis / Impression */}
          <div className="sm:col-span-2">
            <label className="text-xs font-mono text-slate-700 font-bold flex items-center gap-1.5 mb-1.5">
              <Activity className="w-3.5 h-3.5 text-[#0F58B6]" />
              <span>Clinical Diagnosis / Impression</span>
            </label>
            <input
              type="text"
              value={data.diagnosis || ''}
              onChange={(e) => setData({ ...data, diagnosis: e.target.value })}
              placeholder="e.g. Hypertension, Viral Pharyngitis"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#0F58B6] focus:bg-white transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Medicines Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Pill className="w-4 h-4 text-[#0F58B6]" />
              <span>Prescribed Medications ({medications.length})</span>
            </h4>
            <button
              type="button"
              onClick={handleAddMedication}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-[#0F58B6] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Medication</span>
            </button>
          </div>

          {medications.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
              No medications extracted. Click &quot;Add Medication&quot; above to manually include one.
            </div>
          ) : (
            <div className="space-y-3">
              {medications.map((med, idx) => (
                <div
                  key={med.id || idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-all space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Name */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Medicine Name</label>
                      <input
                        type="text"
                        required
                        value={med.name}
                        onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
                        placeholder="e.g. Amoxicillin"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#0F58B6]"
                      />
                    </div>

                    {/* Dosage */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Dosage</label>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                        placeholder="500 mg"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#0F58B6]"
                      />
                    </div>

                    {/* Frequency */}
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Frequency / Routine</label>
                      <select
                        value={normalizeFrequency(med.frequency)}
                        onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#0F58B6]"
                      >
                        <option value="OD">OD (Once daily - Morning)</option>
                        <option value="BD">BD (Twice daily - Morning &amp; Night)</option>
                        <option value="TID">TID (Three times daily - Morn, Noon, Night)</option>
                        <option value="TDS">TDS (Three times daily)</option>
                        <option value="QID">QID (Four times daily)</option>
                        <option value="QDS">QDS (Four times daily)</option>
                        <option value="HS">HS (Night / Bedtime)</option>
                        <option value="PRN">PRN (As needed / SOS)</option>
                      </select>
                    </div>

                    {/* Food Timing */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Food Timing</label>
                      <select
                        value={normalizeTiming(med.timing)}
                        onChange={(e) => handleMedChange(idx, 'timing', e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#0F58B6]"
                      >
                        {med.timing && /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(med.timing) && (
                          <option value={med.timing}>{med.timing} (Prescribed Time)</option>
                        )}
                        <option value="anytime">Anytime / Unspecified</option>
                        <option value="after_food">After Food (p.c.)</option>
                        <option value="before_food">Before Food (a.c.)</option>
                        <option value="with_food">With Food</option>
                      </select>
                    </div>

                    {/* Delete */}
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Medication"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Doctor Notes */}
        <div>
          <label className="text-xs font-mono text-slate-700 font-bold mb-1.5 block">Additional Doctor Advice / Notes</label>
          <textarea
            rows={2}
            value={data.notes || ''}
            onChange={(e) => setData({ ...data, notes: e.target.value })}
            placeholder="e.g. Drink plenty of water. Avoid cold beverages."
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#0F58B6] focus:bg-white"
          />
        </div>
      </div>

      {/* Pinned Action Buttons Footer */}
      <div className="p-4 sm:p-5 px-6 border-t border-slate-200 bg-slate-50/90 flex items-center justify-end gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all active:scale-95"
        >
          Cancel
        </button>
        <button
          id="confirm-review-btn"
          type="submit"
          disabled={isLoading || medications.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F58B6] hover:bg-[#0c4897] text-white font-bold text-xs shadow-md shadow-blue-900/15 active:scale-95 disabled:opacity-50 transition-all"
        >
          <Check className="w-4 h-4" />
          <span>Generate Schedule &amp; Save to Cabinet</span>
        </button>
      </div>
    </form>
  );
};
