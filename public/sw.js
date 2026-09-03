/* Jumsup service worker — push notifications only, no offline caching (keeps the
   SPA from ever serving a stale bundle). */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Jumsup", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Jumsup";
  const options = {
    body: data.body || "",
    icon: "/brand/jumsup-logo.png",
    badge: "/brand/jumsup-logo.png",
    tag: data.tag || "jumsup",
    renotify: Boolean(data.tag),
    data: { url: data.url || "/home" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
