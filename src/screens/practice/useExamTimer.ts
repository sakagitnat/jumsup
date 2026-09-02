import { useEffect, useRef, useState } from "react";

/**
 * Counts down to `endsAt` (epoch ms). Returns the remaining seconds and a
 * `warning` flag for the last 5 minutes. Calls `onExpire` once when it hits 0.
 * The interval is owned by this hook, so navigation away simply unmounts it —
 * no shared timers to leak.
 */
export function useExamTimer(endsAt: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
  );
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    firedRef.current = false;
    const tick = () => {
      const next = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(next);
      if (next <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return { remaining, label: `${mm}:${ss}`, warning: remaining > 0 && remaining <= 300 };
}
