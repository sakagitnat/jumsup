import { useEffect } from "react";
import type { ReactNode } from "react";

export interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  // Give each screen its own <title> for browser tabs and search results.
  useEffect(() => {
    if (typeof title === "string" && title.trim()) {
      document.title = `${title} · Jumsup`;
      return () => {
        document.title = "Jumsup";
      };
    }
  }, [title]);

  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-subtle">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold sm:text-[28px]">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
