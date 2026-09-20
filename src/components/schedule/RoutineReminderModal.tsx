'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ScheduledDose, Prescription, TimeOfDaySlot, FamilyMemberRelation } from '@/types/prescription';
import { 
  X, 
  Bell, 
  Clock, 
  Pill, 
  Check, 
  RotateCcw, 
  CheckSquare,
  Square,
  Utensils, 
  Calendar,
  AlertCircle,
  Plus
} from 'lucide-react';
import { parseFrequencyToSlots } from '@/lib/scheduleEngine';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { subscribeToPushNotifications } from '@/lib/notifications';
import { cleanMedicineName } from '@/lib/deduplication';
import { getFamilyRelationBadge } from '@/lib/familyMembers';

interface RoutineReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescriptions: Prescription[];
  currentDoses: ScheduledDose[];
  onSave: (updatedDoses: ScheduledDose[]) => void;
  userId?: string;
  targetDate?: string;
}

interface RoutineItem {
  id: string;
  prescriptionId: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  slot: TimeOfDaySlot;
  scheduledTime: string; // e.g. "08:00 AM"
  timingNotes: string;
  instructions: string;
  selected: boolean;
  reminderEnabled: boolean;
  status: 'pending' | 'taken' | 'skipped' | 'snoozed';
  takenAt?: string;
  date: string;
  repeatDays?: string[]; // e.g. ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  familyMember?: FamilyMemberRelation;
  patientName?: string;
}

const SLOT_OPTIONS: { slot: TimeOfDaySlot; label: string; defaultTime: string }[] = [
  { slot: 'morning', label: 'Morning', defaultTime: '08:00 AM' },
  { slot: 'afternoon', label: 'Afternoon', defaultTime: '01:00 PM' },
  { slot: 'evening', label: 'Evening', defaultTime: '07:30 PM' },
  { slot: 'bedtime', label: 'Bedtime / Night', defaultTime: '10:00 PM' },
  { slot: 'as_needed', label: 'As Needed (SOS)', defaultTime: 'On Symptom' },
];

const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'M',
  tue: 'T',
  wed: 'W',
  thu: 'Th',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

function parse12HourParts(timeStr: string) {
  const match = (timeStr || '08:00 AM').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return { hour: '08', minute: '00', ampm: 'AM' };
  let hourNum = parseInt(match[1], 10);
  const minute = match[2];
  let ampm = (match[3] || '').toUpperCase();
  if (!ampm) {
    ampm = hourNum >= 12 ? 'PM' : 'AM';
    hourNum = hourNum % 12 || 12;
  }
  const hour = String(hourNum).padStart(2, '0');
  return { hour, minute, ampm: ampm === 'PM' ? 'PM' : 'AM' };
}

