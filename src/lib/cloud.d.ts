import type { AppState, CommunityItem } from "../store/types";

type User = { id: string; email?: string };

export function loadCloudState(user: User): Promise<Partial<AppState>>;
export function pushCloudState(user: User, state: AppState): Promise<void>;
export function loadCommunity(query?: string, type?: string): Promise<CommunityItem[]>;
export function importCommunityItem(user: User, item: CommunityItem): Promise<void>;
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
