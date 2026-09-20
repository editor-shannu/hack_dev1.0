'use client';

import React, { useState, useMemo } from 'react';
import { Prescription, HealthRecord } from '@/types/prescription';
import { SpotlightCard } from '../ui/SpotlightCard';
import {
  Search,
  Calendar,
  User,
  Pill,
  Trash2,
  Eye,
  FileText,
  ArrowLeftRight,
  Hospital,
  Activity,
  Plus,
  Clock,
  CheckCircle2,
  FileCheck2,
  Users,
  Folder,
  FolderOpen,
  ChevronRight,
  LayoutGrid,
  Edit3,
  Stethoscope,
} from 'lucide-react';
import { deletePrescription, deleteHealthRecord, incrementComparisonsCount } from '@/lib/storage';
import { comparePrescriptions, PrescriptionDiffResult } from '@/lib/prescriptionDiff';
import { PrescriptionDiffView } from './PrescriptionDiffView';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { deduplicatePrescriptions, deduplicateHealthRecords } from '@/lib/deduplication';
import { FAMILY_RELATIONS, getFamilyRelationBadge } from '@/lib/familyMembers';

interface PrescriptionCabinetProps {
  prescriptions: Prescription[];
  healthRecords?: HealthRecord[];
  onViewDetails: (rx: Prescription) => void;
  onViewHealthRecord?: (record: HealthRecord) => void;
  onEditPrescription?: (rx: Prescription) => void;
  onEditHealthRecord?: (record: HealthRecord) => void;
  onOpenUpload: () => void;
  onCompare?: (rx1: Prescription, rx2: Prescription) => void;
}

