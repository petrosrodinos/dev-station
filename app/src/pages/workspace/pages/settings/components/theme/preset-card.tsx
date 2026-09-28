import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThemePalette, ThemePreset } from "@/config/constants/themes/theme-presets";

const BASE_DARK: ThemePalette = { canvas: "#131417", surface: "#1a1b1e", elevated: "#202124", card: "#26272a", ink: "#f4f4f6", body: "#cdcdcd", muted: "#9c9c9d", border: "#242728", primary: "#ffffff", primaryForeground: "#000000", terminal: "#050505" };
const BASE_LIGHT: ThemePalette = { canvas: "#f7f7f8", surface: "#ffffff", elevated: "#f1f1f3", card: "#ebebee", ink: "#0d0d0f", body: "#3a3a3d", muted: "#6b6b70", border: "#e3e3e6", primary: "#0d0d0f", primaryForeground: "#ffffff", terminal: "#0b0b0c" };

interface PresetCardProps {
  preset: ThemePreset;
  mode: "light" | "dark";
  accent: string | null;
  selected: boolean;
  onSelect: () => void;
}

/** Miniature app mock-up painted with the preset's palette, so the choice can be judged at a glance. */
export function PresetCard({ preset, mode, accent, selected, onSelect }: PresetCardProps) {
  const p = (mode === "dark" ? preset.dark : preset.light) ?? (mode === "dark" ? BASE_DARK : BASE_LIGHT);
  const primary = accent ?? p.primary;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${preset.label} theme`}
      className={cn("group flex flex-col gap-1.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring")}
    >
      <div className={cn("relative h-16 overflow-hidden rounded-md border-2 transition-colors", selected ? "border-primary" : "border-border group-hover:border-hairline-strong")} style={{ background: p.canvas }}>
        <div className="absolute inset-y-0 left-0 w-3.5" style={{ background: p.surface, borderRight: `1px solid ${p.border}` }}>
          <div className="mx-auto mt-2 size-2 rounded-sm" style={{ background: primary }} />
          <div className="mx-auto mt-1 size-2 rounded-sm" style={{ background: p.card }} />
        </div>
        <div className="absolute left-5 right-2 top-2 h-2 rounded-sm" style={{ background: p.elevated }} />
        <div className="absolute left-5 top-6 h-1.5 w-10 rounded-sm" style={{ background: p.ink, opacity: 0.85 }} />
        <div className="absolute left-5 top-9 h-1.5 w-14 rounded-sm" style={{ background: p.muted, opacity: 0.6 }} />
        <div className="absolute bottom-2 left-5 h-3 w-8 rounded-sm" style={{ background: primary }} />
        {selected && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" />
          </span>
        )}
      </div>
      <span className={cn("text-xs", selected ? "text-foreground" : "text-muted-foreground")}>{preset.label}</span>
    </button>
  );
}
