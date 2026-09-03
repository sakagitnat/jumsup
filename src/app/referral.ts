import { api } from "../lib/api.js";

const KEY = "jumsup_pending_ref";

/** Call once on app start: stash a ?ref=CODE from the URL so it can be claimed
 *  after the visitor signs up. */
export function capturePendingRef(): void {
  try {
    const code = new URLSearchParams(location.search).get("ref");
    if (code && /^[A-Za-z0-9_-]{4,24}$/.test(code)) {
      localStorage.setItem(KEY, code);
    }
  } catch {
    /* private mode / no storage */
  }
}

/** Call after a user signs in. If a referral code was captured before signup,
 *  claim it once and clear it. Failures are silent (already claimed, self-ref…). */
export async function claimPendingRef(): Promise<void> {
  let code: string | null = null;
  try {
    code = localStorage.getItem(KEY);
  } catch {
    return;
  }
  if (!code) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  try {
    await api("/api/referral/claim", { method: "POST", body: JSON.stringify({ code }) });
  } catch {
    /* ignore */
  }
}