export const PrescriptionCabinet: React.FC<PrescriptionCabinetProps> = ({
  prescriptions,
  healthRecords = [],
  onViewDetails,
  onViewHealthRecord,
  onEditPrescription,
  onEditHealthRecord,
  onOpenUpload,
  onCompare,
}) => {
  const [cabinetTab, setCabinetTab] = useState<'prescriptions' | 'records'>('prescriptions');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'folders' | 'files'>('folders');
  const [openedFolder, setOpenedFolder] = useState<string | null>(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Strictly filter out any duplicate prescriptions or health records
  const uniquePrescriptions = useMemo(() => deduplicatePrescriptions(prescriptions), [prescriptions]);
  const uniqueHealthRecords = useMemo(() => deduplicateHealthRecords(healthRecords), [healthRecords]);

  // Compute counts per family member for filtering tabs
  const familyMemberCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    uniquePrescriptions.forEach((rx) => {
      const member = rx.familyMember || 'self';
      counts[member] = (counts[member] || 0) + 1;
      counts.all += 1;
    });
    uniqueHealthRecords.forEach((hr) => {
      const member = hr.familyMember || 'self';
      counts[member] = (counts[member] || 0) + 1;
      counts.all += 1;
    });
    return counts;
  }, [uniquePrescriptions, uniqueHealthRecords]);

  // Distinct family folders for Prescriptions
  const prescriptionFolders = useMemo(() => {
    const folders: Record<string, { count: number; patientNames: Set<string>; latestDate?: string; latestDoctor?: string }> = {};
    uniquePrescriptions.forEach((rx) => {
      const mem = rx.familyMember || 'self';
      if (!folders[mem]) {
        folders[mem] = { count: 0, patientNames: new Set() };
      }
      folders[mem].count += 1;
      if (rx.patientName) folders[mem].patientNames.add(rx.patientName);
      if (rx.date && (!folders[mem].latestDate || rx.date > folders[mem].latestDate!)) {
        folders[mem].latestDate = rx.date;
        folders[mem].latestDoctor = rx.doctorName;
      }
    });
    return folders;
  }, [uniquePrescriptions]);

  // Distinct family folders for Health Records
  const recordFolders = useMemo(() => {
    const folders: Record<string, { count: number; patientNames: Set<string>; latestDate?: string; latestDoctor?: string }> = {};
    uniqueHealthRecords.forEach((hr) => {
      const mem = hr.familyMember || 'self';
      if (!folders[mem]) {
        folders[mem] = { count: 0, patientNames: new Set() };
      }
      folders[mem].count += 1;
      if (hr.patientName) folders[mem].patientNames.add(hr.patientName);
      if (hr.date && (!folders[mem].latestDate || hr.date > folders[mem].latestDate!)) {
        folders[mem].latestDate = hr.date;
        folders[mem].latestDoctor = hr.doctorName || hr.clinicOrHospital;
      }
    });
    return folders;
  }, [uniqueHealthRecords]);

  useBodyScrollLock(isCompareModalOpen);

  const [selectedRx1Id, setSelectedRx1Id] = useState<string>('');
  const [selectedRx2Id, setSelectedRx2Id] = useState<string>('');
  const [activeDiff, setActiveDiff] = useState<{
    oldRx: Prescription;
    newRx: Prescription;
    diffResult: PrescriptionDiffResult;
  } | null>(null);

  // Isolate comparisons strictly to the same family member and patient
  const rx1 = uniquePrescriptions.find((p) => p.id === selectedRx1Id);
  const rx1Family = rx1?.familyMember || 'self';
  const rx1Patient = (rx1?.patientName || '').trim().toLowerCase();

  const eligibleRx2Prescriptions = useMemo(() => {
    if (!selectedRx1Id) return [];
    return uniquePrescriptions.filter((p) => {
      if (p.id === selectedRx1Id) return false;
      const pFamily = p.familyMember || 'self';
      if (pFamily !== rx1Family) return false;
      const pPatient = (p.patientName || '').trim().toLowerCase();
      if (rx1Patient && pPatient && rx1Patient !== pPatient) return false;
      return true;
    });
  }, [uniquePrescriptions, selectedRx1Id, rx1Family, rx1Patient]);

  const handleOpenCompareModal = () => {
    // Find a family member with at least 2 prescriptions
    const memberCounts: Record<string, number> = {};
    uniquePrescriptions.forEach((p) => {
      const mem = p.familyMember || 'self';
      memberCounts[mem] = (memberCounts[mem] || 0) + 1;
    });
    const pairMember = Object.keys(memberCounts).find((k) => memberCounts[k] >= 2) || (uniquePrescriptions[0]?.familyMember || 'self');
    const memberRxs = uniquePrescriptions.filter((p) => (p.familyMember || 'self') === pairMember);

    if (memberRxs.length >= 2) {
      setSelectedRx1Id(memberRxs[1].id);
      setSelectedRx2Id(memberRxs[0].id);
    } else if (uniquePrescriptions.length > 0) {
      setSelectedRx1Id(uniquePrescriptions[0].id);
      setSelectedRx2Id('');
    }
    setIsCompareModalOpen(true);
  };

  const handleRunComparison = () => {
    const rx1 = uniquePrescriptions.find((p) => p.id === selectedRx1Id);
    const rx2 = uniquePrescriptions.find((p) => p.id === selectedRx2Id);
    if (rx1 && rx2) {
      incrementComparisonsCount();
      if (onCompare) {
        onCompare(rx1, rx2);
      } else {
        const diff = comparePrescriptions(rx1, rx2);
        setActiveDiff({
          oldRx: rx1,
          newRx: rx2,
          diffResult: diff,
        });
      }
      setIsCompareModalOpen(false);
    }
  };

  const filteredPrescriptions = uniquePrescriptions.filter((rx) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      rx.title.toLowerCase().includes(query) ||
      rx.doctorName?.toLowerCase().includes(query) ||
      rx.patientName?.toLowerCase().includes(query) ||
      rx.diagnosis?.toLowerCase().includes(query) ||
      rx.medications.some((m) => m.name.toLowerCase().includes(query));

    const matchesStatus = filterStatus === 'all' || rx.status === filterStatus;
    const matchesFamily = selectedFamilyMember === 'all' || (rx.familyMember || 'self') === selectedFamilyMember;
    return matchesSearch && matchesStatus && matchesFamily;
  });

  const filteredHealthRecords = uniqueHealthRecords.filter((record) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      record.title.toLowerCase().includes(query) ||
      record.categoryLabel.toLowerCase().includes(query) ||
      record.patientName?.toLowerCase().includes(query) ||
      record.doctorName?.toLowerCase().includes(query) ||
      record.clinicOrHospital?.toLowerCase().includes(query) ||
      record.diagnosisOrTest?.toLowerCase().includes(query) ||
      record.summary?.toLowerCase().includes(query);

    const matchesFamily = selectedFamilyMember === 'all' || (record.familyMember || 'self') === selectedFamilyMember;
    return matchesSearch && matchesFamily;
  });

  const handleDeletePrescription = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this prescription and its schedule?')) {
      deletePrescription(id);
    }
  };

  const handleDeleteHealthRecord = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this hospital record?')) {
      deleteHealthRecord(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header: Sub-tabs & Action Buttons */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        {/* Sub-Tabs: Prescriptions vs Hospital Records */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            id="cabinet-tab-prescriptions"
            type="button"
            onClick={() => setCabinetTab('prescriptions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              cabinetTab === 'prescriptions'
                ? 'bg-[#0F58B6] text-white shadow-sm shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>Prescriptions</span>
            <span id="cabinet-prescriptions-count" className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
              {uniquePrescriptions.length}
            </span>
          </button>

          <button
            id="cabinet-tab-records"
            type="button"
            onClick={() => setCabinetTab('records')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              cabinetTab === 'records'
                ? 'bg-[#0F58B6] text-white shadow-sm shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Hospital className="w-4 h-4" />
            <span>Hospital &amp; Lab Records</span>
            <span id="cabinet-records-count" className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
              {uniqueHealthRecords.length}
            </span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {cabinetTab === 'prescriptions' && uniquePrescriptions.length >= 2 && (
            <button
              id="cabinet-compare-rx-btn"
              type="button"
              onClick={handleOpenCompareModal}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <ArrowLeftRight className="w-4 h-4 text-[#0F58B6]" />
              <span>Compare Rx</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenUpload}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F58B6] hover:bg-[#0c4897] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Search & View Mode Switcher Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              cabinetTab === 'prescriptions'
                ? 'Search by doctor, diagnosis, medication...'
                : 'Search by test, lab, hospital, doctor...'
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F58B6] focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* View Mode Switcher: Family Folders vs All Files */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs shrink-0 self-start sm:self-auto">
          <button
            type="button"
            id="cabinet-view-folders-btn"
            onClick={() => {
              setViewMode('folders');
              setOpenedFolder(null);
              setSelectedFamilyMember('all');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
              viewMode === 'folders'
                ? 'bg-white text-[#0F58B6] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-[#0F58B6]" />
            <span>Family Folders</span>
          </button>
          <button
            type="button"
            id="cabinet-view-files-btn"
            onClick={() => setViewMode('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
              viewMode === 'files'
                ? 'bg-white text-[#0F58B6] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
            <span>All Files Grid</span>
          </button>
        </div>
      </div>

      {/* Family Member Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs" id="cabinet-family-filter-bar">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-indigo-500" />
          <span>Member:</span>
        </span>
        <button
          type="button"
          id="cabinet-filter-family-all"
          onClick={() => {
            setSelectedFamilyMember('all');
            setOpenedFolder(null);
          }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedFamilyMember === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>All Records</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedFamilyMember === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {familyMemberCounts.all || 0}
          </span>
        </button>
        {FAMILY_RELATIONS.filter((rel) => (familyMemberCounts[rel.key] || 0) > 0 || rel.key === 'self').map((rel) => {
          const isSelected = selectedFamilyMember === rel.key;
          const count = familyMemberCounts[rel.key] || 0;
          return (
            <button
              key={rel.key}
              type="button"
              id={`cabinet-filter-family-${rel.key}`}
              onClick={() => {
                setSelectedFamilyMember(rel.key);
                if (viewMode === 'folders') {
                  setOpenedFolder(rel.key);
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-[#0F58B6] text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{rel.icon}</span>
              <span>{rel.label}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>      {/* ========================================================================= */}
      {/* TAB 1: PRESCRIPTIONS LIST                                                 */}
      {/* ========================================================================= */}
      {cabinetTab === 'prescriptions' && (
        <div className="space-y-4">
          {viewMode === 'folders' && (
            openedFolder ? (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    id="cabinet-breadcrumb-all"
                    onClick={() => {
                      setOpenedFolder(null);
                      setSelectedFamilyMember('all');
                    }}
                    className="font-bold text-[#0F58B6] hover:underline flex items-center gap-1.5"
                  >
                    <Folder className="w-4 h-4" />
                    <span>All Family Vaults</span>
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>{getFamilyRelationBadge(openedFolder as any).icon}</span>
                    <span>{getFamilyRelationBadge(openedFolder as any).displayLabel}&apos;s Prescription Vault</span>
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-[#0F58B6] text-white font-mono text-[10px]">
                      {filteredPrescriptions.length}
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  id="cabinet-back-to-folders-btn"
                  onClick={() => {
                    setOpenedFolder(null);
                    setSelectedFamilyMember('all');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors shadow-sm"
                >
                  ← Back to Folders
                </button>
              </div>
            ) : (
              Object.keys(prescriptionFolders).length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-[#0F58B6]" />
                      <span>Family Prescription Vaults ({Object.keys(prescriptionFolders).length} Folders)</span>
                    </p>
                    <span className="text-[11px] text-slate-400">Click any vault to open member files</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="cabinet-folders-grid">
                    {Object.keys(prescriptionFolders).map((key) => {
                      const data = prescriptionFolders[key];
                      const badge = getFamilyRelationBadge(key as any);
                      const pNames = Array.from(data.patientNames);
                      const patientSubtitle = pNames.length > 0 ? pNames.join(', ') : 'Registered Patient';
                      return (
                        <div
                          key={key}
                          id={`cabinet-folder-${key}`}
                          onClick={() => {
                            setOpenedFolder(key);
                            setSelectedFamilyMember(key);
                          }}
                          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#0F58B6] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-[#0F58B6] flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Folder className="w-6 h-6 text-[#0F58B6]" />
                              </div>
                              <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 ${badge.badgeBg}`}>
                                <span>{badge.icon}</span>
                                <span>{badge.displayLabel}</span>
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0F58B6] transition-colors">
                              {badge.displayLabel}&apos;s Vault
                            </h4>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              👤 Patient: {patientSubtitle}
                            </p>
                            {data.latestDate && (
                              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Latest: {data.latestDate}</span>
                                {data.latestDoctor && <span className="truncate">· {data.latestDoctor}</span>}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
                            <span className="font-mono text-slate-500 font-bold">
                              {data.count} {data.count === 1 ? 'Prescription' : 'Prescriptions'}
                            </span>
                            <span className="text-[#0F58B6] font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                              <span>Open Vault</span>
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )
          )}

          {/* Prescriptions Cards Grid */}
          {filteredPrescriptions.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0F58B6] border border-blue-100 flex items-center justify-center mx-auto">
                <Pill className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">No Prescriptions Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No prescriptions match your search query.'
                    : 'Upload your first prescription scan or photo to organize your medications and routine.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenUpload}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F58B6] text-white text-xs font-bold shadow-md shadow-blue-600/20 hover:bg-[#0c4897] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Upload First Prescription</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPrescriptions.map((rx) => {
                const uploadFormatted = rx.uploadedAt
                  ? new Date(rx.uploadedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Earlier';

                return (
                  <SpotlightCard
                    key={rx.id}
                    id={`prescription-card-${rx.id}`}
                    onClick={() => onViewDetails(rx)}
                    className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#0F58B6]/50 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges: Category, Family Member & Upload Date */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0F58B6] border border-blue-200 font-mono font-bold">
                            Prescription
                          </span>
                          {(() => {
                            const badge = getFamilyRelationBadge(rx.familyMember || 'self');
                            const label = rx.familyMember === 'other' && rx.patientRelation ? rx.patientRelation : badge.label;
                            return (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${badge.badgeBg}`}
                                title={`Belongs to ${label}${rx.patientName ? ` (${rx.patientName})` : ''}`}
                              >
                                <span>{badge.icon}</span>
                                <span>{label}</span>
                              </span>
                            );
                          })()}
                          {rx.doctorVisits && rx.doctorVisits.length > 0 && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold flex items-center gap-1"
                              title={`${rx.doctorVisits.length} consultation visits logged`}
                            >
                              <Stethoscope className="w-3 h-3 text-emerald-600" />
                              <span>{rx.doctorVisits.length} {rx.doctorVisits.length === 1 ? 'Visit' : 'Visits'}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Uploaded: {uploadFormatted}</span>
                        </span>
                      </div>

                      {/* Patient Attribution if present */}
                      {rx.patientName && (
                        <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-semibold mb-1.5 bg-indigo-50/60 px-2.5 py-1 rounded-lg border border-indigo-100/80">
                          <User className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                          <span className="truncate">Patient: {rx.patientName}</span>
                        </div>
                      )}

                      {/* Title & Facility */}
                      <h4 className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-[#0F58B6] transition-colors line-clamp-1 mb-1">
                        {rx.title}
                      </h4>

                      <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{rx.doctorName || 'Doctor not specified'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hospital className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{rx.clinicOrHospital || 'Clinic'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Prescribed Date: {rx.date}</span>
                        </div>
                      </div>

                      {/* Medications Preview List */}
                      <div className="space-y-1.5 pt-3 border-t border-slate-100">
                        <p className="text-[10px] uppercase font-mono font-bold text-slate-400">
                          Medications ({rx.medications.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {rx.medications.slice(0, 3).map((m, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium"
                            >
                              {m.name} <span className="text-slate-400 font-mono text-[10px]">{m.dosage}</span>
                            </span>
                          ))}
                          {rx.medications.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-500 font-bold">
                              +{rx.medications.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          id="cabinet-view-rx-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(rx);
                          }}
                          className="text-[#0F58B6] font-bold group-hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View / Print</span>
                        </button>
                        {onEditPrescription && (
                          <button
                            type="button"
                            id="cabinet-edit-rx-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditPrescription(rx);
                            }}
                            className="text-slate-600 font-bold hover:text-[#0F58B6] hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeletePrescription(e, rx.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete Prescription"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </SpotlightCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HOSPITAL & LAB RECORDS LIST                                        */}
      {/* ========================================================================= */}
      {cabinetTab === 'records' && (
        <div className="space-y-4">
          {viewMode === 'folders' && (
            openedFolder ? (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    id="cabinet-record-breadcrumb-all"
                    onClick={() => {
                      setOpenedFolder(null);
                      setSelectedFamilyMember('all');
                    }}
                    className="font-bold text-[#0F58B6] hover:underline flex items-center gap-1.5"
                  >
                    <Folder className="w-4 h-4" />
                    <span>All Family Vaults</span>
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>{getFamilyRelationBadge(openedFolder as any).icon}</span>
                    <span>{getFamilyRelationBadge(openedFolder as any).displayLabel}&apos;s Medical Reports Vault</span>
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[10px]">
                      {filteredHealthRecords.length}
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  id="cabinet-record-back-to-folders-btn"
                  onClick={() => {
                    setOpenedFolder(null);
                    setSelectedFamilyMember('all');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors shadow-sm"
                >
                  ← Back to Folders
                </button>
              </div>
            ) : (
              Object.keys(recordFolders).length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-[#0F58B6]" />
                      <span>Family Medical Report Vaults ({Object.keys(recordFolders).length} Folders)</span>
                    </p>
                    <span className="text-[11px] text-slate-400">Click any vault to open member reports</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="cabinet-record-folders-grid">
                    {Object.keys(recordFolders).map((key) => {
                      const data = recordFolders[key];
                      const badge = getFamilyRelationBadge(key as any);
                      const pNames = Array.from(data.patientNames);
                      const patientSubtitle = pNames.length > 0 ? pNames.join(', ') : 'Registered Patient';
                      return (
                        <div
                          key={key}
                          id={`cabinet-record-folder-${key}`}
                          onClick={() => {
                            setOpenedFolder(key);
                            setSelectedFamilyMember(key);
                          }}
                          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#0F58B6] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Folder className="w-6 h-6 text-emerald-600" />
                              </div>
                              <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 ${badge.badgeBg}`}>
                                <span>{badge.icon}</span>
                                <span>{badge.displayLabel}</span>
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0F58B6] transition-colors">
                              {badge.displayLabel}&apos;s Medical Reports
                            </h4>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              👤 Patient: {patientSubtitle}
                            </p>
                            {data.latestDate && (
                              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Latest: {data.latestDate}</span>
                                {data.latestDoctor && <span className="truncate">· {data.latestDoctor}</span>}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
                            <span className="font-mono text-slate-500 font-bold">
                              {data.count} {data.count === 1 ? 'Report' : 'Reports'}
                            </span>
                            <span className="text-[#0F58B6] font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                              <span>Open Vault</span>
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )
          )}

              {filteredHealthRecords.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0F58B6] border border-blue-100 flex items-center justify-center mx-auto">
                    <Hospital className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">No Hospital Records Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {searchQuery
                        ? 'No records match your search query.'
                        : 'Upload laboratory blood tests, radiology scans (X-Rays, MRI, CT), discharge summaries, and medical reports.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenUpload}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F58B6] text-white text-xs font-bold shadow-md shadow-blue-600/20 hover:bg-[#0c4897] transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload Hospital Record</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHealthRecords.map((record) => {
                const uploadFormatted = record.uploadedAt
                  ? new Date(record.uploadedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Earlier';

                return (
                  <SpotlightCard
                    key={record.id}
                    id={`health-record-card-${record.id}`}
                    onClick={() => onViewHealthRecord && onViewHealthRecord(record)}
                    className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#0F58B6]/50 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges: Category, Family Member & Upload Date */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold">
                            {record.categoryLabel}
                          </span>
                          {(() => {
                            const badge = getFamilyRelationBadge(record.familyMember || 'self');
                            const label = record.familyMember === 'other' && record.patientRelation ? record.patientRelation : badge.label;
                            return (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${badge.badgeBg}`}
                                title={`Belongs to ${label}${record.patientName ? ` (${record.patientName})` : ''}`}
                              >
                                <span>{badge.icon}</span>
                                <span>{label}</span>
                              </span>
                            );
                          })()}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Uploaded: {uploadFormatted}</span>
                        </span>
                      </div>

                      {/* Patient Attribution if present */}
                      {record.patientName && (
                        <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-semibold mb-1.5 bg-indigo-50/60 px-2.5 py-1 rounded-lg border border-indigo-100/80">
                          <User className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                          <span className="truncate">Patient: {record.patientName}</span>
                        </div>
                      )}

                      {/* Title & Investigation */}
                      <h4 className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-[#0F58B6] transition-colors line-clamp-1 mb-1">
                        {record.title}
                      </h4>

                      <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                        <div className="flex items-center gap-2">
                          <Hospital className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{record.clinicOrHospital || 'Hospital Facility'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Date: {record.date}</span>
                        </div>
                        {record.diagnosisOrTest && (
                          <div className="flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate text-slate-800 font-semibold">{record.diagnosisOrTest}</span>
                          </div>
                        )}
                      </div>

                      {/* Clinical Summary Excerpt */}
                      {record.summary && (
                        <p className="text-xs text-slate-600 line-clamp-2 pt-2 border-t border-slate-100">
                          {record.summary}
                        </p>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          id="cabinet-view-record-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewHealthRecord?.(record);
                          }}
                          className="text-[#0F58B6] font-bold group-hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View / Print Scan</span>
                        </button>
                        {onEditHealthRecord && (
                          <button
                            type="button"
                            id="cabinet-edit-record-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditHealthRecord(record);
                            }}
                            className="text-slate-600 font-bold hover:text-[#0F58B6] hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteHealthRecord(e, record.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </SpotlightCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Comparison Modal */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-5">
            <h3 className="text-lg font-bold text-slate-900">Compare Prescriptions</h3>
            <p className="text-xs text-slate-500">
              Select two prescriptions to analyze added, discontinued, or modified medications.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Older / Previous Prescription</label>
                <select
                  value={selectedRx1Id}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedRx1Id(newId);
                    const targetRx = uniquePrescriptions.find((p) => p.id === newId);
                    const fam = targetRx?.familyMember || 'self';
                    const pat = (targetRx?.patientName || '').trim().toLowerCase();
                    const nextEligible = uniquePrescriptions.filter((p) => {
                      if (p.id === newId) return false;
                      if ((p.familyMember || 'self') !== fam) return false;
                      const pPat = (p.patientName || '').trim().toLowerCase();
                      if (pat && pPat && pat !== pPat) return false;
                      return true;
                    });
                    setSelectedRx2Id(nextEligible[0]?.id || '');
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white"
                >
                  {uniquePrescriptions.map((p) => {
                    const badge = getFamilyRelationBadge(p.familyMember || 'self');
                    return (
                      <option key={p.id} value={p.id}>
                        {badge.icon} [{badge.displayLabel}{p.patientName ? `: ${p.patientName}` : ''}] {p.title} • {p.doctorName || 'Doctor'} ({p.date})
                      </option>
                    );
                  })}
                </select>
                {(() => {
                  const rx1 = uniquePrescriptions.find((p) => p.id === selectedRx1Id);
                  if (!rx1) return null;
                  const badge = getFamilyRelationBadge(rx1.familyMember || 'self');
                  return (
                    <div className="mt-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-0.5">
                      <p className="font-bold text-slate-800">
                        {badge.icon} Member: <span className="text-[#0F58B6]">{badge.displayLabel}</span> {rx1.patientName ? `(${rx1.patientName})` : ''}
                      </p>
                      <p className="text-slate-500">👨‍⚕️ Dr: {rx1.doctorName || 'Physician'} · {rx1.clinicOrHospital || 'Clinic'} · 📅 {rx1.date}</p>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Newer / Revised Prescription</label>
                {eligibleRx2Prescriptions.length > 0 ? (
                  <select
                    value={selectedRx2Id}
                    onChange={(e) => setSelectedRx2Id(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white"
                  >
                    {eligibleRx2Prescriptions.map((p) => {
                      const badge = getFamilyRelationBadge(p.familyMember || 'self');
                      return (
                        <option key={p.id} value={p.id}>
                          {badge.icon} [{badge.displayLabel}{p.patientName ? `: ${p.patientName}` : ''}] {p.title} • {p.doctorName || 'Doctor'} ({p.date})
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>Clinical Safety Isolation Active</span>
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      No second prescription exists for <strong>{getFamilyRelationBadge(rx1Family).displayLabel}{rx1?.patientName ? ` (${rx1.patientName})` : ''}</strong>. Prescriptions can only be compared with other prescriptions belonging to the same family member to avoid cross-patient medication discrepancies.
                    </p>
                  </div>
                )}
                {(() => {
                  const rx2 = uniquePrescriptions.find((p) => p.id === selectedRx2Id);
                  if (!rx2 || eligibleRx2Prescriptions.length === 0) return null;
                  const badge = getFamilyRelationBadge(rx2.familyMember || 'self');
                  return (
                    <div className="mt-1.5 p-2 rounded-xl bg-blue-50/60 border border-blue-200 text-[11px] text-slate-600 space-y-0.5">
                      <p className="font-bold text-slate-900">
                        {badge.icon} Member: <span className="text-[#0F58B6]">{badge.displayLabel}</span> {rx2.patientName ? `(${rx2.patientName})` : ''}
                      </p>
                      <p className="text-slate-500">👨‍⚕️ Dr: {rx2.doctorName || 'Physician'} · {rx2.clinicOrHospital || 'Clinic'} · 📅 {rx2.date}</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunComparison}
                disabled={!selectedRx1Id || !selectedRx2Id || selectedRx1Id === selectedRx2Id || eligibleRx2Prescriptions.length === 0}
                className="px-4 py-2 rounded-xl bg-[#0F58B6] text-white text-xs font-bold hover:bg-[#0c4897] disabled:opacity-50"
              >
                Run Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Diff View Modal */}
      {activeDiff && (
        <PrescriptionDiffView
          oldRx={activeDiff.oldRx}
          newRx={activeDiff.newRx}
          diffResult={activeDiff.diffResult}
          onClose={() => setActiveDiff(null)}
        />
      )}
    </div>
  );
};
