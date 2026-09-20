/**
 * adherence.ts
 * -----------
 * Pure logic for computing medication adherence metrics from existing
 * ScheduledDose records. No AI, no storage writes, no side effects.
 *
 * All exported types are co-located here to keep the module self-contained
 * without circularly importing from types/prescription.ts.
 */

import { ScheduledDose } from '@/types/prescription';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type AdherencePeriod = 'today' | 'week' | 'month';

export interface MedAdherenceRow {
  medicationId: string;
  medicationName: string;
  /** 0–100 */
  rate: number;
  taken: number;
  scheduled: number;
  skipped: number;
  /** Sorted most-recent first */
  missedDoses: MissedDose[];
}

export interface MissedDose {
  date: string;         // YYYY-MM-DD
  medicationName: string;
  scheduledTime: string;
  slot: string;
}

export interface DayAdherence {
  date: string;         // YYYY-MM-DD (label)
  dayLabel: string;     // e.g. "Mon"
  taken: number;
  scheduled: number;
  /** 0–100 */
  rate: number;
}

export interface AdherenceReport {
  period: AdherencePeriod;
  /** Resolved date range (YYYY-MM-DD, inclusive) used for the report */
  fromDate: string;
  toDate: string;
  /** 0–100 overall adherence rate */
  overallRate: number;
  taken: number;
  scheduled: number;
  skipped: number;
  /** pending doses from past dates that were never logged (counts as missed) */
  unloggedPast: number;
  /** Per-medication breakdown, sorted by worst adherence first */
  perMedication: MedAdherenceRow[];
  /** All missed doses (skipped + unlogged-past), most recent first */
  allMissedDoses: MissedDose[];
  /** Per-calendar-day data for bar chart, oldest first */
  dailyTrend: DayAdherence[];
  currentStreakDays: number;
  bestStreakDays: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns today's date string YYYY-MM-DD in local time */
function todayStr(): string {
  const d = new Date();
  return localDateStr(d);
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns an array of YYYY-MM-DD strings for the last N calendar days (inclusive today) */
function lastNDays(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(localDateStr(d));
  }
  return dates;
}

/** Short day label (Mon, Tue, …) */
function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

/**
 * A dose is "missed" if:
 *   - status === 'skipped', OR
 *   - status === 'pending' or 'snoozed' AND date < today (unresolved past dose)
 */
function isMissed(dose: ScheduledDose, today: string): boolean {
  if (dose.status === 'skipped') return true;
  if ((dose.status === 'pending' || dose.status === 'snoozed') && dose.date < today) return true;
  return false;
}

/**
 * A dose counts toward "scheduled" only if it belongs to a past or present
 * date (not a future date). Pending future doses aren't owed yet.
 */
function isCountable(dose: ScheduledDose, today: string): boolean {
  return dose.date <= today;
}

// ---------------------------------------------------------------------------
// Streak computation from raw dose history
// ---------------------------------------------------------------------------

/**
 * Computes current + best consecutive-day streak from dose history.
 * A day "passes" when at least one dose was taken on that day.
 * Only considers days up to and including today.
 */
export function computeStreak(doses: ScheduledDose[]): {
  currentStreakDays: number;
  bestStreakDays: number;
} {
  const today = todayStr();

  // Build a set of dates on which ≥1 dose was taken
  const takenDates = new Set<string>();
  doses.forEach((d) => {
    if (d.status === 'taken' && d.date <= today) {
      takenDates.add(d.date);
    }
  });

  if (takenDates.size === 0) return { currentStreakDays: 0, bestStreakDays: 0 };

  // Sort unique taken dates ascending
  const sorted = Array.from(takenDates).sort();

  let best = 0;
  let current = 1;
  let runningBest = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00');
    const curr = new Date(sorted[i] + 'T00:00:00');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
    if (diffDays === 1) {
      runningBest++;
    } else {
      best = Math.max(best, runningBest);
      runningBest = 1;
    }
  }
  best = Math.max(best, runningBest);

