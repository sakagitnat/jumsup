import type { HTMLAttributes } from "react";
import { cx } from "./cx";

type Tone = "info" | "success" | "warning" | "danger" | "neutral";

const tones: Record<Tone, string> = {
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-2 text-muted",
};

export function Tag({
  tone = "neutral",
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
