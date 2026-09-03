import { useEffect, useState } from "react";
import {
  getReviews,
  reviewCommunity,
  deleteReview,
  voteHelpful,
  replyReview,
  type ContentReview,
} from "../../actions/community";
import { useStore } from "../../store/useStore";
import { Modal, Button, StarRating, cx, IconCheck, IconThumbUp } from "../../ui";
import type { CommunityItem } from "../../store/types";

type Sort = "recent" | "top" | "helpful";

function when(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

export function ReviewsModal({
  item,
  onClose,
  onChanged,
}: {
  item: CommunityItem | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const user = useStore((s) => s.user);
  const myName = useStore((s) => s.profile?.username);
  const isOwner = !!user && !!item && item.creator === myName && item.creator !== "Jumsup Official";

  const [list, setList] = useState<ContentReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<Sort>("recent");
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const mine = list.find((r) => r.isMine);

  const load = (s: Sort = sort) => {
    if (!item) return;
    setLoading(true);
    getReviews(item, s)
      .then((rs) => {
        setList(rs);
        const own = rs.find((r) => r.isMine);
        if (own) {
          setRating(own.rating);
          setBody(own.body);
          setAnon(own.anonymous);
        } else {
          setRating(0);
          setBody("");
          setAnon(false);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (item) load("recent");
    setSort("recent");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  if (!item) return null;

  const save = async () => {
    if (!rating) return;
    setBusy(true);
    await reviewCommunity(item, rating, body.trim(), anon, () => {});
    setBusy(false);
    onChanged();
    load();
  };
  const remove = async () => {
    setBusy(true);
    await deleteReview(item, () => {});
    setBusy(false);
    onChanged();
    load();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={`รีวิว · ${item.title}`}>
      {user ? (
        <div className="rounded-xl border border-line p-3">
          <p className="text-sm font-semibold">{mine ? "รีวิวของคุณ" : "เขียนรีวิว"}</p>
          <div className="mt-2">
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>
          <textarea
            rows={3}
            maxLength={1000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="บอกสิ่งที่เป็นประโยชน์กับผู้เรียนคนอื่น (ไม่บังคับ)"
            className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
            รีวิวแบบไม่ระบุชื่อ (ผู้สร้างและผู้ใช้อื่นจะไม่เห็นชื่อคุณ)
          </label>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" size="sm" disabled={busy || !rating} onClick={save}>
              {mine ? "บันทึกการแก้ไข" : "ส่งรีวิว"}
            </Button>
            {mine && (
              <Button size="sm" variant="danger" disabled={busy} onClick={remove}>
                ลบรีวิว
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">เข้าสู่ระบบเพื่อเขียนรีวิว</p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-semibold">ทั้งหมด {list.length} รีวิว</p>
        <select
          value={sort}
          onChange={(e) => {
            const s = e.target.value as Sort;
            setSort(s);
            load(s);
          }}
          className="rounded-lg border border-line bg-surface px-2 py-1 text-sm"
        >
          <option value="recent">ล่าสุด</option>
          <option value="top">คะแนนสูงสุด</option>
          <option value="helpful">มีประโยชน์สุด</option>
        </select>
      </div>

      {loading && <p className="mt-2 text-sm text-muted">กำลังโหลด…</p>}
      {!loading && list.length === 0 && (
        <p className="mt-2 text-sm text-muted">ยังไม่มีรีวิว — เป็นคนแรกได้เลย</p>
      )}

      <div className="mt-2 max-h-[45vh] space-y-3 overflow-auto">
        {list.map((r) => (
          <div key={r.id} className="rounded-xl border border-line p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <StarRating value={r.rating} size="sm" readOnly />
                <span className={cx("text-sm font-semibold", !r.displayName && "text-subtle")}>
                  {r.displayName || "ไม่ระบุชื่อ"}
                </span>
                {r.imported && (
                  <span className="inline-flex items-center gap-1 rounded bg-success-soft px-1.5 py-0.5 text-[10px] font-bold text-success">
                    <IconCheck size={11} /> นำเข้าแล้ว
                  </span>
                )}
                {r.isMine && (
                  <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    ของคุณ
                  </span>
                )}
              </div>
              <span className="text-xs text-subtle">{when(r.updatedAt || r.createdAt)}</span>
            </div>

            {r.body && <p className="mt-1.5 text-sm text-muted">{r.body}</p>}

            {r.creatorReply && (
              <div className="mt-2 rounded-lg bg-surface-2 p-2 text-sm">
                <b className="text-xs text-primary">ตอบกลับจากผู้สร้าง</b>
                <p className="mt-0.5 text-muted">{r.creatorReply}</p>
              </div>
            )}

            <div className="mt-2 flex items-center gap-3 text-xs">
              <button
                type="button"
                disabled={!user || r.isMine || r.id === "local"}
                onClick={async () => {
                  await voteHelpful(r.id);
                  load();
                }}
                className={cx(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-semibold disabled:opacity-40",
                  r.helpfulByMe
                    ? "border-transparent bg-primary-soft text-primary"
                    : "border-line text-muted hover:bg-surface-2",
                )}
              >
                <IconThumbUp size={13} className="mr-1 inline align-[-2px]" />
                มีประโยชน์ {r.helpfulCount > 0 ? `(${r.helpfulCount})` : ""}
              </button>

              {isOwner && r.id !== "local" && (
                <button
                  type="button"
                  onClick={() => {
                    setReplyFor(replyFor === r.id ? null : r.id);
                    setReplyText(r.creatorReply || "");
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  {r.creatorReply ? "แก้ไขคำตอบ" : "ตอบกลับ"}
                </button>
              )}
            </div>

            {isOwner && replyFor === r.id && (
              <div className="mt-2">
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="ตอบกลับรีวิวนี้…"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                />
                <div className="mt-1 flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={async () => {
                      await replyReview(r.id, replyText.trim());
                      setReplyFor(null);
                      load();
                    }}
                  >
                    บันทึก
                  </Button>
                  <Button size="sm" onClick={() => setReplyFor(null)}>
                    ยกเลิก
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={onClose}>ปิด</Button>
      </div>
    </Modal>
  );
}
