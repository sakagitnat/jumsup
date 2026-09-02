import { useStore, store } from "../store/useStore";
import { cx } from "../ui/cx";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useStore((s) => s.theme);
  const dark = theme === "dark";
  return (
    <button
      type="button"
      aria-label={dark ? "ใช้ธีมสว่าง" : "ใช้ธีมมืด"}
      onClick={() => store.set({ theme: dark ? "light" : "dark" })}
      className={cx(
        "grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:bg-surface-2 hover:text-text",
        className,
      )}
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}
