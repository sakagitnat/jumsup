import { isPro as _isPro, proSource as _proSource } from "../lib/entitlements.js";
import type { Profile, Subscription } from "./types";

type ProInput = { profile: Profile | null; subscription: Subscription | null };

export const isPro = (state: ProInput): boolean => _isPro(state);
export const proSource = (state: ProInput): string => _proSource(state);
