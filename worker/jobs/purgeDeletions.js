import { adminClient } from "../../functions/_lib/supabase.js";

// Execute account-deletion requests whose 7-day grace period has elapsed.
// Deleting the auth user cascades to profiles and everything keyed off it.
export async function purgeDeletions(env) {
  const sb = adminClient(env);
  const nowIso = new Date().toISOString();

  const { data: due, error } = await sb
    .from("account_deletion_requests")
    .select("user_id")
    .is("canceled_at", null)
    .is("completed_at", null)
    .lte("execute_after", nowIso)
    .limit(200);
  if (error) throw error;

  let done = 0;
  let failed = 0;
  for (const row of due ?? []) {
    try {
      // Mark first so a crash mid-loop doesn't re-attempt a half-deleted account;
      // the row is removed by the cascade anyway when deleteUser succeeds.
      await sb
        .from("account_deletion_requests")
        .update({ completed_at: nowIso })
        .eq("user_id", row.user_id);

      const { error: delErr } = await sb.auth.admin.deleteUser(row.user_id);
      if (delErr) throw delErr;

      await sb.from("audit_log").insert({
        actor_user_id: null,
        action: "account_deletion_executed",
        object_type: "account",
        object_id: row.user_id,
        metadata: { via: "cron", executed_at: nowIso },
      });
      done += 1;
    } catch (e) {
      failed += 1;
      console.error("purgeDeletions failed for", row.user_id, e?.message || e);
      // Roll the marker back so the next run retries this one.
      await sb
        .from("account_deletion_requests")
        .update({ completed_at: null })
        .eq("user_id", row.user_id)
        .catch(() => {});
    }
  }

  const summary = { considered: (due ?? []).length, done, failed };
  console.log("purgeDeletions:", JSON.stringify(summary));
  return summary;
}
