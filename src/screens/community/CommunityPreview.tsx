import { useEffect, useState } from "react";
import { getCommunityPreview, type CommunityPreview as Preview } from "../../actions/community";
import { SetContentView } from "./SetContentView";
import { Modal, Button, Tag, toast } from "../../ui";
import type { CommunityItem } from "../../store/types";

function shareUrl(item: CommunityItem) {
  const kind = item.type === "vocab" ? "vocab" : item.sourceKind || item.kind || "reading";
  return `${window.location.origin}/s/${kind}/${item.id}`;
}

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
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl(item));
              toast("คัดลอกลิงก์แชร์แล้ว");
            }}
          >
            แชร์
          </Button>
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
      {data && <SetContentView data={data} />}
    </Modal>
  );
}
