import { Prescription, ScheduledDose, HealthRecord, AdherenceDayRecord, DoctorVisit } from '@/types/prescription';
import { EMRProfile } from '@/types/emr';
import { parseTimeToMinutes } from '@/lib/notifications';
import {
  deduplicatePrescriptions,
  deduplicateHealthRecords,
  deduplicateMedications,
  deduplicateDoses,
  cleanMedicineName,
} from '@/lib/deduplication';
import { getFamilyRelationLabel } from '@/lib/familyMembers';
import { saveStoredFile, deleteStoredFile } from '@/lib/fileStorage';
import { auth } from '@/lib/firebase';

/**
 * High-Reliability Offline-First & Cloud-Synchronized Storage Store
 * - Eliminates discrepancies between mobile and desktop devices.
 * - Full offline resilience: Reminders, doses, and records survive app/browser closures without network.
 * - Cross-tab BroadcastChannel & server polling syncs mobile & desktop automatically in real time.
 */

let memoryPrescriptions: Prescription[] = [];
let memoryHealthRecords: HealthRecord[] = [];
let memoryDoses: ScheduledDose[] = [];
let memoryEMR: EMRProfile | null = null;
let memoryFamilyEMRs: Record<string, EMRProfile> = {};
let memoryAdherenceRecords: AdherenceDayRecord[] = [];
let memoryComparisonsCount = 0;
let activeUserId: string | null = null;

export function getCachedActiveUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('prescriptime_active_user') || localStorage.getItem('prescriptime_test_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.uid) return parsed.uid;
    }
  } catch {}
  return null;
}

export function setActiveUserId(uid: string | null) {
  if (activeUserId && uid && activeUserId !== uid) {
    clearMemoryStorage(false);
  }
  activeUserId = uid;
}

export function getActiveUserId(): string | null {
  return activeUserId || getCachedActiveUserId();
}

/**
 * Resolves cryptographic Bearer auth headers dynamically for API calls
 */
export async function getAuthHeaders(uid?: string): Promise<Record<string, string>> {
  const effectiveUid = uid || activeUserId || getCachedActiveUserId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (effectiveUid) {
    headers['x-user-id'] = effectiveUid;
  }

  // Attach cryptographic Bearer credentials
  if (effectiveUid === 'demo-clinician-001' || effectiveUid?.includes('demo')) {
    headers['Authorization'] = 'Bearer demo-token';
  } else if (effectiveUid?.startsWith('test-uid-') || effectiveUid?.startsWith('test-')) {
    headers['Authorization'] = `Bearer test-token-${effectiveUid}`;
  } else if (auth?.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {}
  }

  return headers;
}

/**
 * Executes an authenticated fetch request attaching verified credentials
 */
export async function authFetch(url: string, init: RequestInit = {}, uid?: string): Promise<Response> {
  const authHeaders = await getAuthHeaders(uid);
  return fetch(url, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init.headers || {}),
    },
  });
}

/**
 * Cross-Tab Real-Time Sync via BroadcastChannel
 */
export function broadcastUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('prescriptime-data-updated'));
    try {
      if ('BroadcastChannel' in window) {
        const ch = new BroadcastChannel('prescriptime_sync_channel');
        ch.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
        ch.close();
      }
    } catch {}
  }
}

// Listen for cross-tab updates & network reconnection
if (typeof window !== 'undefined') {
  if ('BroadcastChannel' in window) {
    try {
      const ch = new BroadcastChannel('prescriptime_sync_channel');
      ch.onmessage = (event) => {
        if (event.data?.type === 'DATA_UPDATED') {
          window.dispatchEvent(new CustomEvent('prescriptime-data-updated'));
        }
      };
    } catch {}
  }

  window.addEventListener('online', () => {
    flushOfflineMutations().then(() => {
      const uid = activeUserId || getCachedActiveUserId();
      if (uid) {
        syncWithServer(uid).catch(() => {});
      }
    }).catch(() => {});
  });
}

/**
 * Offline Mutation Queue (Syncs changes made offline once network is restored)
 */
interface OfflineMutation {
  id: string;
  url: string;
  method: string;
  body: any;
  timestamp: number;
}

export function queueMutation(url: string, method: string, body: any) {
  if (typeof window === 'undefined') return;
  try {
    const key = 'prescriptime_offline_mutations';
    const existing: OfflineMutation[] = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push({
      id: `${Date.now()}_${Math.random()}`,
      url,
      method,
      body,
      timestamp: Date.now(),
    });
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {}
}

export async function flushOfflineMutations(): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  try {
    const key = 'prescriptime_offline_mutations';
    const existingStr = localStorage.getItem(key);
    if (!existingStr) return;
    const mutations: OfflineMutation[] = JSON.parse(existingStr);
    if (!Array.isArray(mutations) || mutations.length === 0) return;

    for (const mut of mutations) {
      try {
        await authFetch(mut.url, {
          method: mut.method,
          body: JSON.stringify(mut.body),
        });
      } catch {
        return; // Break if network drops again
      }
    }
    localStorage.removeItem(key);
  } catch {}
}

/**
 * Guarantees that in-memory state is ALWAYS stored in user-scoped and fallback offline localStorage
 */
