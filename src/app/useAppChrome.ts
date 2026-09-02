import { useEffect } from "react";
import { useStore } from "../store/useStore";

/** Reflects store.theme / store.lang onto <html>. */
export function useAppChrome() {
  const theme = useStore((s) => s.theme);
  const lang = useStore((s) => s.lang);

  useEffect(() => {
    const root = document.documentElement;
    const system =
      window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    const dark = theme === "dark" || (theme !== "light" && system);
    root.classList.toggle("dark", dark);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang =
      lang === "zh" ? "zh-CN" : lang === "pt" ? "pt-BR" : lang;
  }, [lang]);
}
