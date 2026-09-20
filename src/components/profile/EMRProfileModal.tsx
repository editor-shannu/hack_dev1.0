'use client';

import React, { useState, useEffect } from 'react';
import { EMRProfile, BloodGroup } from '@/types/emr';
import { saveEMRProfile, saveFamilyEMRProfile, getStoredFamilyEMR } from '@/lib/storage';
import { ShieldAlert, HeartPulse, User, Phone, AlertCircle, X } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';

interface EMRProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMandatory?: boolean;
  initialData?: EMRProfile | null;
  defaultFullName?: string;
  targetMemberKey?: string;
  targetMemberLabel?: string;
  onSaved?: (profile: EMRProfile) => void;
}

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export const EMRProfileModal: React.FC<EMRProfileModalProps> = ({
  isOpen,
  onClose,
  isMandatory = false,
  initialData = null,
  defaultFullName = '',
  targetMemberKey = 'self',
  targetMemberLabel = '',
  onSaved,
}) => {
  useBodyScrollLock(isOpen);

  const [formData, setFormData] = useState<EMRProfile>({
    fullName: '',
    dateOfBirth: '',
    bloodGroup: 'Unknown',
    allergies: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    activeConditions: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (targetMemberKey && targetMemberKey !== 'self') {
      const existing = initialData || getStoredFamilyEMR(targetMemberKey);
      if (existing && existing.fullName) {
        setFormData(existing);
        setErrors({});
        return;
      }
      setFormData({
        fullName: targetMemberLabel || '',
        dateOfBirth: '',
        bloodGroup: 'Unknown',
        allergies: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        activeConditions: '',
      });
      setErrors({});
      return;
    }

    if (initialData && initialData.fullName) {
      setFormData(initialData);
    } else {
      const prefillName = defaultFullName || initialData?.fullName || (() => {
        if (targetMemberKey !== 'self' && targetMemberLabel) {
          return targetMemberLabel;
        }
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('prescriptime_active_user') || localStorage.getItem('prescriptime_test_session');
            if (raw) {
              const parsed = JSON.parse(raw);
              return parsed.displayName || (parsed.email ? parsed.email.split('@')[0] : '');
            }
          } catch {}
        }
        return '';
      })();

      setFormData({
        fullName: prefillName,
        dateOfBirth: initialData?.dateOfBirth || '',
        bloodGroup: initialData?.bloodGroup || 'Unknown',
        allergies: initialData?.allergies || '',
        emergencyContactName: initialData?.emergencyContactName || '',
        emergencyContactPhone: initialData?.emergencyContactPhone || '',
        activeConditions: initialData?.activeConditions || '',
      });
    }
    setErrors({});
  }, [initialData, defaultFullName, targetMemberKey, targetMemberLabel, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.emergencyContactName.trim()) newErrors.emergencyContactName = 'Contact name is required';
    if (!formData.emergencyContactPhone.trim()) newErrors.emergencyContactPhone = 'Contact phone is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (targetMemberKey && targetMemberKey !== 'self') {
      saveFamilyEMRProfile(targetMemberKey, formData);
    } else {
      saveEMRProfile(formData);
    }

    if (onSaved) onSaved(formData);
    onClose();
  };

  const isSelf = !targetMemberKey || targetMemberKey === 'self';
  const displayTitle = isSelf
    ? 'Emergency Medical Info (EMR)'
    : `Emergency Medical Info: ${targetMemberLabel || 'Family Member'}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden overscroll-contain"
      id="emr-modal-backdrop"
      data-lenis-prevent="true"
    >
      <div 
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 transition-colors"
        id="emr-profile-modal"
        data-lenis-prevent="true"
      >
        {/* Modal Top Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-rose-50/70 via-white to-purple-50/50 dark:from-slate-850 dark:via-slate-900 dark:to-slate-850 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
                <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="emr-profile-modal-title" className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {displayTitle}
                  </h3>
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    {isSelf ? 'Life Safety' : 'Family EMR'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Critical medical data accessible for emergency care and first responders.
                </p>
              </div>
            </div>

            {/* If editing existing profile, allow X close */}
            {initialData && (
              <button
                id="emr-close-btn"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-200 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent dark:border-slate-700/60 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden" data-lenis-prevent="true">
          <div
            className="p-6 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-4"
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Patient Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Patient Identification
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Full Name *</label>
                <input
                  id="emr-fullname"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. John R. Doe"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 transition-all ${
                    errors.fullName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-slate-50/50'
                  }`}
                />
                {errors.fullName && <p className="text-[10px] text-rose-600 font-bold">{errors.fullName}</p>}
              </div>

              {/* Date of Birth */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Date of Birth</label>
                <input
                  id="emr-dob"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
                />
              </div>
            </div>

            {/* Blood Group */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Blood Group</label>
              <select
                id="emr-bloodgroup"
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value as BloodGroup })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clinical Alerts */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Clinical Alerts &amp; Conditions
            </h4>

            {/* Known Allergies */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>Known Drug / Food Allergies</span>
                <span className="text-[10px] font-normal text-slate-400">(Free text)</span>
              </label>
              <input
                id="emr-allergies"
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="e.g. Penicillin, Sulfa drugs, Peanuts, None known"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
              />
            </div>

            {/* Active Medical Conditions */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>Current Active Medical Conditions</span>
                <span className="text-[10px] font-normal text-slate-400">(Free text)</span>
              </label>
              <input
                id="emr-conditions"
                type="text"
                value={formData.activeConditions}
                onChange={(e) => setFormData({ ...formData, activeConditions: e.target.value })}
                placeholder="e.g. Hypertension, Asthma, Type 2 Diabetes, None"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Emergency Contact
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Contact Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Contact Person *</label>
                <input
                  id="emr-contact-name"
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  placeholder="e.g. Jane Doe (Spouse)"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 transition-all ${
                    errors.emergencyContactName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-slate-50/50'
                  }`}
                />
                {errors.emergencyContactName && (
                  <p className="text-[10px] text-rose-600 font-bold">{errors.emergencyContactName}</p>
                )}
              </div>

              {/* Contact Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Contact Phone *</label>
                <input
                  id="emr-contact-phone"
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  placeholder="e.g. +1 (555) 234-5678"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 transition-all ${
                    errors.emergencyContactPhone ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-slate-50/50'
                  }`}
                />
                {errors.emergencyContactPhone && (
                  <p className="text-[10px] text-rose-600 font-bold">{errors.emergencyContactPhone}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pinned Footer Actions */}
          <div className="p-4 sm:px-6 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 flex-shrink-0">
            {initialData && (
              <button
                id="emr-cancel-btn"
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              id="emr-submit-btn"
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-md shadow-purple-500/20 active:scale-95 transition-all"
            >
              Save Emergency Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
