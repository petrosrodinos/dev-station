import { isMac } from "@/lib/shortcuts.utils";
import { cn } from "@/lib/utils";

interface KeyDef {
  codes: string[];
  label: string;
  width?: string;
}

const letters = (chars: string): KeyDef[] => chars.split("").map((c) => ({ codes: [`Key${c}`], label: c }));
const digits = (chars: string): KeyDef[] => chars.split("").map((c) => ({ codes: [`Digit${c}`], label: c }));
const fKeys: KeyDef[] = Array.from({ length: 12 }, (_, i) => ({ codes: [`F${i + 1}`], label: `F${i + 1}` }));

const SPACER = "spacer";

const buildRows = (mac: boolean): (KeyDef | typeof SPACER)[][] => [
  fKeys,
  [
    { codes: ["Backquote"], label: "`" },
    ...digits("1234567890"),
    { codes: ["Minus"], label: "-" },
    { codes: ["Equal"], label: "=" },
    { codes: ["Backspace"], label: "⌫", width: "flex-[2]" },
  ],
  [
    { codes: ["Tab"], label: "Tab", width: "flex-[1.5]" },
    ...letters("QWERTYUIOP"),
    { codes: ["BracketLeft"], label: "[" },
    { codes: ["BracketRight"], label: "]" },
    { codes: ["Backslash"], label: "\\", width: "flex-[1.5]" },
  ],
  [
    SPACER,
    ...letters("ASDFGHJKL"),
    { codes: ["Semicolon"], label: ";" },
    { codes: ["Quote"], label: "'" },
    { codes: ["Enter"], label: "Enter", width: "flex-[2.25]" },
  ],
  [
    { codes: ["ShiftLeft"], label: mac ? "⇧" : "Shift", width: "flex-[2.25]" },
    ...letters("ZXCVBNM"),
    { codes: ["Comma"], label: "," },
    { codes: ["Period"], label: "." },
    { codes: ["Slash"], label: "/" },
    { codes: ["ShiftRight"], label: mac ? "⇧" : "Shift", width: "flex-[2.75]" },
  ],
  [
    { codes: ["ControlLeft", "ControlRight"], label: "Ctrl", width: "flex-[2]" },
    { codes: ["MetaLeft", "MetaRight"], label: mac ? "⌘" : "Win", width: "flex-[2]" },
    { codes: ["Space"], label: "Space", width: "flex-[7]" },
    { codes: ["ArrowLeft"], label: "←" },
    { codes: ["ArrowUp"], label: "↑" },
    { codes: ["ArrowDown"], label: "↓" },
    { codes: ["ArrowRight"], label: "→" },
  ],
];

interface VirtualKeyboardProps {
  /** `KeyboardEvent.code` values currently held down. */
  pressedCodes: ReadonlySet<string>;
  /** Keys to point at, e.g. as a hint for the shortcut being practised. */
  hintCodes?: ReadonlySet<string>;
  className?: string;
}

/** Decorative on-screen keyboard that lights up as keys are pressed. */
export function VirtualKeyboard({ pressedCodes, hintCodes, className }: VirtualKeyboardProps) {
  const rows = buildRows(isMac());
  return (
    <div className={cn("flex w-full select-none flex-col gap-1", className)} aria-hidden>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {row.map((key, keyIndex) => {
            if (key === SPACER) return <div key={`spacer-${keyIndex}`} className="flex-[1.75]" />;
            const pressed = key.codes.some((code) => pressedCodes.has(code));
            const hinted = !pressed && key.codes.some((code) => hintCodes?.has(code));
            return (
              <div
                key={key.codes[0]}
                className={cn(
                  "flex h-8 min-w-0 items-center justify-center rounded-sm border bg-surface-card font-mono text-[0.6875rem] text-body transition-colors duration-75",
                  key.width ?? "flex-1",
                  rowIndex === 0 && "h-6 text-[0.625rem] text-muted-foreground",
                  hinted && "animate-pulse border-primary text-primary",
                  pressed && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {key.label}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
