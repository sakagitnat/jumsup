import { requireAdmin, adminClient } from "../../_lib/supabase.js";
import { json, body, cors } from "../../_lib/http.js";
import { assertSameOrigin, assertJson, errorStatus, noStore } from "../../_lib/security.js";

export const onRequestOptions = () => new Response(null, { headers: cors });

const UUID = /^[0-9a-f-]{36}$/i;
const PER = 25;

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

export async function onRequestGet({ request, env }) {
  try {
    assertSameOrigin(request, env);
    await requireAdmin(request, env);
    const sb = adminClient(env);
    const url = new URL(request.url);
    const detailId = url.searchParams.get("user_id");

    if (detailId && UUID.test(detailId)) {
      const [profile, reds, sets, practice, reviews, attempts, imports] = await Promise.all([
        sb.from("profiles").select("*").eq("user_id", detailId).single(),
        sb
          .from("gift_redemptions")
          .select("gift_code_id,redeemed_at,gift_codes(code,pro_days)")
          .eq("user_id", detailId)
          .order("redeemed_at", { ascending: false }),
        sb.from("vocab_sets").select("id", { count: "exact", head: true }).eq("user_id", detailId),
        sb
          .from("practice_sets")
          .select("id", { count: "exact", head: true })
          .eq("user_id", detailId),
        sb
          .from("content_reviews")
          .select("id", { count: "exact", head: true })
          .eq("user_id", detailId),
        sb
          .from("practice_attempts")
          .select("kind,percent,taken_at")
          .eq("user_id", detailId)
          .order("taken_at", { ascending: false })
          .limit(20),
        sb
          .from("content_imports")
          .select("id", { count: "exact", head: true })
          .eq("user_id", detailId)
          .then((r) => r, () => ({ count: 0 })),
      ]);
      if (profile.error) throw profile.error;
      const gifts = (reds.data || []).map((r) => ({
        code: r.gift_codes?.code || "?",
        pro_days: r.gift_codes?.pro_days || 0,
        redeemed_at: r.redeemed_at,
      }));
      return json(
        {
          detail: {
            profile: profile.data,
            gift_redemptions: gifts,
            free_codes_used: gifts.length,
            sets_count: (sets.count || 0) + (practice.count || 0),
            reviews_count: reviews.count || 0,
            imports_count: imports.count || 0,
            recent_attempts: attempts.data || [],
          },
        },
        200,
        noStore(cors),
      );
    }

    const q = (url.searchParams.get("q") || "").trim().slice(0, 60);
    const page = Math.max(0, parseInt(url.searchParams.get("page") || "0", 10) || 0);

    let query = sb
      .from("profiles")
      .select(
        "user_id,username,role,xp,streak,pro_lifetime,pro_bonus_until,banned_at,created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(page * PER, page * PER + PER - 1);
    if (q) query = query.ilike("username", `%${q}%`);
    const { data, error, count } = await query;
    if (error) throw error;

    return json({ items: data || [], count: count || 0, page, per: PER }, 200, noStore(cors));
  } catch (e) {
    return json({ error: e.message }, errorStatus(e.message), noStore(cors));
  }
}

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request, env);
    assertJson(request);
    const { user } = await requireAdmin(request, env);
    const sb = adminClient(env);
    const b = await body(request);
    const targetId = String(b.user_id || "");
    if (!UUID.test(targetId)) throw new Error("INVALID_ID");

    const selfSensitive = ["set_role", "ban", "unban"].includes(b.action);
    if (selfSensitive && targetId === user.id) throw new Error("CANNOT_MODIFY_SELF");

    if (b.action === "set_role") {
      if (!["user", "admin"].includes(b.role)) throw new Error("INVALID_ROLE");
      const { error } = await sb.from("profiles").update({ role: b.role }).eq("user_id", targetId);
      if (error) throw error;
      await audit(sb, user.id, "user_role_set", targetId, { role: b.role });
      return json({ ok: true }, 200, noStore(cors));
    }

    if (b.action === "grant_pro") {
      if (b.lifetime) {
        const { error } = await sb
          .from("profiles")
          .update({ pro_lifetime: true })
          .eq("user_id", targetId);
        if (error) throw error;
        await audit(sb, user.id, "user_pro_granted", targetId, { lifetime: true });
      } else {
        const days = Number(b.days);
        if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("INVALID_DAYS");
        const { data: cur, error: ce } = await sb
          .from("profiles")
          .select("pro_bonus_until")
          .eq("user_id", targetId)
          .single();
        if (ce) throw ce;
        const base = cur?.pro_bonus_until && new Date(cur.pro_bonus_until) > new Date()
          ? new Date(cur.pro_bonus_until)
          : new Date();
        base.setDate(base.getDate() + days);
        const { error } = await sb
          .from("profiles")
          .update({ pro_bonus_until: base.toISOString() })
          .eq("user_id", targetId);
        if (error) throw error;
        await audit(sb, user.id, "user_pro_granted", targetId, { days, until: base.toISOString() });
      }
      return json({ ok: true }, 200, noStore(cors));
    }

    if (b.action === "revoke_pro") {
      const { error } = await sb
        .from("profiles")
        .update({ pro_lifetime: false, pro_bonus_until: null })
        .eq("user_id", targetId);
      if (error) throw error;
      await audit(sb, user.id, "user_pro_revoked", targetId, {});
      return json({ ok: true }, 200, noStore(cors));
    }

    if (b.action === "ban" || b.action === "unban") {
      const banning = b.action === "ban";
      const { error: authErr } = await sb.auth.admin.updateUserById(targetId, {
        ban_duration: banning ? "876000h" : "none",
      });
      if (authErr) throw authErr;
      const { error } = await sb
        .from("profiles")
        .update({ banned_at: banning ? new Date().toISOString() : null })
        .eq("user_id", targetId);
      if (error) throw error;
      await audit(sb, user.id, banning ? "user_banned" : "user_unbanned", targetId, {});
      return json({ ok: true }, 200, noStore(cors));
    }

    throw new Error("INVALID_ACTION");
  } catch (e) {
    return json({ error: e.message }, errorStatus(e.message), noStore(cors));
  }
}

function audit(sb, actor, action, objectId, metadata) {
  return sb.from("audit_log").insert({
    actor_user_id: actor,
    action,
    object_type: "user",
    object_id: objectId,
    metadata,
  });
}