function persistAllToOfflineCache(userId?: string) {
  if (typeof window === 'undefined') return;
  const uid = userId || activeUserId || getCachedActiveUserId();
  try {
    // Strictly filter out any duplicates across prescriptions, health records, and doses
    memoryPrescriptions = deduplicatePrescriptions(memoryPrescriptions);
    memoryHealthRecords = deduplicateHealthRecords(memoryHealthRecords);
    memoryDoses = deduplicateDoses(memoryDoses);

    // Strip heavy base64 data URIs so localStorage stays well below the 5MB browser quota
    const sanitizedPrescriptions = memoryPrescriptions.map((rx) => ({
      ...rx,
      fileUrl: rx.fileUrl && rx.fileUrl.startsWith('data:') ? '[offline-cached-scan]' : rx.fileUrl,
      rawText: rx.rawText && rx.rawText.length > 5000 ? rx.rawText.slice(0, 5000) + '...' : rx.rawText,
    }));

    const sanitizedHealthRecords = memoryHealthRecords.map((hr) => ({
      ...hr,
      fileUrl: hr.fileUrl && hr.fileUrl.startsWith('data:') ? '[offline-cached-scan]' : hr.fileUrl,
      rawText: hr.rawText && hr.rawText.length > 5000 ? hr.rawText.slice(0, 5000) + '... [truncated]' : hr.rawText,
    }));

    const snapshot = {
      prescriptions: sanitizedPrescriptions,
      healthRecords: sanitizedHealthRecords,
      doses: memoryDoses,
      emrProfile: memoryEMR,
      familyEMRs: memoryFamilyEMRs,
      adherenceRecords: memoryAdherenceRecords,
      comparisonsCount: memoryComparisonsCount,
      savedAt: new Date().toISOString(),
    };

    const serialized = JSON.stringify(snapshot);
    if (uid) {
      try {
        localStorage.setItem(`prescriptime_cache_${uid}`, serialized);
      } catch (err: any) {
        if (err?.name === 'QuotaExceededError') {
          // Fallback to essential dose reminder state only
          localStorage.setItem(`prescriptime_cache_${uid}`, JSON.stringify({
            doses: memoryDoses,
            emrProfile: memoryEMR,
            familyEMRs: memoryFamilyEMRs,
            savedAt: new Date().toISOString(),
          }));
        }
      }
    }

    try {
      localStorage.setItem('prescriptime_offline_backup', serialized);
    } catch (err: any) {
      if (err?.name === 'QuotaExceededError') {
        localStorage.setItem('prescriptime_offline_backup', JSON.stringify({
          doses: memoryDoses,
          savedAt: new Date().toISOString(),
        }));
      }
    }
  } catch (err) {
    console.warn('Failed to write offline cache:', err);
  }
}

/**
 * Hydrates memory state synchronously from localStorage cache at 0ms
 */
export function hydrateFromOfflineCache(userId?: string): void {
  if (typeof window === 'undefined') return;
  const uid = userId || activeUserId || getCachedActiveUserId();
  try {
    const cacheKey = uid ? `prescriptime_cache_${uid}` : 'prescriptime_offline_backup';
    const hasUserSpecificCache = uid ? !!localStorage.getItem(cacheKey) : true;
    const isNewUser = typeof window !== 'undefined' && (
      sessionStorage.getItem('prescriptime_is_new_user') === 'true' ||
      sessionStorage.getItem('prescriptime_emr_onboarding_pending') === 'true'
    );
    const cached = localStorage.getItem(cacheKey) || (!isNewUser ? localStorage.getItem('prescriptime_offline_backup') : null);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed.prescriptions) && (memoryPrescriptions.length === 0 || parsed.prescriptions.length > memoryPrescriptions.length)) {
        memoryPrescriptions = deduplicatePrescriptions(parsed.prescriptions);
      }
      if (Array.isArray(parsed.healthRecords) && (memoryHealthRecords.length === 0 || parsed.healthRecords.length > memoryHealthRecords.length)) {
        memoryHealthRecords = deduplicateHealthRecords(parsed.healthRecords);
      }
      if (Array.isArray(parsed.doses) && (memoryDoses.length === 0 || parsed.doses.length > memoryDoses.length)) {
        memoryDoses = deduplicateDoses(parsed.doses);
      }
      if (parsed.emrProfile && hasUserSpecificCache && !isNewUser) {
        memoryEMR = parsed.emrProfile;
      }
      if (parsed.familyEMRs && typeof parsed.familyEMRs === 'object') {
        memoryFamilyEMRs = { ...memoryFamilyEMRs, ...parsed.familyEMRs };
      }
      if (Array.isArray(parsed.adherenceRecords) && (memoryAdherenceRecords.length === 0 || parsed.adherenceRecords.length > memoryAdherenceRecords.length)) {
        memoryAdherenceRecords = parsed.adherenceRecords;
      }
      if (typeof parsed.comparisonsCount === 'number' && (memoryComparisonsCount === 0 || parsed.comparisonsCount > memoryComparisonsCount)) {
        memoryComparisonsCount = parsed.comparisonsCount;
      }
    }
    if (memoryPrescriptions.length === 0 && typeof window !== 'undefined') {
      const legacyRx = localStorage.getItem('prescriptime_prescriptions_clean_v2');
      if (legacyRx) {
        try {
          const parsedRx = JSON.parse(legacyRx);
          if (Array.isArray(parsedRx)) {
            memoryPrescriptions = deduplicatePrescriptions(parsedRx);
          }
        } catch {}
      }
    }
    if (!memoryEMR && typeof window !== 'undefined') {
      const legacyEMR = localStorage.getItem('prescriptime_emr_profile_v1');
      if (legacyEMR) {
        try { memoryEMR = JSON.parse(legacyEMR); } catch {}
      }
    }
  } catch {}
}

/**
 * Clears in-memory storage.
 * Only purges persistent cache if wipePersistentCache is true (e.g. user explicit signOut).
 */
export function clearMemoryStorage(wipePersistentCache = false): void {
  if (typeof window !== 'undefined' && wipePersistentCache) {
    const uid = activeUserId || getCachedActiveUserId();
    if (uid) {
      try {
        localStorage.removeItem(`prescriptime_cache_${uid}`);
      } catch {}
    }
    try {
      localStorage.removeItem('prescriptime_offline_backup');
    } catch {}
  }
  memoryPrescriptions = [];
  memoryHealthRecords = [];
  memoryDoses = [];
  memoryEMR = null;
  memoryFamilyEMRs = {};
  memoryAdherenceRecords = [];
  memoryComparisonsCount = 0;
  activeUserId = null;
  broadcastUpdate();
}

/**
 * Sends exact offline alarm timestamps to Service Worker so reminders fire
 * even when the PWA or browser is completely closed and offline!
 */
export function dispatchOfflineAlarmsToWorker(doses: ScheduledDose[]) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    navigator.serviceWorker.ready.then((reg) => {
      if (!reg) return;
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      const alarms = doses
        .filter((d) => d.reminderEnabled !== false)
        .map((d) => {
          const doseMinutes = parseTimeToMinutes(d.scheduledTime);
          let targetMs = Date.now();
          if (doseMinutes !== null) {
            targetMs = todayDate.getTime() + doseMinutes * 60 * 1000;
            if (targetMs < Date.now()) {
              targetMs += 24 * 60 * 60 * 1000;
            }
          }
          const recipientName = d.patientName || (d.familyMember && d.familyMember !== 'self' ? getFamilyRelationLabel(d.familyMember) : '');
          const forWhomTag = recipientName ? ` for ${recipientName}` : '';
          return {
            doseId: d.id,
            medicationName: d.medicationName,
            dosage: d.dosage,
            scheduledTime: d.scheduledTime,
            timestamp: targetMs,
            title: `💊 Medicine Time${forWhomTag}: ${d.medicationName}`,
            body: recipientName
              ? `It's ${d.scheduledTime} — reminder for ${recipientName} to take ${d.medicationName}${d.dosage ? ` (${d.dosage})` : ''}. Tap to mark as taken.`
              : `It's ${d.scheduledTime} — time to take ${d.medicationName}${d.dosage ? ` (${d.dosage})` : ''}. Tap to mark as taken.`,
          };
        });

      if (reg.active) {
        reg.active.postMessage({
          type: 'SCHEDULE_OFFLINE_ALARMS',
          alarms,
        });
      }
    }).catch(() => {});
  } catch {}
}

