import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "../store/useStore";
import { localizePage } from "../lib/i18n.js";

/**
 * Non-Thai UI languages are applied by walking the rendered DOM and swapping
 * text (see i18n.js `localizePage`). React owns those text nodes, so we re-run
 * the pass after each navigation and a couple of delayed ticks to catch content
 * that mounts asynchronously. Switching language triggers a full reload
 * (see the pickers in Landing / Settings), so we never need to undo a pass.
 */
export function useLocalize() {
  const lang = useStore((s) => s.lang);
  const { pathname } = useLocation();

  useEffect(() => {
    if (lang === "th") return;
    const run = () => {
      try {
        localizePage(document.body, lang);
      } catch {
        /* translation is best-effort */
      }
    };
    const raf = requestAnimationFrame(run);
    const t1 = window.setTimeout(run, 250);
    const t2 = window.setTimeout(run, 900);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [lang, pathname]);
}
