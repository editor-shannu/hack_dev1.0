// Prescriptime High-Performance Offline & Background Push Service Worker v7
// v7: Instant Cross-Device Sync + Web Push API + Offline Notification Triggers
const CACHE_NAME = 'prescriptime-v8-instant-pwa';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
];

// Offline In-Worker Alarm Cache
let scheduledOfflineAlarms = [];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache assets warning:', err);
      });
    })
  );
  // Take control immediately without waiting for old SW to be removed
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      // Broadcast to all open tabs that a new SW has activated
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED' });
        });
      });
    })
  );
  self.clients.claim();
});

// ---------------------------------------------------------------------------
// OFFLINE SCHEDULED REMINDER ALARMS
// ---------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SCHEDULE_OFFLINE_ALARMS') {
    const alarms = Array.isArray(event.data.alarms) ? event.data.alarms : [];
    scheduledOfflineAlarms = alarms;

    // If Notification Triggers API is supported (Chrome/Edge PWA on mobile & desktop)
    if ('showTrigger' in Notification.prototype || typeof TimestampTrigger !== 'undefined') {
      alarms.forEach((alarm) => {
        if (alarm.timestamp && alarm.timestamp > Date.now()) {
          try {
            self.registration.showNotification(alarm.title || `💊 Medicine Time: ${alarm.medicationName}`, {
              body: alarm.body || `It's ${alarm.scheduledTime} — time to take ${alarm.medicationName}. Tap to mark as taken.`,
              icon: '/icon.svg',
              badge: '/icon.svg',
              vibrate: [250, 100, 250, 100, 250],
              tag: `offline-alarm-${alarm.doseId}`,
              renotify: true,
              showTrigger: new TimestampTrigger(alarm.timestamp),
              data: {
                url: '/',
                doseId: alarm.doseId,
                scheduledTime: alarm.scheduledTime,
                medicationName: alarm.medicationName,
              },
            });
          } catch (err) {
            console.warn('TimestampTrigger registration error:', err);
          }
        }
      });
    }
  }
});

// Internal periodic alarm check while service worker is active
setInterval(() => {
  if (!scheduledOfflineAlarms || scheduledOfflineAlarms.length === 0) return;
  const now = Date.now();
  scheduledOfflineAlarms.forEach((alarm) => {
    if (alarm.timestamp && Math.abs(now - alarm.timestamp) <= 30000 && !alarm.fired) {
      alarm.fired = true;
      self.registration.showNotification(alarm.title || `💊 Medicine Time: ${alarm.medicationName}`, {
        body: alarm.body || `It's ${alarm.scheduledTime} — time to take ${alarm.medicationName}. Tap to mark as taken.`,
        icon: '/icon.svg',
        badge: '/icon.svg',
        vibrate: [250, 100, 250, 100, 250],
        tag: `dose-alarm-${alarm.doseId}`,
        renotify: true,
        data: {
          url: '/',
          doseId: alarm.doseId,
          scheduledTime: alarm.scheduledTime,
          medicationName: alarm.medicationName,
        },
      });
    }
  });
}, 15000);

// ---------------------------------------------------------------------------
// BACKGROUND PUSH NOTIFICATIONS (Works even when PWA & browser are closed!)
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '💊 Prescriptime: Medicine Reminder';
  const options = {
    body: data.body || 'Time to take your scheduled dose. Tap to view details and mark as taken.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [250, 100, 250, 100, 250],
    tag: data.tag || 'prescriptime-med-reminder',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
      ...data.data,
    },
    actions: [
      { action: 'taken', title: 'Mark Taken' },
      { action: 'open', title: 'Open Prescriptime' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Broadcast to all open tabs so the in-app notification history log is updated
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'NOTIFICATION_RECEIVED',
            title,
            body: options.body || '',
            tag: options.tag || 'prescriptime-med-reminder',
            timestamp: Date.now(),
          });
        });
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            action: event.action,
            data: event.notification.data,
          });
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ---------------------------------------------------------------------------
// FETCH HANDLERS: Offline & Speed Optimization
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Static assets (Next.js JS/CSS chunks, fonts, icons): Cache-First for maximum mobile speed
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // API GET requests: Always fresh from network with fallback only when strictly offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Navigation (HTML Pages): Instant App Shell Cache-First with Background Revalidation
  // Eliminates white/blank screen delay on PWA launch while keeping deployment fresh
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Trigger background network fetch to keep cache warm and updated
        const networkFetch = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => null);

        // If we have a cached page, serve it instantly (0ms startup, zero blank screen)
        if (cachedResponse) {
          return cachedResponse;
        }

        // Fall back to pre-cached root shell if specific subpath is requested
        return caches.match('/').then((rootCached) => {
          if (rootCached) {
            return rootCached;
          }
          // If completely un-cached (first install), await network with fast 1.5s timeout
          return Promise.race([
            networkFetch,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
          ]).then((res) => res || caches.match('/'));
        });
      })
    );
    return;
  }

  // Other requests: Network-first with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
