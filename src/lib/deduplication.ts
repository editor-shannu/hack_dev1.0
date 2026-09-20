import { Prescription, HealthRecord, Medication, ScheduledDose } from '@/types/prescription';

/**
 * Normalizes a medication name by removing common formulation prefixes
 * (Tab., Cap., Syrup, etc.), compound dosages (e.g. 75/75/20mg, 40/5mg),
 * and appended instructions/timing words to ensure identical clinical matching.
 */
export function cleanMedicineName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    // 1. Remove parenthetical notes like (5mg), (40/5mg), (before food)
    .replace(/\([^)]*\)/g, ' ')
    // 2. Remove common formulation prefixes
    .replace(/^(tab\.|tablet|tablets|cap\.|capsule|capsules|syp\.|syrup|inj\.|injection|gel|paint|drops|cream|ointment|lotion|spray|inhaler|powder|suspension|solution|iv|im)\s+/i, '')
    // 3. Remove compound dosages like 75/75/20mg, 40/5mg, 500mg, 10ml, 0.5%
    .replace(/\b\d+(\s*[\/\-]\s*\d+)*\s*(mg|g|ml|mcg|iu|%)\b/gi, ' ')
    // 4. Remove standalone number ratios like 40/5 or 75/75/20 or trailing numbers
    .replace(/\b\d+(\s*[\/\-]\s*\d+)+\b/g, ' ')
    // 5. Remove appended timing and frequency phrases
    .replace(/\b(before breakfast|after breakfast|before lunch|after lunch|before dinner|after dinner|before food|after food|empty stomach|with food|bedtime|at night|in morning|morning|afternoon|evening|night|daily|once daily|twice daily|od|bd|tds|tid|qid|hs|sos)\b/gi, ' ')
    // 6. Remove punctuation and collapse spaces
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes a string for loose comparison (lowercase, trimmed, collapsed whitespace)
 */
