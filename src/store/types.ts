/* Shape of the state held by src/lib/store.js. Kept in sync by hand — the store
   module stays plain JS so its migration/merge logic is untouched by the rewrite. */

import type { SrsCard } from "../lib/srs";
export type { SrsCard };

export interface Word {
  w: string;
  m: string;
  p?: string;
  e?: string;
  stress?: string;
}

export interface Deck {
  id: string;
  name: string;
  visibility: "private" | "public";
  creator: string;
  official?: boolean;
  sourceType?: string;
  exam?: string;
  skill?: string;
  level?: string;
  words: Word[];
}

export interface Question {
  id?: string;
  prompt?: string;
  question?: string;
  choices?: string[];
  answer?: number;
  explanation?: string;
  number?: number;
}

export interface PracticeSection {
  title?: string;
  category?: string;
  part?: string | number;
  text?: string;
  script?: string;
  passage?: string;
  context?: string;
  description?: string;
  directions?: string;
  situation?: string;
  statements?: string[];
  questions?: Question[];
}

export interface PracticeSet {
  id: string;
  title: string;
  visibility?: "private" | "public";
  creator?: string;
  official?: boolean;
  minutes?: number;
  itemCount?: number;
  category?: string;
  type?: string;
  accent?: string;
  exam?: string;
  skill?: string;
  level?: string;
  text?: string;
  script?: string;
  passage?: string;
  situation?: string;
  skills?: string[];
  questions?: Question[] | number;
  sections?: PracticeSection[];
}

export interface Profile {
  username?: string;
  display_name?: string | null;
  avatar_url?: string;
  role?: string;
  ui_theme?: "light" | "dark";
  ui_language?: string;
  sound_enabled?: boolean;
  onboarding_completed_at?: string | null;
  exam_goal?: string;
  exam_date?: string | null;
  daily_minutes?: number;
  weak_skills?: string[];
  referral_code?: string;
  pro_lifetime?: boolean;
  pro_bonus_until?: string | null;
  leaderboard_anon?: boolean;
}

export interface Subscription {
  status?: string;
  plan?: "monthly" | "yearly";
  payment_account?: string;
  current_period_end?: string | null;
}

export interface FlashSettings {
  loopSize: number;
  autoSpeak: boolean;
  shuffle: boolean;
  quizCheck: boolean;
  voiceURI: string;
  rate: number;
}

export interface ExamTarget {
  id: string;
  name: string;
  date: string | null;
  sortOrder: number;
}

export interface PracticeAttempt {
  id: string;
  kind: "reading" | "listening" | "writing" | "mock";
  setId: string;
  title: string;
  total: number;
  correct: number;
  percent: number;
  seconds: number;
  takenAt: string;
}

export interface CommunityItem {
  id: string;
  type: "vocab" | "skill";
  kind?: string;
  sourceKind?: string;
  title: string;
  creator: string;
  count?: number;
  official?: boolean;
  liked?: boolean;
  likeCount?: number;
  importCount?: number;
  rating?: number;
  ratingCount?: number;
  createdAt?: string;
  exam?: string;
  skill?: string;
  level?: string;
  /** Set client-side from catalogOverrides — only ever present for admins,
   *  since non-admins never receive hidden items from refreshCommunity(). */
  hidden?: boolean;
}

export interface AppState {
  theme: "light" | "dark";
  lang: string;
  sound: boolean;
  lastCheckin: string;
  xp: number;
  streak: number;
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  subscription: Subscription | null;
  payments: Array<Record<string, unknown>>;
  refunds: Array<Record<string, unknown>>;
  backend: boolean;
  syncing: boolean;
  /** True once the code-split official seed content (vocab + practice) has been
   *  applied at boot. Screens show a skeleton while this is false. */
  contentLoaded: boolean;
  decks: Deck[];
  progress: Record<string, { mastered: number[] }>;
  srs: Record<string, Record<number, SrsCard>>;
  examTargets: ExamTarget[];
  practiceHistory: PracticeAttempt[];
  flashSettings: FlashSettings;
  reading: PracticeSet[];
  listening: PracticeSet[];
  writing: PracticeSet[];
  mocks: PracticeSet[];
  /** Full official catalog (all vocab decks + all practice sets), independent of
   *  the user's own content — used to populate Community, never merged into
   *  decks/reading/listening/writing/mocks (only a curated starter subset of
   *  decks is merged into the user's own Flashcard list). */
  officialCatalog: {
    decks: Deck[];
    reading: PracticeSet[];
    listening: PracticeSet[];
    writing: PracticeSet[];
    mocks: PracticeSet[];
  };
  community: CommunityItem[];
  communitySort: "popular" | "rating" | "new";
  communityLikes: Record<string, boolean>;
  communityReviews: Record<string, { rating: number; body: string; createdAt: string }>;
  communityImportCounts: Record<string, number>;
  /** Admin hide/rename overrides for Community listings, fetched fresh on
   *  every refreshCommunity() call — never persisted locally. */
  catalogOverrides: Record<string, { hidden: boolean; title: string | null }>;
}

export interface Store {
  get(): AppState;
  set(patch: Partial<AppState>): void;
  update(fn: (state: AppState) => AppState): void;
  replace(next: Partial<AppState>): void;
  reset(): void;
  subscribe(fn: (state: AppState) => void): () => void;
}
