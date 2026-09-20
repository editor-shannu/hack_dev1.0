'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LandingPage } from '@/components/landing/LandingPage';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { GlowingMeshBg } from '@/components/ui/GlowingMeshBg';
import { DailyScheduleTimeline } from '@/components/schedule/DailyScheduleTimeline';
import { AdherenceStreak } from '@/components/schedule/AdherenceStreak';
import { AdherenceReport } from '@/components/schedule/AdherenceReport';
import { PrescriptionCabinet } from '@/components/organizer/PrescriptionCabinet';
import { PrescriptionDetailsModal } from '@/components/organizer/PrescriptionDetailsModal';
import { HealthRecordDetailsModal } from '@/components/organizer/HealthRecordDetailsModal';
import { EditPrescriptionModal } from '@/components/organizer/EditPrescriptionModal';
import { EditHealthRecordModal } from '@/components/organizer/EditHealthRecordModal';
import { DocumentUploadModal } from '@/components/upload/DocumentUploadModal';
import {
  getStoredPrescriptions,
  getStoredHealthRecords,
  getStoredDoses,
  saveDoses,
  deleteDose,
  updateDoseStatus,
  getAdherenceStreak,
  getStoredComparisonsCount,
  incrementComparisonsCount,
  getStoredEMRProfile,
  syncWithServer,
  rolloverRoutineDoses,
  getUpcomingFollowUps,
  markFollowUpAsDone,
  type FollowUpItem,
} from '@/lib/storage';
import {
  checkAndNotifyMissedMedications,
  checkAndNotifyScheduledDoses,
  checkAndNotifyExactScheduledDoses,
  subscribeToPushNotifications,
} from '@/lib/notifications';
import { calculateAdherenceScore } from '@/lib/scheduleEngine';
import { deduplicateMedications } from '@/lib/deduplication';
import { comparePrescriptions, PrescriptionDiffResult } from '@/lib/prescriptionDiff';
import { PrescriptionDiffView } from '@/components/organizer/PrescriptionDiffView';
import { EMRProfileModal } from '@/components/profile/EMRProfileModal';
import { EMRShareModal } from '@/components/profile/EMRShareModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { NotificationsModal } from '@/components/notifications/NotificationsModal';
import { EMRProfile } from '@/types/emr';
import { Prescription, ScheduledDose, HealthRecord } from '@/types/prescription';
import { 
  Loader2, 
  Search, 
  Pill,
  FileText,
  ArrowLeftRight,
  Check,
  Upload,
  Clock,
  Folder,
  BarChart2,
  Hospital,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  HeartPulse,
  CalendarClock,
  Calendar,
  AlertCircle,
  Stethoscope,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'schedule' | 'cabinet' | 'adherence'>('schedule');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [editingRx, setEditingRx] = useState<Prescription | null>(null);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [targetEMRMember, setTargetEMRMember] = useState<string>('self');
  const [targetEMRName, setTargetEMRName] = useState<string>('');
  const [activeDiff, setActiveDiff] = useState<{
    oldRx: Prescription;
    newRx: Prescription;
    diffResult: PrescriptionDiffResult;
  } | null>(null);

  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() => {
    if (typeof window !== 'undefined') return getStoredPrescriptions();
    return [];
  });
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>(() => {
    if (typeof window !== 'undefined') return getStoredHealthRecords();
    return [];
  });
  const [doses, setDoses] = useState<ScheduledDose[]>(() => {
    if (typeof window !== 'undefined') return getStoredDoses();
    return [];
  });
  const [streakData, setStreakData] = useState(() => {
    if (typeof window !== 'undefined') return getAdherenceStreak();
    return { currentStreakDays: 0, bestStreakDays: 0 };
  });
  const [comparisonsCount, setComparisonsCount] = useState<number>(() => {
    if (typeof window !== 'undefined') return getStoredComparisonsCount();
    return 0;
  });

  // Dynamic Live Time & Greeting State
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // EMR Profile State
  const [emrProfile, setEmrProfile] = useState<EMRProfile | null>(() => {
    if (typeof window !== 'undefined') return getStoredEMRProfile();
    return null;
  });
  const [isEMROpen, setIsEMROpen] = useState(false);
  const [isEMRShareOpen, setIsEMRShareOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<{ title: string; body?: string } | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [readNotifKey, setReadNotifKey] = useState(0);

  const refreshData = () => {
    setPrescriptions(getStoredPrescriptions());
    setHealthRecords(getStoredHealthRecords());
    setDoses(getStoredDoses());
    setStreakData(getAdherenceStreak());
    setComparisonsCount(getStoredComparisonsCount());
    setEmrProfile(getStoredEMRProfile());
    setReadNotifKey((prev) => prev + 1);
  };

  useEffect(() => {
    let isMounted = true;

    // Instant local refresh on mount so the user never sees 0s while syncing with the server
    refreshData();

    // Check immediately on mount/auth if this is a brand new user or an account without EMR setup
    const activeUid = user?.uid || (typeof window !== 'undefined' ? (() => {
      try {
        const u = JSON.parse(localStorage.getItem('prescriptime_active_user') || localStorage.getItem('prescriptime_test_session') || '{}');
        return u.uid || undefined;
      } catch { return undefined; }
    })() : undefined);

    if (activeUid) {
      const isNewUser = typeof window !== 'undefined' && (
        sessionStorage.getItem('prescriptime_is_new_user') === 'true' ||
        sessionStorage.getItem('prescriptime_emr_onboarding_pending') === 'true'
      );
      const sessionKey = `prescriptime_emr_onboarding_${activeUid}`;
      const localEMR = getStoredEMRProfile();
      const isLocalEmpty = !localEMR || !localEMR.fullName || localEMR.fullName.trim() === '';
      if ((isNewUser || isLocalEmpty) && !sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, 'true');
        if (isNewUser && typeof window !== 'undefined') {
          sessionStorage.removeItem('prescriptime_is_new_user');
          sessionStorage.removeItem('prescriptime_emr_onboarding_pending');
        }
        setIsEMROpen(true);
      }
    }

    const performSync = () => {
      if (!isMounted) return;
      syncWithServer(user?.uid)
        .then((synced) => {
          if (!isMounted) return;
          setPrescriptions([...synced.prescriptions]);
          setHealthRecords([...synced.healthRecords]);
          setDoses([...synced.doses]);
          setStreakData(getAdherenceStreak());
          setComparisonsCount(getStoredComparisonsCount());
          setEmrProfile(synced.emrProfile);

          // Prompt EMR Profile onboarding modal for new account users who don't have one yet
          const effectiveUid = user?.uid || activeUid;
          if (effectiveUid) {
            const sessionKey = `prescriptime_emr_onboarding_${effectiveUid}`;
            const isProfileEmpty = !synced.emrProfile || !synced.emrProfile.fullName || synced.emrProfile.fullName.trim() === '';
            if (isProfileEmpty && !sessionStorage.getItem(sessionKey)) {
              sessionStorage.setItem(sessionKey, 'true');
              setIsEMROpen(true);
            }
          }

          // Check for missed medications and scheduled reminders
          if (synced.doses.length > 0) {
            checkAndNotifyMissedMedications(synced.doses);
            checkAndNotifyScheduledDoses(synced.doses);
          }

          // Push subscription registration
          if (user?.uid && synced.doses.length > 0) {
            subscribeToPushNotifications(user.uid, synced.doses).catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('MongoDB synchronization error:', err);
        });
    };

    // Initial sync
    performSync();

    const handleUpdate = () => refreshData();
    const handleAlarm = (e: any) => {
      if (e.detail) {
        setActiveAlarm({
          title: e.detail.title || 'Medicine Reminder',
          body: e.detail.options?.body,
        });
      }
    };

    // Real-time synchronization triggers between mobile and desktop without manual page refresh
    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        performSync();
      }
    };

    window.addEventListener('prescriptime-data-updated', handleUpdate);
    window.addEventListener('prescriptime-notifications-read', handleUpdate);
    window.addEventListener('prescriptime-dose-alarm', handleAlarm);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('online', performSync);

    // Service Worker message listener: opens Notifications panel when user clicks a push notification
    // The SW sends NOTIFICATION_CLICKED when the user taps a system notification
    // The SW sends NOTIFICATION_RECEIVED when a background push fires (even when app is closed)
    const handleSWMessage = (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === 'NOTIFICATION_CLICKED') {
        // Focus the window and open the notifications modal
        window.focus();
        setIsNotificationsOpen(true);
      } else if (event.data.type === 'NOTIFICATION_RECEIVED') {
        // Log background push notification to persistent history
        import('@/lib/notifications').then(({ logNotificationToHistory }) => {
          logNotificationToHistory({
            title: event.data.title || 'Prescriptime Reminder',
            body: event.data.body || '',
            tag: event.data.tag || 'push',
          });
        }).catch(() => {});
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    // Continuous real-time polling heartbeat (every 5 seconds) so mobile and desktop sync seamlessly in real time
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && user?.uid) {
        performSync();
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('prescriptime-data-updated', handleUpdate);
      window.removeEventListener('prescriptime-notifications-read', handleUpdate);
      window.removeEventListener('prescriptime-dose-alarm', handleAlarm);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('online', performSync);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [user?.uid]);


  const handleStatusChange = (
    doseId: string,
    status: 'taken' | 'skipped' | 'snoozed' | 'pending'
  ) => {
    const updated = updateDoseStatus(doseId, status);
    setDoses([...updated]);
  };

  const handleDeleteDose = (doseId: string) => {
    const updated = deleteDose(doseId, user?.uid);
    setDoses([...updated]);
  };

  // Continuous background ticker: checks for exact scheduled dose times every 10 seconds
  useEffect(() => {
    if (doses.length === 0) return;
    const checkScheduledTimes = () => {
      checkAndNotifyExactScheduledDoses(doses);
    };

    checkScheduledTimes();
    const timer = setInterval(checkScheduledTimes, 10000);
    return () => clearInterval(timer);
  }, [doses]);

  // Pure local today string (IST safe)
  const todayStr = useMemo(() => {
    const _nowD = new Date();
    return `${_nowD.getFullYear()}-${String(_nowD.getMonth() + 1).padStart(2, '0')}-${String(_nowD.getDate()).padStart(2, '0')}`;
  }, [currentTime]);

  // Selected date state synced with the daily timeline navigator
  const [selectedTimelineDate, setSelectedTimelineDate] = useState<string>('');
  const activeSelectedDate = selectedTimelineDate || todayStr;

  // Selected date doses: filter strictly for activeSelectedDate (shows 0/0 if selected date has no routine)
  const selectedDateDoses = useMemo(() => {
    return doses.filter((d) => d.date === activeSelectedDate);
  }, [doses, activeSelectedDate]);

  const isSelectedDateToday = activeSelectedDate === todayStr;
  const { adherenceRate, total, taken } = calculateAdherenceScore(selectedDateDoses);

  const formattedSelectedDateShort = useMemo(() => {
    const [y, m, dayNum] = activeSelectedDate.split('-').map(Number);
    const d = new Date(y, (m || 1) - 1, dayNum || 1);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
    });
  }, [activeSelectedDate]);

  // Dynamic Time-Based Greeting
  const currentHour = currentTime.getHours();
  const timeGreeting =
    currentHour >= 5 && currentHour < 12
      ? 'Good morning'
      : currentHour >= 12 && currentHour < 17
      ? 'Good afternoon'
      : currentHour >= 17 && currentHour < 22
      ? 'Good evening'
      : 'Good night';

  const formattedDate = currentTime.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Computed Real Stat Data (Active prescriptions and unique tracked medications skipping duplicates)
  const activeRxList = prescriptions.filter((p) => p.status === 'active');
  const targetRxList = activeRxList.length > 0 ? activeRxList : prescriptions;
  const activePrescriptionsCount = targetRxList.length;
  const allMedsList = targetRxList.flatMap((rx) => rx.medications || []);
  const uniqueTrackedMeds = deduplicateMedications(allMedsList);
  const totalMedicationsCount = uniqueTrackedMeds.length;

  // Computed Unread Notifications Count (Missed doses past due today, excluding marked-as-read items)
  const unreadNotificationsCount = useMemo(() => {
    let readIds: string[] = [];
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('prescriptime_read_notifications');
        if (stored) readIds = JSON.parse(stored);
      } catch {}
    }

    // Use local calendar date — toISOString() returns UTC which causes date-drift in IST
    const _nowD = new Date();
    const today = `${_nowD.getFullYear()}-${String(_nowD.getMonth() + 1).padStart(2, '0')}-${String(_nowD.getDate()).padStart(2, '0')}`;
    const unreadMissed = doses.filter((d) => {
      if (d.date !== today) return false;
      if (d.status === 'taken' || d.status === 'skipped') return false;
      if (d.reminderEnabled === false) return false;
      if (readIds.includes(d.id)) return false;

      const slotTimes: Record<string, number> = {
        morning: 11,
        afternoon: 16,
        evening: 20,
        night: 23,
      };
      const cutoff = slotTimes[d.slot] || 12;
      return currentHour > cutoff;
    }).length;

    return unreadMissed;
  }, [doses, currentHour, readNotifKey]);

  // Computed Upcoming Doctor Follow-Up Consultations (Prescriptions with follow-up dates)
  const followUps = useMemo<FollowUpItem[]>(() => {
    return getUpcomingFollowUps(user?.uid || undefined);
  }, [prescriptions, user?.uid]);

  const [followUpDoneFeedback, setFollowUpDoneFeedback] = useState<string | null>(null);

  const handleMarkFollowUpDone = (prescriptionId: string, doctorName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    markFollowUpAsDone(prescriptionId, user?.uid);
    const updated = getStoredPrescriptions(user?.uid);
    setPrescriptions([...updated]);
    setFollowUpDoneFeedback(`Follow-up with ${doctorName} marked as done!`);
    setTimeout(() => {
      setFollowUpDoneFeedback(null);
    }, 3500);
  };

  // Quick Action: Compare Prescriptions Handler
  const handleCompareQuickAction = () => {
    if (prescriptions.length >= 2) {
      const sorted = [...prescriptions].sort(
        (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
      );
      const newRx = sorted[0];
      const oldRx = sorted[1];
      const diff = comparePrescriptions(oldRx, newRx);
      setActiveDiff({ oldRx, newRx, diffResult: diff });
      incrementComparisonsCount();
      setComparisonsCount(getStoredComparisonsCount());
    } else {
      setActiveTab('cabinet');
    }
  };

  // Search Results Filter across Prescriptions, Medications, and Hospital Records
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;

    const matchedPrescriptions = prescriptions.filter(
      (rx) =>
        rx.title.toLowerCase().includes(query) ||
        rx.doctorName?.toLowerCase().includes(query) ||
        rx.clinicOrHospital?.toLowerCase().includes(query) ||
        rx.diagnosis?.toLowerCase().includes(query)
    );

    const matchedMedications: Array<{ med: any; rx: Prescription }> = [];
    prescriptions.forEach((rx) => {
      (rx.medications || []).forEach((m) => {
        if (
          m.name.toLowerCase().includes(query) ||
          m.genericName?.toLowerCase().includes(query) ||
          m.dosage.toLowerCase().includes(query) ||
          m.instructions?.toLowerCase().includes(query) ||
          m.timing?.toLowerCase().includes(query)
        ) {
          matchedMedications.push({ med: m, rx });
        }
      });
    });

    const matchedRecords = healthRecords.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.categoryLabel.toLowerCase().includes(query) ||
        r.clinicOrHospital?.toLowerCase().includes(query) ||
        r.doctorName?.toLowerCase().includes(query) ||
        r.diagnosisOrTest?.toLowerCase().includes(query) ||
        r.summary?.toLowerCase().includes(query)
    );

    return {
      prescriptions: matchedPrescriptions,
      medications: matchedMedications,
      healthRecords: matchedRecords,
      totalMatches: matchedPrescriptions.length + matchedMedications.length + matchedRecords.length,
    };
  }, [searchQuery, prescriptions, healthRecords]);

  // 1. Loading State
  if (loading) {
    return (
      <main className="relative min-h-screen flex items-center justify-center bg-[#F8FAFC] overflow-hidden">
        <GlowingMeshBg />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <Loader2 className="w-6 h-6 animate-spin text-[#0F58B6]" />
          </div>
          <p className="text-sm font-semibold text-slate-600">Loading Prescriptime...</p>
        </div>
      </main>
    );
  }

  // 2. Unauthenticated State: Show Creative 3D Landing Page
  if (!user) {
    return <LandingPage />;
  }

  // 3. Authenticated State: Show Dashboard
  return (
    <main className="relative min-h-screen pb-36 pt-2 sm:pt-4 sm:pb-16 overflow-x-hidden bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors" id="dashboard-main-container">
      {/* Background Animated Gradient Mesh */}
      <GlowingMeshBg />

      {/* Floating Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenEMR={() => setIsEMRShareOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6">

        {/* ACTIVE DOSE REMINDER ALARM BANNER */}
        {activeAlarm && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/80 shadow-lg text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                🔔
              </div>
              <div>
                <p className="text-sm font-bold">{activeAlarm.title}</p>
                <p className="text-xs opacity-90">{activeAlarm.body}</p>
              </div>
            </div>
            <button
              onClick={() => setActiveAlarm(null)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TOP HERO CARD (Updated to Clinical Blue Palette from Landing & Sign-in)   */}
        {/* ========================================================================= */}
        <section 
          className="relative rounded-[24px] sm:rounded-3xl p-5 sm:p-8 bg-gradient-to-br from-[#0B58B6] via-[#1572D3] to-[#00A8FF] text-white shadow-xl shadow-blue-900/15"
          id="dashboard-hero-card"
        >
          {/* Subtle decorative background circles constrained within rounded card */}
          <div className="absolute inset-0 overflow-hidden rounded-[24px] sm:rounded-3xl pointer-events-none">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-950/20 rounded-full blur-xl translate-y-1/3 -translate-x-1/4" />
          </div>

          {/* Top Bar inside Card: User Greeting */}
          <div className="relative z-10 flex items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] sm:text-xs font-semibold tracking-wide text-blue-100 uppercase font-mono bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20">
                  {formattedDate} • {formattedTime}
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug text-white break-words">
                {timeGreeting}, <span className="underline decoration-white/40 decoration-wavy underline-offset-4">{user.displayName || 'Patient'}</span>
              </h1>
              <p className="text-xs sm:text-base font-bold text-white/90">
                Let&apos;s organize your prescriptions &amp; build your medicine routine!
              </p>
              <p className="text-[11px] sm:text-xs text-blue-100/90 font-medium pt-0.5">
                Active Prescription Organizer • Medicine Dose Schedule • Hospital Records
              </p>
            </div>
          </div>

          {/* Search Bar Pill inside Hero Card with Live Dropdown */}
          <div className="relative z-20 mt-3 sm:mt-5 max-w-xl">
            <div className="relative flex items-center bg-white rounded-2xl shadow-md shadow-blue-950/20 transition-all focus-within:ring-2 focus-within:ring-white">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 ml-3 sm:ml-4 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                placeholder="Search medications, doses, lab reports, instructions..."
                className="w-full py-2.5 sm:py-3.5 pl-2.5 sm:pl-3 pr-3 sm:pr-4 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 bg-transparent rounded-2xl focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mr-3 text-xs text-slate-400 hover:text-slate-600 font-bold px-1.5 py-0.5"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Live Interactive Search Results Dropdown */}
            {isSearchFocused && searchResults && (
              <div 
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 text-slate-900 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2"
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Search Results</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {searchResults.totalMatches} matches found
                  </span>
                </div>

                {searchResults.totalMatches === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No medications, prescriptions, or records matching &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : (
                  <div className="p-2 space-y-3">
                    {/* Matching Medications */}
                    {searchResults.medications.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-mono uppercase font-bold text-[#0F58B6] flex items-center gap-1">
                          <Pill className="w-3 h-3" />
                          <span>Medications ({searchResults.medications.length})</span>
                        </div>
                        <div className="space-y-1 mt-1">
                          {searchResults.medications.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSelectedRx(item.rx);
                                setIsSearchFocused(false);
                              }}
                              className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-between group"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-900 group-hover:text-[#0F58B6]">
                                  {item.med.name}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {item.med.dosage} • {item.med.frequency} • {item.med.timing || 'Anytime'}
                                </p>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 group-hover:text-blue-600">
                                View Rx →
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Prescriptions */}
                    {searchResults.prescriptions.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="px-2 py-1 text-[10px] font-mono uppercase font-bold text-slate-600 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-blue-600" />
                          <span>Prescriptions ({searchResults.prescriptions.length})</span>
                        </div>
                        <div className="space-y-1 mt-1">
                          {searchResults.prescriptions.map((rx) => (
                            <button
                              key={rx.id}
                              type="button"
                              onClick={() => {
                                setSelectedRx(rx);
                                setIsSearchFocused(false);
                              }}
                              className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-between group"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-900 group-hover:text-[#0F58B6]">
                                  {rx.title}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {rx.doctorName || 'Doctor'} • {rx.clinicOrHospital || 'Clinic'} • {rx.date}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Hospital Records */}
                    {searchResults.healthRecords.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="px-2 py-1 text-[10px] font-mono uppercase font-bold text-emerald-700 flex items-center gap-1">
                          <Hospital className="w-3 h-3 text-emerald-600" />
                          <span>Hospital Records ({searchResults.healthRecords.length})</span>
                        </div>
                        <div className="space-y-1 mt-1">
                          {searchResults.healthRecords.map((rec) => (
                            <button
                              key={rec.id}
                              type="button"
                              onClick={() => {
                                setSelectedRecord(rec);
                                setIsSearchFocused(false);
                              }}
                              className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-between group"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                                  {rec.title}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {rec.categoryLabel} • {rec.clinicOrHospital || 'Hospital'} • {rec.date}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* STAT-SUMMARY TILE ROW (Prescriptions, Meds, Records, Doses)               */}
        {/* ========================================================================= */}
        <section className="space-y-3" id="stats-summary-section">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Stat 1: Active Prescriptions */}
            <div 
              id="stat-tile-prescriptions"
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#0F58B6] dark:text-blue-400 stroke-[2.2]" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight" id="stat-active-prescriptions-count">
                  {activePrescriptionsCount}
                </div>
                <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  Active prescriptions
                </div>
              </div>
            </div>

            {/* Stat 2: Medications Tracked */}
            <div 
              id="stat-tile-medications"
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center">
                  <Pill className="w-5 h-5 text-[#0F58B6] dark:text-blue-400 stroke-[2.2]" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight" id="stat-medications-tracked-count">
                  {totalMedicationsCount}
                </div>
                <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  Medications tracked
                </div>
              </div>
            </div>

            {/* Stat 3: Hospital Records */}
            <div 
              id="stat-tile-hospital-records"
              onClick={() => setActiveTab('cabinet')}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center">
                  <Hospital className="w-5 h-5 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {healthRecords.length}
                </div>
                <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  Hospital &amp; Lab records
                </div>
              </div>
            </div>

            {/* Stat 4: Doses Logged */}
            <div 
              id="stat-tile-doses"
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center">
                  <Check className="w-5 h-5 text-[#0F58B6] dark:text-blue-400 stroke-[2.5]" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight" id="stat-doses-logged-count">
                  {taken}/{total}
                </div>
                <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {isSelectedDateToday ? 'Doses logged today' : `Doses logged (${formattedSelectedDateShort})`}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* UPCOMING DOCTOR FOLLOW-UPS BANNER (Omitted when zero follow-ups)          */}
        {/* ========================================================================= */}
        {(followUps.length > 0 || followUpDoneFeedback) && (
          <section className="space-y-3" id="follow-ups-section">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center">
                  <CalendarClock className="w-4 h-4 text-[#0F58B6] dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span>Doctor Follow-Ups</span>
                    {followUps.length > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#0F58B6] dark:text-blue-300 font-bold">
                        {followUps.length}
                      </span>
                    )}
                  </h2>
                </div>
              </div>

              {followUpDoneFeedback && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-xs">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>{followUpDoneFeedback}</span>
                </div>
              )}
            </div>

            {followUps.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {followUps.map((item) => {
                  const isOverdue = item.status === 'overdue';
                  const isToday = item.status === 'today';

                  const badgeClasses = isOverdue
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50'
                    : isToday
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-[#0F58B6] dark:text-blue-300 border-blue-200 dark:border-blue-900/50';

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedRx(item.prescription)}
                      className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#0F58B6] dark:hover:border-blue-500 transition-all flex flex-col justify-between text-left group cursor-pointer active:scale-[0.99]"
                      title={`View prescription: ${item.prescription.title}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-blue-50 dark:group-hover:bg-blue-950 group-hover:text-[#0F58B6] transition-colors">
                            <Stethoscope className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#0F58B6] dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                              {item.doctorName}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {item.clinicOrHospital}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap flex items-center gap-1 ${badgeClasses}`}
                        >
                          {isOverdue && <AlertCircle className="w-3 h-3" />}
                          {item.label}
                        </span>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.formattedDate}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleMarkFollowUpDone(item.prescriptionId, item.doctorName, e)}
                            id={`mark-followup-done-${item.prescriptionId}`}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer"
                            title="Mark follow-up consultation as completed"
                          >
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Mark as Done</span>
                          </button>

                          <span className="text-[11px] font-bold text-[#0F58B6] dark:text-blue-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            <span>Details</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* QUICK ACTIONS GRID                                                        */}
        {/* ========================================================================= */}
        <section className="space-y-3" id="quick-actions-section">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              Quick actions
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            {/* Tile 1: Upload Document */}
            <button
              id="quick-action-upload"
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#0F58B6] dark:hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-slate-800/60 active:scale-95 transition-all flex flex-col items-center justify-center gap-2.5 group cursor-pointer text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:border-blue-200 dark:group-hover:border-blue-800 transition-colors">
                <Upload className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-[#0F58B6] dark:group-hover:text-blue-400 transition-colors stroke-[2]" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#0F58B6] dark:group-hover:text-blue-400 transition-colors">
                Upload Document
              </span>
            </button>

            {/* Tile 2: Today's Routine */}
            <button
              id="quick-action-routine"
              type="button"
              onClick={() => setActiveTab('schedule')}
              className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#0F58B6] dark:hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-slate-800/60 active:scale-95 transition-all flex flex-col items-center justify-center gap-2.5 group cursor-pointer text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:border-blue-200 dark:group-hover:border-blue-800 transition-colors">
                <Clock className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-[#0F58B6] dark:group-hover:text-blue-400 transition-colors stroke-[2]" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#0F58B6] dark:group-hover:text-blue-400 transition-colors">
                Routine
              </span>
            </button>

            {/* Tile 3: Cabinet & Records */}
            <button
              id="quick-action-cabinet"
              type="button"
              onClick={() => setActiveTab('cabinet')}
              className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#0F58B6] dark:hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-slate-800/60 active:scale-95 transition-all flex flex-col items-center justify-center gap-2.5 group cursor-pointer text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:border-blue-200 dark:group-hover:border-blue-800 transition-colors">
                <Folder className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-[#0F58B6] dark:group-hover:text-blue-400 transition-colors stroke-[2]" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#0F58B6] dark:group-hover:text-blue-400 transition-colors">
                Rx &amp; Lab records
              </span>
            </button>

            {/* Tile 4: Compare Rx */}
            <button
              id="quick-action-compare"
              type="button"
              onClick={handleCompareQuickAction}
              className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#0F58B6] dark:hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-slate-800/60 active:scale-95 transition-all flex flex-col items-center justify-center gap-2.5 group cursor-pointer text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:border-blue-200 dark:group-hover:border-blue-800 transition-colors">
                <ArrowLeftRight className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-[#0F58B6] dark:group-hover:text-blue-400 transition-colors stroke-[2]" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#0F58B6] dark:group-hover:text-blue-400 transition-colors">
                Compare Rx
              </span>
            </button>

            {/* Tile 5: EMR & AI Analysis */}
            <button
              id="quick-action-emr"
              type="button"
              onClick={() => setIsEMRShareOpen(true)}
              className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#0F58B6] dark:hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-slate-800/60 active:scale-95 transition-all flex flex-col items-center justify-center gap-2.5 group cursor-pointer text-center col-span-2 sm:col-span-1"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:border-blue-200 dark:group-hover:border-blue-800 transition-colors">
                <Sparkles className="w-5 h-5 text-amber-500 group-hover:text-[#0F58B6] dark:group-hover:text-blue-400 transition-colors stroke-[2]" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#0F58B6] dark:group-hover:text-blue-400 transition-colors">
                EMR &amp; AI Report
              </span>
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TAB ROUTING                                                               */}
        {/* ========================================================================= */}

        {/* TAB 1: DAILY ROUTINE / SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <AdherenceStreak
              currentStreakDays={streakData.currentStreakDays}
              bestStreakDays={streakData.bestStreakDays}
              adherenceRate={total > 0 ? adherenceRate : 0}
              takenCount={taken}
              totalCount={total}
              dateLabel={isSelectedDateToday ? 'today' : formattedSelectedDateShort}
            />

            <DailyScheduleTimeline
              doses={doses}
              onStatusChange={handleStatusChange}
              onDeleteDose={handleDeleteDose}
              onOpenUpload={() => setIsUploadOpen(true)}
              prescriptions={prescriptions}
              userId={user?.uid}
              selectedDate={activeSelectedDate}
              onSelectDate={(newDate) => setSelectedTimelineDate(newDate)}
              onUpdateDoses={(updated) => {
                const saved = saveDoses(updated, user?.uid);
                setDoses([...saved]);
              }}
            />
          </div>
        )}

        {/* TAB 2: PRESCRIPTION & HOSPITAL RECORDS CABINET */}
        {activeTab === 'cabinet' && (
          <div className="space-y-6">
            <PrescriptionCabinet
              prescriptions={prescriptions}
              healthRecords={healthRecords}
              onViewDetails={(rx) => setSelectedRx(rx)}
              onViewHealthRecord={(rec) => setSelectedRecord(rec)}
              onEditPrescription={(rx) => setEditingRx(rx)}
              onEditHealthRecord={(rec) => setEditingRecord(rec)}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          </div>
        )}

        {/* TAB 3: ADHERENCE REPORT */}
        {activeTab === 'adherence' && (
          <div className="space-y-4">
            <AdherenceReport
              doses={doses}
              prescriptions={prescriptions}
              healthRecords={healthRecords}
              emrProfile={emrProfile}
              onViewHealthRecord={(rec) => setSelectedRecord(rec)}
              onViewPrescription={(rx) => setSelectedRx(rx)}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          </div>
        )}

      </div>

      {/* FLOATING MOBILE BOTTOM NAVIGATION */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenEMR={() => setIsEMRShareOpen(true)}
      />

      {/* MODAL 1: Upload Document & Extraction Flow */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(_newRx, _newRecord) => {
          refreshData();
        }}
      />

      {/* MODAL 2: View Full Prescription Details (Dual Original / Digital View & Print) */}
      <PrescriptionDetailsModal
        prescription={selectedRx}
        onClose={() => setSelectedRx(null)}
        onEdit={(rx) => {
          setSelectedRx(null);
          setEditingRx(rx);
        }}
        onUpdate={(updated) => {
          setSelectedRx(updated);
          refreshData();
        }}
      />

      {/* MODAL 3: View Hospital Record Details (Dual Original / Digital View & Print) */}
      <HealthRecordDetailsModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onEdit={(rec) => {
          setSelectedRecord(null);
          setEditingRecord(rec);
        }}
      />

      {/* MODAL 4: Prescription Diff View (Comparison Flow) */}
      {activeDiff && (
        <PrescriptionDiffView
          oldRx={activeDiff.oldRx}
          newRx={activeDiff.newRx}
          diffResult={activeDiff.diffResult}
          onClose={() => setActiveDiff(null)}
        />
      )}

      {/* MODAL 5: Emergency Medical Profile (EMR) Form Modal */}
      <EMRProfileModal
        isOpen={isEMROpen}
        initialData={targetEMRMember === 'self' ? emrProfile : null}
        targetMemberKey={targetEMRMember}
        targetMemberLabel={targetEMRName}
        defaultFullName={targetEMRMember === 'self' ? (user?.displayName || (user?.email ? user.email.split('@')[0] : '')) : targetEMRName}
        onClose={() => {
          setIsEMROpen(false);
          setTargetEMRMember('self');
          setTargetEMRName('');
        }}
        onSaved={(profile) => {
          if (targetEMRMember === 'self') {
            setEmrProfile(profile);
          }
          refreshData();
        }}
      />

      {/* MODAL 6: Emergency Card, Combined Health Records & AI Analysis Modal */}
      <EMRShareModal
        isOpen={isEMRShareOpen}
        profile={emrProfile}
        prescriptions={prescriptions}
        healthRecords={healthRecords}
        onClose={() => setIsEMRShareOpen(false)}
        onEditProfile={(targetMember, targetName) => {
          setTargetEMRMember(targetMember || 'self');
          setTargetEMRName(targetName || '');
          setIsEMRShareOpen(false);
          setIsEMROpen(true);
        }}
      />

      {/* MODAL 7: App Preferences & Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* MODAL 8: Notifications & Alerts Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        doses={doses}
        prescriptions={prescriptions}
        onMarkDoseTaken={(doseId) => handleStatusChange(doseId, 'taken')}
        onOpenSettings={() => {
          setIsNotificationsOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      {/* MODAL 9: Edit Prescription Modal */}
      {editingRx && (
        <EditPrescriptionModal
          isOpen={!!editingRx}
          prescription={editingRx}
          onClose={() => setEditingRx(null)}
          onSaved={() => {
            setEditingRx(null);
            refreshData();
          }}
        />
      )}

      {/* MODAL 10: Edit Health Record Modal */}
      {editingRecord && (
        <EditHealthRecordModal
          isOpen={!!editingRecord}
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSaved={() => {
            setEditingRecord(null);
            refreshData();
          }}
        />
      )}
    </main>
  );
}
