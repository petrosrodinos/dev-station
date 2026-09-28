import type { ReactNode } from "react";

/** Label + description on the left, control on the right (mockup `.settings-row`). */
export function SettingsRow({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-hairline-soft py-3">
      <div className="min-w-0">
        <div className="text-[0.8125rem]">{label}</div>
        {description && <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>}
      </div>
      <div className="flex w-80 shrink-0 justify-end">{children}</div>
    </div>
  );
}

export function SettingsSectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-[0.7813rem] text-muted-foreground">{description}</div>
    </div>
  );
}
