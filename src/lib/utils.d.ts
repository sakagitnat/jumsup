export function todayKey(): string;
export function speak(text: string, lang?: string, rate?: number, voiceURI?: string): void;
export function englishVoices(): Array<{ uri: string; name: string; lang: string }>;
export function escapeHtml(s: unknown): string;
