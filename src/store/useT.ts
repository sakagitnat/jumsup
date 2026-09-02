import { tr, languages as langs } from "../lib/i18n.js";
import { useStore } from "./useStore";

export const languages = langs;

/** Returns a translate fn bound to the current UI language. */
export function useT(): (key: string) => string {
  const lang = useStore((s) => s.lang);
  return (key: string) => tr(lang, key);
}

export function useLang(): string {
  return useStore((s) => s.lang);
}
