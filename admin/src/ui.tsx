import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { friendlyError } from "./errors";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

type BtnTone = "primary" | "line" | "danger" | "ghost";
export function Btn({
  tone = "line",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: BtnTone }) {
  const tones: Record<BtnTone, string> = {
    primary: "bg-[var(--primary)] text-white hover:brightness-105",
    line: "border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
    danger: "bg-[var(--danger)] text-white hover:brightness-105",
    ghost: "hover:bg-[var(--surface-2)]",
  };
  return (
    <button
      type="button"
      className={cx(
        "rounded-xl px-3.5 py-2 text-sm font-semibold disabled:opacity-40",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}

export function Field({
  label,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
      {label}
      <input
        className={cx(
          "rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--text)]",
          className,
        )}
        {...rest}
      />
    </label>
  );
}

export function Tag({
  children,
  tone = "line",
}: {
  children: ReactNode;
  tone?: "line" | "primary" | "danger" | "success" | "warning";
}) {
  const tones = {
    line: "bg-[var(--surface-2)] text-[var(--muted)]",
    primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
    warning: "bg-[#faf0dd] text-[var(--warning)]",
  };
  return (
    <span className={cx("rounded-full px-2 py-0.5 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function Section({
  title,
  desc,
  actions,
  children,
}: {
  title: string;
  desc?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {desc && <p className="text-sm text-[var(--muted)]">{desc}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--subtle)]">
      {children}
    </div>
  );
}

/* ---- toast ---- */
type ToastFn = (msg: string) => void;
const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastHost({ children }: { children: ReactNode }) {
  const [msgs, setMsgs] = useState<Array<{ id: number; text: string }>>([]);
  const push = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setMsgs((m) => [...m, { id, text }]);
    window.setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {msgs.map((m) => (
          <div
            key={m.id}
            className="rounded-xl bg-[var(--text)] px-4 py-2.5 text-sm text-white shadow-lg"
          >
            {m.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useAsync() {
  const toast = useToast();
  return useCallback(
    async (fn: () => Promise<unknown>, after?: () => void) => {
      try {
        await fn();
        after?.();
      } catch (e) {
        toast(friendlyError((e as Error).message) || "ทำรายการไม่สำเร็จ");
      }
    },
    [toast],
  );
}
