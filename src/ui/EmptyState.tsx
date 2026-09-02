import type { ReactNode } from "react";

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-10 text-center text-sm text-muted">
      {children}
    </div>
  );
}
