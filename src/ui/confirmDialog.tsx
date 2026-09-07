import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

/** window.confirm()/prompt() are unreliable in an iOS home-screen PWA (standalone
 *  display mode) -- WebKit suppresses them there, so they can resolve/no-op
 *  without ever showing anything, silently breaking whatever depended on the
 *  answer. These are in-app, Modal-based replacements with the same call shape. */
interface DialogState {
  open: boolean;
  kind: "confirm" | "prompt";
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  defaultValue?: string;
  resolve?: (value: boolean | string | null) => void;
}

type Listener = (s: DialogState) => void;

let state: DialogState = { open: false, kind: "confirm", title: "" };
const listeners = new Set<Listener>();

function emit() {
  for (const fn of listeners) fn(state);
}

export function confirmDialog(opts: {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    state = { open: true, kind: "confirm", resolve: resolve as DialogState["resolve"], ...opts };
    emit();
  });
}

export function promptDialog(opts: {
  title: string;
  message?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}): Promise<string | null> {
  return new Promise((resolve) => {
    state = { open: true, kind: "prompt", resolve: resolve as DialogState["resolve"], ...opts };
    emit();
  });
}

export function ConfirmDialogHost() {
  const [s, setS] = useState(state);
  const [text, setText] = useState("");

  useEffect(() => {
    const fn: Listener = (next) => {
      setS(next);
      if (next.open) setText(next.defaultValue || "");
    };
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const finish = (value: boolean | string | null) => {
    s.resolve?.(value);
    state = { ...state, open: false };
    setS(state);
  };

  return (
    <Modal
      open={s.open}
      onClose={() => finish(s.kind === "confirm" ? false : null)}
      title={s.title}
      footer={
        <>
          <Button onClick={() => finish(s.kind === "confirm" ? false : null)}>
            {s.cancelLabel || "ยกเลิก"}
          </Button>
          <Button
            variant={s.danger ? "danger" : "primary"}
            onClick={() => finish(s.kind === "confirm" ? true : text)}
          >
            {s.confirmLabel || "ตกลง"}
          </Button>
        </>
      }
    >
      {s.message && <p className="mb-3 text-sm text-muted">{s.message}</p>}
      {s.kind === "prompt" && (
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
        />
      )}
    </Modal>
  );
}
