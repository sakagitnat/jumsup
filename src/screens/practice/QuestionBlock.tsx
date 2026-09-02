import { attemptStore, useAttempt } from "./session";
import { cx } from "../../ui/cx";
import type { AttemptQuestion } from "./session";

export function QuestionBlock({
  q,
  index,
}: {
  q: AttemptQuestion;
  index: number;
}) {
  const attempt = useAttempt();
  const chosen = attempt?.answers[q._attemptKey];

  return (
    <div id={q._attemptKey} className="border-t border-line py-5 first:border-t-0 first:pt-0">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-subtle">
        ITEM {index + 1}
      </div>
      <h3 className="mb-3 text-[15px] font-semibold leading-relaxed">{q.prompt}</h3>
      <div className="space-y-2">
        {(q.choices ?? []).map((choice, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={chosen === i}
            onClick={() => attemptStore.answer(q._attemptKey, i)}
            className={cx(
              "flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
              chosen === i
                ? "border-primary-border bg-primary-soft text-primary"
                : "border-line bg-surface hover:border-primary-border hover:bg-primary-soft",
            )}
          >
            <span className="font-semibold">{i + 1}</span>
            <span>{choice}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
