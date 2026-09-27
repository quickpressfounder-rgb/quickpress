try {
  importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");
} catch (swErr) {
  // Offline or blocked CDN — native push events below still function
  console.debug("[FCM-SW] Firebase scripts loaded with notice:", swErr);
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Fallback native push event handler if custom payload structure received
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const notification = payload.notification || {};
    const data = payload.data || {};

    const title = notification.title || data.title || "QuickPress Laundry";
    const body = notification.body || data.body || data.message || "You have a new update.";
    const icon = notification.icon || data.icon || "/favicon.png";
    const clickUrl = data.url || data.click_action || "/";

    const options = {
      body: body,
      icon: icon,
      badge: "/favicon.png",
      vibrate: [200, 100, 200],
      tag: data.orderId || "quickpress_notification",
      renotify: true,
      data: {
        url: clickUrl,
        orderId: data.orderId,
        ...data,
      },
      actions: [
        { action: "open", title: "View Details" },
        { action: "dismiss", title: "Close" },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.debug("[FCM-SW] Error parsing push payload:", err);
  }
});

// Handle notification click -> open deep link or focus existing window
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If an open window exists, focus it and navigate
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            client.focus();
            if ("navigate" in client) {
              return client.navigate(targetUrl);
            }
            return client;
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
