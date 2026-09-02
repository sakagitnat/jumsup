import { useState } from "react";
import { cx } from "./cx";

export function StarRating({
  value,
  onChange,
  size = "md",
  readOnly,
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const px = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-2xl";

  return (
    <div className="inline-flex" role={readOnly ? undefined : "radiogroup"} aria-label="คะแนน">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          aria-label={`${n} ดาว`}
          aria-checked={value === n}
          role={readOnly ? undefined : "radio"}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(n)}
          className={cx(
            px,
            "leading-none transition-transform",
            !readOnly && "hover:scale-110",
            n <= shown ? "text-warning" : "text-line-strong",
            readOnly && "cursor-default",
          )}
        >
          {n <= shown ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}