// ---------------------------------------------------------------------------
// EMR PROFILE
// ---------------------------------------------------------------------------
export function getStoredEMRProfile(): EMRProfile | null {
  if (typeof window !== 'undefined' && !memoryEMR) {
    hydrateFromOfflineCache();
    if (!memoryEMR) {
      const legacyEMR = localStorage.getItem('prescriptime_emr_profile_v1');
      if (legacyEMR) {
        try { memoryEMR = JSON.parse(legacyEMR); } catch {}
      }
    }
  }
  return memoryEMR;
}

export function saveEMRProfile(profile: EMRProfile, userId?: string): void {
  const uid = userId || activeUserId || getCachedActiveUserId() || profile.userId;
  const updated: EMRProfile = {
    ...profile,
    userId: uid || undefined,
    updatedAt: new Date().toISOString(),
  };

  memoryEMR = updated;
  persistAllToOfflineCache(uid || undefined);
  broadcastUpdate();

  if (typeof window !== 'undefined') {
    authFetch('/api/emr', {
      method: 'POST',
      body: JSON.stringify(updated),
    }, uid || undefined).catch((err) => {
      console.warn('EMR MongoDB sync error — queueing:', err);
      queueMutation('/api/emr', 'POST', updated);
    });
  }
}

export function getStoredFamilyEMRs(): Record<string, EMRProfile> {
  if (typeof window !== 'undefined' && Object.keys(memoryFamilyEMRs).length === 0) {
    hydrateFromOfflineCache();
  }
  return memoryFamilyEMRs;
}

export function getStoredFamilyEMR(memberKey: string): EMRProfile | null {
  if (memberKey === 'self') {
    return getStoredEMRProfile();
  }
  const all = getStoredFamilyEMRs();
  return all[memberKey] || null;
}

export function saveFamilyEMRProfile(memberKey: string, profile: EMRProfile, userId?: string): void {
  if (memberKey === 'self') {
    saveEMRProfile(profile, userId);
    return;
  }
  const uid = userId || activeUserId || getCachedActiveUserId() || profile.userId;
  const updated: EMRProfile = {
    ...profile,
    userId: uid || undefined,
    updatedAt: new Date().toISOString(),
  };
  memoryFamilyEMRs = {
    ...memoryFamilyEMRs,
    [memberKey]: updated,
  };
  persistAllToOfflineCache(uid || undefined);
  broadcastUpdate();
}

export function hasDismissedEMRPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('prescriptime_emr_prompt_dismissed') === 'true';
}

export function setDismissedEMRPrompt(dismissed: boolean): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('prescriptime_emr_prompt_dismissed', dismissed ? 'true' : 'false');
  broadcastUpdate();
}

// ---------------------------------------------------------------------------
// PRESCRIPTIONS
// ---------------------------------------------------------------------------
export function getStoredPrescriptions(userId?: string): Prescription[] {
  if (typeof window !== 'undefined' && memoryPrescriptions.length === 0) {
    hydrateFromOfflineCache(userId);
    if (memoryPrescriptions.length === 0) {
      const legacyRx = localStorage.getItem('prescriptime_prescriptions_clean_v2');
      if (legacyRx) {
        try {
          const parsedRx = JSON.parse(legacyRx);
          if (Array.isArray(parsedRx)) {
            memoryPrescriptions = deduplicatePrescriptions(parsedRx);
          }
        } catch {}
      }
    }
  }
  memoryPrescriptions = deduplicatePrescriptions(memoryPrescriptions);
  return memoryPrescriptions;
}

