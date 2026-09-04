import type { Store } from "../store/types";
export const store: Store;
export function applyOfficialContent(content: {
  officialVocabDecks?: unknown[];
  defaultReading?: unknown[];
  defaultListening?: unknown[];
  defaultWriting?: unknown[];
  defaultMocks?: unknown[];
}): void;
