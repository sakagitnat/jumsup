import type { AppState, CommunityItem } from "../store/types";

type User = { id: string; email?: string };

export function loadCloudState(user: User): Promise<Partial<AppState>>;
export function pushCloudState(user: User, state: AppState): Promise<void>;
export function loadCommunity(query?: string, type?: string): Promise<CommunityItem[]>;
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
): Promise<void>;
export function reportCommunityContent(
  user: User,
  item: CommunityItem,
  reason: string,
): Promise<void>;
