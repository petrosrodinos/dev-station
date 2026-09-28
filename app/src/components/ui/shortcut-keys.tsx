import { Keycap } from "@/components/ui/keycap";
import { formatComboParts } from "@/lib/shortcuts.utils";
import { cn } from "@/lib/utils";

interface ShortcutKeysProps {
  /** Canonical combo (`mod+shift+p`) or pre-formatted key labels. */
  combo?: string;
  parts?: string[];
  className?: string;
  keycapClassName?: string;
}

/** A shortcut rendered as keycaps, using Ctrl or ⌘ depending on the platform. */
export function ShortcutKeys({ combo, parts, className, keycapClassName }: ShortcutKeysProps) {
  const keys = parts ?? (combo ? formatComboParts(combo) : []);
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1", className)}>
      {keys.map((key, i) => (
        <Keycap key={`${key}-${i}`} className={keycapClassName}>
          {key}
        </Keycap>
      ))}
    </span>
  );
}
