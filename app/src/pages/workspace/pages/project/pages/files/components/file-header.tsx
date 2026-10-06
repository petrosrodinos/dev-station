import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PanelHeader } from "@/components/ui/panel";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** One row for an open file: the name on the left (the folder truncates first), the viewer's actions on the right. */
export function FileHeader({ path, actions }: { path: string; actions?: ReactNode }) {
  const slash = path.lastIndexOf("/");
  const dir = path.slice(0, slash + 1);
  const name = path.slice(slash + 1);

  return (
    <PanelHeader
      className="min-h-0 px-3 py-1.5"
      title={
        <span className="flex min-w-0 items-center font-mono text-xs font-normal" title={path}>
          <span className="min-w-0 truncate text-muted-foreground">{dir}</span>
          <span className="shrink-0 text-foreground">{name}</span>
        </span>
      }
      actions={actions}
    />
  );
}

/** Icon button for the file header; `active` marks a toggle that is currently on. */
export function FileHeaderAction({ label, onClick, active, disabled, children }: { label: string; onClick: () => void; active?: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-6 text-muted-foreground", active && "bg-accent text-foreground")}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onClick={onClick}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
