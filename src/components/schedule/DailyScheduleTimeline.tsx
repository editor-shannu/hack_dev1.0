'use client';

import React, { useState, useMemo, useRef } from 'react';
import { ScheduledDose, Prescription, TimeOfDaySlot } from '@/types/prescription';
import { DoseCard } from './DoseCard';
import { RoutineReminderModal } from './RoutineReminderModal';
import { 
  Sun, 
  CloudSun, 
  Sunset, 
  Moon, 
  Activity, 
  Upload, 
  Pill, 
  Clock, 
  Bell,
  Sliders,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Users
} from 'lucide-react';
import { FAMILY_RELATIONS, getFamilyRelationBadge } from '@/lib/familyMembers';

interface DailyScheduleTimelineProps {
  doses: ScheduledDose[];
  onStatusChange: (doseId: string, status: 'taken' | 'skipped' | 'snoozed' | 'pending') => void;
  onDeleteDose?: (doseId: string) => void;
  onOpenUpload?: () => void;
  prescriptions?: Prescription[];
  onUpdateDoses?: (updatedDoses: ScheduledDose[]) => void;
  userId?: string;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
}

interface SlotConfig {
  slot: TimeOfDaySlot;
  label: string;
  timeWindow: string;
  icon: any;
  accent: string;
}

const SLOTS: SlotConfig[] = [
  {
    slot: 'morning',
    label: 'Morning Dose',
    timeWindow: '07:00 AM – 10:30 AM',
    icon: Sun,
    accent: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  },
  {
    slot: 'afternoon',
    label: 'Afternoon Dose',
    timeWindow: '12:00 PM – 03:00 PM',
    icon: CloudSun,
    accent: 'text-cyber-cyan bg-cyber-cyan/10 border-cyber-cyan/20',
  },
  {
    slot: 'evening',
    label: 'Evening / Dinner Dose',
    timeWindow: '06:00 PM – 08:30 PM',
    icon: Sunset,
    accent: 'text-cyber-violet bg-cyber-violet/10 border-cyber-violet/20',
  },
  {
    slot: 'bedtime',
    label: 'Bedtime Dose',
    timeWindow: '09:30 PM – 11:30 PM',
    icon: Moon,
    accent: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  },
  {
    slot: 'as_needed',
    label: 'As Needed (PRN / SOS)',
    timeWindow: 'On Symptom Occurrence',
    icon: Activity,
    accent: 'text-cyber-rose bg-cyber-rose/10 border-cyber-rose/20',
  },
];

