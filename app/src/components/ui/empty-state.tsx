import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-10 text-center text-muted-foreground", className)}>
      {icon && <div className="mb-1 text-stone [&_svg]:size-7">{icon}</div>}
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description && <div className="max-w-sm text-[12.5px] leading-relaxed">{description}</div>}
      {action && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
