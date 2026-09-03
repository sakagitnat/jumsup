export const languages: Array<[string, string]>;
export function tr(lang: string, key: string): string;
export function localizePage(node: ParentNode, lang: string): void;
export function translatePhrase(lang: string, value: string): string;