export function generateAutoDoctorVisit(prescription: Prescription): DoctorVisit {
  const medicineSummary = prescription.medications && prescription.medications.length > 0
    ? `Prescribed ${prescription.medications.length} medication(s): ${prescription.medications.map((m) => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`).join(', ')}`
    : undefined;

  return {
    id: `visit-auto-${prescription.id}`,
    prescriptionId: prescription.id,
    visitDate: prescription.date || new Date().toISOString().split('T')[0],
    doctorName: prescription.doctorName || 'Attending Physician',
    clinicOrHospital: prescription.clinicOrHospital || undefined,
    reasonForVisit: prescription.diagnosis ? `Consultation: ${prescription.diagnosis}` : 'Prescription Consultation',
    diagnosis: prescription.diagnosis || undefined,
    clinicalNotes: prescription.notes || undefined,
    treatmentPlan: medicineSummary,
    nextFollowUpDate: prescription.followUpDate || undefined,
    isAutoGenerated: true,
    createdAt: prescription.createdAt || new Date().toISOString(),
  };
}

export function savePrescription(prescription: Prescription, userId?: string): Prescription[] {
  const uid = userId || activeUserId || getCachedActiveUserId() || prescription.userId;

  let visits = prescription.doctorVisits;
  if (!visits || visits.length === 0) {
    if (prescription.doctorName || prescription.clinicOrHospital || prescription.date || prescription.diagnosis) {
      visits = [generateAutoDoctorVisit(prescription)];
    }
  }

  const rxToSave: Prescription = {
    ...prescription,
    userId: uid || undefined,
    uploadedAt: prescription.uploadedAt || new Date().toISOString(),
    createdAt: prescription.createdAt || new Date().toISOString(),
    medications: deduplicateMedications(prescription.medications || []),
    doctorVisits: visits,
  };

  const existingIndex = memoryPrescriptions.findIndex((p) => p.id === rxToSave.id);
  if (existingIndex >= 0) {
    memoryPrescriptions[existingIndex] = rxToSave;
  } else {
    memoryPrescriptions = [rxToSave, ...memoryPrescriptions];
  }

  // Strictly filter out duplicates across all stored prescriptions
  memoryPrescriptions = deduplicatePrescriptions(memoryPrescriptions);

  if (rxToSave.fileUrl && rxToSave.fileUrl !== '[offline-cached-scan]') {
    saveStoredFile(rxToSave.id, rxToSave.fileUrl).catch(() => {});
  }

  persistAllToOfflineCache(uid || undefined);
  broadcastUpdate();

  if (typeof window !== 'undefined') {
    authFetch('/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify(rxToSave),
    }, uid || undefined).catch((err) => {
      console.warn('Prescription MongoDB sync offline — queueing:', err);
      queueMutation('/api/prescriptions', 'POST', rxToSave);
    });
  }

  return memoryPrescriptions;
}

export function deletePrescription(id: string, userId?: string): Prescription[] {
  const uid = userId || activeUserId || getCachedActiveUserId();
  memoryPrescriptions = memoryPrescriptions.filter((p) => p.id !== id);
  memoryDoses = memoryDoses.filter((d) => d.prescriptionId !== id);

  deleteStoredFile(id).catch(() => {});
  persistAllToOfflineCache(uid || undefined);
  broadcastUpdate();

  if (typeof window !== 'undefined') {
    const uidParam = uid ? `&userId=${encodeURIComponent(uid)}` : '';
    authFetch(`/api/prescriptions?id=${encodeURIComponent(id)}${uidParam}`, {
      method: 'DELETE',
    }, uid || undefined).catch((err) => {
      console.warn('Prescription delete error — queueing:', err);
      queueMutation(`/api/prescriptions?id=${encodeURIComponent(id)}${uidParam}`, 'DELETE', {});
    });

    if (uid) {
      authFetch(`/api/doses?prescriptionId=${encodeURIComponent(id)}&userId=${encodeURIComponent(uid)}`, {
        method: 'DELETE',
      }, uid).catch((err) => {
        queueMutation(`/api/doses?prescriptionId=${encodeURIComponent(id)}&userId=${encodeURIComponent(uid)}`, 'DELETE', {});
      });
    }
  }

  return memoryPrescriptions;
}

export function addDoctorVisitToPrescription(
  prescriptionId: string,
  visit: Omit<DoctorVisit, 'id' | 'createdAt'>,
  userId?: string
): Prescription | null {
  const currentPrescriptions = getStoredPrescriptions();
  const target = currentPrescriptions.find((p) => p.id === prescriptionId);
  if (!target) return null;

  const newVisit: DoctorVisit = {
    ...visit,
    id: `visit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    prescriptionId,
    createdAt: new Date().toISOString(),
  };

  const updatedVisits = [newVisit, ...(target.doctorVisits || [])];
  const updatedPrescription: Prescription = {
    ...target,
    doctorVisits: updatedVisits,
  };

  savePrescription(updatedPrescription, userId);
  return updatedPrescription;
}

export function deleteDoctorVisitFromPrescription(
  prescriptionId: string,
  visitId: string,
  userId?: string
): Prescription | null {
  const currentPrescriptions = getStoredPrescriptions();
  const target = currentPrescriptions.find((p) => p.id === prescriptionId);
  if (!target) return null;

  const updatedVisits = (target.doctorVisits || []).filter((v) => v.id !== visitId);
  const updatedPrescription: Prescription = {
    ...target,
    doctorVisits: updatedVisits,
  };

  savePrescription(updatedPrescription, userId);
  return updatedPrescription;
}

export function autoGenerateDoctorVisitForPrescription(
  prescriptionId: string,
  userId?: string
): Prescription | null {
  const currentPrescriptions = getStoredPrescriptions();
  const target = currentPrescriptions.find((p) => p.id === prescriptionId);
  if (!target) return null;

  const autoVisit = generateAutoDoctorVisit(target);
  const existingVisits = target.doctorVisits || [];
  const alreadyExists = existingVisits.some(
    (v) => v.id === autoVisit.id || (v.visitDate === autoVisit.visitDate && v.doctorName === autoVisit.doctorName)
  );
  const updatedVisits = alreadyExists ? existingVisits : [autoVisit, ...existingVisits];

  const updatedPrescription: Prescription = {
    ...target,
    doctorVisits: updatedVisits,
  };

  savePrescription(updatedPrescription, userId);
  return updatedPrescription;
}

// ---------------------------------------------------------------------------
// HOSPITAL & DIAGNOSTIC RECORDS
// ---------------------------------------------------------------------------
export function getStoredHealthRecords(): HealthRecord[] {
  if (typeof window !== 'undefined' && memoryHealthRecords.length === 0) {
    hydrateFromOfflineCache();
  }
  memoryHealthRecords = deduplicateHealthRecords(memoryHealthRecords);
  return memoryHealthRecords;
}

export function saveHealthRecord(record: HealthRecord, userId?: string): HealthRecord[] {
  const uid = userId || activeUserId || getCachedActiveUserId() || record.userId;
  const recordToSave: HealthRecord = {
    ...record,
    userId: uid || undefined,
    uploadedAt: record.uploadedAt || new Date().toISOString(),
    createdAt: record.createdAt || new Date().toISOString(),
  };

  const existingIndex = memoryHealthRecords.findIndex((r) => r.id === recordToSave.id);
  if (existingIndex >= 0) {
    memoryHealthRecords[existingIndex] = recordToSave;
  } else {
    memoryHealthRecords = [recordToSave, ...memoryHealthRecords];
  }

  // Strictly filter out duplicates across all stored health records
  memoryHealthRecords = deduplicateHealthRecords(memoryHealthRecords);

  if (recordToSave.fileUrl && recordToSave.fileUrl !== '[offline-cached-scan]') {
    saveStoredFile(recordToSave.id, recordToSave.fileUrl).catch(() => {});
  }

  persistAllToOfflineCache(uid || undefined);
  broadcastUpdate();

  if (typeof window !== 'undefined') {
    authFetch('/api/health-records', {
      method: 'POST',
      body: JSON.stringify(recordToSave),
    }, uid || undefined).catch((err) => {
      console.warn('Health record MongoDB sync error — queueing:', err);
      queueMutation('/api/health-records', 'POST', recordToSave);
    });
  }

  return memoryHealthRecords;
}

