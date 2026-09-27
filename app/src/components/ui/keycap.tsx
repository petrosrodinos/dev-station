import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Keycap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-xs bg-surface-card px-1.5 font-mono text-[11px] text-body", className)}>{children}</kbd>
  );
}
