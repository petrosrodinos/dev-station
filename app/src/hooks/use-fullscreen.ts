import { useEffect, useState } from "react";
import { getBridge, isDesktop } from "@/lib/desktop";

/**
 * Full-screen toggle for the workspace shell. In the desktop app this drives the native
 * window (via the main process, so it stays in sync with e.g. the macOS green button);
 * in the web build it uses the standard Fullscreen API. F11 is handled here only for the
 * desktop app — a plain browser tab already owns that key for its own full screen.
 */
export function useFullScreen() {
  const [isFullScreen, setIsFullScreen] = useState(() => !!document.fullscreenElement);

  useEffect(() => {
    if (isDesktop()) return getBridge().app.onFullScreenChange(setIsFullScreen);

    const onChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = () => {
    if (isDesktop()) {
      void getBridge().app.toggleFullScreen().then(setIsFullScreen);
      return;
    }
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  useEffect(() => {
    if (!isDesktop()) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "F11") return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return { isFullScreen, toggle };
}
