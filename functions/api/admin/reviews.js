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

    const q = (url.searchParams.get("q") || "").trim().slice(0, 60);

    let query = sb
      .from("content_reviews")
      .select(
        "id,user_id,content_type,content_id,rating,body,status,helpful_count,creator_reply,creator_replied_at,anonymous,created_at,updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
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

    const [vocabSets, skillSets] = await Promise.all([
      vocabIds.length
        ? sb.from("vocab_sets").select("id,name,user_id,visibility").in("id", vocabIds)
        : { data: [] },
      skillIds.length
        ? sb.from("practice_sets").select("id,title,kind,user_id,visibility").in("id", skillIds)
        : { data: [] },
    ]);
    const ownerIds = [
      ...(vocabSets.data || []).map((s) => s.user_id),
      ...(skillSets.data || []).map((s) => s.user_id),
    ];
    const allUserIds = [...new Set([...userIds, ...ownerIds])];
    const { data: names } = allUserIds.length
      ? await sb.from("profiles").select("user_id,username,display_name").in("user_id", allUserIds)
      : { data: [] };
    const nameMap = Object.fromEntries((names || []).map((p) => [p.user_id, p.username]));
    const nickMap = Object.fromEntries(
      (names || []).map((p) => [p.user_id, (p.display_name || "").trim()]),
    );
    const setMap = Object.fromEntries([
      ...(vocabSets.data || []).map((s) => [
        `vocab:${s.id}`,
        { title: s.name, owner: nameMap[s.user_id] || "user", visibility: s.visibility, kind: "vocab" },
      ]),
      ...(skillSets.data || []).map((s) => [
        `skill:${s.id}`,
        {
          title: s.title,
          owner: nameMap[s.user_id] || "user",
          visibility: s.visibility,
          kind: s.kind || "reading",
        },
      ]),
    ]);

    let items = (reviews || []).map((r) => {
      const set = setMap[`${r.content_type}:${r.content_id}`] || {};
      const shareKind = r.content_type === "vocab" ? "vocab" : set.kind || "reading";
      const isPublic = set.visibility === "public";
      return {
        ...r,
        username: nameMap[r.user_id] || "user",
        nickname: nickMap[r.user_id] || "",
        content_title: set.title || r.content_id,
        set_owner: set.owner || "—",
        set_visibility: set.visibility || "?",
        set_link: isPublic
          ? `https://jumsup.sakagitnat.workers.dev/s/${shareKind}/${r.content_id}`
          : "",
      };
    });
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter(
        (r) =>
          r.username.toLowerCase().includes(needle) ||
          (r.nickname || "").toLowerCase().includes(needle) ||
          r.set_owner.toLowerCase().includes(needle) ||
          r.content_title.toLowerCase().includes(needle) ||
          (r.body || "").toLowerCase().includes(needle),
      );
    }

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
    if (b.action === "edit") {
      const patch = { updated_at: new Date().toISOString() };
      if (typeof b.body === "string") patch.body = b.body.slice(0, 1000);
      if (Number.isInteger(b.rating) && b.rating >= 1 && b.rating <= 5) patch.rating = b.rating;
      if (Object.keys(patch).length === 1) throw new Error("NOTHING_TO_UPDATE");
      const { error } = await sb.from("content_reviews").update(patch).eq("id", b.id);
      if (error) throw error;
      await sb.from("audit_log").insert({
        actor_user_id: user.id,
        action: "review_edited",
        object_type: "content_review",
        object_id: b.id,
        metadata: { body: "body" in patch, rating: patch.rating ?? null },
      });
      return json({ ok: true }, 200, noStore(cors));
    }

    if (b.action === "edit_reply" || b.action === "clear_reply") {
      const reply =
        b.action === "edit_reply" && typeof b.reply === "string"
          ? b.reply.trim().slice(0, 1000)
          : "";
      const patch = reply
        ? { creator_reply: reply, creator_replied_at: new Date().toISOString() }
        : { creator_reply: null, creator_replied_at: null };
      const { error } = await sb.from("content_reviews").update(patch).eq("id", b.id);
      if (error) throw error;
      await sb.from("audit_log").insert({
        actor_user_id: user.id,
        action: reply ? "review_reply_edited" : "review_reply_cleared",
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
