import { Check } from "lucide-react";
import { ProjectColorOptions } from "@/config/constants/dropdowns/projects/project-color.options";
import { cn } from "@/lib/utils";

export function ColorSwatches({ value, onChange }: { value: string; onChange: (color: string) => void }) {
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
          className={cn("flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition", value === c.id && "ring-2 ring-foreground")}
          style={{ backgroundColor: c.id }}
        >
          {value === c.id && <Check className="size-3.5 text-[#0a0a0a]" />}
        </button>
      ))}
    </div>
  );
}
