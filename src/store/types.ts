/* Shape of the state held by src/lib/store.js. Kept in sync by hand — the store
   module stays plain JS so its migration/merge logic is untouched by the rewrite. */

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
  showMeaning: boolean;
  shuffle: boolean;
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
  activeDeckId: string;
  decks: Deck[];
  progress: Record<string, { mastered: number[] }>;
  flashSettings: FlashSettings;
  reading: PracticeSet[];
  listening: PracticeSet[];
  writing: PracticeSet[];
  mocks: PracticeSet[];
  community: CommunityItem[];
  communitySort: "popular" | "rating" | "new";
  communityLikes: Record<string, boolean>;
  communityReviews: Record<string, { rating: number; body: string; createdAt: string }>;
  communityImportCounts: Record<string, number>;
}

export interface Store {
  get(): AppState;
  set(patch: Partial<AppState>): void;
  update(fn: (state: AppState) => AppState): void;
  replace(next: Partial<AppState>): void;
  reset(): void;
  subscribe(fn: (state: AppState) => void): () => void;
}
