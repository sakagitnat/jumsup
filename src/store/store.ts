// The plain-JS store (src/lib/store.js) is the single source of truth and keeps
// its localStorage key + migration logic untouched. Types come from store.d.ts.
export { store, applyOfficialContent } from "../lib/store.js";
export type { Store } from "./types";
