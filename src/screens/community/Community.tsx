import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, store } from "../../store/useStore";
import {
  refreshCommunity,
  importCommunity,
  likeCommunity,
  reviewCommunity,
  reportCommunity,
} from "../../actions";
import { loginGoogle } from "../../actions/auth";
import { COMMUNITY_URL } from "../../lib/community";
import { EXAMS, examLabel, levelLabel } from "../../lib/taxonomy";
import { CommunityPreviewModal } from "./CommunityPreview";
import { ReviewsModal } from "./ReviewsModal";
import {
  PageHeader,
  Card,
  Tag,
  Button,
  EmptyState,
  Modal,
  StarRating,
  toast,
  cx,
  IconChat,
  IconExternal,
  IconDownload,
  IconHeart,
} from "../../ui";
import type { CommunityItem } from "../../store/types";

type Tab = "vocab" | "skill";

export function Community() {
  const community = useStore((s) => s.community);
  const sort = useStore((s) => s.communitySort);
  const user = useStore((s) => s.user);

  const [tab, setTab] = useState<Tab>("vocab");
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [examFilter, setExamFilter] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reviewFor, setReviewFor] = useState<CommunityItem | null>(null);
  const [reportFor, setReportFor] = useState<CommunityItem | null>(null);
  const [previewFor, setPreviewFor] = useState<CommunityItem | null>(null);

  const reload = () => refreshCommunity(query, tab);

  useEffect(() => {
    refreshCommunity(query, tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, query]);

  const onSearchChange = (v: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setQuery(v), 300);
  };

  const items = useMemo(() => {
    const q = query.toLowerCase();
    const score = (x: CommunityItem) =>
      (x.importCount || 0) * 3 + (x.likeCount || 0) * 2 + (x.ratingCount || 0) * (x.rating || 0);
    return (community || [])
      .filter(
        (x) =>
          x.type === tab &&
          (tab !== "skill" || !kindFilter || x.kind === kindFilter) &&
          (!examFilter || x.exam === examFilter) &&
          (!q || x.title.toLowerCase().includes(q) || x.creator.toLowerCase().includes(q)),
      )
      .sort((a, b) =>
        sort === "new"
          ? String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
          : sort === "rating"
            ? (b.rating || 0) - (a.rating || 0)
            : score(b) - score(a),
      );
  }, [community, tab, query, sort, kindFilter, examFilter]);

  return (
    <>
      <PageHeader
        eyebrow="COMMUNITY"
        title="Community Search"
        description="ค้นหา เปรียบเทียบ และนำเข้าชุดฝึกจากผู้สร้างคนอื่น"
      />

      <a
        href={COMMUNITY_URL}
        target="_blank"
        rel="noreferrer"
        className="mb-3 flex items-center gap-3 rounded-2xl border border-primary-border bg-primary-soft px-4 py-3 text-sm"
      >
        <IconChat size={22} className="shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <b className="block text-primary">เข้ากลุ่ม LINE OpenChat ของ Jumsup</b>
          <small className="text-xs text-muted">ถามข้อสอบ แชร์เทคนิค และหาเพื่อนติว</small>
        </span>
        <IconExternal size={16} className="shrink-0 text-primary" />
      </a>

      <div className="mb-3 inline-flex rounded-xl border border-line bg-surface-2 p-1">
        {(["vocab", "skill"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cx(
              "rounded-lg px-3 py-1.5 text-sm font-semibold",
              tab === t ? "bg-surface text-text shadow-sm" : "text-muted",
            )}
          >
            {t === "vocab" ? "ชุดคำศัพท์" : "ชุดฝึกทักษะ"}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          defaultValue={query}
          placeholder="ค้นหาชื่อชุด หรือ username ผู้สร้าง…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <select
          value={examFilter}
          onChange={(e) => setExamFilter(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
        >
          <option value="">ทุกข้อสอบ</option>
          {EXAMS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) =>
            store.set({ communitySort: e.target.value as "popular" | "rating" | "new" })
          }
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
        >
          <option value="popular">ยอดนิยม</option>
          <option value="rating">คะแนนสูงสุด</option>
          <option value="new">ใหม่ล่าสุด</option>
        </select>
        <Button onClick={reload}>รีเฟรช</Button>
      </div>

      {tab === "skill" && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {[
            ["", "ทั้งหมด"],
            ["reading", "Reading"],
            ["listening", "Listening"],
            ["writing", "Writing"],
            ["mock", "Mock"],
          ].map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setKindFilter(v)}
              className={cx(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                kindFilter === v
                  ? "border-primary-border bg-primary-soft text-primary"
                  : "border-line text-muted hover:bg-surface-2",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {!user && (
        <Card soft className="mb-4">
          <p className="text-sm text-muted">
            คุณดูชุดและสถิติได้โดยไม่ต้อง Login แต่ต้องเข้าสู่ระบบก่อนนำเข้าหรือให้คะแนนบนระบบออนไลน์
          </p>
          <Button variant="primary" className="mt-3" onClick={loginGoogle}>
            สมัครฟรี
          </Button>
        </Card>
      )}

      {items.length > 0 && (
        <p className="mb-2 text-sm text-muted">พบ {items.length} ชุด</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {items.length === 0 && <EmptyState>ยังไม่พบผลลัพธ์</EmptyState>}
        {items.map((x) => (
          <Card key={x.id} className="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <Tag tone={x.official ? "info" : "success"}>
                {x.official ? "OFFICIAL" : "COMMUNITY"}
              </Tag>
              <span className="text-xs text-subtle">{x.kind || x.type}</span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewFor(x)}
              className="mt-2 text-left text-base font-semibold hover:text-primary hover:underline"
            >
              {x.title}
            </button>
            <p className="text-sm text-muted">
              {x.type === "vocab" ? `${x.count || 0} คำ` : `${x.count || 0} ข้อ`} · สร้างโดย{" "}
              {x.official ? (
                <b>@{x.creator}</b>
              ) : (
                <Link to={`/u/${encodeURIComponent(x.creator)}`} className="font-semibold text-primary hover:underline">
                  @{x.creator}
                </Link>
              )}
            </p>
            {(x.exam || x.level) && (
              <div className="mt-1 flex flex-wrap gap-1">
                {x.exam && <Tag tone="neutral">{examLabel(x.exam)}</Tag>}
                {x.level && <Tag tone="neutral">{levelLabel(x.level)}</Tag>}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <StarRating value={Math.round(x.rating || 0)} size="sm" readOnly />
                <b>{Number(x.rating || 0).toFixed(1)}</b>
                <small>({x.ratingCount || 0})</small>
              </span>
              <span className="inline-flex items-center gap-1" title="นำเข้า">
                <IconDownload size={14} /> {x.importCount || 0}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">ให้คะแนน:</span>
              <StarRating
                value={0}
                size="sm"
                onChange={(n) => reviewCommunity(x, n, "", false, reload)}
              />
              <button
                type="button"
                onClick={() => setReviewFor(x)}
                className="text-primary hover:underline"
              >
                รีวิว ({x.ratingCount || 0})
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => importCommunity(x, reload)}>
                นำเข้า
              </Button>
              <Button size="sm" onClick={() => setPreviewFor(x)}>
                ดูตัวอย่าง
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const k = x.type === "vocab" ? "vocab" : x.sourceKind || x.kind || "reading";
                  navigator.clipboard?.writeText(`${window.location.origin}/s/${k}/${x.id}`);
                  toast("คัดลอกลิงก์แชร์แล้ว");
                }}
              >
                แชร์
              </Button>
              <button
                type="button"
                aria-label="ถูกใจ"
                onClick={() => likeCommunity(x, reload)}
                className={cx(
                  "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-sm font-semibold",
                  x.liked
                    ? "border-transparent bg-danger-soft text-danger"
                    : "border-line text-muted hover:bg-surface-2",
                )}
              >
                <IconHeart size={14} filled={x.liked} className="inline align-[-2px]" />{" "}
                {x.likeCount || 0}
              </button>
              <button
                type="button"
                onClick={() => setReportFor(x)}
                className="ml-auto text-xs text-subtle hover:text-muted"
              >
                รายงาน
              </button>
            </div>
          </Card>
        ))}
      </div>

      <CommunityPreviewModal
        item={previewFor}
        onClose={() => setPreviewFor(null)}
        onImport={(it) => importCommunity(it, reload)}
        onReviews={(it) => setReviewFor(it)}
      />
      <ReviewsModal
        item={reviewFor}
        onClose={() => setReviewFor(null)}
        onChanged={reload}
      />
      <ReportModal item={reportFor} onClose={() => setReportFor(null)} />
    </>
  );
}

function ReportModal({ item, onClose }: { item: CommunityItem | null; onClose: () => void }) {
  const [reason, setReason] = useState("ข้อมูลหรือเฉลยไม่ถูกต้อง");
  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title="รายงานเนื้อหา"
      footer={
        <>
          <Button onClick={onClose}>ยกเลิก</Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (item) await reportCommunity(item, reason);
              onClose();
            }}
          >
            ส่งรายงาน
          </Button>
        </>
      }
    >
      <label className="block text-sm font-semibold">เหตุผล</label>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
      >
        <option>ข้อมูลหรือเฉลยไม่ถูกต้อง</option>
        <option>ละเมิดลิขสิทธิ์</option>
        <option>Spam หรือโฆษณา</option>
        <option>เนื้อหาไม่เหมาะสม</option>
      </select>
    </Modal>
  );
}
