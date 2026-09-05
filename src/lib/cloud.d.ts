import type { AppState, CommunityItem, ExamTarget, PracticeAttempt } from "../store/types";

type User = { id: string; email?: string };

export function loadCloudState(user: User): Promise<Partial<AppState>>;
export function pushCloudState(user: User, state: AppState): Promise<void>;
export function savePracticeAttempt(
  user: User,
  rec: Omit<PracticeAttempt, "id" | "takenAt">,
): Promise<{ id: string; taken_at: string } | null>;
export function saveExamTargets(
  user: User,
  targets: Array<{ name: string; date: string | null }>,
): Promise<ExamTarget[]>;

export interface WeeklyLeaderboard {
  weekStart: string;
  top: Array<{ username: string; xp: number; rank: number; isMe: boolean }>;
  me: { xp: number; rank: number } | null;
}
export function loadWeeklyLeaderboard(limit?: number): Promise<WeeklyLeaderboard>;

export interface WeekRecap {
  weekStart: string;
  rank: number;
  prevRank: number | null;
  xp: number;
  rewardXp: number;
  rewardProDays: number;
  tierLabel: string;
}
export function loadWeekRecap(): Promise<WeekRecap | null>;
export function markWeekRecapSeen(): Promise<void>;
export function loadLeaderboardHistoryWeeks(): Promise<string[]>;

export interface HistoryLeaderboard {
  weekStart: string;
  top: Array<{
    username: string;
    xp: number;
    rank: number;
    isMe: boolean;
    rewardXp: number;
    rewardProDays: number;
  }>;
  me: { xp: number; rank: number; rewardXp: number; rewardProDays: number } | null;
}
export function loadLeaderboardHistory(
  week: string,
  limit?: number,
): Promise<HistoryLeaderboard>;
export function loadCommunity(query?: string, type?: string): Promise<CommunityItem[]>;
export function withCommunityMetrics(
  items: CommunityItem[],
  type: "vocab" | "skill",
): Promise<CommunityItem[]>;
export function importCommunityItem(user: User, item: CommunityItem): Promise<void>;

export interface CommunityPreview {
  type: "vocab" | "skill";
  kind?: string;
  title: string;
  words?: Array<{ w: string; p?: string; m: string; e?: string }>;
  minutes?: number;
  itemCount?: number;
  sections?: Array<{
    title?: string;
    text?: string;
    script?: string;
    passage?: string;
    context?: string;
    questions?: Array<{ prompt?: string; choices?: string[]; answer?: number }>;
  }>;
}
export function loadCommunityPreview(item: CommunityItem): Promise<CommunityPreview | null>;

export interface PublicSet extends CommunityPreview {
  id: string;
  creator: string;
}
export function loadPublicSet(kind: string, id: string): Promise<PublicSet | null>;

export function loadCreatorSets(username: string): Promise<{
  displayName: string;
  handle: string;
  vocab: Array<{ id: string; title: string; count: number }>;
  skill: Array<{ id: string; title: string; kind: string }>;
}>;
export function uploadAvatar(user: User, file: File): Promise<string>;
export function toggleCommunityLike(user: User, item: CommunityItem): Promise<boolean>;
export function saveCommunityReview(
  user: User,
  item: CommunityItem,
  rating: number,
  body?: string,
  anonymous?: boolean,
): Promise<void>;
export function deleteCommunityReview(user: User, item: CommunityItem): Promise<void>;

export interface ContentReview {
  id: string;
  rating: number;
  body: string;
  anonymous: boolean;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
  displayName: string;
  helpfulCount: number;
  helpfulByMe: boolean;
  imported: boolean;
  creatorReply: string;
  creatorRepliedAt: string | null;
}
export function loadContentReviews(
  type: string,
  id: string,
  sort?: "recent" | "top" | "helpful",
): Promise<ContentReview[]>;
export function toggleReviewHelpful(reviewId: string): Promise<number>;
export function replyToReview(reviewId: string, reply: string): Promise<void>;
export function reportCommunityContent(
  user: User,
  item: CommunityItem,
  reason: string,
): Promise<void>;
