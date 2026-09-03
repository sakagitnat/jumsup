import { adminClient } from "../../functions/_lib/supabase.js";

// Close the week that just ended: snapshot standings, pay rewards, write recaps.
// Safe to run more than once — close_weekly_leaderboard is idempotent per week.
export async function closeWeek(env) {
  const sb = adminClient(env);
  const { data, error } = await sb.rpc("close_weekly_leaderboard", { p_week: null });
  if (error) throw error;
  console.log("closeWeek:", JSON.stringify(data));
  return data;
}
