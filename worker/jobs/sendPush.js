import { adminClient } from "../../functions/_lib/supabase.js";
import { sendPush } from "../lib/webpush.js";

// Bangkok "today" (YYYY-MM-DD). The daily push cron runs at 12:00 UTC = 19:00
// Asia/Bangkok, so this matches the local day for the large majority of users.
function bkkToday() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}
const daysBefore = (isoDate, n) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

function vapidFromEnv(env) {
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: env.VAPID_SUBJECT || "mailto:sakagitnat@gmail.com" };
}

// Pick the single most relevant notification for a user this run.
function chooseMessage({ recapRank }, profile, today) {
  if (recapRank != null) {
    return {
      tag: "weekly-recap",
      title: "สรุปสัปดาห์พร้อมแล้ว",
      body:
        recapRank <= 3
          ? `สุดยอด! สัปดาห์ที่แล้วคุณได้อันดับ ${recapRank} มาดูรางวัลกัน`
          : `สัปดาห์ที่แล้วคุณได้อันดับ ${recapRank} — เปิดดูสรุปและรางวัล`,
      url: "/leaderboard",
    };
  }
  const streak = profile?.streak || 0;
  const last = profile?.last_checkin || "";
  if (streak >= 3 && last && last < today && last >= daysBefore(today, 2)) {
    return {
      tag: "streak",
      title: `🔥 Streak ${streak} วันของคุณกำลังจะหลุด`,
      body: "เช็คอินหรือเรียนสักหน่อยก่อนหมดวันนี้",
      url: "/home",
    };
  }
  return null;
}

export async function sendPushDigest(env) {
  const vapid = vapidFromEnv(env);
  if (!vapid) {
    console.log("sendPush: VAPID not configured, skipping");
    return { skipped: true };
  }
  const sb = adminClient(env);
  const today = bkkToday();

  const { data: recaps } = await sb
    .from("user_week_recap")
    .select("user_id,rank")
    .eq("seen", false);
  const recapRankByUser = new Map((recaps || []).map((r) => [r.user_id, r.rank]));

  const { data: subs, error } = await sb
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth,user_id,failure_count,profiles(streak,last_checkin)")
    .lt("failure_count", 5)
    .limit(1000);
  if (error) throw error;

  let sent = 0;
  let removed = 0;
  const seenUsers = new Set();

  for (const s of subs || []) {
    // one notification per user per run
    if (seenUsers.has(s.user_id)) continue;

    const msg = chooseMessage(
      { recapRank: recapRankByUser.get(s.user_id) ?? null },
      s.profiles || {},
      today,
    );
    if (!msg) continue;
    seenUsers.add(s.user_id);

    try {
      const r = await sendPush(s, msg, vapid);
      if (r.gone) {
        await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        removed += 1;
      } else if (!r.ok) {
        await sb
          .from("push_subscriptions")
          .update({ failure_count: (s.failure_count || 0) + 1 })
          .eq("endpoint", s.endpoint);
      } else {
        await sb
          .from("push_subscriptions")
          .update({ failure_count: 0, last_sent_at: new Date().toISOString() })
          .eq("endpoint", s.endpoint);
        sent += 1;
      }
    } catch (e) {
      console.error("sendPush error", s.endpoint, e?.message || e);
    }
  }

  const summary = { subs: (subs || []).length, sent, removed };
  console.log("sendPush:", JSON.stringify(summary));
  return summary;
}
