import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { cn } from "@/lib/utils";
import { getAppearanceValues, useAppearanceStore } from "@/stores/appearance";
import { buildTerminalFont, buildTerminalTheme } from "@/lib/appearance/terminal-theme";

export interface XtermSource {
  /** History to replay when the view (re)attaches. */
  loadScrollback: () => Promise<string>;
  /** Subscribe to live output; returns an unsubscribe function. */
  subscribe: (onData: (data: string) => void) => () => void;
  /** Keystrokes typed by the user (stdin passthrough). */
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  openLink?: (url: string) => void;
}

interface XtermTerminalProps {
  source: XtermSource;
  /** Changing the key re-attaches to a different PTY. */
  sourceKey: string;
  readOnly?: boolean;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Embedded terminal attached to a real PTY in the main process (agent CLI or shell).
 * Presentational: all IO goes through the `source` callbacks.
 */
export function XtermTerminal({ source, sourceKey, readOnly = false, className, autoFocus = true }: XtermTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const appearance = getAppearanceValues();
    const term = new Terminal({
      theme: buildTerminalTheme(appearance),
      ...buildTerminalFont(appearance),
      lineHeight: 1.25,
      cursorBlink: !readOnly,
      disableStdin: readOnly,
      scrollback: 10_000,
      allowProposedApi: true,
      // OSC 8 hyperlinks (which Claude Code emits) otherwise go through xterm's default handler: a
      // confirm() prompt plus window.open, neither of which opens anything usable in Electron.
      linkHandler: { activate: (_e, uri) => sourceRef.current.openLink?.(uri), allowNonHttpProtocols: false },
      convertEol: false,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon((_e, uri) => sourceRef.current.openLink?.(uri)));
    term.open(container);
    // xterm turns Ctrl+V into a raw ^V keystroke and cancels the browser's paste event, so nothing
    // is pasted. Returning false hands the key back to the browser, whose paste event xterm
    // already turns into (bracketed) paste input. Shift+Insert and Ctrl+Shift+V follow the same path.
    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== "keydown") return true;
      const key = e.key.toLowerCase();
      const isPaste = (e.ctrlKey && !e.altKey && key === "v") || (e.shiftKey && e.key === "Insert");
      return !isPaste;
    });

    let disposed = false;
    let buffered: string[] = [];
    let replayed = false;

    // Live output that arrives while scrollback is loading is buffered, then flushed in order.
    const unsubscribe = sourceRef.current.subscribe((data) => {
      if (disposed) return;
      if (!replayed) buffered.push(data);
      else term.write(data);
    });

    sourceRef.current
      .loadScrollback()
      .then((history) => {
        if (disposed) return;
        if (history) term.write(history);
        for (const chunk of buffered) term.write(chunk);
        buffered = [];
        replayed = true;
      })
      .catch(() => {
        replayed = true;
      });

    const inputDisposable = term.onData((data) => {
      if (!readOnly) sourceRef.current.write(data);
    });

    const doFit = () => {
      if (disposed || !container.offsetWidth || !container.offsetHeight) return;
      try {
        fit.fit();
        sourceRef.current.resize(term.cols, term.rows);
      } catch {
        /* container not measurable yet */
      }
    };
    // Live theme/font changes from Settings → Theme; refit because glyph metrics change.
    const unsubscribeAppearance = useAppearanceStore.subscribe(() => {
      const next = getAppearanceValues();
      term.options.theme = buildTerminalTheme(next);
      const font = buildTerminalFont(next);
      term.options.fontFamily = font.fontFamily;
      term.options.fontSize = font.fontSize;
      requestAnimationFrame(doFit);
    });
    const observer = new ResizeObserver(() => requestAnimationFrame(doFit));
    observer.observe(container);
    requestAnimationFrame(() => {
      doFit();
      if (autoFocus && !readOnly) term.focus();
    });

    return () => {
      disposed = true;
      observer.disconnect();
      unsubscribeAppearance();
      inputDisposable.dispose();
      unsubscribe();
      term.dispose();
    };
  }, [sourceKey, readOnly, autoFocus]);

  return <div ref={containerRef} className={cn("h-full w-full overflow-hidden bg-terminal", className)} />;
}
