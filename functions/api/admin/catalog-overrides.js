import { requireAdmin, adminClient } from "../../_lib/supabase.js";
import { json, body, cors } from "../../_lib/http.js";
import { assertSameOrigin, assertJson, cleanText, errorStatus, noStore } from "../../_lib/security.js";

export const onRequestOptions = () => new Response(null, { headers: cors });

// Hide/rename any Community listing, including bundled official catalog
// items that have no row in vocab_sets/practice_sets for
// functions/api/admin/content.js's moderation to act on. The client applies
// these overrides directly (src/actions/community.ts), so this takes effect
// for every viewer immediately, no redeploy needed.
export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request, env);
    assertJson(request);
    const { user } = await requireAdmin(request, env);
    const sb = adminClient(env);
    const b = await body(request);

    const contentId = String(b.content_id || "");
    if (!/^[A-Za-z0-9._:-]{1,160}$/.test(contentId)) throw new Error("INVALID_CONTENT_ID");
    if (!["vocab", "skill"].includes(b.kind)) throw new Error("INVALID_KIND");
    if (!["hide", "unhide", "rename"].includes(b.action)) throw new Error("INVALID_ACTION");

    const patch = { content_id: contentId, kind: b.kind, updated_by: user.id, updated_at: new Date().toISOString() };
    if (b.action === "hide") patch.hidden = true;
    else if (b.action === "unhide") patch.hidden = false;
    else patch.title_override = cleanText(b.title, { min: 1, max: 120, name: "title" });

    const { error } = await sb
      .from("catalog_overrides")
      .upsert(patch, { onConflict: "content_id" });
    if (error) throw error;

    await sb.from("audit_log").insert({
      actor_user_id: user.id,
      action: `catalog_${b.action}`,
      object_type: b.kind,
      object_id: contentId,
      metadata: b.action === "rename" ? { title: patch.title_override } : undefined,
    });

    return json({ ok: true }, 200, noStore(cors));
  } catch (e) {
    return json({ error: e.message }, errorStatus(e.message), noStore(cors));
  }
}
