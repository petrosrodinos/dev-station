import type { KeyboardEvent, MouseEvent } from "react";
import { MoreHorizontal } from "lucide-react";
import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { cn } from "@/lib/utils";
import { useProjectActions, type ProjectMenuEntry } from "../hooks/use-project-actions";

/** Renders project entries as right-click items or dropdown items, so both menus share one list. */
export function ProjectMenuItems({ entries, variant }: { entries: ProjectMenuEntry[]; variant: "context" | "dropdown" }) {
  const Item = variant === "context" ? ContextMenuItem : DropdownMenuItem;
  const Separator = variant === "context" ? ContextMenuSeparator : DropdownMenuSeparator;

  return (
    <>
      {entries.map((entry, i) =>
        entry === "separator" ? (
          <Separator key={`separator-${i}`} />
        ) : (
          <Item key={entry.label} onSelect={entry.onSelect} className={cn("gap-2", entry.destructive && "text-danger focus:text-danger")}>
            {entry.icon && <entry.icon className="size-3.5" />}
            {entry.label}
          </Item>
        ),
      )}
    </>
  );
}

/** Project actions behind a dropdown icon, for places without a right-click menu (the /workspace cards). */
export function ProjectActionsMenu({ project }: { project: Project }) {
  const { entries, removeDialog } = useProjectActions(project);

  // Callers put this inside clickable cards; clicks and keys from the trigger, the menu and the dialog must not also open the card.
  const stop = (e: MouseEvent | KeyboardEvent) => e.stopPropagation();

  return (
    <div className="shrink-0" onClick={stop} onKeyDown={stop}>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <button
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Project options"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>
                }
              />
            }
          />
          <TooltipContent>Project options</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-56">
          <ProjectMenuItems entries={entries} variant="dropdown" />
        </DropdownMenuContent>
      </DropdownMenu>
      {removeDialog}
    </div>
  );
}