  // Current streak: walk backward from today
  const todayDate = new Date(today + 'T00:00:00');
  current = 0;
  let cursor = new Date(todayDate);
  while (takenDates.has(localDateStr(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { currentStreakDays: current, bestStreakDays: best };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * computeAdherenceReport
 * ----------------------
 * Computes a full adherence report for the given period from dose history.
 * Pure function — safe to call on every render.
 */
export function computeAdherenceReport(
  allDoses: ScheduledDose[],
  period: AdherencePeriod
): AdherenceReport {
  const today = todayStr();

  // 1. Resolve date range
  let periodDates: string[];
  if (period === 'today') {
    periodDates = [today];
  } else if (period === 'week') {
    periodDates = lastNDays(7);
  } else {
    periodDates = lastNDays(30);
  }

  const fromDate = periodDates[0];
  const toDate = periodDates[periodDates.length - 1];

  // 2. Filter doses to period (only countable ones — date ≤ today within range)
  const inPeriod = allDoses.filter(
    (d) => d.date >= fromDate && d.date <= toDate && isCountable(d, today)
  );

  // 3. Overall aggregates
  const taken = inPeriod.filter((d) => d.status === 'taken').length;
  const skipped = inPeriod.filter((d) => d.status === 'skipped').length;
  const unloggedPast = inPeriod.filter(
    (d) => (d.status === 'pending' || d.status === 'snoozed') && d.date < today
  ).length;
  const scheduled = inPeriod.length;
  const overallRate = scheduled > 0 ? Math.round((taken / scheduled) * 100) : 0;

  // 4. All missed doses (most-recent first)
  const allMissedDoses: MissedDose[] = inPeriod
    .filter((d) => isMissed(d, today))
    .sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.scheduledTime.localeCompare(a.scheduledTime);
    })
    .map((d) => ({
      date: d.date,
      medicationName: d.medicationName,
      scheduledTime: d.scheduledTime,
      slot: d.slot,
    }));

  // 5. Per-medication breakdown
  const medMap = new Map<
    string,
    { name: string; doses: ScheduledDose[] }
  >();
  inPeriod.forEach((d) => {
    if (!medMap.has(d.medicationId)) {
      medMap.set(d.medicationId, { name: d.medicationName, doses: [] });
    }
    medMap.get(d.medicationId)!.doses.push(d);
  });

  const perMedication: MedAdherenceRow[] = Array.from(medMap.entries())
    .map(([medicationId, { name, doses }]) => {
      const mTaken = doses.filter((d) => d.status === 'taken').length;
      const mSkipped = doses.filter((d) => d.status === 'skipped').length;
      const mScheduled = doses.length;
      const mRate = mScheduled > 0 ? Math.round((mTaken / mScheduled) * 100) : 0;
      const mMissed: MissedDose[] = doses
        .filter((d) => isMissed(d, today))
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((d) => ({
          date: d.date,
          medicationName: d.medicationName,
          scheduledTime: d.scheduledTime,
          slot: d.slot,
        }));
      return {
        medicationId,
        medicationName: name,
        rate: mRate,
        taken: mTaken,
        scheduled: mScheduled,
        skipped: mSkipped,
        missedDoses: mMissed,
      };
    })
    .sort((a, b) => a.rate - b.rate); // worst adherence first

  // 6. Per-day trend for chart
  const dailyTrend: DayAdherence[] = periodDates
    .filter((date) => date <= today)
    .map((date) => {
      const dayDoses = allDoses.filter((d) => d.date === date);
      const dTaken = dayDoses.filter((d) => d.status === 'taken').length;
      const dScheduled = dayDoses.length;
      return {
        date,
        dayLabel: dayLabel(date),
        taken: dTaken,
        scheduled: dScheduled,
        rate: dScheduled > 0 ? Math.round((dTaken / dScheduled) * 100) : 0,
      };
    });

  // 7. Streak
  const { currentStreakDays, bestStreakDays } = computeStreak(allDoses);

  return {
    period,
    fromDate,
    toDate,
    overallRate,
    taken,
    scheduled,
    skipped,
    unloggedPast,
    perMedication,
    allMissedDoses,
    dailyTrend,
    currentStreakDays,
    bestStreakDays,
  };
}
