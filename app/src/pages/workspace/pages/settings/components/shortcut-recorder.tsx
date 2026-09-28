import { useEffect, useRef, useState } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShortcutKeys } from "@/components/ui/shortcut-keys";
import { useSuspendShortcuts } from "@/features/users/hooks/use-shortcuts";
import { eventToCombo } from "@/lib/shortcuts.utils";
import { cn } from "@/lib/utils";

interface ShortcutRecorderProps {
  value: string | null;
  onChange: (combo: string) => void;
  error?: string | null;
}

const MODIFIER_KEYS = ["Control", "Meta", "Shift", "Alt"];

/** Click, then press the desired combination. Esc cancels. Real app shortcuts are paused while recording. */
export function ShortcutRecorder({ value, onChange, error }: ShortcutRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useSuspendShortcuts(recording);

  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRecording(false);
        setHint(null);
        return;
      }
      if (MODIFIER_KEYS.includes(e.key)) return;
      const combo = eventToCombo(e);
      if (!combo) {
        setHint(e.ctrlKey || e.metaKey ? "That key can't be used in a shortcut." : "Hold Ctrl/⌘ together with another key.");
        return;
      }
      setHint(null);
      setRecording(false);
      onChangeRef.current(combo);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording]);

  const message = hint ?? error;

  return (
    <div className="w-full">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setHint(null);
          setRecording((r) => !r);
        }}
        className={cn("h-9 w-full justify-between font-normal", recording && "border-primary ring-2 ring-primary/30", message && "border-danger")}
        aria-label={recording ? "Recording shortcut, press keys now" : "Record shortcut"}
      >
        <span className={cn("text-[0.8125rem]", !value && "text-muted-foreground", recording && "animate-pulse")}>
          {recording ? "Press a shortcut… (Esc to cancel)" : value ? <ShortcutKeys combo={value} /> : "Click to record"}
        </span>
        <Keyboard className="size-4 text-muted-foreground" />
      </Button>
      {message && <p className="mt-1 text-xs text-danger">{message}</p>}
    </div>
  );
}
