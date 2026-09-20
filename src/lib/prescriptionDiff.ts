import { Prescription, Medication } from '@/types/prescription';
import stringSimilarity from 'string-similarity';

export interface PrescriptionChange {
  medicineName: string;
  field: 'dosage' | 'frequency' | 'timing' | 'duration' | 'instructions';
  oldValue: string;
  newValue: string;
  needsVerification?: boolean;
  verificationNote?: string;
}

export interface MatchedMedicineInfo {
  oldMedicineName: string;
  newMedicineName: string;
  similarity: number;
  needsVerification: boolean;
}

export interface PatientMismatchNotice {
  isMismatch: boolean;
  oldPatientName: string;
  newPatientName: string;
  message: string;
}

export interface PrescriptionDiffResult {
  added: Medication[];
  removed: Medication[];
  changed: PrescriptionChange[];
  unchanged: Medication[];
  matchedPairs: MatchedMedicineInfo[];
  patientMismatch?: PatientMismatchNotice;
}

export { cleanMedicineName } from './deduplication';
import { cleanMedicineName } from './deduplication';

/**
 * Compares two saved prescription records and computes a neutral clinical diff:
 * - added: medicines only in the new prescription
 * - removed: medicines only in the old prescription
 * - changed: medicines present in both with field-level modifications
 * - unchanged: medicines identical in both
 * 
 * Matches medicines with fuzzy string matching (threshold >= 0.85).
 * Flags matches with similarity < 0.95 as "verify manually".
 */
export function comparePrescriptions(
  oldRx: Prescription,
  newRx: Prescription,
  threshold: number = 0.82
): PrescriptionDiffResult {
  const added: Medication[] = [];
  const removed: Medication[] = [];
  const changed: PrescriptionChange[] = [];
  const unchanged: Medication[] = [];
  const matchedPairs: MatchedMedicineInfo[] = [];

  // Patient & Family Mismatch Safeguard
  const oldPatient = (oldRx?.patientName || '').trim();
  const newPatient = (newRx?.patientName || '').trim();
  const oldFamily = oldRx?.familyMember || 'self';
  const newFamily = newRx?.familyMember || 'self';
  let patientMismatch: PatientMismatchNotice | undefined;

  const isOldMissing = !oldPatient;
  const isNewMissing = !newPatient;
  const isDifferent = oldPatient.toLowerCase() !== newPatient.toLowerCase();
  const isFamilyMismatch = oldFamily !== newFamily;

  if (isFamilyMismatch || ((isOldMissing || isNewMissing || isDifferent) && (oldPatient || newPatient))) {
    const displayOld = oldPatient || oldFamily;
    const displayNew = newPatient || newFamily;
    patientMismatch = {
      isMismatch: true,
      oldPatientName: displayOld,
      newPatientName: displayNew,
      message: isFamilyMismatch
        ? `Clinical Safety Warning: These prescriptions belong to two different family members (${oldFamily} vs ${newFamily}). Cross-family comparison is not clinically meaningful.`
        : `These prescriptions appear to be for different patients (${displayOld} vs ${displayNew}). Comparison shown below may not be clinically meaningful.`,
    };
  }

  const oldMeds = oldRx?.medications || [];
  const newMeds = newRx?.medications || [];

  // Track matched indices
  const matchedOldIndices = new Set<number>();
  const matchedNewIndices = new Set<number>();

  // Compare every new medication against old medications
  for (let newIdx = 0; newIdx < newMeds.length; newIdx++) {
    const newMed = newMeds[newIdx];
    const cleanedNewName = cleanMedicineName(newMed.name);

    let bestMatchOldIdx = -1;
    let highestSimilarity = 0;

    for (let oldIdx = 0; oldIdx < oldMeds.length; oldIdx++) {
      if (matchedOldIndices.has(oldIdx)) continue;

      const oldMed = oldMeds[oldIdx];
      const cleanedOldName = cleanMedicineName(oldMed.name);

      // Exact match check first
      if (cleanedNewName === cleanedOldName && cleanedNewName.length > 0) {
        bestMatchOldIdx = oldIdx;
        highestSimilarity = 1.0;
        break;
      }

      // String similarity calculation
      const similarity = stringSimilarity.compareTwoStrings(cleanedNewName, cleanedOldName);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatchOldIdx = oldIdx;
      }
    }

    if (bestMatchOldIdx !== -1 && highestSimilarity >= threshold) {
      // Found a match!
      matchedOldIndices.add(bestMatchOldIdx);
      matchedNewIndices.add(newIdx);

      const oldMed = oldMeds[bestMatchOldIdx];
      const needsVerification = highestSimilarity < 0.95;
      const verificationNote = needsVerification
        ? `Verify manually (match similarity: ${Math.round(highestSimilarity * 100)}%)`
        : undefined;

      matchedPairs.push({
        oldMedicineName: oldMed.name,
        newMedicineName: newMed.name,
        similarity: highestSimilarity,
        needsVerification,
      });

      // Detect field-level modifications
      const fieldsToCheck: Array<'dosage' | 'frequency' | 'timing' | 'duration' | 'instructions'> = [
        'dosage',
        'frequency',
        'timing',
        'duration',
        'instructions',
      ];

      let medChanged = false;

      for (const field of fieldsToCheck) {
        const oldVal = (oldMed[field] || '').trim();
        const newVal = (newMed[field] || '').trim();

        if (oldVal.toLowerCase() !== newVal.toLowerCase()) {
          // If both are empty or unstated, do not consider it a change
          if (!oldVal && !newVal) continue;

          changed.push({
            medicineName: newMed.name,
            field,
            oldValue: oldVal || 'Not specified',
            newValue: newVal || 'Not specified',
            needsVerification,
            verificationNote,
          });
          medChanged = true;
        }
      }

      if (!medChanged) {
        unchanged.push(newMed);
      }
    }
  }

  // Any unmatched new medication is "added"
  for (let newIdx = 0; newIdx < newMeds.length; newIdx++) {
    if (!matchedNewIndices.has(newIdx)) {
      added.push(newMeds[newIdx]);
    }
  }

  // Any unmatched old medication is "removed"
  for (let oldIdx = 0; oldIdx < oldMeds.length; oldIdx++) {
    if (!matchedOldIndices.has(oldIdx)) {
      removed.push(oldMeds[oldIdx]);
    }
  }

  return {
    added,
    removed,
    changed,
    unchanged,
    matchedPairs,
    patientMismatch,
  };
}

