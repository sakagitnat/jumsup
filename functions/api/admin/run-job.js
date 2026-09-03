import { requireAdmin } from "../../_lib/supabase.js";
import { json, body, cors } from "../../_lib/http.js";
import { assertSameOrigin, assertJson, errorStatus, noStore } from "../../_lib/security.js";
import { closeWeek } from "../../../worker/jobs/closeWeek.js";
import { purgeDeletions } from "../../../worker/jobs/purgeDeletions.js";
import { sendPushDigest } from "../../../worker/jobs/sendPush.js";

export const onRequestOptions = () => new Response(null, { headers: cors });

// Manually run one of the scheduled jobs. Same code the cron runs; every job is
// idempotent / safe to re-run. Lets an admin verify or recover a missed tick
// without the Cloudflare dashboard.
const JOBS = {
  close_week: closeWeek,
  purge_deletions: purgeDeletions,
  push_digest: sendPushDigest,
};

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request, env);
    assertJson(request);
    const { user } = await requireAdmin(request, env);
    const sb = (await import("../../_lib/supabase.js")).adminClient(env);
    const b = await body(request);

    const fn = JOBS[b.job];
    if (!fn) throw new Error("INVALID_JOB");

    const started = Date.now();
    const result = await fn(env);
    await sb.from("audit_log").insert({
      actor_user_id: user.id,
      action: "job_run_manually",
      object_type: "job",
      object_id: String(b.job),
      metadata: { result: result ?? null, ms: Date.now() - started },
    });

    return json({ ok: true, job: b.job, result: result ?? null }, 200, noStore(cors));
  } catch (e) {
    return json({ error: e.message }, errorStatus(e.message), noStore(cors));
  }
}
