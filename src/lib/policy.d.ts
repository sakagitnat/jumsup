import type { AppState } from "../store/types";
export function privateQuota(kind: string): number;
export function localPrivateCount(s: AppState, kind: string, excludeId?: string | null): number;
export function canPrivateLocally(s: AppState, kind: string, excludeId?: string | null): boolean;
export function startDailyFeature(
  feature: string,
  sessionKey: string,
  state?: Record<string, unknown>,
): Promise<Record<string, unknown>>;
