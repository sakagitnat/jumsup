import { backendEnabled } from "../lib/supabase.js";
import {
  loadCommunity,
  importCommunityItem,
  toggleCommunityLike,
  saveCommunityReview,
  reportCommunityContent,
} from "../lib/cloud.js";
import { store } from "../store/store";
import { getCurrentUser, hydrateFromCloud, scheduleSync } from "../app/cloudSync";
import { toast, proPopup } from "../ui/toast";
import type { AppState, CommunityItem } from "../store/types";

type Tab = "vocab" | "skill";

/** Synthesize the official catalog entries from local seed data. */
function buildDemoCommunity(s: AppState): CommunityItem[] {
  const likes = s.communityLikes || {};
  const reviews = s.communityReviews || {};
  const imports = s.communityImportCounts || {};
  const decorate = (x: CommunityItem): CommunityItem => {
    const review = reviews[x.id];
    const rating = review?.rating || x.rating || 0;
    const ratingCount = review ? 1 : x.ratingCount || 0;
    return {
      ...x,
      liked: !!likes[x.id],
      likeCount: (x.likeCount || 0) + (likes[x.id] ? 1 : 0),
      importCount: (x.importCount || 0) + (imports[x.id] || 0),
      rating,
      ratingCount,
    };
  };

  const vocab = (s.decks || [])
    .filter((x) => x.official)
    .map((x, i) =>
      decorate({
        id: x.id,
        type: "vocab",
        title: x.name,
        creator: "Jumsup Official",
        count: x.words?.length || 0,
        official: true,
        likeCount: 18 - i * 5,
        importCount: 42 - i * 11,
        rating: 4.7 - i * 0.2,
        ratingCount: 12 - i * 3,
        createdAt: "2026-08-25",
      }),
    );

  const skillSource = [
    ...(s.reading || []).map((x) => ({ ...x, kind: "reading" })),
    ...(s.listening || []).map((x) => ({ ...x, kind: "listening" })),
    ...(s.writing || []).map((x) => ({ ...x, kind: "writing" })),
    ...(s.mocks || []).map((x) => ({ ...x, kind: "mock" })),
  ].filter((x) => x.creator === "Jumsup Official");

  const skill = skillSource.map((x, i) =>
    decorate({
      id: x.id,
      type: "skill",
      kind: x.kind,
      sourceKind: x.kind,
      title: x.title,
      creator: x.creator || "Jumsup Official",
      count: x.itemCount || (Array.isArray(x.questions) ? x.questions.length : 1),
      official: true,
      likeCount: 24 - i * 2,
      importCount: 61 - i * 7,
      rating: Math.max(4.2, 4.9 - i * 0.12),
      ratingCount: 18 - i,
      createdAt: "2026-08-21",
    }),
  );

  return [...vocab, ...skill];
}

export async function refreshCommunity(query: string, tab: Tab) {
  const user = getCurrentUser();
  if (!user || !backendEnabled) {
    store.set({ community: buildDemoCommunity(store.get()) });
    return;
  }
  try {
    const remote = await loadCommunity(query, tab);
    const official = buildDemoCommunity(store.get()).filter(
      (item) => item.official && (tab === "vocab" ? item.type === "vocab" : item.type === "skill"),
    );
    const items = [
      ...official,
      ...remote.filter((item) => !official.some((seed) => seed.id === item.id)),
    ];
    store.set({ community: items });
  } catch (e) {
    console.error(e);
  }
}

