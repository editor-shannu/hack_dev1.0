'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HealthRecord, FamilyMemberRelation } from '@/types/prescription';
import { FAMILY_RELATIONS } from '@/lib/familyMembers';
import { saveHealthRecord } from '@/lib/storage';
import { saveStoredFile, getStoredFile } from '@/lib/fileStorage';
import {
  X,
  Hospital,
  Calendar,
  FileText,
  Upload,
  Trash2,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';

interface EditHealthRecordModalProps {
  record: HealthRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updated: HealthRecord) => void;
}

const CATEGORY_OPTIONS = [
  'Lab Report',
  'Radiology & Imaging',
  'Discharge Summary',
  'Cardiology & ECG',
  'Vaccination Record',
  'Clinical Consultation',
  'Hospital Diagnostic Record',
];

export const EditHealthRecordModal: React.FC<EditHealthRecordModalProps> = ({
  record,
  isOpen,
  onClose,
  onSaved,
}) => {
  useBodyScrollLock(isOpen);

  const [title, setTitle] = useState('');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [clinicOrHospital, setClinicOrHospital] = useState('');
  const [date, setDate] = useState('');
  const [diagnosisOrTest, setDiagnosisOrTest] = useState('');
  const [summary, setSummary] = useState('');
  const [familyMember, setFamilyMember] = useState<FamilyMemberRelation>('self');
  const [patientName, setPatientName] = useState('');
  const [patientRelation, setPatientRelation] = useState('');
  const [fileUrl, setFileUrl] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'image' | 'pdf'>('image');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!record) return;
    setTitle(record.title || '');
    setCategoryLabel(record.categoryLabel || 'Hospital Diagnostic Record');
    setDoctorName(record.doctorName || '');
    setClinicOrHospital(record.clinicOrHospital || '');
    setDate(record.date || '');
    setDiagnosisOrTest(record.diagnosisOrTest || '');
    setSummary(record.summary || '');
    setFamilyMember(record.familyMember || 'self');
    setPatientName(record.patientName || '');
    setPatientRelation(record.patientRelation || '');
    setFileName(record.fileName || '');
    setFileType(record.fileType || 'image');

    if (record.fileUrl && record.fileUrl !== '[offline-cached-scan]') {
      setFileUrl(record.fileUrl);
    } else {
      getStoredFile(record.id).then((stored) => {
        if (stored) setFileUrl(stored);
      });
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

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
      const updatedRecord: HealthRecord = {
        ...record,
        title: title.trim() || 'Hospital Diagnostic Record',
        categoryLabel: categoryLabel || 'Hospital Diagnostic Record',
        doctorName: doctorName.trim() || undefined,
        clinicOrHospital: clinicOrHospital.trim() || undefined,
        date: date || new Date().toISOString().split('T')[0],
        diagnosisOrTest: diagnosisOrTest.trim() || undefined,
        summary: summary.trim() || undefined,
        familyMember,
        patientName: patientName.trim() || undefined,
        patientRelation: familyMember === 'other' ? patientRelation.trim() : undefined,
        fileName: fileName || record.fileName,
        fileType,
        fileUrl: fileUrl || record.fileUrl,
      };

      if (fileUrl && fileUrl !== '[offline-cached-scan]') {
        await saveStoredFile(updatedRecord.id, fileUrl);
      }

      saveHealthRecord(updatedRecord);
      if (onSaved) onSaved(updatedRecord);
      onClose();
    } catch (err) {
      console.error('Failed to update health record:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      id="edit-health-record-modal"
      data-lenis-prevent="true"
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-900 my-auto"
        data-lenis-prevent="true"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Hospital className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Edit Hospital &amp; Diagnostic Record
              </h3>
              <p className="text-xs text-slate-500 font-mono">ID: {record.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            id="close-edit-record-modal-btn"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Record Title / Test Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Complete Blood Count (CBC)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Record Category</label>
              <select
                value={categoryLabel}
                onChange={(e) => setCategoryLabel(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs font-medium bg-white"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Doctor / Lab In-Charge</label>
              <input
                id="edit-record-doctor-input"
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g. Dr. S. Rao"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hospital / Laboratory</label>
              <input
                id="edit-record-clinic-input"
                type="text"
                value={clinicOrHospital}
                onChange={(e) => setClinicOrHospital(e.target.value)}
                placeholder="e.g. Vijaya Diagnostics"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Family Member</label>
              <select
                id="edit-record-family-select"
                value={familyMember}
                onChange={(e) => setFamilyMember(e.target.value as FamilyMemberRelation)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs font-medium bg-white"
              >
                {FAMILY_RELATIONS.map((rel) => (
                  <option key={rel.key} value={rel.key}>
                    {rel.icon} {rel.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Patient Name</label>
              <input
                id="edit-record-patient-input"
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Margaret Ellis"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Summary / Key Findings</label>
              <textarea
                id="edit-record-summary-input"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Clinical observations, test results, normal reference ranges..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs font-medium"
              />
            </div>
          </div>

          {/* Section: Original Scan */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider">
                Original Document Scan
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{fileUrl ? 'Replace Scan' : 'Upload Scan'}</span>
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
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-800 truncate">{fileName || 'Diagnostic Scan Document'}</p>
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
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-600 bg-slate-50/50 hover:bg-emerald-50/30 text-center cursor-pointer transition-all"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-700">Attach Lab / Diagnostic Scan</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Click to select an image or PDF report</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
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
              id="save-edited-record-btn"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
