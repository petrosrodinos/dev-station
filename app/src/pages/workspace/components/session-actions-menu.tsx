import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, FileDiff, MoreHorizontal, PictureInPicture2, RotateCw, Square, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOpenAgentExternally, useRestartAgentSession, useStopAgentSession } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { ProjectTabs } from "@/config/constants/dropdowns/projects/project-tab.options";
import { getBridge, isDesktop } from "@/lib/desktop";
import { useLayoutStore } from "@/stores/layout";
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
  const addFloating = useLayoutStore((s) => s.addFloating);

  const runtime = item?.runtime ?? null;
  const canUseAgents = can(PermissionKeys.AI_USE_AGENTS);
  const hasChanges = !!item?.changes && item.changes.files_changed > 0;
  const canDelete = !!item?.session && canUseAgents;

  const floatPanel = () => {
    if (!item || !isDesktop()) return;
    const panelId = `session:${item.id}`;
    void getBridge().layout.openFloatingPanel({ panelId, componentType: "session-terminal", params: { sessionId: item.id }, title: item.name });
    addFloating({ panelId, componentType: "session-terminal", params: { sessionId: item.id }, bounds: { x: 0, y: 0, width: 640, height: 480 } });
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
        <DropdownMenuContent align="end" className="w-56">
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
          {isDesktop() && (
            <DropdownMenuItem onSelect={floatPanel} disabled={!item}>
              <PictureInPicture2 className="size-3.5" /> Float in its own window
            </DropdownMenuItem>
          )}
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
