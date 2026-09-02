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
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "";

    let query = sb
      .from("content_reviews")
      .select(
        "id,user_id,content_type,content_id,rating,body,status,helpful_count,creator_reply,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(120);
    if (["visible", "hidden", "removed"].includes(status)) query = query.eq("status", status);
    const { data: reviews, error } = await query;
    if (error) throw error;

    const userIds = [...new Set((reviews || []).map((r) => r.user_id))];
    const vocabIds = [
      ...new Set((reviews || []).filter((r) => r.content_type === "vocab").map((r) => r.content_id)),
    ];
    const skillIds = [
      ...new Set((reviews || []).filter((r) => r.content_type === "skill").map((r) => r.content_id)),
    ];

    const [names, vocabNames, skillNames] = await Promise.all([
      userIds.length
        ? sb.from("profiles").select("user_id,username").in("user_id", userIds)
        : { data: [] },
      vocabIds.length
        ? sb.from("vocab_sets").select("id,name").in("id", vocabIds)
        : { data: [] },
      skillIds.length
        ? sb.from("practice_sets").select("id,title").in("id", skillIds)
        : { data: [] },
    ]);

    const nameMap = Object.fromEntries((names.data || []).map((p) => [p.user_id, p.username]));
    const titleMap = Object.fromEntries([
      ...(vocabNames.data || []).map((s) => [`vocab:${s.id}`, s.name]),
      ...(skillNames.data || []).map((s) => [`skill:${s.id}`, s.title]),
    ]);

    const items = (reviews || []).map((r) => ({
      ...r,
      username: nameMap[r.user_id] || "user",
      content_title: titleMap[`${r.content_type}:${r.content_id}`] || r.content_id,
    }));

    return json({ items }, 200, noStore(cors));
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
    if (!UUID.test(String(b.id || ""))) throw new Error("INVALID_ID");
    if (b.action === "set_status") {
      if (!["visible", "hidden", "removed"].includes(b.status)) throw new Error("INVALID_STATUS");
      const { error } = await sb
        .from("content_reviews")
        .update({ status: b.status })
        .eq("id", b.id);
      if (error) throw error;
      await sb.from("audit_log").insert({
        actor_user_id: user.id,
        action: "review_status_set",
        object_type: "content_review",
        object_id: b.id,
        metadata: { status: b.status },
      });
      return json({ ok: true }, 200, noStore(cors));
    }
    if (b.action === "clear_reply") {
      const { error } = await sb
        .from("content_reviews")
        .update({ creator_reply: null, creator_replied_at: null })
        .eq("id", b.id);
      if (error) throw error;
      await sb.from("audit_log").insert({
        actor_user_id: user.id,
        action: "review_reply_cleared",
        object_type: "content_review",
        object_id: b.id,
      });
      return json({ ok: true }, 200, noStore(cors));
    }
    throw new Error("INVALID_ACTION");
  } catch (e) {
    return json({ error: e.message }, errorStatus(e.message), noStore(cors));
  }
}
