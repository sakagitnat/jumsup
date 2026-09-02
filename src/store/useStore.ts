import { useRef } from "react";
import { useSyncExternalStore } from "react";
import { store } from "./store";
import type { AppState } from "./types";

const identity = <T,>(s: AppState) => s as unknown as T;

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false;
  const ak = Object.keys(a as object);
  const bk = Object.keys(b as object);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
      return false;
  }
  return true;
}

const EMPTY = Symbol("empty");

/**
 * Subscribe a component to the app store. A selector may return a primitive or a
 * fresh object literal — the result is memoised with a shallow comparison, so
 * `useStore(s => ({ a: s.a, b: s.b }))` will not cause render loops and only
 * re-renders when `a` or `b` actually change.
 */
export function useStore<T = AppState>(
  selector: (state: AppState) => T = identity,
): T {
  const lastStateRef = useRef<AppState | typeof EMPTY>(EMPTY);
  const lastResultRef = useRef<T | typeof EMPTY>(EMPTY);

  const getSnapshot = (): T => {
    const state = store.get();
    if (state === lastStateRef.current && lastResultRef.current !== EMPTY) {
      return lastResultRef.current;
    }
    const next = selector(state);
    if (lastResultRef.current !== EMPTY && shallowEqual(next, lastResultRef.current)) {
      lastStateRef.current = state;
      return lastResultRef.current;
    }
    lastStateRef.current = state;
    lastResultRef.current = next;
    return next;
  };

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export { store };
