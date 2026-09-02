import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, store } from "../../store/useStore";
import {
  refreshCommunity,
  importCommunity,
  likeCommunity,
  reviewCommunity,
  reportCommunity,
} from "../../actions";
import { loginGoogle } from "../../actions/auth";
import { CommunityPreviewModal } from "./CommunityPreview";
import { PageHeader, Card, Tag, Button, EmptyState, Modal, StarRating, cx } from "../../ui";
import type { CommunityItem } from "../../store/types";

type Tab = "vocab" | "skill";

export function Community() {
  const community = useStore((s) => s.community);
  const sort = useStore((s) => s.communitySort);
  const user = useStore((s) => s.user);

  const [tab, setTab] = useState<Tab>("vocab");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [reviewFor, setReviewFor] = useState<CommunityItem | null>(null);
  const [reportFor, setReportFor] = useState<CommunityItem | null>(null);
  const [previewFor, setPreviewFor] = useState<CommunityItem | null>(null);

  const reload = () => refreshCommunity(query, tab);

  useEffect(() => {
    refreshCommunity(query, tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const items = useMemo(() => {
    const q = query.toLowerCase();
    const score = (x: CommunityItem) =>
      (x.importCount || 0) * 3 + (x.likeCount || 0) * 2 + (x.ratingCount || 0) * (x.rating || 0);
    return (community || [])
      .filter(
        (x) =>
          x.type === tab &&
          (!q || x.title.toLowerCase().includes(q) || x.creator.toLowerCase().includes(q)),
      )
      .sort((a, b) =>
        sort === "new"
          ? String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
          : sort === "rating"
            ? (b.rating || 0) - (a.rating || 0)
            : score(b) - score(a),
      );
  }, [community, tab, query, sort]);

  const totalImports = items.reduce((n, x) => n + (x.importCount || 0), 0);
  const avgRating = items.length
    ? (items.reduce((n, x) => n + (x.rating || 0), 0) / items.length).toFixed(1)
    : "-";

  return (
    <>
      <PageHeader
        eyebrow="COMMUNITY"
        title="Community Search"
        description="ค้นหา เปรียบเทียบ และนำเข้าชุดฝึกจากผู้สร้างคนอื่น"
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          [String(items.length), "ชุดที่พบ"],
          [String(totalImports), "การนำเข้า"],
          [String(avgRating), "คะแนนเฉลี่ย"],
        ].map(([v, l]) => (
          <Card key={l} soft className="text-center">
            <strong className="block text-lg">{v}</strong>
            <small className="text-xs text-muted">{l}</small>
          </Card>
        ))}
      </div>

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

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          ref={searchRef}
          defaultValue={query}
          placeholder="ค้นหาชื่อชุด หรือ username ผู้สร้าง..."
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") setQuery(searchRef.current?.value || "");
          }}
        />
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
        <Button onClick={() => setQuery(searchRef.current?.value || "")}>ค้นหา</Button>
        <Button onClick={reload}>รีเฟรช</Button>
      </div>

      {!user && (
        <Card soft className="mb-4">
          <p className="text-sm text-muted">
            คุณดูชุดและสถิติได้โดยไม่ต้อง Login แต่ต้องเข้าสู่ระบบก่อนนำเข้าหรือให้คะแนนบนระบบออนไลน์
          </p>
          <Button variant="primary" className="mt-3" onClick={loginGoogle}>
            เข้าสู่ระบบ Google
          </Button>
        </Card>
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
              {x.count || 1} รายการ · สร้างโดย <b>@{x.creator}</b>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <StarRating value={Math.round(x.rating || 0)} size="sm" readOnly />
                <b>{Number(x.rating || 0).toFixed(1)}</b>
                <small>({x.ratingCount || 0})</small>
              </span>
              <span title="นำเข้า">⇩ {x.importCount || 0}</span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">ให้คะแนน:</span>
              <StarRating
                value={0}
                size="sm"
                onChange={(n) => reviewCommunity(x, n, "", reload)}
              />
              <button
                type="button"
                onClick={() => setReviewFor(x)}
                className="text-primary hover:underline"
              >
                เขียนรีวิว
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => importCommunity(x, reload)}>
                นำเข้า
              </Button>
              <Button size="sm" onClick={() => setPreviewFor(x)}>
                ดูตัวอย่าง
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
                {x.liked ? "♥" : "♡"} {x.likeCount || 0}
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
      />
      <ReviewModal item={reviewFor} onClose={() => setReviewFor(null)} reload={reload} />
      <ReportModal item={reportFor} onClose={() => setReportFor(null)} />
    </>
  );
}

function ReviewModal({
  item,
  onClose,
  reload,
}: {
  item: CommunityItem | null;
  onClose: () => void;
  reload: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title="ให้คะแนนชุดฝึก"
      footer={
        <>
          <Button onClick={onClose}>ยกเลิก</Button>
          <Button
            variant="primary"
            onClick={async () => {
              if (item) await reviewCommunity(item, rating, body.trim(), reload);
              onClose();
              setBody("");
            }}
          >
            บันทึก
          </Button>
        </>
      }
    >
      <label className="block text-sm font-semibold">คะแนน</label>
      <div className="mt-1">
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>
      <label className="mt-3 block text-sm font-semibold">รีวิว (ไม่บังคับ)</label>
      <textarea
        rows={4}
        maxLength={1000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="บอกสิ่งที่เป็นประโยชน์กับผู้เรียนคนอื่น"
        className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
      />
    </Modal>
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
