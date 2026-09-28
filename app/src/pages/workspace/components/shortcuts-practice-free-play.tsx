import { useMemo, useState } from "react";
import { Check, Circle, PartyPopper, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/ui/confetti";
import { ShortcutKeys } from "@/components/ui/shortcut-keys";
import { VirtualKeyboard } from "@/components/ui/virtual-keyboard";
import { useResolvedShortcuts } from "@/features/users/hooks/use-shortcuts";
import { buildComboIndex, RESERVED_SHORTCUT_COMBOS } from "@/lib/shortcuts.utils";
import { cn } from "@/lib/utils";
import { usePracticeKeys } from "../hooks/use-practice-keys";

type Readout = { combo: string; label: string | null; reserved: boolean } | { combo: null; message: string };

/** Press any shortcut: the keyboard lights up, the readout says what it would do (without doing it), and each one found is ticked off. */
export function ShortcutsPracticeFreePlay() {
  const shortcuts = useResolvedShortcuts();
  const testable = useMemo(() => shortcuts.filter((s) => s.combo), [shortcuts]);
  const index = useMemo(() => buildComboIndex(shortcuts), [shortcuts]);
  const [found, setFound] = useState<ReadonlySet<string>>(new Set());
  const [readout, setReadout] = useState<Readout | null>(null);

  const pressed = usePracticeKeys(true, ({ combo, hasModifier }) => {
    if (!combo) {
      setReadout({ combo: null, message: hasModifier ? "That key can't be used in a shortcut." : "Hold Ctrl/⌘ and press a key." });
      return;
    }
    const match = index.get(combo);
    setReadout({ combo, label: match?.label ?? null, reserved: RESERVED_SHORTCUT_COMBOS.includes(combo) });
    if (match) setFound((prev) => new Set(prev).add(match.id));
  });

  const foundCount = testable.filter((s) => found.has(s.id)).length;
  const complete = testable.length > 0 && foundCount === testable.length;

  return (
    <div className="relative flex flex-col gap-4">
      {complete && <Confetti />}
      <VirtualKeyboard pressedCodes={pressed} />

      <div className="flex min-h-11 items-center gap-3 rounded-md border bg-surface-elevated px-3 py-2 text-[0.8125rem]" aria-live="polite">
        {!readout ? (
          <span className="text-muted-foreground">Press a shortcut. Nothing will actually run.</span>
        ) : readout.combo === null ? (
          <span className="text-muted-foreground">{readout.message}</span>
        ) : (
          <>
            <ShortcutKeys combo={readout.combo} />
            {readout.label ? (
              <span className="font-medium text-success">→ {readout.label}</span>
            ) : (
              <span className="text-muted-foreground">{readout.reserved ? "Reserved by the system, can't be bound." : "Nothing is bound to this."}</span>
            )}
          </>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {foundCount} of {testable.length} found
          </span>
          {foundCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs" onClick={() => setFound(new Set())}>
              <RotateCcw className="size-3" /> Reset
            </Button>
          )}
        </div>
        <div className="mb-3 flex gap-0.5" aria-hidden>
          {testable.map((s) => (
            <span key={s.id} className={cn("h-1 flex-1 rounded-full bg-surface-card transition-colors", found.has(s.id) && "bg-success")} />
          ))}
        </div>
        {complete && (
          <div className="mb-3 flex items-center gap-2 rounded-md bg-success-soft px-3 py-2 text-[0.8125rem] text-success">
            <PartyPopper className="size-4" /> You found every shortcut!
          </div>
        )}
        <ul className="grid max-h-44 grid-cols-2 gap-x-6 gap-y-1 overflow-y-auto pr-1">
          {testable.map((s) => {
            const done = found.has(s.id);
            return (
              <li key={s.id} className={cn("flex items-center gap-2 text-xs", done ? "text-foreground" : "text-muted-foreground")}>
                {done ? <Check className="size-3.5 shrink-0 text-success" /> : <Circle className="size-3.5 shrink-0" />}
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                {s.combo && <ShortcutKeys combo={s.combo} keycapClassName="h-4 min-w-4 px-1 text-[0.625rem]" />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
