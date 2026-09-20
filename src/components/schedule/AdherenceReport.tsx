'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  BarChart2,
  TrendingUp,
  Flame,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Pill,
  Calendar,
  Sparkles,
  Loader2,
  Users,
  Hospital,
  FileText,
  Eye,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { ScheduledDose, Prescription, HealthRecord } from '@/types/prescription';
import { EMRProfile } from '@/types/emr';
import {
  computeAdherenceReport,
  AdherencePeriod,
  MedAdherenceRow,
  MissedDose,
} from '@/lib/adherence';
import { cleanMedicineName } from '@/lib/deduplication';
import { getFamilyRelationBadge } from '@/lib/familyMembers';
import { getStoredFamilyEMRs } from '@/lib/storage';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AdherenceReportProps {
  doses: ScheduledDose[];
  prescriptions?: Prescription[];
  healthRecords?: HealthRecord[];
  emrProfile?: EMRProfile | null;
  onViewHealthRecord?: (record: HealthRecord) => void;
  onViewPrescription?: (rx: Prescription) => void;
  onOpenUpload?: () => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Clean, responsive HTML/CSS Daily Bar Chart — displays date-wise adherence progress */
function DailyBarChart({
  dailyTrend,
  period,
  selectedDate,
  onSelectDate,
}: {
  dailyTrend: { date?: string; dayLabel: string; rate: number; taken: number; scheduled: number }[];
  period: AdherencePeriod;
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
}) {
  const _td = new Date();
  const todayStr = `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, '0')}-${String(_td.getDate()).padStart(2, '0')}`;
  const activeDaysWithDoses = dailyTrend.filter((d) => d.scheduled > 0);

  if (activeDaysWithDoses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center gap-2">
        <Calendar className="w-6 h-6 text-slate-400" />
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No scheduled routines logged for this period</p>
        <p className="text-[11px] text-slate-400 max-w-xs">Configure your daily medication routine to start recording date-wise adherence trends.</p>
      </div>
    );
  }

  // 1. TODAY PERIOD: Render clean compact summary card
  if (period === 'today') {
    const todayData = dailyTrend.find((d) => d.date === todayStr) || activeDaysWithDoses[activeDaysWithDoses.length - 1];
    const color =
      todayData.rate >= 90
        ? 'bg-emerald-500 text-white shadow-emerald-500/20'
        : todayData.rate >= 60
        ? 'bg-amber-500 text-white shadow-amber-500/20'
        : 'bg-rose-500 text-white shadow-rose-500/20';

    const formattedDate = todayData.date
      ? new Date(todayData.date + 'T00:00:00').toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : todayData.dayLabel;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-base shadow-sm ${color}`}>
            {todayData.rate}%
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{formattedDate} ({todayData.dayLabel})</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {todayData.taken} of {todayData.scheduled} doses logged taken
            </p>
          </div>
        </div>
        <div className="w-full sm:w-48 bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              todayData.rate >= 90 ? 'bg-emerald-500' : todayData.rate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.max(5, todayData.rate)}%` }}
          />
        </div>
      </div>
    );
  }

  // 2. WEEKLY PERIOD: Display all 7 days of the week with day names and metrics
  // 3. MONTHLY PERIOD: Display date-wise progression across the month
  const displayDays = period === 'week' ? dailyTrend.slice(-7) : dailyTrend.filter((d) => d.scheduled > 0 || d.date === todayStr);

  return (
    <div className="flex items-end gap-2.5 sm:gap-3.5 h-48 pt-6 pb-2 px-1 overflow-x-auto">
      {displayDays.map((d, i) => {
        const isToday = d.date === todayStr;
        const hasDoses = d.scheduled > 0;
        const heightPercent = hasDoses ? Math.max(12, d.rate) : 6;

        const barColor = !hasDoses
          ? 'bg-slate-200 dark:bg-slate-700 opacity-40'
          : d.rate >= 90
          ? 'bg-emerald-500'
          : d.rate >= 60
          ? 'bg-amber-500'
          : 'bg-rose-500';

        const textColor = !hasDoses
          ? 'text-slate-400 dark:text-slate-500'
          : d.rate >= 90
          ? 'text-emerald-600 dark:text-emerald-400'
          : d.rate >= 60
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-rose-600 dark:text-rose-400';

        const shortDate = d.date
          ? new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : d.dayLabel;

        const isSelected = selectedDate && d.date === selectedDate;

        return (
          <button
            key={(d.date || d.dayLabel) + i}
            type="button"
            onClick={() => {
              if (onSelectDate) {
                onSelectDate(isSelected ? null : (d.date || null));
              }
            }}
            className={`flex flex-col items-center flex-1 min-w-[48px] max-w-[70px] h-full justify-end group transition-all cursor-pointer p-1.5 rounded-2xl ${
              isSelected
                ? 'ring-2 ring-purple-600 dark:ring-purple-400 bg-purple-50/70 dark:bg-purple-950/50 scale-105 shadow-sm'
                : isToday
                ? 'scale-102 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:scale-102'
            }`}
            title={`Click to filter medications for ${d.date || d.dayLabel}`}
          >
            {/* % Pill or Empty Dash */}
            <span className={`text-[10px] font-mono font-bold mb-1.5 transition-transform group-hover:scale-110 ${textColor}`}>
              {hasDoses ? `${d.rate}%` : '—'}
            </span>

            {/* Track and Filled Bar */}
            <div className={`w-full h-24 rounded-xl flex items-end p-1 border overflow-hidden transition-colors ${
              isSelected
                ? 'bg-purple-100/70 dark:bg-purple-900/40 border-purple-300 dark:border-purple-600'
                : isToday
                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700'
            }`}>
              <div
                className={`w-full rounded-lg transition-all duration-500 shadow-sm ${barColor}`}
                style={{ height: `${heightPercent}%` }}
                title={`${d.date || d.dayLabel}: ${d.taken}/${d.scheduled} doses (${hasDoses ? `${d.rate}%` : 'No routine'})`}
              />
            </div>

            {/* Date label */}
            <span className={`text-[10px] font-mono whitespace-nowrap mt-1 ${
              isSelected
                ? 'font-black text-purple-700 dark:text-purple-300 underline'
                : isToday
                ? 'font-black text-[#0F58B6] dark:text-blue-400 underline'
                : 'font-bold text-slate-800 dark:text-slate-100'
            }`}>
              {shortDate}
            </span>

            {/* Day of week */}
            <span className={`text-[9px] font-mono ${isSelected ? 'font-bold text-purple-700 dark:text-purple-300' : isToday ? 'font-bold text-[#0F58B6]' : 'text-slate-400'}`}>
              {d.dayLabel}
            </span>

            {/* Fraction */}
            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
              {d.taken}/{d.scheduled}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Circular ring showing overall adherence rate */
function AdherenceRing({ rate }: { rate: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const filled = (rate / 100) * circ;
  const color = rate >= 90 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#f43f5e';

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-28 h-28 -rotate-90"
      aria-label={`Overall adherence ${rate}%`}
    >
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Gemini summary card sub-component
// ---------------------------------------------------------------------------

type SummaryState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; text: string; model: string }
  | { status: 'flagged'; flaggedText: string }
  | { status: 'error' };

// Module-level memory cache so switching periods or tabs instantly renders cached AI summaries
const adherenceSummaryCache = new Map<string, { text: string; model: string; timestamp: number }>();

function GeminiSummaryCard({
  state,
  onRefresh,
  isRefreshing,
}: {
  state: SummaryState;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  if (state.status === 'idle' || state.status === 'error') return null;

  return (
    <div
      id="adherence-ai-summary"
      className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-5 sm:p-6 shadow-sm relative overflow-hidden transition-all duration-300"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-700">
            AI Summary
          </span>
          {state.status === 'success' && (
            <span className="text-[9px] font-mono text-purple-400 uppercase tracking-wider hidden xs:inline">
              Gemini · {state.model}
            </span>
          )}
        </div>

        {/* Manual Refresh Button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={state.status === 'loading' || isRefreshing}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-purple-700 hover:bg-purple-100/80 active:scale-95 transition-all disabled:opacity-50"
            title="Refresh AI Analysis"
          >
            <Loader2 className={`w-3 h-3 ${state.status === 'loading' || isRefreshing ? 'animate-spin' : ''}`} />
            <span>{state.status === 'loading' || isRefreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        )}
      </div>

      {state.status === 'loading' && (
        <div className="flex items-start gap-3">
          <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin flex-shrink-0 mt-0.5" />
          {/* Shimmer skeleton lines */}
          <div className="flex-1 space-y-2.5">
            <div className="h-3 bg-purple-200/60 rounded-full animate-pulse w-full" />
            <div className="h-3 bg-purple-200/60 rounded-full animate-pulse w-4/5" />
            <div className="h-3 bg-purple-200/60 rounded-full animate-pulse w-3/5" />
          </div>
        </div>
      )}

      {state.status === 'success' && (
        <p className="text-sm text-slate-700 leading-relaxed font-medium">
          {state.text}
        </p>
      )}

      {state.status === 'flagged' && (
        <div className="space-y-2">
          <p className="text-xs text-amber-700 font-bold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Dev notice: advisory language detected in model output — hidden from users
          </p>
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer font-mono">Show flagged text (dev only)</summary>
            <p className="mt-1 p-2 bg-amber-50 rounded-lg border border-amber-200 font-mono break-all">
              {state.flaggedText}
            </p>
          </details>
        </div>
      )}
    </div>
  );
}

/** Collapsible per-medication breakdown row */
function MedRow({ row }: { row: MedAdherenceRow }) {
  const [open, setOpen] = useState(false);
  const barColor =
    row.rate >= 90 ? 'bg-emerald-500' : row.rate >= 60 ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
          <Pill className="w-4 h-4 text-purple-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-bold text-slate-800 truncate">
              {row.medicationName}
            </span>
            <span className="text-xs font-mono font-bold text-slate-600 flex-shrink-0">
              {row.taken}/{row.scheduled}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${row.rate}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-1">
          {row.missedDoses.length > 0 && (
            <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">
              {row.missedDoses.length} missed
            </span>
          )}
          <span className="text-xs font-mono font-bold text-slate-500">{row.rate}%</span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {open && row.missedDoses.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
            Missed doses
          </p>
          {row.missedDoses.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <span className="text-xs font-medium text-slate-600">
                {formatDate(m.date)} · {m.scheduledTime}
              </span>
            </div>
          ))}
        </div>
      )}

      {open && row.missedDoses.length === 0 && (
        <div className="border-t border-slate-100 px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-700">
            No missed doses in this period 🎉
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
}

const PERIOD_LABELS: Record<AdherencePeriod, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const AdherenceReport: React.FC<AdherenceReportProps> = ({
  doses,
  prescriptions = [],
  healthRecords = [],
  emrProfile,
  onViewHealthRecord,
  onViewPrescription,
  onOpenUpload,
}) => {
  const [period, setPeriod] = useState<AdherencePeriod>('week');
  const [showAllMissed, setShowAllMissed] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string>('all');

  // Compute family member stats across doses, prescriptions, health records, and family EMRs
  const memberStats = useMemo(() => {
    const stats: Record<
      string,
      {
        total: number;
        taken: number;
        label: string;
        icon: string;
        patientNames: Set<string>;
        rxCount: number;
        hrCount: number;
      }
    > = {};

    const ensureMember = (memKey: string, customLabel?: string) => {
      if (!stats[memKey]) {
        const badge = getFamilyRelationBadge(memKey as any, customLabel);
        stats[memKey] = {
          total: 0,
          taken: 0,
          label: badge.displayLabel,
          icon: badge.icon,
          patientNames: new Set(),
          rxCount: 0,
          hrCount: 0,
        };
      }
      return stats[memKey];
    };

    // Always ensure 'self'
    const self = ensureMember('self');
    if (emrProfile?.fullName) self.patientNames.add(emrProfile.fullName);

    // Stored Family EMRs
    const familyEmrs = typeof window !== 'undefined' ? getStoredFamilyEMRs() : {};
    Object.keys(familyEmrs).forEach((memKey) => {
      const entry = ensureMember(memKey);
      if (familyEmrs[memKey]?.fullName) entry.patientNames.add(familyEmrs[memKey].fullName);
    });

    // Doses
    doses.forEach((d) => {
      const mem = d.familyMember || 'self';
      const entry = ensureMember(mem);
      entry.total++;
      if (d.status === 'taken') entry.taken++;
      if (d.patientName) entry.patientNames.add(d.patientName);
    });

    // Prescriptions
    prescriptions.forEach((rx) => {
      const mem = rx.familyMember || 'self';
      const entry = ensureMember(mem);
      entry.rxCount++;
      if (rx.patientName) entry.patientNames.add(rx.patientName);
    });

    // Hospital / Lab Health Records
    healthRecords.forEach((hr) => {
      const mem = hr.familyMember || 'self';
      const entry = ensureMember(mem);
      entry.hrCount++;
      if (hr.patientName) entry.patientNames.add(hr.patientName);
    });

    return stats;
  }, [doses, prescriptions, healthRecords, emrProfile]);

  const uniqueMembers = useMemo(() => Object.keys(memberStats), [memberStats]);

  const classifiedDoses = useMemo(() => {
    if (selectedMember === 'all') return doses;
    return doses.filter((d) => (d.familyMember || 'self') === selectedMember);
  }, [doses, selectedMember]);

  const classifiedHealthRecords = useMemo(() => {
    if (selectedMember === 'all') return healthRecords;
    return healthRecords.filter((hr) => (hr.familyMember || 'self') === selectedMember);
  }, [healthRecords, selectedMember]);

  const classifiedPrescriptions = useMemo(() => {
    if (selectedMember === 'all') return prescriptions;
    return prescriptions.filter((rx) => (rx.familyMember || 'self') === selectedMember);
  }, [prescriptions, selectedMember]);

  const report = useMemo(() => computeAdherenceReport(classifiedDoses, period), [classifiedDoses, period]);

  // Compute per-medication breakdown filtered by selected day when clicked
  const displayPerMedication = useMemo((): MedAdherenceRow[] => {
    if (!selectedDayDate) return report.perMedication;

    const dayDoses = classifiedDoses.filter((d) => d.date === selectedDayDate);
    if (dayDoses.length === 0) return [];

    const medMap = new Map<string, { name: string; doses: ScheduledDose[] }>();
    dayDoses.forEach((d) => {
      const key = cleanMedicineName(d.medicationName) || d.medicationId;
      if (!medMap.has(key)) {
        medMap.set(key, { name: d.medicationName, doses: [] });
      }
      medMap.get(key)!.doses.push(d);
    });

    return Array.from(medMap.entries()).map(([key, { name, doses: mDoses }]) => {
      const taken = mDoses.filter((d) => d.status === 'taken').length;
      const skipped = mDoses.filter((d) => d.status === 'skipped').length;
      const scheduled = mDoses.length;
      const rate = scheduled > 0 ? Math.round((taken / scheduled) * 100) : 0;
      const missed = mDoses
        .filter((d) => d.status === 'skipped' || d.status === 'pending' || d.status === 'snoozed')
        .map((d) => ({
          date: d.date,
          medicationName: d.medicationName,
          scheduledTime: d.scheduledTime,
          slot: d.slot,
        }));

      return {
        medicationId: key,
        medicationName: name,
        dosage: mDoses[0]?.dosage,
        taken,
        skipped,
        scheduled,
        rate,
        missedDoses: missed,
      };
    });
  }, [selectedDayDate, report.perMedication, classifiedDoses]);

  // Gemini narrative summary with smart caching — avoids constant regeneration
  const [summaryState, setSummaryState] = useState<SummaryState>({ status: 'idle' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stable cache key based on computed metrics and member
  const summaryKey = `adh_sum_${selectedMember}_${period}_${report.overallRate}_${report.taken}_${report.scheduled}_${report.currentStreakDays}`;

  const fetchSummary = useCallback(
    async (force = false) => {
      if (report.scheduled === 0) {
        setSummaryState({ status: 'idle' });
        return;
      }

      // 1. Check in-memory module cache
      if (!force && adherenceSummaryCache.has(summaryKey)) {
        const cached = adherenceSummaryCache.get(summaryKey)!;
        setSummaryState({ status: 'success', text: cached.text, model: cached.model });
        return;
      }

      // 2. Check sessionStorage cache
      if (!force && typeof window !== 'undefined') {
        try {
          const stored = sessionStorage.getItem(summaryKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.text) {
              adherenceSummaryCache.set(summaryKey, parsed);
              setSummaryState({ status: 'success', text: parsed.text, model: parsed.model || 'Gemini' });
              return;
            }
          }
        } catch {}
      }

      // If we already have a successful summary, keep displaying it while refreshing
      if (summaryState.status === 'success') {
        setIsRefreshing(true);
      } else {
        setSummaryState({ status: 'loading' });
      }

      // Build minimal fact payload — pre-computed metrics only
      const missedMedications = report.perMedication
        .filter((m) => m.missedDoses.length > 0)
        .slice(0, 5)
        .map((m) => ({ name: m.medicationName, count: m.missedDoses.length }));

      const worstAdherenceMeds = report.perMedication
        .filter((m) => m.scheduled > 0)
        .slice(0, 3)
        .map((m) => ({ name: m.medicationName, rate: m.rate }));

      try {
        const res = await fetch('/api/adherence-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            period,
            overallRate: report.overallRate,
            taken: report.taken,
            scheduled: report.scheduled,
            missedCount: report.skipped + report.unloggedPast,
            currentStreakDays: report.currentStreakDays,
            bestStreakDays: report.bestStreakDays,
            missedMedications,
            worstAdherenceMeds,
          }),
        });

        const json = await res.json();

        if (json.success && json.summary) {
          const newEntry = { text: json.summary, model: json.model ?? 'Gemini 2.5' };
          adherenceSummaryCache.set(summaryKey, { ...newEntry, timestamp: Date.now() });
          try {
            sessionStorage.setItem(summaryKey, JSON.stringify(newEntry));
          } catch {}
          setSummaryState({ status: 'success', text: json.summary, model: json.model ?? '' });
        } else if (json.error === 'advisory_language_detected' && json.flaggedSummary) {
          setSummaryState({ status: 'flagged', flaggedText: json.flaggedSummary });
        } else {
          setSummaryState({ status: 'error' });
        }
      } catch {
        setSummaryState({ status: 'error' });
      } finally {
        setIsRefreshing(false);
      }
    },
    // Only re-create callback when metric primitives change, not on every object reference change
    [summaryKey, period, report.scheduled, report.taken, report.overallRate, report.currentStreakDays, report.perMedication, report.skipped, report.unloggedPast, report.bestStreakDays, summaryState.status]
  );

  useEffect(() => {
    fetchSummary(false);
  }, [fetchSummary]);

  const ringColor =
    report.overallRate >= 90
      ? 'text-emerald-600'
      : report.overallRate >= 60
        ? 'text-amber-600'
        : 'text-rose-600';

  const missedToShow = showAllMissed
    ? report.allMissedDoses
    : report.allMissedDoses.slice(0, 5);

  const hasDoses = doses.length > 0 && report.scheduled > 0;

  return (
    <div className="space-y-4" id="adherence-report-section">

      {/* Header row */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-purple-600" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Adherence Report
          </h2>
        </div>
      </div>

      {/* Classified Family Member Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs" id="adherence-family-filter">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-purple-600" />
          <span>Classify By:</span>
        </span>
        <button
          type="button"
          id="adherence-filter-member-all"
          onClick={() => {
            setSelectedMember('all');
            setSelectedDayDate(null);
          }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            selectedMember === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>👥</span>
          <span>All Family ({doses.length} doses{healthRecords.length > 0 ? ` · ${healthRecords.length} reports` : ''})</span>
        </button>
        {uniqueMembers.map((memKey) => {
          const stat = memberStats[memKey];
          const pNames = Array.from(stat.patientNames);
          const nameTag = pNames.length > 0 && pNames[0] !== stat.label ? ` (${pNames[0]})` : '';
          return (
            <button
              key={memKey}
              type="button"
              id={`adherence-filter-member-${memKey}`}
              onClick={() => {
                setSelectedMember(memKey);
                setSelectedDayDate(null);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedMember === memKey
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20 ring-2 ring-purple-400/40'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{stat.icon}</span>
              <span>{stat.label}{nameTag}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  selectedMember === memKey ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {stat.total > 0 ? `${stat.taken}/${stat.total}` : `${stat.hrCount} reports`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1 w-fit shadow-sm">
        {(Object.keys(PERIOD_LABELS) as AdherencePeriod[]).map((p) => (
          <button
            key={p}
            id={`adherence-period-${p}`}
            type="button"
            onClick={() => {
              setPeriod(p);
              setSelectedDayDate(null);
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              period === p
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* ── GEMINI NARRATIVE SUMMARY ───────────────────────────── */}
      <GeminiSummaryCard
        state={summaryState}
        onRefresh={() => fetchSummary(true)}
        isRefreshing={isRefreshing}
      />

      {/* ── SUMMARY CARD ───────────────────────────────────────── */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
        {hasDoses ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Ring */}
            <div className="relative flex-shrink-0 flex items-center justify-center w-28 h-28 mx-auto sm:mx-0">
              <AdherenceRing rate={report.overallRate} />
              <div className="absolute flex flex-col items-center justify-center">
                <span className={`text-xl font-black font-mono ${ringColor}`}>
                  {report.overallRate}%
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">
                  Overall
                </span>
              </div>
            </div>

            {/* Stat chips */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Taken */}
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-bold">
                    Taken
                  </span>
                </div>
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {report.taken}
                </span>
              </div>

              {/* Scheduled */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                    Scheduled
                  </span>
                </div>
                <span className="text-2xl font-black text-slate-700 font-mono">
                  {report.scheduled}
                </span>
              </div>

              {/* Missed */}
              <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-rose-700 font-bold">
                    Missed
                  </span>
                </div>
                <span className="text-2xl font-black text-rose-600 font-mono">
                  {report.skipped + report.unloggedPast}
                </span>
              </div>

              {/* Streak */}
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 font-bold">
                    Streak
                  </span>
                </div>
                <span className="text-2xl font-black text-amber-600 font-mono">
                  {report.currentStreakDays}d
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <BarChart2 className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No scheduled routines logged yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Configure your daily medication routine to start recording date-wise adherence trends.
              </p>
            </div>
          </div>
        )}

        {/* Best streak footnote */}
        {hasDoses && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 text-[11px] font-mono text-slate-500">
            <span className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#0F58B6]" />
              Best streak: <span className="font-bold text-slate-700">{report.bestStreakDays} days</span>
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              {report.overallRate >= 80 ? 'Excellent consistency!' : report.overallRate >= 50 ? 'Room to improve.' : 'Needs attention.'}
            </span>
          </div>
        )}
      </div>

      {/* ── DAILY TREND CHART ──────────────────────────────────── */}
      {hasDoses && report.dailyTrend.some((d) => d.scheduled > 0) && (
        <div id="adherence-daily-trend-card" className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-extrabold text-slate-800">
              Daily Trend
            </h3>
            <span className="text-[10px] font-mono text-slate-400 ml-auto">
              {selectedDayDate ? 'Click bar to deselect' : 'Click a day to view its medications'}
            </span>
          </div>
          <div className="w-full">
            <DailyBarChart 
              dailyTrend={report.dailyTrend} 
              period={period} 
              selectedDate={selectedDayDate}
              onSelectDate={(d) => setSelectedDayDate(d)}
            />
          </div>
        </div>
      )}

      {/* ── PER-MEDICATION BREAKDOWN ───────────────────────────── */}
      {hasDoses && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 px-1">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Pill className="w-4 h-4 text-purple-600" />
              <span>Per-Medication Breakdown</span>
              {selectedDayDate && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  {(() => {
                    const [y, m, dayNum] = selectedDayDate.split('-').map(Number);
                    const d = new Date(y, (m || 1) - 1, dayNum || 1);
                    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
                  })()}
                </span>
              )}
            </h3>
            {selectedDayDate && (
              <button
                type="button"
                onClick={() => setSelectedDayDate(null)}
                className="text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors"
              >
                Show Entire {period === 'week' ? 'Week' : 'Month'} →
              </button>
            )}
          </div>

          {displayPerMedication.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-500 font-medium">
              No medications were scheduled or logged for this specific day ({selectedDayDate}).
            </div>
          ) : (
            displayPerMedication.map((row) => (
              <MedRow key={row.medicationId} row={row} />
            ))
          )}
        </div>
      )}

      {/* ── MISSED DOSE LOG ────────────────────────────────────── */}
      {hasDoses && report.allMissedDoses.length > 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-extrabold text-slate-800">
              Missed Dose Log
            </h3>
            <span className="ml-auto text-[10px] font-mono bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold">
              {report.allMissedDoses.length} total
            </span>
          </div>

          <div className="space-y-2">
            {missedToShow.map((m, i) => (
              <MissedDoseRow key={i} missed={m} />
            ))}
          </div>

          {report.allMissedDoses.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllMissed((p) => !p)}
              className="mt-3 text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1"
            >
              {showAllMissed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> Show all {report.allMissedDoses.length} missed doses
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* All-clear state */}
      {hasDoses && report.allMissedDoses.length === 0 && (
        <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-5 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">
              Perfect adherence for {PERIOD_LABELS[period].toLowerCase()}! 🎉
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              No missed doses in this period. Keep it up!
            </p>
          </div>
        </div>
      )}

      {/* ── DIAGNOSTIC & CLINICAL HEALTH REPORTS BY FAMILY MEMBER ── */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4" id="adherence-family-reports-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Hospital className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Diagnostic &amp; Lab Reports</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                  {classifiedHealthRecords.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {selectedMember === 'all'
                  ? 'Official pathology test reports, imaging scans & clinical summaries for all family members'
                  : `Clinical pathology, imaging & lab records logged for ${memberStats[selectedMember]?.label || selectedMember}`}
              </p>
            </div>
          </div>

          {onOpenUpload && (
            <button
              type="button"
              id="adherence-upload-report-btn"
              onClick={onOpenUpload}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all active:scale-95 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-700" />
              <span>Upload New Report</span>
            </button>
          )}
        </div>

        {classifiedHealthRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center gap-2">
            <FileText className="w-7 h-7 text-slate-300" />
            <p className="text-xs font-bold text-slate-700">
              No diagnostic reports found {selectedMember === 'all' ? 'for any family member' : `for ${memberStats[selectedMember]?.label || selectedMember}`}
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm">
              Upload multi-page lab reports, blood tests (CBC, lipid profile), radiology scans, or hospital discharge summaries to track clinical results here.
            </p>
            {onOpenUpload && (
              <button
                type="button"
                onClick={onOpenUpload}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Report</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="adherence-records-grid">
            {classifiedHealthRecords.map((record) => {
              const badge = getFamilyRelationBadge(record.familyMember as any);
              return (
                <div
                  key={record.id}
                  className="rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-sm p-4 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-mono uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 inline-block mb-1">
                          {record.categoryLabel || 'Medical Record'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 truncate transition-colors">
                          {record.title}
                        </h4>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 flex-shrink-0 ${badge.badgeBg}`}>
                        <span>{badge.icon}</span>
                        <span>{record.patientName || badge.displayLabel}</span>
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      {record.clinicOrHospital && (
                        <p className="truncate">🏥 {record.clinicOrHospital}</p>
                      )}
                      {record.doctorName && (
                        <p className="truncate">👨‍⚕️ {record.doctorName}</p>
                      )}
                      {record.date && (
                        <p className="font-mono text-[10px] text-slate-400">📅 {record.date}</p>
                      )}
                    </div>

                    {record.summary && (
                      <p className="text-xs text-slate-600 line-clamp-2 bg-white/80 rounded-xl p-2 border border-slate-100">
                        {record.summary}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">
                      {record.fileType === 'pdf' ? '📄 Multi-page PDF' : '🖼️ Medical Scan/Image'}
                    </span>
                    {onViewHealthRecord && (
                      <button
                        type="button"
                        onClick={() => onViewHealthRecord(record)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors group/btn"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600 group-hover/btn:scale-110 transition-transform" />
                        <span>View Document</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Missed dose row (extracted to keep the main component readable)
// ---------------------------------------------------------------------------

function MissedDoseRow({ missed }: { missed: MissedDose }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-slate-700 truncate block">
          {missed.medicationName}
        </span>
        <span className="text-xs text-slate-400 font-mono">
          {formatDate(missed.date)} · {missed.scheduledTime}
        </span>
      </div>
      <div className="flex-shrink-0">
        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold capitalize">
          {missed.slot.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}
