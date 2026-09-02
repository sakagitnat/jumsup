import { useEffect, useState } from "react";
import { getCommunityPreview, type CommunityPreview as Preview } from "../../actions/community";
import { Modal, Button, Tag } from "../../ui";
import type { CommunityItem } from "../../store/types";

const kindLabel: Record<string, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  mock: "Mock Exam",
};

export function CommunityPreviewModal({
  item,
  onClose,
  onImport,
}: {
  item: CommunityItem | null;
  onClose: () => void;
  onImport: (item: CommunityItem) => void;
}) {
  const [data, setData] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!item) {
      setData(null);
      setErr("");
      return;
    }
    setLoading(true);
    setErr("");
    getCommunityPreview(item)
      .then((d) => setData(d))
      .catch((e) => setErr((e as Error).message || "โหลดตัวอย่างไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [item]);

  if (!item) return null;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="ตัวอย่างชุด"
      footer={
        <>
          <Button onClick={onClose}>ปิด</Button>
          <Button
            variant="primary"
            onClick={() => {
              onImport(item);
              onClose();
            }}
          >
            นำเข้าเข้าคลัง
          </Button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tag tone={item.official ? "info" : "success"}>
          {item.official ? "OFFICIAL" : "COMMUNITY"}
        </Tag>
        <span className="text-sm text-muted">
          โดย @{item.creator} · ★ {Number(item.rating || 0).toFixed(1)} ({item.ratingCount || 0}) · ♥{" "}
          {item.likeCount || 0} · ⇩ {item.importCount || 0}
        </span>
      </div>
      <h3 className="mb-3 text-lg font-semibold">{data?.title || item.title}</h3>

      {loading && <p className="text-sm text-muted">กำลังโหลดตัวอย่าง…</p>}
      {err && <p className="text-sm text-danger">{err}</p>}

      {data?.type === "vocab" && data.words && (
        <>
          <p className="mb-2 text-sm text-muted">{data.words.length} คำ</p>
          <div className="max-h-[50vh] overflow-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-2">
                <tr>
                  <th className="px-3 py-2 font-semibold">คำ</th>
                  <th className="px-3 py-2 font-semibold">ความหมาย</th>
                </tr>
              </thead>
              <tbody>
                {data.words.slice(0, 100).map((w, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-2 font-medium">{w.w}</td>
                    <td className="px-3 py-2 text-muted">{w.m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.words.length > 100 && (
            <p className="mt-2 text-xs text-subtle">แสดง 100 คำแรกจากทั้งหมด {data.words.length}</p>
          )}
        </>
      )}

      {data?.type === "skill" && (
        <>
          <p className="mb-2 text-sm text-muted">
            {kindLabel[data.kind || ""] || data.kind}
            {data.minutes ? ` · ${data.minutes} นาที` : ""}
            {data.itemCount ? ` · ${data.itemCount} ข้อ` : ""}
          </p>
          <div className="max-h-[50vh] space-y-3 overflow-auto">
            {(data.sections || []).map((sec, si) => {
              const body = sec.text || sec.passage || sec.script || sec.context || "";
              return (
                <div key={si} className="rounded-xl border border-line p-3">
                  <b className="text-sm">
                    PART {si + 1}
                    {sec.title ? ` · ${sec.title}` : ""}
                  </b>
                  {body && (
                    <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-muted">
                      {body}
                    </p>
                  )}
                  {(sec.questions || []).slice(0, 2).map((q, qi) => (
                    <div key={qi} className="mt-2 text-sm">
                      <p className="font-medium">
                        {qi + 1}. {q.prompt}
                      </p>
                      <ul className="ml-4 list-disc text-muted">
                        {(q.choices || []).map((c, ci) => (
                          <li key={ci}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {(sec.questions?.length || 0) > 2 && (
                    <p className="mt-1 text-xs text-subtle">
                      …และอีก {(sec.questions?.length || 0) - 2} ข้อ
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
}
