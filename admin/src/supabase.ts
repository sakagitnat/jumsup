import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Lazily build the Supabase client from the worker's /api/config. */
export async function getSupabase(): Promise<SupabaseClient> {
  if (client) return client;
  const res = await fetch("/api/config", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error("ADMIN_NOT_CONFIGURED");
  const config = (await res.json()) as { supabase_url: string; supabase_anon_key: string };
  client = createClient(config.supabase_url, config.supabase_anon_key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
