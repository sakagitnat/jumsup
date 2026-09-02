import type { CommunityPreview } from "../../actions/community";

const kindLabel: Record<string, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  mock: "Mock Exam",
};

/** Read-only rendering of a set's contents, shared by the Community preview
 *  dialog and the public share page. */
export function SetContentView({ data }: { data: CommunityPreview }) {
  if (data.type === "vocab" && data.words) {
    return (
      <>
        <p className="mb-2 text-sm text-muted">{data.words.length} คำ</p>
        <div className="max-h-[55vh] overflow-auto rounded-xl border border-line">
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
          <p className="mt-2 text-xs text-subtle">
            แสดง 100 คำแรกจากทั้งหมด {data.words.length}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <p className="mb-2 text-sm text-muted">
        {kindLabel[data.kind || ""] || data.kind}
        {data.minutes ? ` · ${data.minutes} นาที` : ""}
        {data.itemCount ? ` · ${data.itemCount} ข้อ` : ""}
      </p>
      <div className="max-h-[55vh] space-y-3 overflow-auto">
        {(data.sections || []).map((sec, si) => {
          const body = sec.text || sec.passage || sec.script || sec.context || "";
          return (
            <div key={si} className="rounded-xl border border-line p-3">
              <b className="text-sm">
                PART {si + 1}
                {sec.title ? ` · ${sec.title}` : ""}
              </b>
              {body && (
                <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-muted">{body}</p>
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
  );
}
