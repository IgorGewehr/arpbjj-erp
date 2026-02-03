/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Firebase config will be passed via the service worker query string or postMessage.
// We initialize lazily once we receive the config.
let isInitialized = false;

function initFirebase(config) {
  if (isInitialized) return;
  try {
    firebase.initializeApp(config);
    isInitialized = true;

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (!title) return;

      const notificationOptions = {
        body: body || '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: payload.data || {},
      };

      self.registration.showNotification(title, notificationOptions);
    });
  } catch (e) {
    console.error('Firebase messaging SW init error:', e);
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    initFirebase(event.data.config);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  if (data.type === 'financial') {
    url = '/portal/financeiro';
  } else if (data.type === 'competition' || data.type === 'competition_reminder') {
    url = '/competicoes';
  } else if (data.actionUrl) {
    url = data.actionUrl;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
