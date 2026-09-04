import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";
import { App } from "./app/App";
import { initAuth, setOnboardingHandler } from "./app/cloudSync";
import { capturePendingRef } from "./app/referral";
import { router } from "./app/router";
import { store, applyOfficialContent } from "./store/store";

capturePendingRef();

// Official seed content (vocab decks + practice sets) is code-split; kick off
// the download now so it loads in parallel with auth and the main bundle.
const officialContent = import("./data/defaultData.js").then(applyOfficialContent);

if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
  (window as unknown as { __store: typeof store }).__store = store;
}

setOnboardingHandler(() => {
  // Don't yank people off a deep link (shared set, creator profile) into
  // onboarding — let them see what they opened.
  if (/^\/(s|u)\//.test(window.location.pathname)) return;
  void router.navigate("/onboarding");
});

const mount = document.getElementById("app")!;

Promise.all([initAuth().catch(() => {}), officialContent.catch(() => {})]).finally(() => {
  createRoot(mount).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
