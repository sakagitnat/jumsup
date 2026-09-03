import type { Profile } from "./types";

/** Primary name shown for a user: their nickname, else @handle. */
export function displayName(p?: Profile | null): string {
  const nick = p?.display_name?.trim();
  if (nick) return nick;
  return p?.username ? `@${p.username}` : "ผู้ใช้";
}

/** The @handle, or "" if unknown. */
export function handle(p?: Profile | null): string {
  return p?.username ? `@${p.username}` : "";
}
