export const SUPPORTED_BILLING_CURRENCIES: string[];
export function defaultBillingCurrency(): "THB" | "USD";

interface Plan {
  id: string;
  name: string;
  prices: Record<string, number>;
  period?: Record<string, string>;
  monthlyEquivalent?: Record<string, number>;
  features: string[];
}
export const PLANS: { free: Plan; monthly: Plan; yearly: Plan };

export function money(value: number, currency?: string): string;

interface Limits {
  privateVocab: number;
  privatePractice: number;
  wordsPerDeck: number;
  communitySets: number;
  matchPerDay: number;
  crosswordPerDay: number;
  translationsPerDay: number;
  importRows?: number;
}
export const FREE_LIMITS: Limits;
export const PRO_LIMITS: Limits;
