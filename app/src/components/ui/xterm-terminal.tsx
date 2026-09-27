import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { cn } from "@/lib/utils";

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

const theme = {
  background: "#050505",
  foreground: "#d7f7dd",
  cursor: "#d7f7dd",
  cursorAccent: "#050505",
  selectionBackground: "rgba(87,193,255,0.3)",
  black: "#1a1a1b",
  red: "#ff6161",
  green: "#59d499",
  yellow: "#ffc533",
  blue: "#57c1ff",
  magenta: "#c49bff",
  cyan: "#4fd1c5",
  white: "#cdcdcd",
  brightBlack: "#6a6b6c",
  brightRed: "#ff8a8a",
  brightGreen: "#8be3b8",
  brightYellow: "#ffd76a",
  brightBlue: "#8fd6ff",
  brightMagenta: "#d7b8ff",
  brightCyan: "#7fe3da",
  brightWhite: "#ffffff",
};

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

    const term = new Terminal({
      theme,
      fontFamily: '"JetBrains Mono", "Cascadia Code", Menlo, Consolas, monospace',
      fontSize: 12.5,
      lineHeight: 1.25,
      cursorBlink: !readOnly,
      disableStdin: readOnly,
      scrollback: 10_000,
      allowProposedApi: true,
      convertEol: false,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon((_e, uri) => sourceRef.current.openLink?.(uri)));
    term.open(container);

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
    const observer = new ResizeObserver(() => requestAnimationFrame(doFit));
    observer.observe(container);
    requestAnimationFrame(() => {
      doFit();
      if (autoFocus && !readOnly) term.focus();
    });

    return () => {
      disposed = true;
      observer.disconnect();
      inputDisposable.dispose();
      unsubscribe();
      term.dispose();
    };
  }, [sourceKey, readOnly, autoFocus]);

  return <div ref={containerRef} className={cn("h-full w-full overflow-hidden bg-terminal", className)} />;
}
