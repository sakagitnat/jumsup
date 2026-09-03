import { requireAdmin, adminClient } from "../../_lib/supabase.js";
import { json, body, cors } from "../../_lib/http.js";
import { assertSameOrigin, assertJson, errorStatus, noStore } from "../../_lib/security.js";

export const onRequestOptions = () => new Response(null, { headers: cors });

const UUID = /^[0-9a-f-]{36}$/i;

export async function onRequestGet({ request, env }) {
  try {
    assertSameOrigin(request, env);
    await requireAdmin(request, env);
    const sb = adminClient(env);

    const { data: bots, error } = await sb
      .from("leaderboard_bots")
      .select("id,name,factor,base_xp,active,hidden")
      .order("factor", { ascending: false });
    if (error) throw error;

    // The board is the same for everyone now (fixed bot scores).
    const { data: weekly } = await sb
      .rpc("weekly_leaderboard", { p_limit: 30 })
      .catch(() => ({ data: null }));
    let preview = weekly?.top || null;
    if (!preview) {
      preview = (bots || [])
        .filter((b) => b.active)
        .map((b) => ({
          username: b.hidden ? `ผู้เรียน #${b.id.slice(0, 4)}` : b.name,
          xp: Math.max(15, Number(b.base_xp) || 0),
        }))
        .sort((a, b) => b.xp - a.xp)
        .map((r, i) => ({ ...r, rank: i + 1 }));
    }

    return json({ items: bots || [], preview }, 200, noStore(cors));
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

    if (b.action === "create") {
      const name = String(b.name || "").trim().slice(0, 40);
      const baseXp = Math.max(1, Number(b.base_xp ?? 200) | 0);
      if (!name) throw new Error("INVALID_NAME");
      if (!(baseXp >= 1 && baseXp <= 100000)) throw new Error("INVALID_XP");
      const { data, error } = await sb
        .from("leaderboard_bots")
        .insert({ name, factor: 1, base_xp: baseXp, active: true, hidden: Boolean(b.hidden) })
        .select("id")
        .single();
      if (error) throw error;
      await sb.from("audit_log").insert({
        actor_user_id: user.id,
        action: "bot_created",
        object_type: "bot",
        object_id: data.id,
        metadata: { name, factor },
      });
      return json({ ok: true, id: data.id }, 200, noStore(cors));
    }

    if (b.action === "update") {
      if (!UUID.test(String(b.id || ""))) throw new Error("INVALID_ID");
      const patch = {};
      if (b.name != null) patch.name = String(b.name).trim().slice(0, 40);
      if (b.factor != null) {
        const f = Number(b.factor);
        if (!(f > 0 && f <= 5)) throw new Error("INVALID_FACTOR");
        patch.factor = f;
      }
      if (b.base_xp != null) patch.base_xp = Math.max(0, Number(b.base_xp) | 0);
      if (b.active != null) patch.active = Boolean(b.active);
      if (b.hidden != null) patch.hidden = Boolean(b.hidden);
      if (!Object.keys(patch).length) throw new Error("NOTHING_TO_UPDATE");
      const { error } = await sb.from("leaderboard_bots").update(patch).eq("id", b.id);
      if (error) throw error;
      await sb.from("audit_log").insert({
        actor_user_id: user.id,
        action: "bot_updated",
        object_type: "bot",
        object_id: b.id,
        metadata: patch,
      });
      return json({ ok: true }, 200, noStore(cors));
    }

    if (b.action === "delete") {
      if (!UUID.test(String(b.id || ""))) throw new Error("INVALID_ID");
      const { error } = await sb.from("leaderboard_bots").delete().eq("id", b.id);
      if (error) throw error;
      await sb.from("audit_log").insert({
        actor_user_id: user.id,
        action: "bot_deleted",
        object_type: "bot",
        object_id: b.id,
      });
      return json({ ok: true }, 200, noStore(cors));
    }

    throw new Error("INVALID_ACTION");
  } catch (e) {
    return json({ error: e.message }, errorStatus(e.message), noStore(cors));
  }
}
