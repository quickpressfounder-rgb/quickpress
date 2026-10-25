// QuickPress Partner — Firebase Cloud Messaging Service Worker
// Listens for background incoming order notifications and status updates.

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const notification = payload.notification || {};
    const data = payload.data || {};

    const title = notification.title || data.title || "⚡ New Order Received!";
    const body = notification.body || data.body || data.message || "A new order requires partner acceptance.";
    const icon = notification.icon || data.icon || "/favicon.png";
    const clickUrl = data.url || (data.orderId ? `/orders/${data.orderId}` : "/orders");

    const options = {
      body: body,
      icon: icon,
      badge: "/favicon.png",
      vibrate: [300, 100, 300, 100, 300],
      tag: data.orderId ? `partner_order_${data.orderId}` : "quickpress_partner_notification",
      renotify: true,
      requireInteraction: true,
      data: {
        url: clickUrl,
        orderId: data.orderId,
        ...data,
      },
      actions: [
        { action: "accept", title: "View Order" },
        { action: "dismiss", title: "Dismiss" },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.debug("[Partner-FCM-SW] Error parsing push payload:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || "/orders";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            client.focus();
            if (event.action === "go_online") {
              client.postMessage({ type: "QP_GO_ONLINE" });
            } else if (event.action === "accept" && event.notification.data?.orderId) {
              client.postMessage({ type: "QP_ACCEPT_ORDER", orderId: event.notification.data.orderId });
            }
            if ("navigate" in client && targetUrl) {
              return client.navigate(targetUrl);
            }
            return client;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
