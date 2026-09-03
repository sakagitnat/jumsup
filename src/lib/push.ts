import { api } from "./api.js";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.ready;
}

function keyB64(sub: PushSubscription, name: "p256dh" | "auth"): string {
  const raw = sub.getKey(name);
  if (!raw) return "";
  const bytes = new Uint8Array(raw);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** True when this browser currently holds a push subscription. */
export async function getPushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await registration();
    return Boolean(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/** Ask for permission, subscribe, and register the endpoint server-side. */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) throw new Error("เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("ยังไม่ได้อนุญาตการแจ้งเตือน");

  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string) as BufferSource,
    });
  }

  await api("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify({
      endpoint: sub.endpoint,
      p256dh: keyB64(sub, "p256dh"),
      auth: keyB64(sub, "auth"),
    }),
  });
  return true;
}

export async function disablePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await registration();
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
        method: "DELETE",
      }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
  } catch {
    /* ignore */
  }
}
