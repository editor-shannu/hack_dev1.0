'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Prescription, Medication, FamilyMemberRelation } from '@/types/prescription';
import { FAMILY_RELATIONS } from '@/lib/familyMembers';
import { savePrescription } from '@/lib/storage';
import { saveStoredFile, getStoredFile } from '@/lib/fileStorage';
import {
  X,
  Pill,
  User,
  Hospital,
  Calendar,
  FileText,
  Plus,
  Trash2,
  Upload,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';

interface EditPrescriptionModalProps {
  prescription: Prescription | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updated: Prescription) => void;
}

export const EditPrescriptionModal: React.FC<EditPrescriptionModalProps> = ({
  prescription,
  isOpen,
  onClose,
  onSaved,
}) => {
  useBodyScrollLock(isOpen);

  const [doctorName, setDoctorName] = useState('');
  const [clinicOrHospital, setClinicOrHospital] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [date, setDate] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [familyMember, setFamilyMember] = useState<FamilyMemberRelation>('self');
  const [patientName, setPatientName] = useState('');
  const [patientRelation, setPatientRelation] = useState('');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [fileUrl, setFileUrl] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'image' | 'pdf'>('image');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!prescription) return;
    setDoctorName(prescription.doctorName || '');
    setClinicOrHospital(prescription.clinicOrHospital || '');
    setDiagnosis(prescription.diagnosis || '');
    setDate(prescription.date || '');
    setFollowUpDate(prescription.followUpDate || '');
    setNotes(prescription.notes || '');
    setFamilyMember(prescription.familyMember || 'self');
    setPatientName(prescription.patientName || '');
    setPatientRelation(prescription.patientRelation || '');
    setMedications(prescription.medications ? [...prescription.medications] : []);
    setFileName(prescription.fileName || '');
    setFileType(prescription.fileType || 'image');

    if (prescription.fileUrl && prescription.fileUrl !== '[offline-cached-scan]') {
      setFileUrl(prescription.fileUrl);
    } else {
      getStoredFile(prescription.id).then((stored) => {
        if (stored) setFileUrl(stored);
      });
    }
  }, [prescription, isOpen]);

  if (!isOpen || !prescription) return null;

  const handleAddMedication = () => {
    const newMed: Medication = {
      id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: '',
      dosage: '',
      frequency: 'Once daily',
      timing: 'after_food',
      duration: '5 days',
      instructions: '',
    };
    setMedications([...medications, newMed]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, idx) => idx !== index));
  };

  const handleMedChange = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf';
    setFileName(file.name);
    setFileType(isPdf ? 'pdf' : 'image');

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFileUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updatedRx: Prescription = {
        ...prescription,
        doctorName: doctorName.trim() || 'Treating Physician',
        clinicOrHospital: clinicOrHospital.trim() || 'Medical Center',
        diagnosis: diagnosis.trim() || 'Clinical Consultation',
        title: `${diagnosis.trim() || 'Prescription'} (${doctorName.trim() || 'Doctor'})`,
        date: date || new Date().toISOString().split('T')[0],
        followUpDate: followUpDate || undefined,
        notes: notes.trim() || undefined,
        familyMember,
        patientName: patientName.trim() || undefined,
        patientRelation: familyMember === 'other' ? patientRelation.trim() : undefined,
        medications: medications.filter((m) => m.name.trim().length > 0),
        fileName: fileName || prescription.fileName,
        fileType,
        fileUrl: fileUrl || prescription.fileUrl,
      };

      if (fileUrl && fileUrl !== '[offline-cached-scan]') {
        await saveStoredFile(updatedRx.id, fileUrl);
      }

      savePrescription(updatedRx);
      if (onSaved) onSaved(updatedRx);
      onClose();
    } catch (err) {
      console.error('Failed to update prescription:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      id="edit-prescription-modal"
      data-lenis-prevent="true"
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-900 my-auto"
        data-lenis-prevent="true"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0F58B6] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Edit Prescription &amp; Original Scan
              </h3>
              <p className="text-xs text-slate-500 font-mono">ID: {prescription.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            id="close-edit-prescription-modal-btn"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Section 1: Clinical Metadata */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider">
              1. Clinical &amp; Doctor Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Doctor Name</label>
                <input
                  id="edit-rx-doctor-input"
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. A. Patel"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F58B6] text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clinic or Hospital</label>
                <input
                  id="edit-rx-clinic-input"
                  type="text"
                  value={clinicOrHospital}
                  onChange={(e) => setClinicOrHospital(e.target.value)}
                  placeholder="e.g. Apollo Hospital"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F58B6] text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Diagnosis / Reason</label>
                <input
                  id="edit-rx-diagnosis-input"
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Acute Bronchitis"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F58B6] text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Prescription Date</label>
                <input
                  id="edit-rx-date-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F58B6] text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Family Member Attribution */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider">
              2. Family Member Attribution
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Family Member</label>
                <select
                  value={familyMember}
                  onChange={(e) => setFamilyMember(e.target.value as FamilyMemberRelation)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F58B6] text-xs font-medium bg-white"
                >
                  {FAMILY_RELATIONS.map((rel) => (
                    <option key={rel.key} value={rel.key}>
                      {rel.icon} {rel.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Patient Name (Optional)</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Margaret Ellis"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F58B6] text-xs font-medium"
                />
              </div>

              {familyMember === 'other' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Specify Relation</label>
                  <input
                    type="text"
                    value={patientRelation}
                    onChange={(e) => setPatientRelation(e.target.value)}
                    placeholder="e.g. Aunt, Friend, Guardian"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F58B6] text-xs font-medium"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Original Scan / Document Attachment */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider">
                3. Original Document Scan (Image or PDF)
              </h4>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-[#0F58B6] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{fileUrl ? 'Replace Scan File' : 'Upload / Attach Scan'}</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {fileUrl ? (
              <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0F58B6] flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-800 truncate">{fileName || 'Attached Scan Document'}</p>
                    <p className="text-[11px] font-mono text-emerald-600">Scan Ready &bull; Stored Locally</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFileUrl(undefined);
                      setFileName('');
                    }}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#0F58B6] bg-slate-50/50 hover:bg-blue-50/30 text-center cursor-pointer transition-all"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-700">Attach Original Prescription Scan</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Click to select an image or PDF from your device</p>
              </div>
            )}
          </div>

          {/* Section 4: Extracted Medications List */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider">
                4. Prescribed Medications ({medications.length})
              </h4>
              <button
                type="button"
                onClick={handleAddMedication}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-[#0F58B6] hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medicine</span>
              </button>
            </div>

            {medications.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 text-center bg-slate-50 rounded-xl">
                No medications listed. Click &quot;Add Medicine&quot; above to prescribe medications.
              </p>
            ) : (
              <div className="space-y-3">
                {medications.map((med, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2.5 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        Medicine #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(idx)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove medicine"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={med.name}
                          onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
                          placeholder="Medicine name (e.g. Amoxicillin)"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0F58B6]"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                          placeholder="Dosage (e.g. 500mg)"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0F58B6]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div>
                        <input
                          type="text"
                          value={med.frequency || ''}
                          onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                          placeholder="Frequency (e.g. Twice daily)"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0F58B6]"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={med.timing || ''}
                          onChange={(e) => handleMedChange(idx, 'timing', e.target.value)}
                          placeholder="Timing (e.g. after_food)"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0F58B6]"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <input
                          type="text"
                          value={med.duration || ''}
                          onChange={(e) => handleMedChange(idx, 'duration', e.target.value)}
                          placeholder="Duration (e.g. 7 days)"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0F58B6]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Doctor Notes & Follow-up */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider">
              5. Instructions &amp; Follow-up
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F58B6] text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Doctor Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions, dietary restrictions..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F58B6] text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-5 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              id="save-edited-prescription-btn"
              className="px-5 py-2.5 rounded-xl bg-[#0F58B6] hover:bg-[#0c4897] text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
