import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACCENT_SWATCHES } from "@/config/constants/themes/theme-presets";

const HEX = /^#[0-9a-f]{6}$/i;

interface AccentPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function AccentPicker({ value, onChange }: AccentPickerProps) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);

  const commit = (next: string) => {
    setDraft(next);
    if (HEX.test(next)) onChange(next.toLowerCase());
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        {ACCENT_SWATCHES.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Accent ${color}`}
            aria-pressed={value === color}
            onClick={() => onChange(color)}
            className={cn("flex size-6 items-center justify-center rounded-full border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring", value === color && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}
            style={{ background: color }}
          >
            {value === color && <Check className="size-3.5 text-white mix-blend-difference" />}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Pick a custom accent color"
          value={HEX.test(value ?? "") ? value! : "#5b8def"}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5 [&::-moz-color-swatch]:rounded-sm [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-0"
        />
        <Input className="h-8 flex-1 font-mono text-xs" placeholder="#5b8def" aria-label="Custom accent color" value={draft} onChange={(e) => commit(e.target.value)} maxLength={7} />
        <Button variant="ghost" size="sm" disabled={!value} onClick={() => onChange(null)}>
          Reset
        </Button>
      </div>
    </div>
  );
}