function normalizeString(val?: string): string {
  return (val || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Deduplicates an array of medications:
 * Keeps only one entry if multiple medications have the same cleaned name (e.g. "Cap. Rozagold" vs "Rozagold").
 * Prefers the item with more complete clinical fields (dosage, frequency, timing).
 */
export function deduplicateMedications(medications: Medication[]): Medication[] {
  if (!Array.isArray(medications) || medications.length <= 1) return medications || [];

  const seenKeys = new Map<string, Medication>();

  for (const med of medications) {
    if (!med || !med.name) continue;
    const cleanKey = cleanMedicineName(med.name) || normalizeString(med.name);
    
    // Check if we already have this medication
    if (!seenKeys.has(cleanKey)) {
      seenKeys.set(cleanKey, med);
    } else {
      // If duplicate, keep the more detailed one
      const existing = seenKeys.get(cleanKey)!;
      const existingScore = (existing.dosage ? 1 : 0) + (existing.frequency ? 1 : 0) + (existing.timing ? 1 : 0) + (existing.instructions ? 1 : 0);
      const newScore = (med.dosage ? 1 : 0) + (med.frequency ? 1 : 0) + (med.timing ? 1 : 0) + (med.instructions ? 1 : 0);
      if (newScore > existingScore) {
        seenKeys.set(cleanKey, med);
      }
    }
  }

  return Array.from(seenKeys.values());
}

/**
 * Deduplicates an array of Prescriptions:
 * Keeps only one unique prescription if duplicates exist by:
 * 1. Exact ID
 * 2. Same patient + doctor + date + title
 * 3. Same fileUrl (when not generic default)
 * 4. Same fileName + patient + date
 * 5. Same patient + date + identical set of medications
 * Also runs deduplicateMedications on each prescription's medications.
 */
export function deduplicatePrescriptions(prescriptions: Prescription[]): Prescription[] {
  if (!Array.isArray(prescriptions) || prescriptions.length === 0) {
    return [];
  }

  const result: Prescription[] = [];
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();

  for (const rx of prescriptions) {
    if (!rx) continue;

    // Deduplicate medications within this prescription
    const sanitizedRx: Prescription = {
      ...rx,
      medications: deduplicateMedications(rx.medications || []),
    };

    if (sanitizedRx.id && seenIds.has(sanitizedRx.id)) {
      continue;
    }

    const patient = normalizeString(sanitizedRx.patientName);
    const doctor = normalizeString(sanitizedRx.doctorName);
    const date = normalizeString(sanitizedRx.date);
    const title = normalizeString(sanitizedRx.title);
    const fileName = normalizeString(sanitizedRx.fileName);

    // Primary fingerprint: patient + doctor + date + title
    const primaryKey = `${patient}|${doctor}|${date}|${title}`;
    
    // File fingerprint (if valid non-generic filename)
    const fileKey = fileName && fileName !== 'prescription.png' && fileName !== 'document.png' 
      ? `file:${patient}|${date}|${fileName}` 
      : '';

    // Medication signature fingerprint: patient + date + sorted medication names
    const medNames = (sanitizedRx.medications || [])
      .map(m => cleanMedicineName(m.name))
      .filter(Boolean)
      .sort()
      .join(',');
    const medKey = medNames.length > 0 ? `meds:${patient}|${date}|${medNames}` : '';

    if (seenFingerprints.has(primaryKey)) {
      continue;
    }
    if (fileKey && seenFingerprints.has(fileKey)) {
      continue;
    }
    if (medKey && seenFingerprints.has(medKey)) {
      continue;
    }

    if (sanitizedRx.id) seenIds.add(sanitizedRx.id);
    seenFingerprints.add(primaryKey);
    if (fileKey) seenFingerprints.add(fileKey);
    if (medKey) seenFingerprints.add(medKey);

    result.push(sanitizedRx);
  }

  return result;
}

/**
 * Deduplicates an array of Health Records:
 * Keeps only one unique record if duplicates exist by:
 * 1. Exact ID
 * 2. Same title + recordType + patient + date
 * 3. Same fileName + patient + date
 * 4. Same doctorOrFacility + diagnosisOrTest + patient + date
 */
export function deduplicateHealthRecords(records: HealthRecord[]): HealthRecord[] {
  if (!Array.isArray(records) || records.length === 0) return [];

  const result: HealthRecord[] = [];
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();

  for (const rec of records) {
    if (!rec) continue;

    if (rec.id && seenIds.has(rec.id)) {
      continue;
    }

    const patient = normalizeString(rec.patientName);
    const type = normalizeString(rec.documentType);
    const title = normalizeString(rec.title);
    const date = normalizeString(rec.date);
    const doctor = normalizeString(rec.doctorName);
    const clinic = normalizeString(rec.clinicOrHospital);
    const diagnosis = normalizeString(rec.diagnosisOrTest);
    const fileName = normalizeString(rec.fileName);

    const primaryKey = `${patient}|${type}|${title}|${date}`;
    const facilityKey = (doctor || clinic || diagnosis) ? `fac:${patient}|${date}|${doctor}|${clinic}|${diagnosis}` : '';
    const fileKey = fileName && fileName !== 'record.png' && fileName !== 'lab.png'
      ? `file:${patient}|${date}|${fileName}`
      : '';

    if (seenFingerprints.has(primaryKey)) {
      continue;
    }
    if (facilityKey && seenFingerprints.has(facilityKey)) {
      continue;
    }
    if (fileKey && seenFingerprints.has(fileKey)) {
      continue;
    }

    if (rec.id) seenIds.add(rec.id);
    seenFingerprints.add(primaryKey);
    if (facilityKey) seenFingerprints.add(facilityKey);
    if (fileKey) seenFingerprints.add(fileKey);

    result.push(rec);
  }

  return result;
}

/**
 * Deduplicates scheduled doses:
 * Prevents duplicate medicine reminders in the same slot on the same day.
 * Prefers 'taken' status over 'pending'.
 */
export function deduplicateDoses(doses: ScheduledDose[]): ScheduledDose[] {
  if (!Array.isArray(doses) || doses.length <= 1) return doses || [];

  const map = new Map<string, ScheduledDose>();

  for (const d of doses) {
    if (!d) continue;
    const fam = d.familyMember || 'self';
    const pat = normalizeString(d.patientName || '');
    const cleanMed = cleanMedicineName(d.medicationName) || normalizeString(d.medicationName);
    const key = `${d.date || 'today'}|${fam}|${pat}|${d.slot}|${cleanMed}`;

    if (!map.has(key)) {
      map.set(key, d);
    } else {
      const existing = map.get(key)!;
      // If incoming dose is 'taken' and existing is 'pending', keep the taken one
      if (d.status === 'taken' && existing.status !== 'taken') {
        map.set(key, d);
      }
    }
  }

  return Array.from(map.values());
}
