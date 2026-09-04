export interface CoreWord {
  w: string;
  p: string;
  m: string;
  e: string;
  tag: string;
  rank: number;
}
export interface OfficialDeck {
  id: string;
  name: string;
  visibility: "public";
  creator: string;
  official: true;
  words: CoreWord[];
}
export const frequentExamWords: CoreWord[];
export const shouldKnowWords: CoreWord[];
export const defaultWords: CoreWord[];
export const topicDecks: OfficialDeck[];
export const officialVocabDecks: OfficialDeck[];
