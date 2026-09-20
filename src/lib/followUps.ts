import { Prescription } from '@/types/prescription';
import { getStoredPrescriptions } from '@/lib/storage';

export interface FollowUpItem {
  id: string;
  prescriptionId: string;
  prescription: Prescription;
  doctorName: string;
  clinicOrHospital: string;
  followUpDate: string;
  formattedDate: string;
  daysDifference: number;
  status: 'today' | 'upcoming' | 'overdue';
  label: string;
}

/**
 * Normalizes various date string formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, ISO)
 * into a valid Date object set to local midnight.
 */
function parseDateToMidnight(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  if (!clean) return null;

  // Format 1: YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  // Format 2: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  // Format 3: Standard JS parse
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
  }

  return null;
}

/**
 * Scans stored prescriptions for any with a followUpDate in the future
 * or recently passed (within the last 14 days to highlight overdue visits).
 * Results are sorted soonest-first (overdue first, then today, then upcoming).
 */
export function getUpcomingFollowUps(userId?: string): FollowUpItem[] {
  const allPrescriptions = getStoredPrescriptions(userId);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const oneDayMs = 24 * 60 * 60 * 1000;

  const items: FollowUpItem[] = [];

  for (const rx of allPrescriptions) {
    // Check prescription level followUpDate first, or latest doctor visit nextFollowUpDate
    const rawFollowUp =
      rx.followUpDate ||
      (rx.doctorVisits && rx.doctorVisits.length > 0
        ? rx.doctorVisits.find((v) => v.nextFollowUpDate)?.nextFollowUpDate
        : undefined);

    if (!rawFollowUp) continue;

    const followUpMidnight = parseDateToMidnight(rawFollowUp);
    if (!followUpMidnight) continue;

    // Difference in whole calendar days (positive = future, negative = overdue)
    const diffDays = Math.round((followUpMidnight.getTime() - todayMidnight.getTime()) / oneDayMs);

    // Filter out overdue dates older than 14 days to avoid cluttering with obsolete records
    if (diffDays < -14) continue;

    let status: 'today' | 'upcoming' | 'overdue';
    let label: string;

    if (diffDays < 0) {
      status = 'overdue';
      const absDays = Math.abs(diffDays);
      label = absDays === 1 ? 'Overdue by 1 day' : `Overdue by ${absDays} days`;
    } else if (diffDays === 0) {
      status = 'today';
      label = 'Today';
    } else if (diffDays === 1) {
      status = 'upcoming';
      label = 'Tomorrow';
    } else {
      status = 'upcoming';
      label = `In ${diffDays} days`;
    }

    const formattedDate = followUpMidnight.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    items.push({
      id: `followup-${rx.id}-${rawFollowUp}`,
      prescriptionId: rx.id,
      prescription: rx,
      doctorName: rx.doctorName || 'Attending Physician',
      clinicOrHospital: rx.clinicOrHospital || 'Clinic / Hospital',
      followUpDate: rawFollowUp,
      formattedDate,
      daysDifference: diffDays,
      status,
      label,
    });
  }

  // Sort soonest-first (overdue -> today -> tomorrow -> upcoming)
  items.sort((a, b) => a.daysDifference - b.daysDifference);

  return items;
}
