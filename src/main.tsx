import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";
import { App } from "./app/App";
import { initAuth, setOnboardingHandler } from "./app/cloudSync";
import { router } from "./app/router";
import { store } from "./store/store";

if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
  (window as unknown as { __store: typeof store }).__store = store;
}

setOnboardingHandler(() => {
  void router.navigate("/onboarding");
});

const mount = document.getElementById("app")!;

initAuth().finally(() => {
  createRoot(mount).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
