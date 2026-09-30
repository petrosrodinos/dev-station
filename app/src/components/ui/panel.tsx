import type { HTMLAttributes, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Mockup-style card: hairline border, 10px radius, no shadow, header row + body.

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Card className={cn("gap-0 rounded-lg py-0 shadow-none", className)} {...props} />;
}

interface PanelHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PanelHeader({ title, actions, className }: PanelHeaderProps) {
  return (
    <div className={cn("flex min-h-12 items-center justify-between gap-3 border-b px-4 py-2.5", className)}>
      <div className="flex min-w-0 items-center gap-2 text-[0.8125rem] font-medium">{title}</div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}

export function PanelBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

/** Label/value row used on dashboard cards (mockup `.stat-row`). */
export function StatRow({ label, value, className }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 border-b border-hairline-soft py-[7px] text-[0.8125rem] last:border-b-0", className)}>
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
