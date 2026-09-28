import { useEffect, useRef, useState } from "react";
import { eventToCombo } from "@/lib/shortcuts.utils";

const MODIFIER_KEYS = ["Control", "Meta", "Shift", "Alt"];

export interface PracticeKeyPress {
  /** Canonical combo, or null when the press is not a bindable shortcut. */
  combo: string | null;
  /** Ctrl/⌘ was held. Lets callers tell "wrong key" from "forgot the modifier". */
  hasModifier: boolean;
}

/**
 * Tracks held keys (as `KeyboardEvent.code`) and reports each non-modifier key press while `active`.
 * Ctrl/⌘ combos are cancelled so the browser or Electron shell never acts on them; Escape is left alone so dialogs can close.
 */
export function usePracticeKeys(active: boolean, onPress: (press: PracticeKeyPress) => void): ReadonlySet<string> {
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  useEffect(() => {
    if (!active) {
      setPressed(new Set());
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") return;
      const hasModifier = e.ctrlKey || e.metaKey;
      if (hasModifier) e.preventDefault();
      setPressed((prev) => (prev.has(e.code) ? prev : new Set(prev).add(e.code)));
      if (e.repeat || MODIFIER_KEYS.includes(e.key)) return;
      onPressRef.current({ combo: eventToCombo(e), hasModifier });
    };
    const onKeyUp = (e: KeyboardEvent) => {
      setPressed((prev) => {
        if (!prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.delete(e.code);
        return next;
      });
    };
    const clear = () => setPressed(new Set());
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", clear);
    };
  }, [active]);

  return pressed;
}
