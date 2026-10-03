import { useEffect, useState } from "react";

/** Follows the resolved <html> theme class rather than the raw setting, so it stays correct for "system" and for changes made elsewhere (e.g. Settings). */
export function useResolvedTheme(): "light" | "dark" {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark ? "dark" : "light";
}