function localCommunityImport(item: CommunityItem) {
  if (!item) return;
  const newId = `import-${crypto.randomUUID()}`;
  store.update((s) => {
    const counts = {
      ...(s.communityImportCounts || {}),
      [item.id]: (s.communityImportCounts?.[item.id] || 0) + 1,
    };
    if (item.type === "vocab") {
      const source = s.decks.find((x) => x.id === item.id);
      if (!source) return { ...s, communityImportCounts: counts };
      return {
        ...s,
        communityImportCounts: counts,
        decks: [
          ...s.decks,
          {
            ...structuredClone(source),
            id: newId,
            name: `${source.name} · สำเนา`,
            visibility: "private" as const,
            creator: "guest",
            official: false,
            sourceType: "community",
          },
        ],
      };
    }
    const key = (item.sourceKind === "mock" ? "mocks" : item.sourceKind) as
      | "reading"
      | "listening"
      | "writing"
      | "mocks";
    const source = (s[key] || []).find((x) => x.id === item.id);
    if (!source) return { ...s, communityImportCounts: counts };
    return {
      ...s,
      communityImportCounts: counts,
      [key]: [
        ...s[key],
        {
          ...structuredClone(source),
          id: `${item.sourceKind}-${newId}`,
          title: `${source.title} · สำเนา`,
          visibility: "private" as const,
          creator: "guest",
          official: false,
        },
      ],
    };
  });
}

export async function importCommunity(item: CommunityItem, refresh: () => void) {
  const user = getCurrentUser();
  if (!backendEnabled) {
    localCommunityImport(item);
    refresh();
    return toast("นำเข้าเป็นสำเนาใหม่ในโหมดทดสอบแล้ว");
  }
  if (!user) return toast("กรุณาเข้าสู่ระบบก่อนนำเข้า Community");
  if (item.official) {
    localCommunityImport(item);
    scheduleSync();
    refresh();
    return toast("นำเข้าชุดทางการของ Jumsup แล้ว");
  }
  try {
    await importCommunityItem(user, item);
  } catch (err) {
    if (String((err as Error).message).includes("COMMUNITY_SET_LIMIT_REACHED")) {
      return proPopup(
        "เก็บชุด Community ครบ 3 ชุดแล้ว",
        "ลบชุด Community เดิมก่อนเลือกชุดใหม่ หรืออัปเกรดเป็น Pro เพื่อเก็บได้ไม่จำกัด",
      );
    }
    return toast((err as Error).message || "นำเข้าไม่สำเร็จ");
  }
  await hydrateFromCloud(user);
  toast("นำเข้าเป็นสำเนาใหม่แล้ว");
}

export async function likeCommunity(item: CommunityItem, refresh: () => void) {
  const user = getCurrentUser();
  if (backendEnabled) {
    if (!user) return toast("กรุณาเข้าสู่ระบบก่อนกดถูกใจ");
    try {
      await toggleCommunityLike(user, item);
    } catch (e) {
      return toast((e as Error).message || "กดถูกใจไม่สำเร็จ");
    }
  } else {
    const s = store.get();
    store.set({
      communityLikes: { ...(s.communityLikes || {}), [item.id]: !s.communityLikes?.[item.id] },
    });
  }
  refresh();
}

export async function reviewCommunity(
  item: CommunityItem,
  rating: number,
  body: string,
  refresh: () => void,
) {
  const user = getCurrentUser();
  if (backendEnabled) {
    if (!user) return toast("กรุณาเข้าสู่ระบบก่อนให้คะแนน");
    try {
      await saveCommunityReview(user, item, rating, body);
    } catch (e) {
      return toast((e as Error).message || "บันทึกคะแนนไม่สำเร็จ");
    }
  } else {
    const s = store.get();
    store.set({
      communityReviews: {
        ...(s.communityReviews || {}),
        [item.id]: { rating, body, createdAt: new Date().toISOString() },
      },
    });
  }
  refresh();
  toast("บันทึกคะแนนและรีวิวแล้ว");
}

export async function reportCommunity(item: CommunityItem, reason: string) {
  const user = getCurrentUser();
  if (backendEnabled) {
    if (!user) return toast("กรุณาเข้าสู่ระบบก่อนรายงานเนื้อหา");
    try {
      await reportCommunityContent(user, item, reason);
    } catch (e) {
      return toast((e as Error).message || "ส่งรายงานไม่สำเร็จ");
    }
  }
  toast("ส่งรายงานให้ผู้ดูแลตรวจสอบแล้ว");
}

export { buildDemoCommunity };
