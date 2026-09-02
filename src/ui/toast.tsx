import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export interface ToastItem {
  id: number;
  kind: "info" | "pro";
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

function push(item: Omit<ToastItem, "id">) {
  const id = ++seq;
  items = [...items, { ...item, id }];
  emit();
  if (item.kind === "info") {
    setTimeout(() => dismiss(id), 4200);
  }
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

/** Fire-and-forget notice — safe to call from non-React action modules. */
export function toast(message: string) {
  push({ kind: "info", message });
}

/** Upgrade prompt with a CTA to the pricing screen. */
export function proPopup(title: string, message: string) {
  push({ kind: "pro", title, message });
}

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>(items);
  const navigate = useNavigate();

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
          <div className="mt-3 flex justify-end gap-2">
            {t.kind === "pro" && (
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary"
                onClick={() => {
                  dismiss(t.id);
                  navigate("/pricing");
                }}
              >
                ดู Jumsup Pro
              </button>
            )}
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
