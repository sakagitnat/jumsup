import { getSupabase } from "./supabase";

const BASE = "https://jumsup.sakagitnat.workers.dev";

async function token(): Promise<string> {
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error("UNAUTHORIZED");
  return t;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { authorization: `Bearer ${await token()}` },
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((out as { error?: string }).error || `HTTP ${res.status}`);
  return out as T;
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${await token()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((out as { error?: string }).error || `HTTP ${res.status}`);
  return out as T;
}
