import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { loadCreatorSets } from "../../lib/cloud.js";
import { PageHeader, Card, Tag, Button, EmptyState } from "../../ui";

type Sets = Awaited<ReturnType<typeof loadCreatorSets>>;

const kindLabel: Record<string, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  mock: "Mock Exam",
};

export function CreatorProfile() {
  const { username = "" } = useParams();
  const navigate = useNavigate();
  const [sets, setSets] = useState<Sets | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoading(true);
    setErr("");
    loadCreatorSets(username)
      .then((d) => setSets(d))
      .catch((e) => setErr((e as Error).message || "โหลดโปรไฟล์ไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [username]);

  const total = (sets?.vocab.length || 0) + (sets?.skill.length || 0);

  return (
    <>
      <PageHeader
        eyebrow="ครีเอเตอร์"
        title={`@${username}`}
        description={loading ? "กำลังโหลด…" : `เผยแพร่ ${total} ชุดสาธารณะ`}
      />

      {err && <EmptyState>{err}</EmptyState>}

      {!loading && !err && total === 0 && (
        <EmptyState>ยังไม่มีชุดสาธารณะจากผู้ใช้นี้</EmptyState>
      )}

      {sets && sets.vocab.length > 0 && (
        <Card className="mb-4">
          <h2 className="mb-2 text-base font-semibold">ชุดคำศัพท์ ({sets.vocab.length})</h2>
          {sets.vocab.map((s) => (
            <Link
              key={s.id}
              to={`/s/vocab/${s.id}`}
              className="flex items-center gap-3 border-t border-line py-3 first:border-t-0 hover:text-primary"
            >
              <b className="min-w-0 flex-1 truncate text-sm">{s.title}</b>
              <small className="text-xs text-muted">{s.count} คำ</small>
            </Link>
          ))}
        </Card>
      )}

      {sets && sets.skill.length > 0 && (
        <Card className="mb-4">
          <h2 className="mb-2 text-base font-semibold">ชุดฝึกทักษะ ({sets.skill.length})</h2>
          {sets.skill.map((s) => (
            <Link
              key={s.id}
              to={`/s/${s.kind}/${s.id}`}
              className="flex items-center gap-3 border-t border-line py-3 first:border-t-0 hover:text-primary"
            >
              <b className="min-w-0 flex-1 truncate text-sm">{s.title}</b>
              <Tag tone="neutral">{kindLabel[s.kind] || s.kind}</Tag>
            </Link>
          ))}
        </Card>
      )}

      <Button onClick={() => navigate("/community")}>กลับไป Community</Button>
    </>
  );
}