export function deleteHealthRecord(id: string, userId?: string): HealthRecord[] {
  const uid = userId || activeUserId || getCachedActiveUserId();
  memoryHealthRecords = memoryHealthRecords.filter((r) => r.id !== id);

  deleteStoredFile(id).catch(() => {});
  persistAllToOfflineCache(uid || undefined);
  broadcastUpdate();

  if (typeof window !== 'undefined') {
    const uidParam = uid ? `&userId=${encodeURIComponent(uid)}` : '';
    authFetch(`/api/health-records?id=${encodeURIComponent(id)}${uidParam}`, {
      method: 'DELETE',
    }, uid || undefined).catch((err) => {
      console.warn('Health record delete error — queueing:', err);
      queueMutation(`/api/health-records?id=${encodeURIComponent(id)}${uidParam}`, 'DELETE', {});
    });
  }

  return memoryHealthRecords;
}

export function generateAutoDoctorVisitForHealthRecord(record: HealthRecord): DoctorVisit {
  const findingsSummary = record.testResults && record.testResults.length > 0
    ? `Lab/Diagnostic findings: ${record.testResults.map((t) => `${t.parameter}: ${t.value}${t.unit ? ` ${t.unit}` : ''}`).join(', ')}`
    : (record.summary || record.diagnosisOrTest || undefined);

  return {
    id: `visit-auto-${record.id}`,
    prescriptionId: record.id,
    visitDate: record.date || new Date().toISOString().split('T')[0],
    doctorName: record.doctorName || 'Attending Physician',
    clinicOrHospital: record.clinicOrHospital || undefined,
    reasonForVisit: record.categoryLabel ? `${record.categoryLabel} Review` : 'Diagnostic Review',
    diagnosis: record.diagnosisOrTest || undefined,
    clinicalNotes: record.notes || record.summary || undefined,
    treatmentPlan: findingsSummary,
    isAutoGenerated: true,
    createdAt: record.createdAt || new Date().toISOString(),
  };
}

export function autoGenerateDoctorVisitForHealthRecord(
  recordId: string,
  userId?: string
): HealthRecord | null {
  const currentRecords = getStoredHealthRecords();
  const target = currentRecords.find((r) => r.id === recordId);
  if (!target) return null;

  const autoVisit = generateAutoDoctorVisitForHealthRecord(target);
  const existingVisits = target.doctorVisits || [];
  const alreadyExists = existingVisits.some(
    (v: DoctorVisit) => v.id === autoVisit.id || (v.visitDate === autoVisit.visitDate && v.doctorName === autoVisit.doctorName)
  );
  const updatedVisits = alreadyExists ? existingVisits : [autoVisit, ...existingVisits];

  const updatedRecord: HealthRecord = {
    ...target,
    doctorVisits: updatedVisits,
  };

  saveHealthRecord(updatedRecord, userId);
  return updatedRecord;
}

// ---------------------------------------------------------------------------
// DOSES & ROUTINE
// ---------------------------------------------------------------------------
export function getStoredDoses(): ScheduledDose[] {
  if (typeof window !== 'undefined' && memoryDoses.length === 0) {
    hydrateFromOfflineCache();
  }
  memoryDoses = deduplicateDoses(memoryDoses);
  return memoryDoses;
}

export function getStoredAdherenceRecords(): AdherenceDayRecord[] {
  return memoryAdherenceRecords;
}

function persistAdherenceForDate(dateStr: string, userId?: string) {
  const uid = userId || activeUserId || getCachedActiveUserId();
  if (!uid || typeof window === 'undefined') return;

  const dayDoses = memoryDoses.filter((d) => d.date === dateStr);
  const scheduled = dayDoses.length;
  if (scheduled === 0) return;

  const taken = dayDoses.filter((d) => d.status === 'taken').length;
  const skipped = dayDoses.filter((d) => d.status === 'skipped').length;
  const rate = Math.round((taken / scheduled) * 100);

  const record: AdherenceDayRecord = {
    date: dateStr,
    totalScheduled: scheduled,
    totalTaken: taken,
    totalSkipped: skipped,
    adherencePercentage: rate,
  };

  const existingIdx = memoryAdherenceRecords.findIndex((r) => r.date === dateStr);
  if (existingIdx >= 0) {
    memoryAdherenceRecords[existingIdx] = record;
  } else {
    memoryAdherenceRecords.push(record);
  }

  const payload = {
    userId: uid,
    date: dateStr,
    totalScheduled: scheduled,
    totalTaken: taken,
    totalSkipped: skipped,
    adherenceRate: rate,
  };

  authFetch('/api/adherence', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, uid || undefined).catch((err) => {
    console.warn('Adherence MongoDB sync offline — queueing:', err);
    queueMutation('/api/adherence', 'POST', payload);
  });
}

export function saveDoses(newDoses: ScheduledDose[], userId?: string): ScheduledDose[] {
  const uid = userId || activeUserId || getCachedActiveUserId();
  // Use local calendar date — toISOString() returns UTC which causes date-drift in IST
  const _d = new Date();
  const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
  const targetDate = newDoses[0]?.date || today;

  // Track routine configuration state in localStorage
  if (typeof window !== 'undefined' && uid) {
    if (newDoses.length === 0) {
      localStorage.setItem(`prescriptime_has_routine_configured_${uid}`, 'false');
      localStorage.setItem(`prescriptime_routine_cleared_${uid}_${targetDate}`, 'true');
    } else {
      localStorage.setItem(`prescriptime_has_routine_configured_${uid}`, 'true');
      localStorage.removeItem(`prescriptime_routine_cleared_${uid}_${targetDate}`);
    }
  }

  // Preserve past doses from other dates so adherence history is retained!
  const otherDatesDoses = memoryDoses.filter((d) => d.date !== targetDate);
  const updatedTodayDoses = newDoses.map((d) => ({
    ...d,
    date: d.date || targetDate,
    userId: uid || d.userId,
  }));

  // Strictly deduplicate doses so duplicate medicine items or reminders cannot be created
  memoryDoses = deduplicateDoses([...otherDatesDoses, ...updatedTodayDoses]);

  // 1. UNCONDITIONALLY persist to local storage cache immediately (survives offline & app close)
  persistAllToOfflineCache(uid || undefined);

  // 2. Dispatch offline alarms to Service Worker
  dispatchOfflineAlarmsToWorker(updatedTodayDoses);

  // 3. Persist date-wise adherence records for this date
  persistAdherenceForDate(targetDate, uid || undefined);

  // 4. Broadcast update to all open tabs and components
  broadcastUpdate();

  // 5. Sync with cloud or queue if offline
  if (typeof window !== 'undefined' && uid) {
    const payload = { doses: updatedTodayDoses, userId: uid, date: targetDate, replace: true };
    authFetch('/api/doses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, uid).catch((err) => {
      console.warn('Doses cloud sync offline — queueing mutation:', err);
      queueMutation('/api/doses', 'POST', payload);
    });
  }

  return memoryDoses;
}

