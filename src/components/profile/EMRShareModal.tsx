'use client';

import React, { useState, useMemo } from 'react';
import { EMRProfile } from '@/types/emr';
import { Prescription, HealthRecord } from '@/types/prescription';
import { generateEMRPdfDocument, createEMRPdfFile } from '@/lib/emrPdfGenerator';
import { 
  ShieldAlert, 
  Copy, 
  Check, 
  Edit3, 
  Phone, 
  Pill, 
  AlertTriangle, 
  HeartPulse, 
  X,
  Share2, 
  FileDown, 
  Hospital,
  Sparkles,
  Loader2,
  FileText,
  Users
} from 'lucide-react';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { ClinicalMarkdownRenderer } from './ClinicalMarkdownRenderer';
import { getFamilyRelationBadge } from '@/lib/familyMembers';
import { getStoredFamilyEMR, getStoredFamilyEMRs, authFetch } from '@/lib/storage';
import { Plus } from 'lucide-react';

interface EMRShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: EMRProfile | null;
  prescriptions: Prescription[];
  healthRecords?: HealthRecord[];
  onEditProfile: (targetMember?: string, targetName?: string) => void;
}

export const EMRShareModal: React.FC<EMRShareModalProps> = ({
  isOpen,
  onClose,
  profile,
  prescriptions,
  healthRecords = [],
  onEditProfile,
}) => {
  useBodyScrollLock(isOpen);

  const [activeTab, setActiveTab] = useState<'card' | 'ai_analysis'>('card');
  const [copied, setCopied] = useState(false);
  const [copiedAI, setCopiedAI] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string>('self');

  // AI Analysis State
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Discover all distinct family members from prescriptions, health records, and saved family EMRs
  const memberOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; icon: string; patientNames: Set<string>; rxCount: number; hrCount: number }>();
    
    // Always include 'self'
    const selfBadge = getFamilyRelationBadge('self');
    map.set('self', {
      key: 'self',
      label: selfBadge.displayLabel,
      icon: selfBadge.icon,
      patientNames: new Set(profile?.fullName ? [profile.fullName] : []),
      rxCount: 0,
      hrCount: 0,
    });

    // Check saved family EMRs
    const familyEmrs = getStoredFamilyEMRs();
    Object.keys(familyEmrs).forEach((memKey) => {
      if (!map.has(memKey)) {
        const badge = getFamilyRelationBadge(memKey as any);
        const pName = familyEmrs[memKey]?.fullName;
        map.set(memKey, {
          key: memKey,
          label: badge.displayLabel,
          icon: badge.icon,
          patientNames: new Set(pName ? [pName] : []),
          rxCount: 0,
          hrCount: 0,
        });
      }
    });

    prescriptions.forEach((rx) => {
      const mem = rx.familyMember || 'self';
      if (!map.has(mem)) {
        const badge = getFamilyRelationBadge(mem as any);
        map.set(mem, {
          key: mem,
          label: badge.displayLabel,
          icon: badge.icon,
          patientNames: new Set(),
          rxCount: 0,
          hrCount: 0,
        });
      }
      const item = map.get(mem)!;
      item.rxCount++;
      if (rx.patientName) item.patientNames.add(rx.patientName);
    });

    healthRecords.forEach((hr) => {
      const mem = hr.familyMember || 'self';
      if (!map.has(mem)) {
        const badge = getFamilyRelationBadge(mem as any);
        map.set(mem, {
          key: mem,
          label: badge.displayLabel,
          icon: badge.icon,
          patientNames: new Set(),
          rxCount: 0,
          hrCount: 0,
        });
      }
      const item = map.get(mem)!;
      item.hrCount++;
      if (hr.patientName) item.patientNames.add(hr.patientName);
    });

    return Array.from(map.values());
  }, [prescriptions, healthRecords, profile]);

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((rx) => (rx.familyMember || 'self') === selectedMember);
  }, [prescriptions, selectedMember]);

  const filteredHealthRecords = useMemo(() => {
    return healthRecords.filter((hr) => (hr.familyMember || 'self') === selectedMember);
  }, [healthRecords, selectedMember]);

  const activeMemberInfo = useMemo(() => {
    const opt = memberOptions.find((m) => m.key === selectedMember);
    const pNames = opt ? Array.from(opt.patientNames) : [];
    const registeredName = pNames.length > 0 ? pNames[0] : (selectedMember === 'self' ? (profile?.fullName || 'Self') : opt?.label || 'Family Member');
    return {
      displayName: registeredName,
      relationLabel: opt?.label || 'Family Member',
      icon: opt?.icon || '👤',
    };
  }, [selectedMember, memberOptions, profile]);

  // Specific EMR profile for selected member (strictly isolated: no false data leakage from main user)
  const memberEMR = useMemo((): EMRProfile | null => {
    if (selectedMember === 'self') {
      return profile;
    }
    return getStoredFamilyEMR(selectedMember);
  }, [selectedMember, profile]);

  const isMemberConfigured = useMemo(() => {
    if (selectedMember === 'self') {
      return !!(profile && profile.fullName && profile.fullName.trim() !== '');
    }
    return !!(memberEMR && (memberEMR.bloodGroup !== 'Unknown' || memberEMR.dateOfBirth || memberEMR.emergencyContactPhone || memberEMR.allergies));
  }, [selectedMember, profile, memberEMR]);

  const effectiveProfile = useMemo((): EMRProfile | null => {
    if (memberEMR) {
      return {
        ...memberEMR,
        fullName: activeMemberInfo.displayName || memberEMR.fullName,
      };
    }
    return {
      fullName: activeMemberInfo.displayName,
      dateOfBirth: '',
      bloodGroup: 'Unknown' as const,
      allergies: 'None reported',
      activeConditions: 'None reported',
      emergencyContactName: '',
      emergencyContactPhone: '',
    };
  }, [memberEMR, activeMemberInfo]);

  if (!isOpen) return null;

  // Compilation of active medications for the selected member
  const activePrescriptions = filteredPrescriptions.filter((rx) => rx.status === 'active' || !rx.status);
  const compiledMeds = activePrescriptions.flatMap((rx) =>
    (rx.medications || []).map((med) => ({
      ...med,
      doctorName: rx.doctorName,
      prescriptionDate: rx.date,
      prescriptionTitle: rx.title,
    }))
  );

  const generatePlainTextSummary = (): string => {
    const lines = [
      '🚨 EMERGENCY MEDICAL SUMMARY (Prescriptime)',
      `Patient: ${activeMemberInfo.displayName} [${activeMemberInfo.relationLabel}]`,
      `Date of Birth: ${memberEMR?.dateOfBirth || 'Not specified'} | Blood Group: ${memberEMR?.bloodGroup || 'Unknown'}`,
      `Known Allergies: ${memberEMR?.allergies || 'None reported'}`,
      `Emergency Contact: ${memberEMR?.emergencyContactName || 'None'} (${memberEMR?.emergencyContactPhone || 'N/A'})`,
      `Active Conditions: ${memberEMR?.activeConditions || 'None reported'}`,
      '',
      `CURRENT ACTIVE MEDICATIONS (${compiledMeds.length} tracked):`,
    ];

    if (compiledMeds.length === 0) {
      lines.push('  No active medications currently registered.');
    } else {
      compiledMeds.forEach((m, idx) => {
        lines.push(
          `  ${idx + 1}. ${m.name} - ${m.dosage || 'Standard dose'} (${m.frequency || 'Routine'}, ${m.timing || 'Anytime'})${
            m.doctorName ? ` [Prescribed by ${m.doctorName}]` : ''
          }`
        );
      });
    }

    if (filteredHealthRecords.length > 0) {
      lines.push('');
      lines.push(`HOSPITAL & DIAGNOSTIC RECORDS (${filteredHealthRecords.length} records):`);
      filteredHealthRecords.forEach((r, idx) => {
        lines.push(
          `  ${idx + 1}. [${r.categoryLabel}] ${r.title} (${r.date}) - Facility: ${r.clinicOrHospital || 'Hospital'}`
        );
      });
    }

    lines.push('');
    lines.push(`Generated from Prescriptime on ${new Date().toLocaleDateString()}`);
    return lines.join('\n');
  };

  const handleCopy = async () => {
    const text = generatePlainTextSummary();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleGenerateAIAnalysis = async () => {
    setIsLoadingAI(true);
    setAiError(null);
    try {
      // Sanitize payload to only send essential clinical metadata.
      const sanitizedPrescriptions = filteredPrescriptions.map((rx) => ({
        id: rx.id,
        patientName: rx.patientName || activeMemberInfo.displayName,
        title: rx.title,
        date: rx.date,
        doctorName: rx.doctorName,
        clinicOrHospital: rx.clinicOrHospital,
        diagnosis: rx.diagnosis,
        status: rx.status,
        medications: (rx.medications || []).map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          timing: m.timing,
          duration: m.duration,
          instructions: m.instructions,
        })),
      }));

      const sanitizedHealthRecords = filteredHealthRecords.map((hr) => ({
        id: hr.id,
        patientName: hr.patientName || activeMemberInfo.displayName,
        title: hr.title,
        date: hr.date,
        categoryLabel: hr.categoryLabel,
        clinicOrHospital: hr.clinicOrHospital,
        diagnosisOrTest: hr.diagnosisOrTest,
        summary: hr.summary,
      }));

      const res = await authFetch('/api/emr/ai-analysis', {
        method: 'POST',
        body: JSON.stringify({
          profile: effectiveProfile
            ? {
                fullName: effectiveProfile.fullName,
                dateOfBirth: effectiveProfile.dateOfBirth,
                bloodGroup: effectiveProfile.bloodGroup,
                allergies: effectiveProfile.allergies,
                activeConditions: effectiveProfile.activeConditions,
                emergencyContactName: effectiveProfile.emergencyContactName,
                emergencyContactPhone: effectiveProfile.emergencyContactPhone,
              }
            : null,
          prescriptions: sanitizedPrescriptions,
          healthRecords: sanitizedHealthRecords,
          familyMemberTag: activeMemberInfo.relationLabel,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const textResponse = await res.text();
        throw new Error(textResponse || `Server returned status ${res.status}`);
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to generate AI report.');
      }
      setAiReport(data.report);
    } catch (err: any) {
      setAiError(err.message || 'AI generation failed. Please try again.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleCopyAIReport = async () => {
    if (!aiReport) return;
    try {
      await navigator.clipboard.writeText(aiReport);
      setCopiedAI(true);
      setTimeout(() => setCopiedAI(false), 2500);
    } catch {
      setCopiedAI(true);
      setTimeout(() => setCopiedAI(false), 2500);
    }
  };

  const handleSharePdf = async () => {
    setIsSharing(true);
    setShareStatus(null);
    try {
      const pdfFile = createEMRPdfFile(effectiveProfile, compiledMeds, aiReport, filteredHealthRecords);

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `Emergency Medical Record - ${activeMemberInfo.displayName}`,
          text: `Emergency Medical Record and verified active prescriptions for ${activeMemberInfo.displayName} [${activeMemberInfo.relationLabel}].`,
          files: [pdfFile],
        });
        setShareStatus('Shared PDF successfully!');
      } else {
        const doc = generateEMRPdfDocument(effectiveProfile, compiledMeds, aiReport, filteredHealthRecords);
        const safeName = (activeMemberInfo.displayName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
        doc.save(`Prescriptime_EMR_${safeName}.pdf`);
        setShareStatus('PDF downloaded');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const doc = generateEMRPdfDocument(effectiveProfile, compiledMeds, aiReport, filteredHealthRecords);
        const safeName = (activeMemberInfo.displayName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
        doc.save(`Prescriptime_EMR_${safeName}.pdf`);
        setShareStatus('PDF saved to downloads.');
      }
    } finally {
      setIsSharing(false);
      setTimeout(() => setShareStatus(null), 4000);
    }
  };

  const handleDownloadPdf = () => {
    const doc = generateEMRPdfDocument(effectiveProfile, compiledMeds, aiReport, filteredHealthRecords);
    const safeName = (activeMemberInfo.displayName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Prescriptime_EMR_${safeName}.pdf`);
    setShareStatus('PDF downloaded successfully!');
    setTimeout(() => setShareStatus(null), 3500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden overscroll-contain"
      id="emr-share-modal-backdrop"
      data-lenis-prevent="true"
    >
      <div 
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 transition-colors"
        id="emr-share-modal"
        data-lenis-prevent="true"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/50 dark:from-slate-850 dark:via-slate-900 dark:to-slate-850 flex items-start justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0F58B6] text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Emergency Medical Profile (EMR)
                </h3>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#0F58B6] dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  Combined Health Data
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Integrated active prescriptions, hospital records &amp; AI clinical synthesis.
              </p>
            </div>
          </div>

          <button
            id="emr-share-modal-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-200 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent dark:border-slate-700/60 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Sub-Tab Switcher: Emergency Card vs AI Health Analysis */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            id="emr-tab-card"
            type="button"
            onClick={() => setActiveTab('card')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'card'
                ? 'bg-[#0F58B6] text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Emergency Card &amp; Data</span>
          </button>

          <button
            id="emr-tab-ai-report"
            type="button"
            onClick={() => {
              setActiveTab('ai_analysis');
              if (!aiReport && !isLoadingAI) {
                handleGenerateAIAnalysis();
              }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ai_analysis'
                ? 'bg-[#0F58B6] text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Clinical Analysis Report</span>
          </button>
        </div>

        {/* Family Member EMR Profile Switcher (All Family button removed as requested) */}
        {memberOptions.length > 1 && (
          <div className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none text-xs" id="emr-family-member-strip">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#0F58B6]" />
              <span>EMR For:</span>
            </span>
            {memberOptions.map((opt) => {
              const isSelected = selectedMember === opt.key;
              const count = opt.rxCount + opt.hrCount;
              const pNames = Array.from(opt.patientNames);
              const nameTag = pNames.length > 0 && pNames[0] !== opt.label ? ` (${pNames[0]})` : '';
              return (
                <button
                  key={opt.key}
                  type="button"
                  id={`emr-member-filter-${opt.key}`}
                  onClick={() => {
                    setSelectedMember(opt.key);
                    setAiReport(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#0F58B6] text-white shadow-sm shadow-blue-500/20 ring-2 ring-blue-400/40'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}{nameTag}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable Card Content */}
        <div
          className="p-5 sm:p-7 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-6"
          data-lenis-prevent="true"
          onWheel={(e) => e.stopPropagation()}
        >
          {shareStatus && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{shareStatus}</span>
            </div>
          )}

          {/* TAB 1: EMERGENCY CARD & COMBINED HEALTH DATA */}
          {activeTab === 'card' && (
            <div className="space-y-5">
              {/* Member Profile Attribution Banner */}
              <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{activeMemberInfo.icon}</span>
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      Medical Profile For: {activeMemberInfo.relationLabel}
                    </p>
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white" id="emr-active-patient-name">
                      {activeMemberInfo.displayName}
                    </h4>
                  </div>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#0F58B6] dark:text-blue-300 font-bold font-mono">
                  {compiledMeds.length} Active Meds · {filteredHealthRecords.length} Records
                </span>
              </div>

              {/* Unconfigured Family Member State - Prevents false data from main user leaking! */}
              {selectedMember !== 'self' && !isMemberConfigured ? (
                <div className="p-6 rounded-2xl border-2 border-dashed border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 text-center space-y-3">
                  <ShieldAlert className="w-9 h-9 text-amber-500 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Emergency Details Not Configured for {activeMemberInfo.displayName}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                      Each family member has their own separate emergency profile. Register {activeMemberInfo.displayName}&apos;s blood group, emergency contact, drug allergies, and active conditions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditProfile(selectedMember, activeMemberInfo.displayName)}
                    id="add-family-emr-btn"
                    className="px-4 py-2 rounded-xl bg-[#0F58B6] hover:bg-[#0c4897] text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Emergency Details for {activeMemberInfo.displayName}</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Emergency Key Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-mono font-bold text-rose-700 dark:text-rose-400">Blood Group</span>
                      <span className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-1" id="emr-display-bloodgroup">
                        {effectiveProfile?.bloodGroup || 'Unknown'}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400">Date of Birth</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1" id="emr-display-dob">
                        {effectiveProfile?.dateOfBirth || 'Not set'}
                      </span>
                    </div>

                    <div className="col-span-2 p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-mono font-bold text-[#0F58B6] dark:text-blue-400">Emergency Contact</span>
                      <div className="mt-1 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white" id="emr-display-contact-name">
                            {effectiveProfile?.emergencyContactName || 'None set'}
                          </p>
                          <p className="text-xs font-mono text-[#0F58B6] dark:text-blue-400 font-semibold" id="emr-display-contact-phone">
                            {effectiveProfile?.emergencyContactPhone || 'N/A'}
                          </p>
                        </div>
                        {effectiveProfile?.emergencyContactPhone && (
                          <a
                            href={`tel:${effectiveProfile.emergencyContactPhone}`}
                            className="p-2 rounded-xl bg-[#0F58B6] text-white hover:bg-[#0c4897] shadow-sm transition-all active:scale-95"
                            title="Call emergency contact"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Allergies & Conditions Warnings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Known Allergies</span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200" id="emr-display-allergies">
                        {effectiveProfile?.allergies || 'None reported'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-purple-800 dark:text-purple-300 font-bold text-xs">
                        <HeartPulse className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Active Medical Conditions</span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200" id="emr-display-conditions">
                        {effectiveProfile?.activeConditions || 'None reported'}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Combined Prescriptions Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 font-mono flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-[#0F58B6] dark:text-blue-400" />
                    <span>Current Active Prescriptions ({compiledMeds.length})</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">From Cloud Storage</span>
                </div>

                {compiledMeds.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                    No active prescriptions registered in Prescriptime.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1" id="emr-active-medications">
                    {compiledMeds.map((med, idx) => (
                      <div
                        key={`${med.id}-${idx}`}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{med.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {med.dosage} • {med.frequency} • {med.timing ? med.timing.replace('_', ' ') : 'Anytime'}
                          </p>
                        </div>
                        {med.doctorName && (
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                            {med.doctorName}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Combined Hospital Records Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 font-mono flex items-center gap-1.5">
                    <Hospital className="w-4 h-4 text-[#0F58B6] dark:text-blue-400" />
                    <span>Hospital Diagnostic &amp; Lab Records ({filteredHealthRecords.length})</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">Pathology &amp; Scans</span>
                </div>

                {filteredHealthRecords.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                    No hospital or lab reports registered.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1" id="emr-active-records">
                    {filteredHealthRecords.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{rec.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {rec.categoryLabel} • {rec.clinicOrHospital || 'Hospital'} • {rec.date}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          Verified
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AI CLINICAL ANALYSIS REPORT */}
          {activeTab === 'ai_analysis' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs text-[#0F58B6] dark:text-blue-300 font-bold">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>AI Clinical Synthesis (Strictly based on your medical data)</span>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAIAnalysis}
                  disabled={isLoadingAI}
                  className="px-3 py-1.5 rounded-xl bg-[#0F58B6] hover:bg-[#0c4897] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isLoadingAI ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Regenerate Report</span>
                    </>
                  )}
                </button>
              </div>

              {aiError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  {aiError}
                </div>
              )}

              {isLoadingAI ? (
                <div className="p-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                  <Loader2 className="w-8 h-8 text-[#0F58B6] dark:text-blue-400 animate-spin mx-auto" />
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Generating AI Health Analysis...</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Synthesizing active medications, lab records, and clinical conditions into an actionable summary.
                  </p>
                </div>
              ) : aiReport ? (
                <div className="space-y-3">
                  <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 max-h-[440px] overflow-y-auto font-sans shadow-inner">
                    <ClinicalMarkdownRenderer content={aiReport} />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyAIReport}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all inline-flex items-center gap-1.5 shadow-sm"
                    >
                      {copiedAI ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedAI ? 'Copied AI Summary!' : 'Copy AI Report'}</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/60 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              id="edit-emr-profile-btn"
              type="button"
              onClick={() => onEditProfile(selectedMember, activeMemberInfo.displayName)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
            <button
              id="close-emr-share-btn"
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all active:scale-95 shadow-sm"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              id="download-emr-pdf-btn"
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="Download Combined Record as PDF"
            >
              <FileDown className="w-4 h-4 text-rose-600" />
              <span>PDF</span>
            </button>

            <button
              id="copy-emr-summary-btn"
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              id="share-emr-pdf-btn"
              type="button"
              disabled={isSharing}
              onClick={handleSharePdf}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0F58B6] hover:bg-[#0c4897] text-white text-xs font-bold shadow-md shadow-blue-900/15 transition-all active:scale-95 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              <span>{isSharing ? 'Preparing...' : 'Share EMR'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
