import { requireAdmin, adminClient } from "../../_lib/supabase.js";
import { json, body, cors } from "../../_lib/http.js";
import { assertSameOrigin, assertJson, errorStatus, noStore } from "../../_lib/security.js";

export const onRequestOptions = () => new Response(null, { headers: cors });

const WEEK = /^\d{4}-\d{2}-\d{2}$/;
const int = (v, lo, hi, dflt) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.max(lo, Math.min(n, hi));
};

export async function onRequestGet({ request, env }) {
  try {
    assertSameOrigin(request, env);
    await requireAdmin(request, env);
    const sb = adminClient(env);

    const url = new URL(request.url);
    const wantWeek = url.searchParams.get("week");

    const [{ data: hist, error: histErr }, { data: tiers, error: tierErr }] = await Promise.all([
      sb
        .from("weekly_leaderboard_history")
        .select("week_start,rank,display_name,xp,reward_xp,reward_pro_days,is_bot,created_at")
        .order("week_start", { ascending: false })
        .order("rank", { ascending: true })
        .limit(4000),
      sb
        .from("weekly_reward_tiers")
        .select("id,min_rank,max_rank,reward_xp,reward_pro_days,label")
        .order("min_rank", { ascending: true }),
    ]);
    if (histErr) throw histErr;
    if (tierErr) throw tierErr;

    const byWeek = new Map();
    for (const r of hist || []) {
      let w = byWeek.get(r.week_start);
      if (!w) {
        w = { week_start: r.week_start, players: 0, bots: 0, closed_at: r.created_at, rows: [] };
        byWeek.set(r.week_start, w);
      }
      if (r.is_bot) w.bots += 1;
      else w.players += 1;
      w.rows.push(r);
    }

    const weeks = [...byWeek.values()].map((w) => ({
      week_start: w.week_start,
      players: w.players,
      bots: w.bots,
      closed_at: w.closed_at,
      top3: w.rows.slice(0, 3).map((r) => ({ rank: r.rank, name: r.display_name, xp: r.xp })),
    }));

    const focus = wantWeek && WEEK.test(wantWeek) ? wantWeek : weeks[0]?.week_start || null;
    const detail = focus
      ? {
          week_start: focus,
          rows: (byWeek.get(focus)?.rows || []).map((r) => ({
            rank: r.rank,
            name: r.display_name,
            xp: r.xp,
            is_bot: r.is_bot,
            reward_xp: r.reward_xp,
            reward_pro_days: r.reward_pro_days,
          })),
        }
      : null;

    return json({ weeks, tiers: tiers || [], detail }, 200, noStore(cors));
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

    if (b.action === "close") {
      const week = b.week && WEEK.test(String(b.week)) ? String(b.week) : null;
      const { data, error } = await sb.rpc("close_weekly_leaderboard", { p_week: week });
      if (error) throw error;
      await sb.from("audit_log").insert({
        actor_user_id: user.id,
        action: "weekly_leaderboard_closed",
        object_type: "leaderboard_week",
        object_id: String(data?.week_start || week || ""),
        metadata: data || {},
      });
      return json({ ok: true, result: data }, 200, noStore(cors));
    }

    if (b.action === "set_tiers") {
      const raw = Array.isArray(b.tiers) ? b.tiers : [];
      if (raw.length > 20) throw new Error("TOO_MANY_TIERS");
      const rows = raw.map((t) => {
        const min_rank = int(t.min_rank, 1, 100000, 1);
        const max_rank = int(t.max_rank, min_rank, 100000, min_rank);
        return {
          min_rank,
          max_rank,
          reward_xp: int(t.reward_xp, 0, 100000, 0),
          reward_pro_days: int(t.reward_pro_days, 0, 3650, 0),
          label: String(t.label || "").trim().slice(0, 60),
        };
      });
      // Replace the whole set so the admin edits it as one list.
      const del = await sb.from("weekly_reward_tiers").delete().gte("id", 0);
      if (del.error) throw del.error;
      if (rows.length) {
        const ins = await sb.from("weekly_reward_tiers").insert(rows);
        if (ins.error) throw ins.error;
      }
      await sb.from("audit_log").insert({
        actor_user_id: user.id,
        action: "weekly_reward_tiers_updated",
        object_type: "leaderboard",
        metadata: { tiers: rows },
      });
      return json({ ok: true, count: rows.length }, 200, noStore(cors));
    }

    throw new Error("INVALID_ACTION");
  } catch (e) {
    return json({ error: e.message }, errorStatus(e.message), noStore(cors));
  }
}
