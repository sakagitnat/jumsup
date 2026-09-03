import { requireAdmin, adminClient } from "../../_lib/supabase.js";
import { json, cors } from "../../_lib/http.js";
import { assertSameOrigin, errorStatus, noStore } from "../../_lib/security.js";

export const onRequestOptions = () => new Response(null, { headers: cors });

const count = async (q) => {
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
};
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const dateAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export async function onRequestGet({ request, env }) {
  try {
    assertSameOrigin(request, env);
    await requireAdmin(request, env);
    const sb = adminClient(env);
    const month = new Date().toISOString().slice(0, 7) + "-01";
    const today = new Date().toISOString().slice(0, 10);

    const [
      users,
      paid,
      admins,
      banned,
      newUsers7,
      newUsers30,
      active7,
      active30,
      pendingDictionary,
      pendingReports,
      pendingRefunds,
      reviews,
      reviewsHidden,
      publicVocab,
      publicSkill,
      setsNew30,
      imports30,
      attempts30,
      giftRedemptions30,
      codes,
      usage,
      payments,
      attemptRows,
    ] = await Promise.all([
      count(sb.from("profiles").select("user_id", { count: "exact", head: true })),
      count(
        sb
          .from("subscriptions")
          .select("user_id", { count: "exact", head: true })
          .in("status", ["active", "trialing"]),
      ),
      count(sb.from("profiles").select("user_id", { count: "exact", head: true }).eq("role", "admin")),
      count(
        sb.from("profiles").select("user_id", { count: "exact", head: true }).not("banned_at", "is", null),
      ),
      count(
        sb
          .from("profiles")
          .select("user_id", { count: "exact", head: true })
          .gte("created_at", daysAgo(7)),
      ),
      count(
        sb
          .from("profiles")
          .select("user_id", { count: "exact", head: true })
          .gte("created_at", daysAgo(30)),
      ),
      count(
        sb
          .from("profiles")
          .select("user_id", { count: "exact", head: true })
          .gte("last_checkin", dateAgo(7)),
      ),
      count(
        sb
          .from("profiles")
          .select("user_id", { count: "exact", head: true })
          .gte("last_checkin", dateAgo(30)),
      ),
      count(
        sb
          .from("dictionary_suggestions")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ),
      count(
        sb
          .from("content_reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ),
      count(
        sb
          .from("refund_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "approved", "processing"]),
      ),
      count(sb.from("content_reviews").select("id", { count: "exact", head: true })),
      count(
        sb
          .from("content_reviews")
          .select("id", { count: "exact", head: true })
          .in("status", ["hidden", "removed"]),
      ),
      count(
        sb
          .from("vocab_sets")
          .select("id", { count: "exact", head: true })
          .eq("visibility", "public"),
      ),
      count(
        sb
          .from("practice_sets")
          .select("id", { count: "exact", head: true })
          .eq("visibility", "public"),
      ),
      count(
        sb.from("vocab_sets").select("id", { count: "exact", head: true }).gte("created_at", daysAgo(30)),
      ),
      count(
        sb
          .from("content_imports")
          .select("id", { count: "exact", head: true })
          .gte("created_at", daysAgo(30)),
      ).catch(() => 0),
      count(
        sb
          .from("practice_attempts")
          .select("id", { count: "exact", head: true })
          .gte("taken_at", daysAgo(30)),
      ),
      count(
        sb
          .from("gift_redemptions")
          .select("id", { count: "exact", head: true })
          .gte("redeemed_at", daysAgo(30)),
      ),
      sb.from("gift_codes").select("pro_days,max_uses,used_count,expires_at").eq("active", true),
      sb.from("translation_usage").select("usage_count").eq("usage_date", today).limit(5000),
      sb.from("payment_events").select("amount,currency").eq("status", "succeeded").gte("created_at", month).limit(5000),
      sb.from("practice_attempts").select("kind").gte("taken_at", daysAgo(30)).limit(5000),
    ]);

    if (codes.error) throw codes.error;
    if (usage.error) throw usage.error;
    if (payments.error) throw payments.error;

    const revenue = {};
    for (const p of payments.data || [])
      if (p.amount != null) revenue[p.currency] = (revenue[p.currency] || 0) + p.amount;

    const active = (codes.data || []).filter((x) => !x.expires_at || new Date(x.expires_at) > new Date());
    const giftLiability = active.reduce(
      (n, x) => n + Math.max(0, (x.max_uses || 0) - (x.used_count || 0)) * (x.pro_days || 0),
      0,
    );

    const byKind = {};
    for (const r of attemptRows.data || []) byKind[r.kind] = (byKind[r.kind] || 0) + 1;

    return json(
      {
        users,
        paid,
        free_users: Math.max(0, users - paid),
        paid_ratio: users ? Math.round((paid / users) * 100) : 0,
        admins,
        banned,
        new_users_7d: newUsers7,
        new_users_30d: newUsers30,
        active_7d: active7,
        active_30d: active30,
        active_ratio_7d: users ? Math.round((active7 / users) * 100) : 0,
        pending_dictionary: pendingDictionary,
        pending_reports: pendingReports,
        pending_refunds: pendingRefunds,
        reviews_total: reviews,
        reviews_hidden: reviewsHidden,
        public_sets: publicVocab + publicSkill,
        public_vocab: publicVocab,
        public_skill: publicSkill,
        sets_new_30d: setsNew30,
        imports_30d: imports30,
        attempts_30d: attempts30,
        attempts_by_kind_30d: byKind,
        gift_redemptions_30d: giftRedemptions30,
        active_codes: active.length,
        gift_liability_days: giftLiability,
        translations_today: (usage.data || []).reduce((n, x) => n + (x.usage_count || 0), 0),
        google_configured: Boolean(env.GOOGLE_TRANSLATE_API_KEY),
        revenue,
      },
      200,
      noStore(cors),
    );
  } catch (e) {
    return json({ error: e.message }, errorStatus(e.message), noStore(cors));
  }
}
