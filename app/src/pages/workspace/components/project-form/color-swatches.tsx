import { Check } from "lucide-react";
import { ProjectColorOptions } from "@/config/constants/dropdowns/projects/project-color.options";
import { cn } from "@/lib/utils";

const HEX = /^#[0-9a-f]{6}$/i;

export function ColorSwatches({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const isCustom = !ProjectColorOptions.some((c) => c.id.toLowerCase() === value?.toLowerCase());

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Project color">
      {ProjectColorOptions.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={value === c.id}
          aria-label={c.label}
          title={c.label}
          onClick={() => onChange(c.id)}
          className={cn("flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition", value === c.id ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-hairline-strong")}
          style={{ backgroundColor: c.id }}
        >
          {value === c.id && <Check className="size-3.5 text-[#0a0a0a]" />}
        </button>
      ))}
      <label
        title="Custom color"
        className={cn(
          "relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-offset-2 ring-offset-background transition focus-within:ring-2 focus-within:ring-ring",
          isCustom && "ring-2 ring-foreground",
        )}
        style={isCustom && HEX.test(value ?? "") ? { backgroundColor: value } : { background: "conic-gradient(#ff6161, #ffc533, #59d499, #57c1ff, #8b7cf6, #ff6161)" }}
      >
        <input
          type="color"
          aria-label="Custom project color"
          value={HEX.test(value ?? "") ? value : "#5b8def"}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
        {isCustom && <Check className="pointer-events-none size-3.5 text-white mix-blend-difference" />}
      </label>
    </div>
  );
}
