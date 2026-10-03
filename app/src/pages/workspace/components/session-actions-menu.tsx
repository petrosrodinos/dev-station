import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, FileDiff, MoreHorizontal, RotateCw, Square, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOpenAgentExternally, useRestartAgentSession, useStopAgentSession } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { ProjectTabs } from "@/config/constants/dropdowns/projects/project-tab.options";
import { isDesktop } from "@/lib/desktop";
import { FloatTargetMenuItems } from "@/features/workspace-layouts/components/float-target-menu-items";
import { floatPanel } from "@/features/workspace-layouts/utils/float-panel.utils";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import type { SessionItem } from "../hooks/use-session-groups";
import { DeleteSessionDialog } from "./session-context-menu";

/** Actions for the focused AI session, shown beside the session history toggle. */
export function SessionActionsMenu({ item }: { item: SessionItem | null }) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const restart = useRestartAgentSession();
  const stop = useStopAgentSession();
  const openExternal = useOpenAgentExternally();
  const runtime = item?.runtime ?? null;
  const canUseAgents = can(PermissionKeys.AI_USE_AGENTS);
  const hasChanges = !!item?.changes && item.changes.files_changed > 0;
  const canDelete = !!item?.session && canUseAgents;

  const floatSession = (windowId: string | undefined) => {
    if (!item) return;
    floatPanel({ panelId: `session:${item.id}`, componentType: "session-terminal", params: { sessionId: item.id }, title: item.name, windowId });
  };

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <button
                    disabled={!item}
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
                    )}
                    aria-label="Session options"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>
                }
              />
            }
          />
          <TooltipContent>Session options</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-max min-w-56">
          <DropdownMenuItem onSelect={() => item && navigate(Routes.workspace.project_tab(item.project_id, ProjectTabs.GIT))} disabled={!hasChanges}>
            <FileDiff className="size-3.5" /> Review changes
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => runtime && restart.mutate(runtime.id)} disabled={!runtime || !canUseAgents || restart.isPending}>
            <RotateCw className="size-3.5" /> Restart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => runtime && stop.mutate(runtime.id)} disabled={!runtime?.alive || !canUseAgents || stop.isPending}>
            <Square className="size-3.5" /> Stop
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => runtime && openExternal.mutate(runtime.id)} disabled={!runtime || !canUseAgents}>
            <ExternalLink className="size-3.5" /> Open in external terminal
          </DropdownMenuItem>
          {isDesktop() && item && <FloatTargetMenuItems onFloat={floatSession} />}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => setConfirmDelete(true)} disabled={!canDelete}>
            <Trash2 className="size-3.5" /> Delete session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {item?.session && canDelete && <DeleteSessionDialog session={item.session} open={confirmDelete} onOpenChange={setConfirmDelete} />}
    </>
  );
}
