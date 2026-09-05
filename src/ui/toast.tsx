import { useEffect, useState } from "react";

export interface ToastItem {
  id: number;
  title?: string;
  message: string;
}

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();
let seq = 0;

function emit() {
  for (const fn of listeners) fn(items);
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

/** Fire-and-forget notice — safe to call from non-React action modules. */
export function toast(message: string) {
  const id = ++seq;
  items = [...items, { id, message }];
  emit();
  setTimeout(() => dismiss(id), 4200);
}

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>(items);

  useEffect(() => {
    const fn: Listener = (next) => setList(next);
    listeners.add(fn);
    setList(items);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  if (!list.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
      {list.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto w-full max-w-sm rounded-xl border border-line bg-surface p-4 shadow-pop"
        >
          {t.title && <p className="mb-1 font-semibold">{t.title}</p>}
          <p className="text-sm text-muted">{t.message}</p>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2"
              onClick={() => dismiss(t.id)}
            >
              ปิด
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