function to24HourString(timeStr: string): string {
  const { hour, minute, ampm } = parse12HourParts(timeStr);
  let h = parseInt(hour, 10);
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${minute}`;
}

function from24HourString(time24: string): string {
  const parts = time24.split(':');
  if (parts.length < 2) return '08:00 AM';
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

/**
 * Interactive Clock Time Picker Component
 * Provides a dedicated visual clock popup with hour/minute dial buttons,
 * AM/PM toggles, and OS native clock picker integration.
 */
const ClockTimePicker: React.FC<{
  timeStr: string;
  onChange: (newTime: string) => void;
  id?: string;
}> = ({ timeStr, onChange, id }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  const { hour, minute, ampm } = parse12HourParts(timeStr);
  const time24 = to24HourString(timeStr);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleHourSelect = (h: string) => {
    const formattedHour = String(parseInt(h, 10)).padStart(2, '0');
    onChange(`${formattedHour}:${minute} ${ampm}`);
  };

  const handleMinuteSelect = (m: string) => {
    onChange(`${hour}:${m} ${ampm}`);
  };

  const handleAmPmToggle = (newAmPm: 'AM' | 'PM') => {
    onChange(`${hour}:${minute} ${newAmPm}`);
  };

  const handleNativeTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      onChange(from24HourString(val));
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Visual Clock Display and Trigger */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          id={id}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 text-slate-900 dark:text-white transition-all text-xs font-mono font-bold shadow-xs group"
          title="Click to open interactive clock"
        >
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#0F58B6] dark:text-blue-400 group-hover:rotate-12 transition-transform" />
            <span className="tracking-wide">{timeStr || '08:00 AM'}</span>
          </div>
          <span className="text-[10px] text-[#0F58B6] dark:text-blue-400 font-sans font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900">
            Set Clock ⏱
          </span>
        </button>

        {/* Native HTML5 Clock Input for Mobile & Desktop Native Dialogs */}
        <input
          type="time"
          value={time24}
          onChange={handleNativeTimeChange}
          aria-label="Set clock time"
          className="w-8 h-8 p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer text-xs"
          title="Open system clock dial"
        />
      </div>

      {/* Visual Clock Dial Panel */}
      {isOpen && (
        <div className="mt-2 w-full p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/90 border border-blue-200 dark:border-blue-800 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Clock className="w-3.5 h-3.5 text-[#0F58B6] dark:text-blue-400" />
              <span>Select Exact Time</span>
            </div>
            {/* AM / PM Selector */}
            <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => handleAmPmToggle('AM')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  ampm === 'AM'
                    ? 'bg-[#0F58B6] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => handleAmPmToggle('PM')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  ampm === 'PM'
                    ? 'bg-[#0F58B6] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Hour Buttons (1 to 12) */}
          <div className="mb-2">
            <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1">
              Hour
            </span>
            <div className="grid grid-cols-6 gap-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((h) => {
                const isSelected = parseInt(hour, 10) === parseInt(h, 10);
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleHourSelect(h)}
                    className={`py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      isSelected
                        ? 'bg-[#0F58B6] text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Minute Buttons */}
          <div className="mb-2.5">
            <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1">
              Minute
            </span>
            <div className="grid grid-cols-4 gap-1">
              {['00', '15', '30', '45'].map((m) => {
                const isSelected = minute === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMinuteSelect(m)}
                    className={`py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      isSelected
                        ? 'bg-[#0F58B6] text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    :{m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Presets and Confirmation */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-mono font-extrabold text-[#0F58B6] dark:text-blue-400">
              {hour}:{minute} {ampm}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-lg bg-[#0F58B6] text-white text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const RoutineReminderModal: React.FC<RoutineReminderModalProps> = ({
  isOpen,
  onClose,
  prescriptions,
  currentDoses,
  onSave,
  userId,
  targetDate,
}) => {
  useBodyScrollLock(isOpen);
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const hasInitializedRef = React.useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, [isOpen]);

  // ─── Timezone-safe local date helper ────────────────────────────────────────
  // IMPORTANT: new Date().toISOString() returns UTC time and causes a date-drift
  // bug in IST (UTC+5:30) where Sep 9 11 PM IST is reported as Sep 8 in UTC.
  // This helper always returns the LOCAL calendar date as YYYY-MM-DD.
  const getLocalToday = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Initialize or re-populate items when modal opens
  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      return;
    }

    // Protect active user selections while modal is currently open
    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;
    setSaveSuccess(false);

    // Use targetDate if provided, else timezone-safe local today
    const effectiveDate = targetDate || getLocalToday();
    const initialItems: RoutineItem[] = [];

    // Filter currentDoses strictly to effectiveDate to prevent past dates from masquerading as today's routine!
    const targetDoses = currentDoses.filter((d) => d.date === effectiveDate);

    // Collect all medications from prescriptions and deduplicate by clinical medicine name
    const allPrescriptionMeds: Array<{ med: any; rx: Prescription }> = [];
    prescriptions.forEach((rx) => {
      (rx.medications || []).forEach((m) => {
        allPrescriptionMeds.push({ med: m, rx });
      });
    });

    const uniqueMedMap = new Map<string, { med: any; rx: Prescription }>();
    allPrescriptionMeds.forEach((item) => {
      const cleanName = cleanMedicineName(item.med.name);
      if (!cleanName) return;
      const family = item.rx.familyMember || 'self';
      const patient = item.rx.patientName || '';
      // Distinct key includes family member and patient name so different members taking same tablet are distinct!
      const uniqueKey = `${family}:::${patient}:::${cleanName}`;
      if (!uniqueMedMap.has(uniqueKey)) {
        uniqueMedMap.set(uniqueKey, item);
      } else {
        // Prefer medication with richer instructions/timing
        const existing = uniqueMedMap.get(uniqueKey)!;
        const existScore = (existing.med.dosage ? 1 : 0) + (existing.med.frequency ? 1 : 0) + (existing.med.instructions ? 1 : 0);
        const newScore = (item.med.dosage ? 1 : 0) + (item.med.frequency ? 1 : 0) + (item.med.instructions ? 1 : 0);
        if (newScore > existScore) {
          uniqueMedMap.set(uniqueKey, item);
        }
      }
    });

    const consumedDoseIds = new Set<string>();

    // For each unique medication per family member:
    uniqueMedMap.forEach(({ med, rx }) => {
      const cleanName = cleanMedicineName(med.name);
      const rxFamily = rx.familyMember || 'self';
      const rxPatient = rx.patientName || '';

      // Check if user already configured routine dose(s) on effectiveDate for this specific family member & medicine
      const configuredDoses = targetDoses.filter((d) => {
        const doseFamily = d.familyMember || 'self';
        const samePerson = doseFamily === rxFamily;
        return (
          samePerson &&
          (d.medicationId === med.id || cleanMedicineName(d.medicationName) === cleanName)
        );
      });

      if (configuredDoses.length > 0) {
        // User already has configured routine dose(s) for this medicine on effectiveDate
        configuredDoses.forEach((d) => {
          consumedDoseIds.add(d.id);
          initialItems.push({
            id: d.id,
            prescriptionId: rx.id,
            medicationId: med.id,
            medicationName: d.medicationName || med.name,
            dosage: d.dosage || med.dosage,
            slot: ((d.slot as string) === 'night' ? 'bedtime' : d.slot) as TimeOfDaySlot,
            scheduledTime: d.scheduledTime,
            timingNotes: d.timingNotes || 'after food',
            instructions: d.instructions || med.instructions || '',
            selected: true,
            reminderEnabled: d.reminderEnabled !== false,
            status: d.status || 'pending',
            takenAt: d.takenAt,
            date: effectiveDate,
            repeatDays: d.repeatDays && d.repeatDays.length > 0 ? d.repeatDays : [...ALL_DAYS],
            familyMember: rxFamily,
            patientName: rxPatient || d.patientName,
          });
        });
      } else {
        // Not yet configured for this date — starts completely UNSELECTED
        const parsedSlots = parseFrequencyToSlots(med.frequency);
        const defaultSlot = parsedSlots[0]?.slot || 'morning';
        const defaultTime = parsedSlots[0]?.time || (SLOT_OPTIONS.find((s) => s.slot === defaultSlot)?.defaultTime || '08:00 AM');

        initialItems.push({
          id: `${rx.id}-${med.id}-${defaultSlot}-${effectiveDate}`,
          prescriptionId: rx.id,
          medicationId: med.id,
          medicationName: med.name,
          dosage: med.dosage,
          slot: defaultSlot,
          scheduledTime: defaultTime,
          timingNotes: med.timing ? med.timing.replace('_', ' ') : 'after food',
          instructions: med.instructions || '',
          selected: false, // User must choose to select!
          reminderEnabled: true,
          status: 'pending',
          date: effectiveDate,
          repeatDays: [...ALL_DAYS],
          familyMember: rxFamily,
          patientName: rxPatient,
        });
      }
    });

    // Add any remaining doses from targetDoses that didn't match any active prescription
    targetDoses.forEach((d) => {
      if (!consumedDoseIds.has(d.id)) {
        initialItems.push({
          id: d.id,
          prescriptionId: d.prescriptionId,
          medicationId: d.medicationId,
          medicationName: d.medicationName,
          dosage: d.dosage,
          slot: ((d.slot as string) === 'night' ? 'bedtime' : d.slot) as TimeOfDaySlot,
          scheduledTime: d.scheduledTime,
          timingNotes: d.timingNotes || 'after food',
          instructions: d.instructions || '',
          selected: true,
          reminderEnabled: d.reminderEnabled !== false,
          status: d.status,
          takenAt: d.takenAt,
          date: effectiveDate,
          repeatDays: d.repeatDays && d.repeatDays.length > 0 ? d.repeatDays : [...ALL_DAYS],
          familyMember: d.familyMember || 'self',
          patientName: d.patientName,
        });
      }
    });

    setItems(initialItems);
  }, [isOpen, prescriptions, currentDoses, targetDate]);

  const handleAddSlot = (cleanMedKey: string, baseItem: RoutineItem) => {
    const usedSlots = items
      .filter((i) => cleanMedicineName(i.medicationName) === cleanMedKey)
      .map((i) => i.slot);

    const available = SLOT_OPTIONS.filter((s) => !usedSlots.includes(s.slot));
    const nextSlot = available[0] || SLOT_OPTIONS[0];

    const newItem: RoutineItem = {
      id: `${baseItem.prescriptionId}-${baseItem.medicationId}-${nextSlot.slot}-${Date.now()}`,
      prescriptionId: baseItem.prescriptionId,
      medicationId: baseItem.medicationId,
      medicationName: baseItem.medicationName,
      dosage: baseItem.dosage,
      slot: nextSlot.slot,
      scheduledTime: nextSlot.defaultTime,
      timingNotes: baseItem.timingNotes,
      instructions: baseItem.instructions,
      selected: true,
      reminderEnabled: true,
      status: 'pending',
      date: baseItem.date,
      repeatDays: [...(baseItem.repeatDays || ALL_DAYS)],
      familyMember: baseItem.familyMember,
      patientName: baseItem.patientName,
    };

    setItems((prev) => {
      let lastIndex = -1;
      for (let idx = 0; idx < prev.length; idx++) {
        if (cleanMedicineName(prev[idx].medicationName) === cleanMedKey) {
          lastIndex = idx;
        }
      }
      const next = [...prev];
      if (lastIndex >= 0) {
        next.splice(lastIndex + 1, 0, newItem);
      } else {
        next.push(newItem);
      }
      return next;
    });
  };

  const handleRemoveSlot = (indexToRemove: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleToggleSelected = (index: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index].selected = !next[index].selected;
      return next;
    });
  };

  const handleToggleAll = (selectState: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: selectState })));
  };

  const handleToggleReminder = (index: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index].reminderEnabled = !next[index].reminderEnabled;
      return next;
    });
  };

  const handleTimeChange = (index: number, newTime: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index].scheduledTime = newTime;
      return next;
    });
  };

  const handleSlotChange = (index: number, newSlot: TimeOfDaySlot) => {
    setItems((prev) => {
      const next = [...prev];
      const targetSlot = SLOT_OPTIONS.find((s) => s.slot === newSlot);
      next[index].slot = newSlot;
      if (targetSlot && !next[index].scheduledTime) {
        next[index].scheduledTime = targetSlot.defaultTime;
      }
      return next;
    });
  };

  const handleTimingNotesChange = (index: number, newTiming: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index].timingNotes = newTiming;
      return next;
    });
  };

  const handleToggleDay = (index: number, dayKey: string) => {
    setItems((prev) => {
      const next = [...prev];
      const cur = next[index].repeatDays || [...ALL_DAYS];
      let updated: string[];
      if (cur.includes(dayKey)) {
        updated = cur.filter((d) => d !== dayKey);
        if (updated.length === 0) updated = [dayKey]; // Keep at least one day
      } else {
        updated = [...cur, dayKey];
      }
      next[index].repeatDays = updated;
      return next;
    });
  };

  const handleToggleDaily = (index: number) => {
    setItems((prev) => {
      const next = [...prev];
      const isAll = (next[index].repeatDays || []).length === ALL_DAYS.length;
      next[index].repeatDays = isAll ? ['mon', 'wed', 'fri'] : [...ALL_DAYS];
      return next;
    });
  };

  const handleResetDefaults = () => {
    // Immediately clear ALL routine doses — deselect all and persist [] to MongoDB right now.
    // User does not need to click Save separately after Reset.
    setItems((prev) => prev.map((item) => ({ ...item, selected: false })));
    onSave([]);
    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSave = async () => {
    // Use targetDate if provided, else timezone-safe local today
    const effectiveDate = targetDate || getLocalToday();
    const selectedDoses: ScheduledDose[] = items
      .filter((item) => item.selected)
      .map((item) => ({
        id: item.id || `${item.prescriptionId}-${item.medicationId}-${item.slot}-${effectiveDate}`,
        prescriptionId: item.prescriptionId,
        medicationId: item.medicationId,
        medicationName: item.medicationName,
        dosage: item.dosage,
        slot: item.slot,
        scheduledTime: item.scheduledTime,
        timingNotes: item.timingNotes,
        instructions: item.instructions,
        status: item.status,
        takenAt: item.takenAt,
        date: effectiveDate,
        reminderEnabled: item.reminderEnabled,
        repeatDays: item.repeatDays && item.repeatDays.length > 0 ? item.repeatDays : [...ALL_DAYS],
        familyMember: item.familyMember || 'self',
        patientName: item.patientName,
      }));

    if (items.some((i) => i.selected && i.reminderEnabled)) {
      if (typeof window !== 'undefined') {
        if ('Notification' in window && Notification.permission === 'default') {
          try {
            const res = await Notification.requestPermission();
            setNotifPermission(res);
          } catch {}
        }
        if (userId) {
          subscribeToPushNotifications(userId, selectedDoses).catch((err) => {
            console.warn('Push subscription background registration warning:', err);
          });
        }
      }
    }

    onSave(selectedDoses);
    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const uniqueMedicineNames = useMemo(() => {
    return Array.from(new Set(items.map((i) => cleanMedicineName(i.medicationName))));
  }, [items]);

  const selectedUniqueMedicines = useMemo(() => {
    return Array.from(
      new Set(
        items
          .filter((i) => i.selected)
          .map((i) => cleanMedicineName(i.medicationName))
      )
    );
  }, [items]);

  const selectedCount = selectedUniqueMedicines.length;
  const totalMedicinesCount = uniqueMedicineNames.length;
  const remindersCount = items.filter((i) => i.selected && i.reminderEnabled).length;
  const allSelected = items.length > 0 && items.every((i) => i.selected);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
      data-lenis-prevent="true"
    >
      <div 
        id="routine-reminders-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-modal-title"
        data-lenis-prevent="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-[#0F58B6] dark:text-blue-400 shadow-sm flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 id="routine-modal-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Customize Routine &amp; Reminders
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                <Calendar className="w-3 h-3 text-[#0F58B6] dark:text-blue-400 flex-shrink-0" />
                <span className="font-semibold text-[#0F58B6] dark:text-blue-400">
                  {(() => {
                    const effectiveDate = targetDate || getLocalToday();
                    const [y, m, dayNum] = effectiveDate.split('-').map(Number);
                    const d = new Date(y, (m || 1) - 1, dayNum || 1);
                    return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
                  })()}
                </span>
                <span className="text-slate-400 dark:text-slate-500">
                  {targetDate && targetDate !== getLocalToday()
                    ? `— Setting routine for ${(() => {
                        const [y, m, dayNum] = targetDate.split('-').map(Number);
                        const d = new Date(y, (m || 1) - 1, dayNum || 1);
                        return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
                      })()}`
                    : '— Setting routine for today'}
                </span>
              </p>
            </div>
          </div>

          <button
            id="close-routine-reminders-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Push Notification Permission Banner */}
        {notifPermission !== 'granted' && (
          <div className="px-4 sm:px-6 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3 text-xs flex-shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>
                Enable notifications so reminder alarms ring even when the app or browser is closed.
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (typeof window !== 'undefined' && 'Notification' in window) {
                  try {
                    const res = await Notification.requestPermission();
                    setNotifPermission(res);
                  } catch {}
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] whitespace-nowrap shadow-sm active:scale-95 transition-all"
            >
              Enable Alerts
            </button>
          </div>
        )}

        {/* Action Controls Subheader */}
        <div className="flex items-center justify-between flex-wrap gap-2 px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Active in Routine: <strong className="text-[#0F58B6] dark:text-blue-400">{selectedCount}</strong> / {totalMedicinesCount} Medicines
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Bell className="w-3.5 h-3.5 text-blue-500" />
              {remindersCount} Reminders
            </span>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => handleToggleAll(!allSelected)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700"
              >
                {allSelected ? (
                  <>
                    <Square className="w-3 h-3 text-slate-400" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3 h-3 text-[#0F58B6]" />
                    <span>Select All</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800"
              title="Clear all routine doses and close"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset &amp; Clear All</span>
            </button>
          </div>
        </div>

        {/* Content Body with Working Native Scroll */}
        <div 
          id="routine-modal-scroll-container"
          className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 space-y-3.5 overscroll-contain"
          data-lenis-prevent="true"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {items.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0F58B6] flex items-center justify-center">
                <Pill className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Prescribed Medications Found</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Upload an active prescription to select medications and configure your personalized daily routine.
                </p>
              </div>
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id || idx}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  item.selected
                    ? 'bg-white dark:bg-slate-800/80 border-blue-200 dark:border-blue-900/60 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Select Checkbox & Medicine Name */}
                  <div 
                    className="flex items-start gap-3 cursor-pointer select-none"
                    onClick={() => handleToggleSelected(idx)}
                  >
                    <input
                      type="checkbox"
                      id={`select-med-${idx}`}
                      checked={item.selected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleSelected(idx);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 w-4 h-4 rounded text-[#0F58B6] focus:ring-blue-500 border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                    />
                    <div>
                      {/* Family Member & Patient Badge */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {(() => {
                          const badge = getFamilyRelationBadge(item.familyMember || 'self');
                          const label = item.familyMember === 'other' && item.patientName ? item.patientName : badge.label;
                          return (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${badge.badgeBg}`}>
                              <span>{badge.icon}</span>
                              <span>{label}</span>
                              {item.patientName && <span className="font-semibold text-slate-700 dark:text-slate-200">({item.patientName})</span>}
                            </span>
                          );
                        })()}
                      </div>
                      <span 
                        className="text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 transition-colors"
                      >
                        {item.medicationName}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0F58B6] dark:text-blue-400 font-mono font-bold border border-blue-200 dark:border-blue-800/40">
                          {item.dosage}
                        </span>
                        {item.instructions && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                            {item.instructions}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notification Reminder Toggle */}
                  {item.selected && (
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleToggleReminder(idx)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          item.reminderEnabled
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-[#0F58B6] dark:text-blue-400 border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                        }`}
                        title={item.reminderEnabled ? 'Notification reminder is active' : 'Notification reminder is muted'}
                      >
                        <Bell className={`w-3.5 h-3.5 ${item.reminderEnabled ? 'fill-blue-500 text-blue-500' : ''}`} />
                        <span>{item.reminderEnabled ? 'Remind Me' : 'Muted'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Config Controls (Slot, Time, Timing Notes) */}
                {item.selected && (
                  <>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Slot Selector */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          Routine Slot
                        </label>
                        <select
                          value={item.slot}
                          onChange={(e) => handleSlotChange(idx, e.target.value as TimeOfDaySlot)}
                          className="w-full text-xs font-medium px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {SLOT_OPTIONS.map((slot) => (
                            <option key={slot.slot} value={slot.slot}>
                              {slot.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Reminder Time & Visual Clock */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          Reminder Time &amp; Clock
                        </label>
                        <ClockTimePicker
                          id={`clock-picker-input-${idx}`}
                          timeStr={item.scheduledTime}
                          onChange={(newTime) => handleTimeChange(idx, newTime)}
                        />
                      </div>

                      {/* Timing Notes */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          Meal Timing
                        </label>
                        <select
                          value={item.timingNotes}
                          onChange={(e) => handleTimingNotesChange(idx, e.target.value)}
                          className="w-full text-xs font-medium px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="after food">After Food</option>
                          <option value="before food">Before Food</option>
                          <option value="with food">With Food</option>
                          <option value="anytime">Anytime / As Needed</option>
                        </select>
                      </div>
                    </div>

                    {/* Alarm Repeat Schedule: Daily + M, T, W, Th, Fri, Sat, Sun */}
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/60">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Repeat Alarm Schedule
                          </label>
                          <span className="text-[11px] text-[#0F58B6] dark:text-blue-400 font-semibold">
                            {(() => {
                              const days = item.repeatDays || [...ALL_DAYS];
                              if (days.length === 7) return 'Daily (Every day)';
                              if (days.length === 5 && !days.includes('sat') && !days.includes('sun')) return 'Weekdays (Mon-Fri)';
                              if (days.length === 2 && days.includes('sat') && days.includes('sun')) return 'Weekends (Sat-Sun)';
                              return days.map((d) => DAY_LABELS[d] || d).join(', ');
                            })()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleDaily(idx)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                              (item.repeatDays || []).length === ALL_DAYS.length
                                ? 'bg-[#0F58B6] text-white border-blue-700 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            Daily
                          </button>
                          {ALL_DAYS.map((dayKey) => {
                            const isSelected = (item.repeatDays || [...ALL_DAYS]).includes(dayKey);
                            return (
                              <button
                                key={dayKey}
                                type="button"
                                onClick={() => handleToggleDay(idx, dayKey)}
                                className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all border ${
                                  isSelected
                                    ? 'bg-[#0F58B6] text-white border-blue-700 shadow-xs'
                                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700'
                                }`}
                                title={dayKey.toUpperCase()}
                              >
                                {DAY_LABELS[dayKey]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Add / Remove Multiple Slot Controls */}
                    <div className="mt-2.5 pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddSlot(cleanMedicineName(item.medicationName), item)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-[#0F58B6] dark:text-blue-400 text-[11px] font-bold border border-blue-200 dark:border-blue-800 transition-all active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add another dose time</span>
                      </button>

                      {items.filter((i) => cleanMedicineName(i.medicationName) === cleanMedicineName(item.medicationName)).length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(idx)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-700 px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-auto"
                        >
                          <X className="w-3 h-3" />
                          <span>Remove this time slot</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-shrink-0 z-10">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            {saveSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center sm:justify-start gap-1.5">
                <Check className="w-4 h-4" />
                Routine and reminders saved!
              </span>
            ) : (
              <span>Only selected medicines will be active in your daily routine.</span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              id="save-routine-reminders-btn"
              onClick={handleSave}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F58B6] hover:bg-[#0c4897] text-white text-xs font-bold shadow-md shadow-blue-900/15 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save Schedule &amp; Reminders</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
