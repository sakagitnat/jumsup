import type { Profile, Subscription } from "../store/types";
type Input = { profile: Profile | null; subscription: Subscription | null };
export const MONETIZATION_ENABLED: boolean;
export function isPro(state: Input): boolean;
export function proSource(state: Input): string;