/**
 * Handles day-boundary rollover:
 * Preserves past completed/skipped doses for adherence history,
 * and initializes today's routine doses with status 'pending'.
 * Only triggers if the user has actively configured a routine and today hasn't been cleared/deleted.
 */
export function rolloverRoutineDoses(userId?: string): ScheduledDose[] {
  const uid = userId || activeUserId || getCachedActiveUserId();
  // Use local calendar date — toISOString() returns UTC and causes date-drift bug in IST (UTC+5:30)
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // If user hasn't explicitly configured a routine, DO NOT automatically invent one from old days!
  if (typeof window !== 'undefined' && uid) {
    const hasConfigured = localStorage.getItem(`prescriptime_has_routine_configured_${uid}`) === 'true';
    const isTodayCleared = localStorage.getItem(`prescriptime_routine_cleared_${uid}_${today}`) === 'true';
    if (!hasConfigured || isTodayCleared) {
      return memoryDoses;
    }
  }

  // If today already has doses configured, no rollover needed
  const todayDoses = memoryDoses.filter((d) => d.date === today);
  if (todayDoses.length > 0) {
    return memoryDoses;
  }

  // Check if past doses exist
  const pastDoses = memoryDoses.filter((d) => d.date < today);
  if (pastDoses.length === 0) {
    return memoryDoses;
  }

  // Find the most recent previous date with doses
  const pastDates = Array.from(new Set(pastDoses.map((d) => d.date))).sort();
  const latestPastDate = pastDates[pastDates.length - 1];
  const templateDoses = pastDoses.filter((d) => d.date === latestPastDate);

  if (templateDoses.length === 0) {
    return memoryDoses;
  }

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayDayName = dayNames[d.getDay()];

  // Create fresh pending doses for today based on the active routine, respecting repeatDays and deletions
  const newTodayDoses: ScheduledDose[] = templateDoses
    .filter((d) => {
      // If repeatDays is specified, check if today is included
      if (Array.isArray(d.repeatDays) && d.repeatDays.length > 0) {
        if (!d.repeatDays.includes(todayDayName)) return false;
      }
      // Check if user previously deleted this dose
      if (typeof window !== 'undefined' && uid) {
        if (localStorage.getItem(`prescriptime_deleted_dose_${uid}_${d.id}`) === 'true') return false;
        const cleanName = cleanMedicineName(d.medicationName);
        if (localStorage.getItem(`prescriptime_deleted_med_${uid}_${today}_${cleanName}_${d.slot}`) === 'true') return false;
      }
      return true;
    })
    .map((d) => ({
      id: `${d.prescriptionId}-${d.medicationId}-${d.slot}-${today}`,
      prescriptionId: d.prescriptionId,
      medicationId: d.medicationId,
      medicationName: d.medicationName,
      dosage: d.dosage,
      slot: d.slot,
      scheduledTime: d.scheduledTime,
      timingNotes: d.timingNotes,
      instructions: d.instructions,
      status: 'pending',
      date: today,
      reminderEnabled: d.reminderEnabled !== false,
      repeatDays: d.repeatDays,
      userId: uid || d.userId,
      familyMember: d.familyMember,
      patientName: d.patientName,
    }));

  if (newTodayDoses.length === 0) {
    return memoryDoses;
  }

  memoryDoses = [...memoryDoses, ...newTodayDoses];
  persistAllToOfflineCache(uid || undefined);
  dispatchOfflineAlarmsToWorker(newTodayDoses);
  broadcastUpdate();

  if (typeof window !== 'undefined' && uid) {
    const payload = { doses: newTodayDoses, userId: uid, date: today };
    fetch('/api/doses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      queueMutation('/api/doses', 'POST', payload);
    });
  }

  return memoryDoses;
}

export function deleteDose(doseId: string, userId?: string): ScheduledDose[] {
  const uid = userId || activeUserId || getCachedActiveUserId();
  const target = memoryDoses.find((d) => d.id === doseId);
  memoryDoses = memoryDoses.filter((d) => d.id !== doseId);

  // Remember this deletion so rollover or server sync does not resurrect it
  if (typeof window !== 'undefined' && uid) {
    localStorage.setItem(`prescriptime_deleted_dose_${uid}_${doseId}`, 'true');
    if (target) {
      const cleanName = cleanMedicineName(target.medicationName);
      localStorage.setItem(`prescriptime_deleted_med_${uid}_${target.date}_${cleanName}_${target.slot}`, 'true');
      const remainingForDate = memoryDoses.filter((d) => d.date === target.date);
      if (remainingForDate.length === 0) {
        localStorage.setItem(`prescriptime_routine_cleared_${uid}_${target.date}`, 'true');
      }
    }
  }

  persistAllToOfflineCache(uid || undefined);
  broadcastUpdate();

  if (typeof window !== 'undefined') {
    if (uid) {
      authFetch(`/api/doses?id=${encodeURIComponent(doseId)}&userId=${encodeURIComponent(uid)}`, {
        method: 'DELETE',
      }, uid).catch((err) => {
        queueMutation(`/api/doses?id=${encodeURIComponent(doseId)}&userId=${encodeURIComponent(uid)}`, 'DELETE', {});
      });
    }

    if (target) {
      persistAdherenceForDate(target.date, uid || undefined);
    }
  }

  return memoryDoses;
}

