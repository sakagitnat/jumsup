/** The Jumsup mark. Rendered from /brand/jumsup-logo.svg so the whole app stays
 *  in sync with one file. */
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/jumsup-logo.svg"
      width={size}
      height={size}
      alt="Jumsup"
      className={className}
      style={{ display: "block" }}
    />
  );
}
