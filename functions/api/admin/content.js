import { requireAdmin, adminClient } from "../../_lib/supabase.js";
import { json, body, cors } from "../../_lib/http.js";
import { assertSameOrigin, assertJson, errorStatus, noStore } from "../../_lib/security.js";

export const onRequestOptions = () => new Response(null, { headers: cors });

// Parallel view of the public catalog for moderation.
export async function onRequestGet({ request, env }) {
  try {
    assertSameOrigin(request, env);
    await requireAdmin(request, env);
    const sb = adminClient(env);
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim().slice(0, 60).toLowerCase();
    const kind = url.searchParams.get("kind") || "all"; // all | vocab | skill

    const jobs = [];
    if (kind !== "skill")
      jobs.push(
        sb
          .from("vocab_sets")
          .select("id,name,user_id,visibility,moderation_status,exam,level,created_at,vocab_words(count)")
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .limit(200),
      );
    else jobs.push(Promise.resolve({ data: [] }));
    if (kind !== "vocab")
      jobs.push(
        sb
          .from("practice_sets")
          .select("id,title,user_id,visibility,moderation_status,kind,exam,level,created_at")
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .limit(200),
      );
    else jobs.push(Promise.resolve({ data: [] }));

    const [vocab, skill] = await Promise.all(jobs);
    if (vocab.error) throw vocab.error;
    if (skill.error) throw skill.error;

    const ownerIds = [
      ...new Set([
        ...(vocab.data || []).map((s) => s.user_id),
        ...(skill.data || []).map((s) => s.user_id),
      ]),
    ];
    const { data: names } = ownerIds.length
      ? await sb.from("profiles").select("user_id,username").in("user_id", ownerIds)
      : { data: [] };
    const nameMap = Object.fromEntries((names || []).map((p) => [p.user_id, p.username]));

    let items = [
      ...(vocab.data || []).map((s) => ({
        id: s.id,
        kind: "vocab",
        title: s.name,
        owner: nameMap[s.user_id] || "user",
        size: s.vocab_words?.[0]?.count ?? 0,
        moderation_status: s.moderation_status,
        exam: s.exam,
        level: s.level,
        created_at: s.created_at,
        link: `https://jumsup.sakagitnat.workers.dev/s/vocab/${s.id}`,
      })),
      ...(skill.data || []).map((s) => ({
        id: s.id,
        kind: s.kind || "skill",
        title: s.title,
        owner: nameMap[s.user_id] || "user",
        size: null,
        moderation_status: s.moderation_status,
        exam: s.exam,
        level: s.level,
        created_at: s.created_at,
        link: `https://jumsup.sakagitnat.workers.dev/s/skill/${s.id}`,
      })),
    ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    if (q)
      items = items.filter(
        (s) => s.title.toLowerCase().includes(q) || s.owner.toLowerCase().includes(q),
      );

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
    if (!["vocab", "skill"].includes(b.kind)) throw new Error("INVALID_KIND");
    if (!["hide", "unhide"].includes(b.action)) throw new Error("INVALID_ACTION");
    const id = String(b.id || "");
    if (!/^[A-Za-z0-9._:-]{1,160}$/.test(id)) throw new Error("INVALID_ID");

    const table = b.kind === "vocab" ? "vocab_sets" : "practice_sets";
    const patch =
      b.action === "hide"
        ? { moderation_status: "hidden", visibility: "private" }
        : { moderation_status: "visible" };
    const { error } = await sb.from(table).update(patch).eq("id", id);
    if (error) throw error;
    await sb.from("audit_log").insert({
      actor_user_id: user.id,
      action: `content_${b.action}`,
      object_type: b.kind,
      object_id: id,
    });
    return json({ ok: true }, 200, noStore(cors));
  } catch (e) {
    return json({ error: e.message }, errorStatus(e.message), noStore(cors));
  }
}