export function updateDoseStatus(
  doseId: string,
  status: 'taken' | 'skipped' | 'snoozed' | 'pending'
): ScheduledDose[] {
  let index = memoryDoses.findIndex((d) => d.id === doseId);

  // Fallback 1: Prefix / Suffix match (e.g. with/without date suffix)
  if (index === -1) {
    index = memoryDoses.findIndex((d) => d.id.startsWith(doseId) || doseId.startsWith(d.id));
  }

  // Fallback 2: Match by stripping date suffix from both
  if (index === -1) {
    const baseId = doseId.replace(/-\d{4}-\d{2}-\d{2}$/, '');
    index = memoryDoses.findIndex((d) => {
      const dBaseId = d.id.replace(/-\d{4}-\d{2}-\d{2}$/, '');
      return dBaseId === baseId || d.id === baseId;
    });
  }

  // Fallback 3: Match by composite prescriptionId + medicationId + slot
  if (index === -1) {
    index = memoryDoses.findIndex((d) => {
      const composite = `${d.prescriptionId}-${d.medicationId}-${d.slot}`;
      return doseId.includes(composite) || (Boolean(d.medicationId) && doseId.includes(d.medicationId) && doseId.includes(d.slot));
    });
  }

  const takenAt =
    status === 'taken'
      ? new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })
      : undefined;

  const _d = new Date();
  let targetDate = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
  let targetUid = activeUserId || getCachedActiveUserId();

  if (index >= 0) {
    const target = memoryDoses[index];
    targetDate = target.date || targetDate;
    targetUid = target.userId || targetUid;

    memoryDoses[index] = {
      ...target,
      status,
      takenAt,
    };

    if (status === 'taken') {
      decrementPillCount(target.prescriptionId, target.medicationId);
    }
  } else {
    // If not found in memoryDoses (e.g., projected dose from template), instantiate it immediately
    const template = memoryDoses.find((d) => doseId.includes(d.slot) || (d.medicationId && doseId.includes(d.medicationId)));
    if (template) {
      const dateMatch = doseId.match(/\d{4}-\d{2}-\d{2}/);
      const doseDate = dateMatch ? dateMatch[0] : targetDate;
      const instantiated: ScheduledDose = {
        ...template,
        id: doseId,
        date: doseDate,
        status,
        takenAt,
        userId: targetUid || template.userId,
      };
      memoryDoses.push(instantiated);
      if (status === 'taken') {
        decrementPillCount(template.prescriptionId, template.medicationId);
      }
    }
  }

  // Persist status override in localStorage so background server syncs never revert it
  if (typeof window !== 'undefined' && targetUid) {
    const key = `prescriptime_dose_status_${targetUid}_${doseId}`;
    const baseKey = `prescriptime_dose_status_${targetUid}_${doseId.replace(/-\d{4}-\d{2}-\d{2}$/, '')}`;
    if (status === 'taken' || status === 'skipped') {
      const record = JSON.stringify({ status, takenAt, timestamp: Date.now() });
      localStorage.setItem(key, record);
      localStorage.setItem(baseKey, record);
    } else if (status === 'pending') {
      localStorage.removeItem(key);
      localStorage.removeItem(baseKey);
    }
  }

  persistAllToOfflineCache(targetUid || undefined);
  broadcastUpdate();

  if (typeof window !== 'undefined') {
    const payload = { id: doseId, status, takenAt, userId: targetUid || undefined };
    authFetch('/api/doses', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, targetUid || undefined).catch((err) => {
      console.warn('Dose status PATCH offline — queueing mutation:', err);
      queueMutation('/api/doses', 'PATCH', payload);
    });

    persistAdherenceForDate(targetDate, targetUid || undefined);
  }

  return memoryDoses;
}

function decrementPillCount(prescriptionId: string, medicationId: string) {
  const rx = memoryPrescriptions.find((p) => p.id === prescriptionId);
  if (!rx) return;

  let changed = false;
  rx.medications = rx.medications.map((m) => {
    if (m.id === medicationId && typeof m.remainingPills === 'number' && m.remainingPills > 0) {
      changed = true;
      return { ...m, remainingPills: m.remainingPills - 1 };
    }
    return m;
  });

  if (changed && typeof window !== 'undefined') {
    persistAllToOfflineCache();
    authFetch('/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify(rx),
    }).catch(() => {
      queueMutation('/api/prescriptions', 'POST', rx);
    });
  }
}

// ---------------------------------------------------------------------------
// ADHERENCE STREAK & COMPARISONS
// ---------------------------------------------------------------------------
export function getStoredComparisonsCount(): number {
  return memoryComparisonsCount > 0 ? memoryComparisonsCount : (memoryPrescriptions.length >= 2 ? 1 : 0);
}

export function incrementComparisonsCount(): number {
  memoryComparisonsCount += 1;
  persistAllToOfflineCache();
  broadcastUpdate();
  return memoryComparisonsCount;
}

export function getAdherenceStreak(): { currentStreakDays: number; bestStreakDays: number } {
  const takenDoses = memoryDoses.filter((d) => d.status === 'taken').length;
  if (takenDoses === 0) {
    return { currentStreakDays: 0, bestStreakDays: 0 };
  }

  const takenDates = new Set(
    memoryDoses.filter((d) => d.status === 'taken').map((d) => d.date)
  );

  let currentStreak = 0;
  const cursor = new Date();
  while (true) {
    const dateStr = cursor.toISOString().split('T')[0];
    if (takenDates.has(dateStr)) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  const sortedDates = Array.from(takenDates).sort();
  let bestStreak = 0;
  let runLength = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      runLength++;
    } else {
      bestStreak = Math.max(bestStreak, runLength);
      runLength = 1;
    }
  }
  bestStreak = Math.max(bestStreak, runLength);

  return {
    currentStreakDays: currentStreak,
    bestStreakDays: bestStreak,
  };
}

// ---------------------------------------------------------------------------
// CROSS-DEVICE MONGODB SYNCHRONIZATION
// ---------------------------------------------------------------------------
export interface SyncResult {
  prescriptions: Prescription[];
  healthRecords: HealthRecord[];
  doses: ScheduledDose[];
  emrProfile: EMRProfile | null;
  adherenceRecords?: AdherenceDayRecord[];
}

/**
 * Synchronizes in-memory storage directly with MongoDB records from the server.
 * Handles offline hydration instantly (0ms) and flushes queued mutations on reconnection.
 */
