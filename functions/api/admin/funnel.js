import { requireAdmin, adminClient } from "../../_lib/supabase.js";
import { json, cors } from "../../_lib/http.js";
import { assertSameOrigin, errorStatus, noStore } from "../../_lib/security.js";

export const onRequestOptions = () => new Response(null, { headers: cors });

export async function onRequestGet({ request, env }) {
  try {
    assertSameOrigin(request, env);
    await requireAdmin(request, env);
    const url = new URL(request.url);
    const days = Math.max(1, Math.min(Number(url.searchParams.get("days")) || 30, 365));
    const { data, error } = await adminClient(env).rpc("admin_funnel", { p_days: days });
    if (error) throw error;
    return json(data || { days, signup: 0 }, 200, noStore(cors));
  } catch (e) {
    return json({ error: e.message }, errorStatus(e.message), noStore(cors));
  }
}
