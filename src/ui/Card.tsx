import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function Card({
  className,
  soft,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { soft?: boolean }) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-line p-4 sm:p-5",
        soft ? "bg-surface-2" : "bg-surface shadow-card",
        className,
      )}
      {...rest}
    />
  );
}