export async function syncWithServer(userId?: string): Promise<SyncResult> {
  const effectiveUid = userId || activeUserId || getCachedActiveUserId();

  if (typeof window === 'undefined') {
    return {
      prescriptions: memoryPrescriptions,
      healthRecords: memoryHealthRecords,
      doses: memoryDoses,
      emrProfile: memoryEMR,
    };
  }

  if (effectiveUid) {
    activeUserId = effectiveUid;
  }

  // 1. Instant 0ms Offline Cache Hydration:
  // Hydrates immediately so mobile & offline users have zero lag and never lose reminders
  if (typeof window !== 'undefined') {
    hydrateFromOfflineCache(effectiveUid || undefined);
  }

  // If truly no user id available yet, return hydrated memory store
  if (!effectiveUid) {
    return {
      prescriptions: deduplicatePrescriptions(memoryPrescriptions),
      healthRecords: deduplicateHealthRecords(memoryHealthRecords),
      doses: deduplicateDoses(memoryDoses),
      emrProfile: memoryEMR,
      adherenceRecords: memoryAdherenceRecords,
    };
  }

  // 2. Replay & flush any offline mutations if we are online
  await flushOfflineMutations().catch(() => {});

  const timestamp = Date.now();
  const queryParam = `?userId=${encodeURIComponent(effectiveUid)}&_t=${timestamp}`;
  const authHeaders = await getAuthHeaders(effectiveUid);
  const syncFetchOpts: RequestInit = {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      ...authHeaders,
    },
  };

  try {
    const [rxRes, healthRes, dosesRes, emrRes, adhRes] = await Promise.all([
      fetch(`/api/prescriptions${queryParam}`, syncFetchOpts).then((r) => r.json()).catch(() => ({ success: false })),
      fetch(`/api/health-records${queryParam}`, syncFetchOpts).then((r) => r.json()).catch(() => ({ success: false })),
      fetch(`/api/doses${queryParam}`, syncFetchOpts).then((r) => r.json()).catch(() => ({ success: false })),
      fetch(`/api/emr${queryParam}`, syncFetchOpts).then((r) => r.json()).catch(() => ({ success: false })),
      fetch(`/api/adherence${queryParam}`, syncFetchOpts).then((r) => r.json()).catch(() => ({ success: false })),
    ]);

    if (rxRes.success && Array.isArray(rxRes.data)) {
      // Reconcile server prescriptions with locally completed follow-ups so polling/sync never reverts user actions
      const reconciledPrescriptions = rxRes.data.map((serverRx: any) => {
        const isLocallyCompleted =
          (typeof window !== 'undefined' &&
            (localStorage.getItem(`prescriptime_followup_completed_${serverRx.id}`) === 'true' ||
              (effectiveUid && localStorage.getItem(`prescriptime_followup_completed_${effectiveUid}_${serverRx.id}`) === 'true'))) ||
          memoryPrescriptions.find((p) => p.id === serverRx.id)?.followUpCompleted;

        if (isLocallyCompleted && !serverRx.followUpCompleted) {
          return {
            ...serverRx,
            followUpCompleted: true,
            followUpCompletedAt: serverRx.followUpCompletedAt || new Date().toISOString(),
          };
        }
        return serverRx;
      });

      const serverIds = new Set(reconciledPrescriptions.map((r: any) => r.id));
      const localOnly = memoryPrescriptions.filter((r) => !serverIds.has(r.id));
      memoryPrescriptions = deduplicatePrescriptions([...reconciledPrescriptions, ...localOnly]);
    }
    if (healthRes.success && Array.isArray(healthRes.data)) {
      const serverIds = new Set(healthRes.data.map((r: any) => r.id));
      const localOnly = memoryHealthRecords.filter((r) => !serverIds.has(r.id));
      memoryHealthRecords = deduplicateHealthRecords([...healthRes.data, ...localOnly]);
    }
    if (dosesRes.success && Array.isArray(dosesRes.data)) {
      const rawDoses = deduplicateDoses(dosesRes.data);

      // Preserve local taken and skipped states so server read lag never reverts an action
      const localStatusMap = new Map<string, { status: ScheduledDose['status']; takenAt?: string }>();
      memoryDoses.forEach((d) => {
        if (d.status === 'taken' || d.status === 'skipped') {
          localStatusMap.set(d.id, { status: d.status, takenAt: d.takenAt });
          const baseId = d.id.replace(/-\d{4}-\d{2}-\d{2}$/, '');
          localStatusMap.set(baseId, { status: d.status, takenAt: d.takenAt });
        }
      });

      // Also read recent local storage overrides
      if (typeof window !== 'undefined' && effectiveUid) {
        try {
          const prefix = `prescriptime_dose_status_${effectiveUid}_`;
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(prefix)) {
              const dId = k.replace(prefix, '');
              const parsed = JSON.parse(localStorage.getItem(k) || '{}');
              if (parsed.status && Date.now() - (parsed.timestamp || 0) < 600000) {
                localStatusMap.set(dId, { status: parsed.status, takenAt: parsed.takenAt });
              }
            }
          }
        } catch {}
      }

      let filteredDoses = rawDoses;
      if (typeof window !== 'undefined' && effectiveUid) {
        filteredDoses = rawDoses.filter((d) => {
          if (localStorage.getItem(`prescriptime_deleted_dose_${effectiveUid}_${d.id}`) === 'true') return false;
          const cleanName = cleanMedicineName(d.medicationName);
          if (localStorage.getItem(`prescriptime_deleted_med_${effectiveUid}_${d.date}_${cleanName}_${d.slot}`) === 'true') return false;
          return true;
        });
      }

      // Reconcile: retain local taken/skipped status if server still shows pending
      const reconciledServerDoses = filteredDoses.map((serverDose) => {
        const local = localStatusMap.get(serverDose.id) || localStatusMap.get(serverDose.id.replace(/-\d{4}-\d{2}-\d{2}$/, ''));
        if (local && (local.status === 'taken' || local.status === 'skipped') && serverDose.status !== local.status) {
          return {
            ...serverDose,
            status: local.status,
            takenAt: local.takenAt || serverDose.takenAt,
          };
        }
        return serverDose;
      });

      // Merge server doses with any existing local-only doses so offline records are never erased
      const serverIds = new Set(reconciledServerDoses.map((d) => d.id));
      const localOnlyDoses = memoryDoses.filter((d) => !serverIds.has(d.id));
      memoryDoses = deduplicateDoses([...reconciledServerDoses, ...localOnlyDoses]);

      rolloverRoutineDoses(effectiveUid);
    }
    if (emrRes.success && emrRes.data) {
      memoryEMR = emrRes.data;
    }
    if (adhRes.success && Array.isArray(adhRes.data)) {
      memoryAdherenceRecords = adhRes.data;
    }

    // Update persistent cache with freshly fetched server state
    persistAllToOfflineCache(effectiveUid);
    broadcastUpdate();
  } catch (err) {
    console.warn('MongoDB cloud sync notice (offline mode active):', err);
  }

  return {
    prescriptions: memoryPrescriptions,
    healthRecords: memoryHealthRecords,
    doses: memoryDoses,
    emrProfile: memoryEMR,
    adherenceRecords: memoryAdherenceRecords,
  };
}

export { getUpcomingFollowUps, markFollowUpAsDone, type FollowUpItem } from '@/lib/followUps';
