import type { ReactNode } from "react";

/** Label + description on the left, control on the right (mockup `.settings-row`). */
export function SettingsRow({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="@container border-b border-hairline-soft">
    <div className="flex flex-col gap-2 py-3 @xl:flex-row @xl:items-center @xl:justify-between @xl:gap-6">
      <div className="min-w-0">
        <div className="text-[0.8125rem]">{label}</div>
        {description && <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>}
      </div>
      <div className="flex w-full min-w-0 @xl:w-80 @xl:shrink-0 @xl:justify-end">{children}</div>
    </div>
    </div>
  );
}

export function SettingsSectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-[0.7813rem] text-muted-foreground [overflow-wrap:anywhere]">{description}</div>
    </div>
  );
}
