import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ThemeOptions } from "@/config/constants/dropdowns/settings/theme.options";
import {
  DEFAULT_FONT_SIZE,
  FontFamilyOptions,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  MonoFontFamilyOptions,
  getFontOption,
  type FontOption,
} from "@/config/constants/dropdowns/settings/font-family.options";
import { ThemePresets } from "@/config/constants/themes/theme-presets";
import { useAppearance } from "@/features/users/hooks/use-appearance";
import { resolveMode } from "@/lib/appearance/apply-appearance";
import { cn } from "@/lib/utils";
import { SettingsRow, SettingsSectionHeader } from "./settings-row";
import { PresetCard } from "./theme/preset-card";
import { AccentPicker } from "./theme/accent-picker";

function FontSelect({ label, options, value, onChange }: { label: string; options: FontOption[]; value: string; onChange: (id: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full @xl:w-56" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ThemeSettings() {
  const { values, change, reset } = useAppearance();
  const previewMode = resolveMode(values.mode);
  const isDefault =
    values.mode === "dark" && values.preset_id === "default" && !values.accent_color && values.font_size === DEFAULT_FONT_SIZE && values.font_family === FontFamilyOptions[0].id && values.mono_font_family === MonoFontFamilyOptions[0].id;

  return (
    <div className="space-y-8">
      <section>
        <SettingsSectionHeader title="Color theme" description="Pick a mode and a preset. Changes apply instantly and follow your account across devices." />
        <SettingsRow label="Mode" description="System follows your operating system setting.">
          <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="Mode">
            {ThemeOptions.map((o) => (
              <Button key={o.id} variant={values.mode === o.id ? "secondary" : "ghost"} size="sm" aria-pressed={values.mode === o.id} onClick={() => change({ mode: o.id })}>
                {o.label}
              </Button>
            ))}
          </div>
        </SettingsRow>
        <div className="border-b border-hairline-soft py-3">
          <div className="mb-2 text-[0.8125rem]">Preset</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-3">
            {ThemePresets.map((preset) => (
              <PresetCard key={preset.id} preset={preset} mode={previewMode} accent={values.accent_color} selected={values.preset_id === preset.id} onSelect={() => change({ preset_id: preset.id })} />
            ))}
          </div>
        </div>
        <SettingsRow label="Accent color" description="Overrides the preset's primary color for buttons, highlights and focus rings.">
          <AccentPicker value={values.accent_color} onChange={(accent_color) => change({ accent_color })} />
        </SettingsRow>
      </section>

      <section>
        <SettingsSectionHeader title="Typography" description="Applies to the whole app, including the integrated terminal." />
        <SettingsRow label="Interface font">
          <FontSelect label="Interface font" options={FontFamilyOptions} value={values.font_family} onChange={(font_family) => change({ font_family })} />
        </SettingsRow>
        <SettingsRow label="Monospace font" description="Terminal, code and diffs.">
          <FontSelect label="Monospace font" options={MonoFontFamilyOptions} value={values.mono_font_family} onChange={(mono_font_family) => change({ mono_font_family })} />
        </SettingsRow>
        <SettingsRow label="Font size" description={`${MIN_FONT_SIZE}–${MAX_FONT_SIZE}px. Default is ${DEFAULT_FONT_SIZE}px.`}>
          <div className="flex w-full items-center gap-3">
            <Slider aria-label="Font size" min={MIN_FONT_SIZE} max={MAX_FONT_SIZE} step={1} value={[values.font_size]} onValueChange={([font_size]) => change({ font_size })} />
            <span className="w-10 shrink-0 text-right font-mono text-xs text-muted-foreground">{values.font_size}px</span>
          </div>
        </SettingsRow>
      </section>

      <section>
        <SettingsSectionHeader title="Preview" description="A sample of your current settings." />
        <div className="space-y-2 rounded-md border border-border bg-card p-4">
          <div className="text-sm font-medium">Fix flaky session reconnect</div>
          <p className="text-[0.8125rem] text-muted-foreground">The quick brown fox jumps over the lazy dog. 0123456789</p>
          <pre className={cn("overflow-x-auto rounded-sm bg-terminal p-3 text-xs text-body")} style={{ fontFamily: getFontOption(MonoFontFamilyOptions, values.mono_font_family).stack }}>
            {"$ git commit -m \"feat: appearance settings\"\n[main 3f9a2c1] feat: appearance settings"}
          </pre>
          <div className="flex gap-2 pt-1">
            <Button size="sm">Primary</Button>
            <Button size="sm" variant="secondary">
              Secondary
            </Button>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" disabled={isDefault} onClick={reset}>
            Reset all to defaults
          </Button>
        </div>
      </section>
    </div>
  );
}