export const DailyScheduleTimeline: React.FC<DailyScheduleTimelineProps> = ({
  doses,
  onStatusChange,
  onDeleteDose,
  onOpenUpload,
  prescriptions = [],
  onUpdateDoses,
  userId,
  selectedDate: controlledSelectedDate,
  onSelectDate,
}) => {
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Helper for pure local YYYY-MM-DD formatting without timezone drift
  const formatYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = useMemo(() => formatYMD(new Date()), []);
  const [internalDate, setInternalDate] = useState<string>(today);
  const selectedDate = controlledSelectedDate || internalDate;

  const setSelectedDate = (newDate: string) => {
    setInternalDate(newDate);
    if (onSelectDate) onSelectDate(newDate);
  };

  // Filter doses strictly for the selected date (completed or pending for this day only)
  // If viewing a future date, project active routine doses whose repeatDays match that day
  const currentDayDoses = useMemo(() => {
    const directMatches = doses.filter((d) => d.date === selectedDate || (!d.date && selectedDate === today));
    if (directMatches.length > 0) {
      return directMatches;
    }

    // If future date, project scheduled routine for that day based on repeatDays
    if (selectedDate > today) {
      const [y, m, dayNum] = selectedDate.split('-').map(Number);
      const selDate = new Date(y, (m || 1) - 1, dayNum || 1);
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const selDayName = dayNames[selDate.getDay()];

      const activeTemplate = doses.filter((d) => d.date === today);
      const source = activeTemplate.length > 0 ? activeTemplate : doses.filter((d) => d.date && d.date < selectedDate);

      const uniqueMap = new Map<string, ScheduledDose>();
      source.forEach((d) => {
        const key = `${d.slot}|${d.medicationName}`;
        if (!uniqueMap.has(key)) uniqueMap.set(key, d);
      });

      return Array.from(uniqueMap.values())
        .filter((d) => {
          if (Array.isArray(d.repeatDays) && d.repeatDays.length > 0) {
            return d.repeatDays.includes(selDayName);
          }
          return true;
        })
        .map((d) => ({
          ...d,
          id: `${d.prescriptionId}-${d.medicationId}-${d.slot}-${selectedDate}`,
          date: selectedDate,
          status: 'pending' as const,
          takenAt: undefined,
        }));
    }

    return [];
  }, [doses, selectedDate, today]);

  const [selectedFamilyMember, setSelectedFamilyMember] = useState<string>('all');

  const familyMemberStats = useMemo(() => {
    const stats: Record<string, { total: number; taken: number; label: string; icon: string; patientNames: Set<string> }> = {};
    currentDayDoses.forEach((d) => {
      const mem = d.familyMember || 'self';
      if (!stats[mem]) {
        const badge = getFamilyRelationBadge(mem);
        stats[mem] = { total: 0, taken: 0, label: badge.displayLabel, icon: badge.icon, patientNames: new Set() };
      }
      stats[mem].total++;
      if (d.status === 'taken') stats[mem].taken++;
      if (d.patientName) stats[mem].patientNames.add(d.patientName);
    });
    return stats;
  }, [currentDayDoses]);

  const uniqueMembers = useMemo(() => Object.keys(familyMemberStats), [familyMemberStats]);

  const displayDoses = useMemo(() => {
    if (selectedFamilyMember === 'all') return currentDayDoses;
    return currentDayDoses.filter((d) => (d.familyMember || 'self') === selectedFamilyMember);
  }, [currentDayDoses, selectedFamilyMember]);

  const hasDoses = displayDoses.length > 0;
  const takenCount = displayDoses.filter((d) => d.status === 'taken').length;
  const totalCount = displayDoses.length;
  const allDayTaken = hasDoses && takenCount === totalCount;
  const adherenceRate = hasDoses ? Math.round((takenCount / totalCount) * 100) : 0;

  const isSelectedToday = selectedDate === today;
  const isSelectedPast = selectedDate < today;
  const isSelectedFuture = selectedDate > today;

  // Compute 7 days of the week surrounding the selected date
  const weekDays = useMemo(() => {
    const [y, m, dayNum] = selectedDate.split('-').map(Number);
    const sel = new Date(y, (m || 1) - 1, dayNum || 1);
    const dayOfWeek = sel.getDay(); // 0 = Sun, 1 = Mon ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(y, (m || 1) - 1, (dayNum || 1) + mondayOffset);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const dStr = formatYMD(d);
      let dayDoses = doses.filter((item) => item.date === dStr || (!item.date && dStr === today));
      
      // If future day and has no recorded doses, project from today's routine
      if (dayDoses.length === 0 && dStr > today) {
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayNameKey = dayNames[d.getDay()];
        const activeTemplate = doses.filter((item) => item.date === today);
        dayDoses = activeTemplate.filter((item) => {
          if (Array.isArray(item.repeatDays) && item.repeatDays.length > 0) {
            return item.repeatDays.includes(dayNameKey);
          }
          return true;
        });
      }

      const scheduled = dayDoses.length;
      const taken = dayDoses.filter((item) => item.status === 'taken').length;
      const allDone = scheduled > 0 && taken === scheduled;
      const partial = taken > 0 && taken < scheduled;
      const hasMissed = scheduled > 0 && dStr < today && taken < scheduled;

      days.push({
        dateStr: dStr,
        dayName: d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'narrow' }),
        dayShort: d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' }),
        dayNumber: d.getDate(),
        monthShort: d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' }),
        isToday: dStr === today,
        isSelected: dStr === selectedDate,
        scheduled,
        taken,
        allDone,
        partial,
        hasMissed,
      });
    }
    return days;
  }, [selectedDate, doses, today]);

  const handlePrevDay = () => {
    const [y, m, dayNum] = selectedDate.split('-').map(Number);
    const d = new Date(y, (m || 1) - 1, (dayNum || 1) - 1);
    setSelectedDate(formatYMD(d));
  };

  const handleNextDay = () => {
    const [y, m, dayNum] = selectedDate.split('-').map(Number);
    const d = new Date(y, (m || 1) - 1, (dayNum || 1) + 1);
    setSelectedDate(formatYMD(d));
  };

  const handleJumpToday = () => {
    setSelectedDate(today);
  };

  const formattedSelectedDate = useMemo(() => {
    const [y, m, dayNum] = selectedDate.split('-').map(Number);
    const d = new Date(y, (m || 1) - 1, dayNum || 1);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  const handleSaveRoutine = (updatedDoses: ScheduledDose[]) => {
    if (onUpdateDoses) {
      onUpdateDoses(updatedDoses);
    }
  };

  return (
    <div id="daily-schedule-timeline" className="space-y-6">
      {/* Schedule Top Bar with Routine Settings */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#0F58B6] dark:text-blue-400 shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Daily Medication Routine
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isSelectedToday 
                ? "Today's routine • Completed doses logged for today move to adherence tomorrow"
                : `Viewing medication routine for ${formattedSelectedDate}`}
            </p>
          </div>
        </div>

        <button
          id="set-reminders-schedule-btn"
          onClick={() => setIsRoutineModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0F58B6] dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800/80 shadow-sm active:scale-95 transition-all self-start sm:self-auto"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Set Reminders &amp; Schedule</span>
        </button>
      </div>

      {/* Calendar Date Navigator Strip */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#0F58B6] dark:text-blue-400">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                {formattedSelectedDate}
              </span>
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
                {isSelectedToday ? 'Today (Active)' : isSelectedPast ? 'Historical Record' : 'Upcoming Date'}
              </span>
            </div>
          </div>

          {/* Quick Date Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isSelectedToday && (
              <button
                id="routine-jump-today-btn"
                type="button"
                onClick={handleJumpToday}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-[#0F58B6] dark:text-blue-400 text-xs font-bold transition-all border border-blue-200 dark:border-blue-800"
                title="Jump to Today"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Today</span>
              </button>
            )}

            <button
              id="routine-prev-day-btn"
              type="button"
              onClick={handlePrevDay}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Hidden native date input triggered by calendar button */}
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="sr-only"
            />
            <button
              id="routine-calendar-picker-btn"
              type="button"
              onClick={() => dateInputRef.current?.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.click()}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              title="Open Calendar Picker"
            >
              <CalendarIcon className="w-4 h-4 text-[#0F58B6]" />
            </button>

            <button
              id="routine-next-day-btn"
              type="button"
              onClick={handleNextDay}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 7-Day Interactive Calendar Strip */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          {weekDays.map((day) => (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => setSelectedDate(day.dateStr)}
              className={`flex flex-col items-center py-2.5 px-1 rounded-2xl transition-all relative ${
                day.isSelected
                  ? 'bg-[#0F58B6] text-white shadow-md shadow-blue-500/20 scale-[1.03]'
                  : day.isToday
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 text-[#0F58B6] dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60'
              }`}
            >
              <span className={`text-[10px] font-mono font-bold uppercase ${day.isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                {day.dayShort}
              </span>
              <span className="text-sm sm:text-base font-extrabold tracking-tight mt-0.5">
                {day.dayNumber}
              </span>

              {/* Status Indicator Dot/Pill */}
              <div className="mt-1 h-3 flex items-center justify-center">
                {day.allDone ? (
                  <div className={`w-2 h-2 rounded-full ${day.isSelected ? 'bg-emerald-300' : 'bg-emerald-500'}`} title="All doses taken" />
                ) : day.partial ? (
                  <div className={`w-2 h-2 rounded-full ${day.isSelected ? 'bg-amber-300' : 'bg-amber-500'}`} title="Partially taken" />
                ) : day.hasMissed ? (
                  <div className={`w-2 h-2 rounded-full ${day.isSelected ? 'bg-rose-300' : 'bg-rose-500'}`} title="Missed / skipped doses" />
                ) : day.scheduled > 0 ? (
                  <div className={`w-1.5 h-1.5 rounded-full ${day.isSelected ? 'bg-white/60' : 'bg-slate-300'}`} title="Scheduled" />
                ) : (
                  <div className="w-1 h-1 rounded-full bg-transparent" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Day Adherence Status Bar */}
        {hasDoses && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${allDayTaken ? 'bg-emerald-500' : 'bg-blue-500'}`} />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {allDayTaken 
                  ? `All ${totalCount} doses completed on this day!`
                  : `${takenCount} of ${totalCount} scheduled doses taken`}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
              <span>Adherence: <strong className={adherenceRate === 100 ? 'text-emerald-600' : 'text-[#0F58B6]'}>{adherenceRate}%</strong></span>
              <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${allDayTaken ? 'bg-emerald-500' : 'bg-[#0F58B6]'}`}
                  style={{ width: `${adherenceRate}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Family Member Routine Filter */}
      {uniqueMembers.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none" id="routine-family-filters">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 shrink-0 mr-1">
            <Users className="w-3.5 h-3.5 text-[#0F58B6]" />
            Routine For:
          </span>
          <button
            type="button"
            onClick={() => setSelectedFamilyMember('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedFamilyMember === 'all'
                ? 'bg-[#0F58B6] text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <span>👥</span>
            <span>All Family ({currentDayDoses.length})</span>
          </button>
          {uniqueMembers.map((memKey) => {
            const stat = familyMemberStats[memKey];
            const pNames = Array.from(stat.patientNames);
            const extraName = pNames.length === 1 && pNames[0] !== stat.label ? ` (${pNames[0]})` : '';
            return (
              <button
                key={memKey}
                type="button"
                onClick={() => setSelectedFamilyMember(memKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedFamilyMember === memKey
                    ? 'bg-[#0F58B6] text-white shadow-sm ring-2 ring-blue-400/40'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>{stat.icon}</span>
                <span>{stat.label}{extraName}</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 dark:bg-white/10 font-mono">
                  {stat.taken}/{stat.total}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {allDayTaken && hasDoses && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 text-xs font-medium animate-in fade-in">
          <span className="text-base">🎉</span>
          <div>
            <p className="font-bold">
              {isSelectedToday
                ? "All scheduled doses completed for today!"
                : `All scheduled doses completed on ${formattedSelectedDate}!`}
            </p>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
              {isSelectedToday
                ? "Completed doses are recorded for today and will roll over to Adherence History tomorrow."
                : "Historical record verified in adherence tracker."}
            </p>
          </div>
        </div>
      )}

      {hasDoses ? (
        SLOTS.map((slotConfig) => {
          const slotDoses = displayDoses.filter(
            (d) => d.slot === slotConfig.slot || (slotConfig.slot === 'bedtime' && (d.slot as string) === 'night')
          );
          if (slotDoses.length === 0) return null;

          const Icon = slotConfig.icon;
          const allDone = slotDoses.every((d) => d.status === 'taken');

          return (
            <div
              key={slotConfig.slot}
              className={`p-5 rounded-3xl border transition-all ${
                allDone
                  ? 'bg-slate-50 dark:bg-slate-900/60 border-emerald-200 dark:border-emerald-900/60 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              {/* Slot Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${slotConfig.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{slotConfig.label}</h3>
                      {allDone && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800">
                          Complete
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono">{slotConfig.timeWindow}</p>
                  </div>
                </div>

                <div className="text-xs font-mono text-slate-500 font-semibold">
                  {slotDoses.filter((d) => d.status === 'taken').length}/{slotDoses.length} Taken
                </div>
              </div>

              {/* Doses in this slot */}
              <div className="grid grid-cols-1 gap-3">
                {slotDoses.map((dose) => (
                  <DoseCard
                    key={dose.id}
                    dose={dose}
                    onStatusChange={onStatusChange}
                    onDeleteDose={onDeleteDose}
                  />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className="flex flex-col items-center justify-center p-12 sm:p-16 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#0F58B6] dark:text-blue-400 shadow-sm">
            <Pill className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isSelectedToday
                ? 'Your Routine Is Empty for Today'
                : `No Routine Recorded for ${formattedSelectedDate}`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isSelectedToday
                ? 'No medications in your daily routine yet. Click "Configure Routine from Prescriptions" to select medicines, set reminder times, and build your routine.'
                : isSelectedPast
                ? `No medication doses were scheduled or logged on this date (${formattedSelectedDate}).`
                : `No doses logged yet for this upcoming date. Your daily routine will be active on ${formattedSelectedDate}.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {!isSelectedToday && (
              <button
                type="button"
                onClick={handleJumpToday}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F58B6] hover:bg-[#0c4897] text-white text-xs font-bold shadow-md shadow-blue-900/15 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Return to Today&apos;s Routine</span>
              </button>
            )}

            {isSelectedToday && onOpenUpload && (
              <button
                onClick={onOpenUpload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F58B6] hover:bg-[#0c4897] text-white text-xs font-bold shadow-md shadow-blue-900/15 active:scale-95 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Doctor Prescription</span>
              </button>
            )}

            {isSelectedToday && prescriptions.length > 0 && (
              <button
                onClick={() => setIsRoutineModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-[#0F58B6] dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800 active:scale-95 transition-all"
              >
                <Sliders className="w-4 h-4" />
                <span>Configure Routine from Prescriptions</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Routine & Reminder Customization Modal */}
      <RoutineReminderModal
        isOpen={isRoutineModalOpen}
        onClose={() => setIsRoutineModalOpen(false)}
        prescriptions={prescriptions}
        currentDoses={doses}
        onSave={handleSaveRoutine}
        userId={userId}
        targetDate={selectedDate}
      />
    </div>
  );
};
