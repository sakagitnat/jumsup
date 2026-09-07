// Auth bootstrap + cloud sync. Ported verbatim in behaviour from the tail of the
// old src/app/createApp.js (hydrateFromCloud / scheduleSync / onAuthChange) so
// logged-in users keep the exact same sync semantics.

import { backendEnabled, getSession, onAuthChange, refreshSessionIfNeeded } from "../lib/auth.js";
import { loadCloudState, pushCloudState } from "../lib/cloud.js";
import { claimPendingRef } from "./referral";
import { store } from "../store/store";
import type { AppState } from "../store/types";

type User = { id: string; email?: string };

let currentUser: User | null = null;
let hydrating = false;
let lastSyncedSnapshot = "";
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncingCloud = false;
let syncPending = false;

const snapshot = (s: AppState) =>
  JSON.stringify({
    theme: s.theme,
    lang: s.lang,
    sound: s.sound,
    profile: s.profile,
    decks: s.decks,
    progress: s.progress,
    reading: s.reading,
    listening: s.listening,
    writing: s.writing,
    mocks: s.mocks,
  });

export function getCurrentUser(): User | null {
  return currentUser;
}

let onNeedsOnboarding: () => void = () => {};
export function setOnboardingHandler(fn: () => void) {
  onNeedsOnboarding = fn;
}

export async function hydrateFromCloud(user: User) {
  if (!backendEnabled || !user) return;
  hydrating = true;
  store.set({ syncing: true, backend: true, user });
  try {
    const remote = await loadCloudState(user);
    if (!remote.profile?.onboarding_completed_at) onNeedsOnboarding();
    const local = store.get();
    // Server is authoritative after sign-in; never push the browser cache here
    // (that used to resurrect deleted sets).
    store.replace({
      ...remote,
      theme: remote.profile?.ui_theme || local.theme,
      lang: remote.profile?.ui_language || local.lang,
      sound: remote.profile?.sound_enabled ?? local.sound,
      // Review schedule is device-local (official starter decks have no server
      // progress row anyway) — keep it across sign-in instead of dropping it.
      srs: local.srs,
      // Official/starter decks are seed data with no vocab_sets row, so
      // markWordMastered() tracks their "mastered" list device-locally only
      // (see actions/flashcards.ts) -- remote.progress never has an entry for
      // them. Overwriting local.progress wholesale with remote.progress used
      // to silently erase that local-only mastery every time this ran (every
      // sign-in, and every cold boot on a session that's still signed in),
      // which is why words already learned in an official deck could come
      // back "unmastered" after the app reloaded. Merge instead: remote still
      // wins per-deck for real, server-backed decks.
      progress: { ...local.progress, ...remote.progress },
      backend: true,
      syncing: false,
    });
    lastSyncedSnapshot = snapshot(store.get());
  } catch (e) {
    console.error(e);
    store.set({ syncing: false, user, backend: true });
  }
  hydrating = false;
}

export function scheduleSync() {
  if (hydrating || !currentUser || !backendEnabled) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const run = async () => {
      const user = currentUser;
      if (!user) return;
      const snap = snapshot(store.get());
      if (snap === lastSyncedSnapshot) return;
      if (syncingCloud) {
        syncPending = true;
        return;
      }
      syncingCloud = true;
      try {
        await pushCloudState(user, store.get());
        lastSyncedSnapshot = snap;
      } catch (e) {
        console.error("Sync failed", e);
      } finally {
        syncingCloud = false;
        if (syncPending) {
          syncPending = false;
          scheduleSync();
        }
      }
    };
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(run, { timeout: 2000 });
    } else {
      setTimeout(run, 0);
    }
  }, 900);
}

/** Call once on app start. */
export async function initAuth() {
  store.subscribe(scheduleSync);

  if (!backendEnabled) {
    store.set({ backend: false, user: null });
    return;
  }
  const session = await getSession();
  currentUser = session?.user ?? null;
  if (currentUser) await hydrateFromCloud(currentUser);
  else store.set({ backend: true, user: null });

  onAuthChange(async (next, event) => {
    // TOKEN_REFRESHED and INITIAL_SESSION fire for the same signed-in user on
    // every silent token renewal (roughly hourly) and on every tab-visibility
    // recheck. Re-running the full cloud hydration on those was pure overhead
    // and, if it landed mid-navigation, could show a screen as briefly empty
    // for no reason -- treat them as a no-op unless the user actually changed.
    if (
      (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") &&
      (next?.user?.id ?? null) === (currentUser?.id ?? null)
    ) {
      return;
    }
    const wasSignedOut = !currentUser;
    currentUser = next?.user ?? null;
    if (currentUser) {
      await hydrateFromCloud(currentUser);
      if (wasSignedOut) void claimPendingRef();
    } else
      store.set({
        user: null,
        profile: null,
        subscription: null,
        community: [],
        backend: true,
      });
  });

  // Mobile Safari (and PWAs added to the home screen) pause JS timers while
  // the tab is backgrounded, so autoRefreshToken's proactive renewal never
  // fires there -- the access token can sit expired for the whole time away.
  // Force a session check the moment the tab is foregrounded again, instead
  // of waiting for some other request to fail first and surface it as a
  // forced logout or a screen that looks empty.
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && currentUser) {
        void refreshSessionIfNeeded();
      }
    });
  }
}
