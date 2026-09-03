import { requireUser, adminClient } from "../../_lib/supabase.js";
import { json, body, cors } from "../../_lib/http.js";
import { assertSameOrigin, assertJson, errorStatus, noStore } from "../../_lib/security.js";

export const onRequestOptions = () => new Response(null, { headers: cors });

const clean = (v, max) => String(v || "").slice(0, max);

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request, env);
    assertJson(request);
    const { user } = await requireUser(request, env);
    const b = await body(request);

    const endpoint = clean(b.endpoint, 1000);
    const p256dh = clean(b.p256dh, 200);
    const auth = clean(b.auth, 100);
    if (!endpoint.startsWith("https://") || !p256dh || !auth) {
      throw new Error("INVALID_SUBSCRIPTION");
    }

    const sb = adminClient(env);
    const { error } = await sb.from("push_subscriptions").upsert(
      {
        endpoint,
        user_id: user.id,
        p256dh,
        auth,
        ua: clean(request.headers.get("user-agent"), 300),
        failure_count: 0,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw error;

    return json({ ok: true }, 200, noStore(cors));
  } catch (e) {
    return json({ error: e.message }, errorStatus(e.message), noStore(cors));
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    assertSameOrigin(request, env);
    const { user } = await requireUser(request, env);
    const url = new URL(request.url);
    const endpoint = url.searchParams.get("endpoint") || "";
    const sb = adminClient(env);
    const q = sb.from("push_subscriptions").delete().eq("user_id", user.id);
    if (endpoint) q.eq("endpoint", endpoint);
    const { error } = await q;
    if (error) throw error;
    return json({ ok: true }, 200, noStore(cors));
  } catch (e) {
    return json({ error: e.message }, errorStatus(e.message), noStore(cors));
  }
}
