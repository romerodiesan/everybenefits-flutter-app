/* Firebase Cloud Messaging service worker (compat). Config is public client SDK. */
importScripts(
  "https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyDroJ-XW_BHCRvq9TWEKOInUkEt0jYasXk",
  authDomain: "every-insurance.firebaseapp.com",
  projectId: "every-insurance",
  storageBucket: "every-insurance.firebasestorage.app",
  messagingSenderId: "978334689853",
  appId: "1:978334689853:web:bf2108057fa442617d1854",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "Pulse";
  const body = payload.notification?.body || payload.data?.body || "";
  const href = payload.data?.href || "/notifications";
  return self.registration.showNotification(title, {
    body,
    data: { href, ...(payload.data || {}) },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification?.data?.href || "/notifications";
  const target = raw.startsWith("http")
    ? raw
    : new URL(raw, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              return client.navigate(target);
            }
            return undefined;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(target);
        }
        return undefined;
      },
    ),
  );
});
