import { api } from "../lib/api.js";
import { backendEnabled } from "../lib/supabase.js";
import { startDailyFeature } from "../lib/policy.js";
import { store } from "../store/store";
import { getCurrentUser } from "../app/cloudSync";
import { proPopup, toast } from "../ui/toast";
import type { PracticeSet } from "../store/types";
import {
  attemptStore,
  buildAttemptQuestions,
  type PracticeKind,
} from "../screens/practice/session";

/** Per-kind server usage-session keys, mirroring the old activeUsageSessions map. */
const activeUsageSessions: Partial<Record<PracticeKind, string>> = {};

function formatWait(seconds: number): string {
  const s = Math.max(0, seconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.max(1, Math.ceil((s % 3600) / 60));
  if (days) return `${days} วัน ${hours} ชั่วโมง`;
  if (hours) return `${hours} ชั่วโมง ${minutes} นาที`;
  return `${minutes} นาที`;
}

/**
 * Start a practice attempt. Returns true if the caller may navigate to the play
 * screen; false if it was blocked (a daily-limit popup has been shown).
 */
export async function startPracticeSession(
  kind: PracticeKind,
  id: string,
): Promise<boolean> {
  const s = store.get();
  const list: PracticeSet[] = kind === "mock" ? s.mocks : s[kind];
  const set = list.find((x) => x.id === id);
  if (!set) {
    toast("ไม่พบชุดฝึกนี้");
    return false;
  }

  const minutes = Math.max(1, Number(set.minutes || 10));
  let endsAt = Date.now() + minutes * 60000;

  if (getCurrentUser() && backendEnabled) {
    const sessionKey =
      activeUsageSessions[kind] || `${kind}:${set.id}:${crypto.randomUUID()}`;
    try {
      const usage = (await startDailyFeature(kind, sessionKey, {
        content_id: set.id,
        minutes,
      })) as { existing_session_key?: string; ends_at?: string };
      activeUsageSessions[kind] = usage.existing_session_key || sessionKey;
      if (usage.ends_at) endsAt = new Date(usage.ends_at).getTime();
    } catch (err) {
      const e = err as { message?: string; details?: { remaining_seconds?: number } };
      if (String(e.message).includes("DAILY_LIMIT_REACHED")) {
        proPopup(
          "ใช้สิทธิ์ทดลองครบ 3 ครั้งแล้ว",
          `แพ็กเกจ Free จะปลดล็อก ${kind.toUpperCase()} อีกครั้งใน ${formatWait(
            Number(e.details?.remaining_seconds || 0),
          )} หรืออัปเกรดเป็น Pro เพื่อใช้งานได้ทันที`,
        );
        return false;
      }
      toast(e.message || "เริ่มแบบฝึกไม่สำเร็จ");
      return false;
    }
  }

  attemptStore.start({
    kind,
    set,
    questions: buildAttemptQuestions(set, kind),
    answers: {},
    startedAt: Date.now(),
    endsAt,
  });
  return true;
}

/** Persist the completed attempt (best-effort) and clear the server session key. */
export function submitPracticeUsage() {
  const attempt = attemptStore.get();
  if (!attempt) return;
  const key = activeUsageSessions[attempt.kind];
  if (key && backendEnabled) {
    api("/api/usage/save", {
      method: "POST",
      body: JSON.stringify({
        session_key: key,
        state: { content_id: attempt.set.id, answers: attempt.answers },
        complete: true,
      }),
    }).catch(console.error);
  }
  delete activeUsageSessions[attempt.kind];
}
