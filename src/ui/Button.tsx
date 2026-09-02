import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import type { LinkProps } from "react-router-dom";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-xl border transition-colors " +
  "disabled:opacity-50 disabled:pointer-events-none select-none";

const sizes: Record<Size, string> = {
  sm: "text-xs px-3 h-8",
  md: "text-sm px-4 h-10",
  lg: "text-sm px-5 h-12",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-primary border-primary text-on-primary hover:bg-primary-hover hover:border-primary-hover",
  secondary:
    "bg-surface border-line text-text hover:bg-surface-2 hover:border-line-strong",
  ghost: "bg-transparent border-transparent text-muted hover:bg-surface-2 hover:text-text",
  danger: "bg-danger-soft border-transparent text-danger hover:bg-danger hover:text-white",
  success:
    "bg-success-soft border-transparent text-success hover:bg-success hover:text-white",
};

export function buttonClass(opts: { variant?: Variant; size?: Size; block?: boolean } = {}) {
  const { variant = "secondary", size = "md", block } = opts;
  return cx(base, sizes[size], variants[variant], block && "w-full");
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(buttonClass({ variant, size, block }), className)}
      {...rest}
    />
  );
});

export function LinkButton({
  variant,
  size,
  block,
  className,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; block?: boolean }) {
  return <Link className={cx(buttonClass({ variant, size, block }), className)} {...rest} />;
}
