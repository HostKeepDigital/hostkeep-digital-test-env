import { useEffect } from "react";

/**
 * Detects system dark-mode preference and applies/removes the `dark`
 * class on <html> so Tailwind's `darkMode: 'class'` strategy works.
 * Also listens for live changes (e.g. user toggles OS theme).
 */
export default function ThemeProvider({ children }) {
  useEffect(() => {
    const root = document.documentElement;

    const apply = (dark) => {
      if (dark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    apply(mq.matches);

    const handler = (e) => apply(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return <>{children}</>;
}