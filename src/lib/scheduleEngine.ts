import { Medication, ScheduledDose, TimeOfDaySlot } from '@/types/prescription';

/**
 * Maps prescription frequency string to standard daily slots
 */
export function parseFrequencyToSlots(frequency: string): { slot: TimeOfDaySlot; time: string }[] {
  const norm = frequency.toLowerCase();

  // Three times daily (TDS / TID / 1-1-1)
  if (norm.includes('tds') || norm.includes('tid') || norm.includes('three') || norm.includes('1-1-1') || norm.includes('thrice')) {
    return [
      { slot: 'morning', time: '08:00 AM' },
      { slot: 'afternoon', time: '01:00 PM' },
      { slot: 'evening', time: '08:00 PM' },
    ];
  }

  // Twice daily (BD / BID / 1-0-1)
  if (norm.includes('bd') || norm.includes('bid') || norm.includes('twice') || norm.includes('1-0-1') || norm.includes('2 times')) {
    return [
      { slot: 'morning', time: '08:00 AM' },
      { slot: 'evening', time: '08:00 PM' },
    ];
  }

  // Four times daily (QDS / QID / 1-1-1-1)
  if (norm.includes('qds') || norm.includes('qid') || norm.includes('four') || norm.includes('1-1-1-1')) {
    return [
      { slot: 'morning', time: '07:30 AM' },
      { slot: 'afternoon', time: '12:30 PM' },
      { slot: 'evening', time: '06:00 PM' },
      { slot: 'bedtime', time: '10:00 PM' },
    ];
  }

  // Bedtime (HS / 0-0-1 / Night)
  if (norm.includes('hs') || norm.includes('bedtime') || norm.includes('night') || norm.includes('0-0-1')) {
    return [{ slot: 'bedtime', time: '10:00 PM' }];
  }

  // As needed (PRN / SOS)
  if (norm.includes('prn') || norm.includes('sos') || norm.includes('as needed') || norm.includes('when required')) {
    return [{ slot: 'as_needed', time: 'When required' }];
  }

  // Default: Once daily (OD / 1-0-0 / Morning)
  return [{ slot: 'morning', time: '08:00 AM' }];
}

/**
 * Generates daily scheduled doses for a list of medications on a specific date
 */
export function generateDailyDoses(
  prescriptionId: string,
  medications: Medication[],
  dateStr: string = new Date().toISOString().split('T')[0]
): ScheduledDose[] {
  const doses: ScheduledDose[] = [];

  medications.forEach((med) => {
    const slots = parseFrequencyToSlots(med.frequency);
    slots.forEach((s) => {
      doses.push({
        id: `${prescriptionId}-${med.id}-${s.slot}-${dateStr}`,
        prescriptionId,
        medicationId: med.id,
        medicationName: med.name,
        dosage: med.dosage,
        slot: s.slot,
        scheduledTime: s.time,
        timingNotes: med.timing ? med.timing.replace('_', ' ') : 'after food',
        instructions: med.instructions,
        status: 'pending',
        date: dateStr,
      });
    });
  });

  return doses;
}

/**
 * Calculate adherence metrics
 */
export function calculateAdherenceScore(doses: ScheduledDose[]): {
  adherenceRate: number;
  total: number;
  taken: number;
  pending: number;
  skipped: number;
} {
  if (doses.length === 0) {
    return { adherenceRate: 100, total: 0, taken: 0, pending: 0, skipped: 0 };
  }

  const taken = doses.filter((d) => d.status === 'taken').length;
  const skipped = doses.filter((d) => d.status === 'skipped').length;
  const pending = doses.filter((d) => d.status === 'pending' || d.status === 'snoozed').length;
  const total = doses.length;

  const adherenceRate = Math.round((taken / total) * 100);

  return { adherenceRate, total, taken, pending, skipped };
}

/**
 * Calculates days remaining of pill inventory and detects refill alerts
 */
export function checkRefillStatus(med: Medication): {
  isLow: boolean;
  daysRemaining: number;
  statusText: string;
} {
  const remaining = med.remainingPills ?? 15;
  const slots = parseFrequencyToSlots(med.frequency);
  const dailyPills = Math.max(1, slots.length);
  const daysRemaining = Math.floor(remaining / dailyPills);

  const threshold = med.refillThreshold ?? 4;
  const isLow = daysRemaining <= threshold;

  return {
    isLow,
    daysRemaining,
    statusText: isLow
      ? `Low Stock: ${daysRemaining} days left (${remaining} pills)`
      : `${daysRemaining} days remaining (${remaining} pills)`,
  };
}
