import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { loadPublicSet, type PublicSet } from "../../lib/cloud.js";
import { useStore } from "../../store/useStore";
import { loginGoogle } from "../../actions/auth";
import { importCommunity } from "../../actions/community";
import { SetContentView } from "../community/SetContentView";
import { ReviewsModal } from "../community/ReviewsModal";
import { PageHeader, Card, Button, EmptyState, toast } from "../../ui";
import type { CommunityItem } from "../../store/types";

export function SharedSet() {
  const { kind = "vocab", id = "" } = useParams();
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const [data, setData] = useState<PublicSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [reviewsOpen, setReviewsOpen] = useState(false);

  const asItem = (): CommunityItem | null =>
    data
      ? {
          id: data.id,
          type: kind === "vocab" ? "vocab" : "skill",
          sourceKind: kind === "vocab" ? undefined : kind,
          kind: kind === "vocab" ? undefined : kind,
          title: data.title,
          creator: data.creator,
          official: false,
        }
      : null;

  useEffect(() => {
    setLoading(true);
    setErr("");
    loadPublicSet(kind, id)
      .then((d) => setData(d))
      .catch((e) => setErr((e as Error).message || "ไม่พบชุดนี้ หรือถูกตั้งเป็นส่วนตัว"))
      .finally(() => setLoading(false));
  }, [kind, id]);

  const doImport = () => {
    if (!data) return;
    const item: CommunityItem = {
      id: data.id,
      type: kind === "vocab" ? "vocab" : "skill",
      sourceKind: kind === "vocab" ? undefined : kind,
      kind: kind === "vocab" ? undefined : kind,
      title: data.title,
      creator: data.creator,
      official: false,
    };
    importCommunity(item, () => {});
  };

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="SHARED SET" title="กำลังโหลด…" />
      </>
    );
  }

  if (err || !data) {
    return (
      <>
        <PageHeader eyebrow="SHARED SET" title="เปิดชุดนี้ไม่ได้" />
        <EmptyState>
          {err || "ไม่พบชุดนี้"}
          <div className="mt-3">
            <Button variant="primary" onClick={() => navigate("/community")}>
              ไปที่ Community
            </Button>
          </div>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="ชุดที่แชร์"
        title={data.title}
        description={
          <>
            โดย{" "}
            <Link
              to={`/u/${encodeURIComponent(data.creator)}`}
              className="font-semibold text-primary hover:underline"
            >
              @{data.creator}
            </Link>
          </>
        }
        actions={
          <>
            <Button onClick={() => setReviewsOpen(true)}>ดูรีวิว</Button>
            <Button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                toast("คัดลอกลิงก์แล้ว");
              }}
            >
              คัดลอกลิงก์
            </Button>
            {user ? (
              <Button variant="primary" onClick={doImport}>
                นำเข้าเข้าคลัง
              </Button>
            ) : (
              <Button variant="primary" onClick={loginGoogle}>
                เข้าสู่ระบบเพื่อนำเข้า
              </Button>
            )}
          </>
        }
      />
      <Card>
        <SetContentView data={data} />
      </Card>

      {reviewsOpen && (
        <ReviewsModal
          item={asItem()}
          onClose={() => setReviewsOpen(false)}
          onChanged={() => {}}
        />
      )}
    </>
  );
}
