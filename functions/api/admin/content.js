import { requireAdmin, adminClient } from "../../_lib/supabase.js";
import { json, body, cors } from "../../_lib/http.js";
import { assertSameOrigin, assertJson, errorStatus, noStore } from "../../_lib/security.js";

export const onRequestOptions = () => new Response(null, { headers: cors });

// Full catalog view for moderation — every set, public or private, plus the
// ability to read a set's actual content.
export async function onRequestGet({ request, env }) {
  try {
    assertSameOrigin(request, env);
    await requireAdmin(request, env);
    const sb = adminClient(env);
    const url = new URL(request.url);

    // --- content detail ---
    const detailId = url.searchParams.get("detail_id");
    const detailKind = url.searchParams.get("detail_kind");
    if (detailId && ["vocab", "skill"].includes(detailKind)) {
      if (detailKind === "vocab") {
        const { data, error } = await sb
          .from("vocab_sets")
          .select("id,name,vocab_words(word,stress,meaning,example,sort_order)")
          .eq("id", detailId)
          .maybeSingle();
        if (error) throw error;
        const words = (data?.vocab_words || [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((w) => ({ w: w.word, p: w.stress || "", m: w.meaning || "", e: w.example || "" }));
        return json({ detail: { kind: "vocab", title: data?.name || "", words } }, 200, noStore(cors));
      }
      const { data, error } = await sb
        .from("practice_sets")
        .select("id,title,kind,payload")
        .eq("id", detailId)
        .maybeSingle();
      if (error) throw error;
      const payload = data?.payload || {};
      const sections = (payload.sections || []).map((s) => ({
        title: s.title || "",
        text: s.text || s.passage || s.script || "",
        questions: (s.questions || []).map((qq) => ({
          prompt: qq.prompt || qq.question || "",
          choices: qq.choices || [],
          answer: qq.answer,
        })),
      }));
      const flatQ = Array.isArray(payload.questions)
        ? payload.questions.map((qq) => ({
            prompt: qq.prompt || qq.question || "",
            choices: qq.choices || [],
            answer: qq.answer,
          }))
        : [];
      return json(
        {
          detail: {
            kind: "skill",
            title: data?.title || "",
            practice_kind: data?.kind || "",
            text: payload.text || payload.passage || payload.script || "",
            sections,
            questions: flatQ,
          },
        },
        200,
        noStore(cors),
      );
    }

    // --- catalog list ---
    const q = (url.searchParams.get("q") || "").trim().slice(0, 60).toLowerCase();
    const kind = url.searchParams.get("kind") || "all"; // all | vocab | skill
    const scope = url.searchParams.get("scope") || "all"; // all | public

    const applyScope = (query) =>
      scope === "public" ? query.eq("visibility", "public") : query;

    const jobs = [];
    jobs.push(
      kind === "skill"
        ? Promise.resolve({ data: [] })
        : applyScope(
            sb
              .from("vocab_sets")
              .select(
                "id,name,user_id,visibility,moderation_status,exam,level,created_at,vocab_words(count)",
              ),
          )
            .order("created_at", { ascending: false })
            .limit(300),
    );
    jobs.push(
      kind === "vocab"
        ? Promise.resolve({ data: [] })
        : applyScope(
            sb
              .from("practice_sets")
              .select("id,title,user_id,visibility,moderation_status,kind,exam,level,created_at"),
          )
            .order("created_at", { ascending: false })
            .limit(300),
    );

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

    const linkFor = (kindStr, id, visibility) =>
      visibility === "public"
        ? `https://jumsup.sakagitnat.workers.dev/s/${kindStr}/${id}`
        : "";

    let items = [
      ...(vocab.data || []).map((s) => ({
        id: s.id,
        kind: "vocab",
        title: s.name,
        owner: nameMap[s.user_id] || "user",
        size: s.vocab_words?.[0]?.count ?? 0,
        visibility: s.visibility,
        moderation_status: s.moderation_status,
        exam: s.exam,
        level: s.level,
        created_at: s.created_at,
        link: linkFor("vocab", s.id, s.visibility),
      })),
      ...(skill.data || []).map((s) => ({
        id: s.id,
        kind: s.kind || "skill",
        title: s.title,
        owner: nameMap[s.user_id] || "user",
        size: null,
        visibility: s.visibility,
        moderation_status: s.moderation_status,
        exam: s.exam,
        level: s.level,
        created_at: s.created_at,
        link: linkFor(s.kind || "reading", s.id, s.visibility),
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
