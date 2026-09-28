import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, X } from "lucide-react";
import { StatusDot } from "@/components/ui/status-dot";
import { ProjectFlag } from "@/components/ui/project-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgentSessions } from "@/features/agent-sessions/hooks/use-agent-sessions";
import type { AgentSession } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { AgentStatusOptions } from "@/config/constants/dropdowns/agents/agent-status.options";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { agentStatusDot, isAgentActive } from "@/lib/status";
import { useWorkspaceStore } from "@/stores/workspace";
import { useRuntimeStore } from "@/stores/runtime";
import { useDialogsStore } from "@/stores/dialogs";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { CloseSessionDialog } from "./close-session-dialog";
import { useCloseSessionTab } from "@/features/agent-sessions/hooks/use-agent-sessions";

interface TabModel {
  id: string;
  session: AgentSession | null;
  projectName: string;
  color: string;
}

/**
 * Global AI session tabs (Spec §13): visible on every screen, spans all projects, color-coded
 * by project, shows live status, drag to reorder, "+" to start a session.
 */
export function SessionTabStrip() {
  const navigate = useNavigate();
  const openTabs = useWorkspaceStore((s) => s.open_session_tabs);
  const activeId = useWorkspaceStore((s) => s.active_session_id);
  const attention = useWorkspaceStore((s) => s.attention_session_ids);
  const openSessionTab = useWorkspaceStore((s) => s.openSessionTab);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const reorder = useWorkspaceStore((s) => s.reorderSessionTabs);
  const runtimeAgents = useRuntimeStore((s) => s.agents);
  const openNewSession = useDialogsStore((s) => s.openNewSession);
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const { data: sessions } = useAgentSessions();
  const { data: projects } = useGetProjects();
  const closeTab = useCloseSessionTab();
  const { can } = usePermissions();
  const canUseAgents = can(PermissionKeys.AI_USE_AGENTS);
  const [closing, setClosing] = useState<TabModel | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const tabs: TabModel[] = useMemo(() => {
    const byId = new Map((sessions?.data ?? []).map((s) => [s.id, s]));
    const projectById = new Map((projects ?? []).map((p) => [p.id, p]));
    return openTabs.map((id) => {
      const session = byId.get(id) ?? null;
      const project = session ? projectById.get(session.project_id) : undefined;
      return { id, session, projectName: project?.name ?? "", color: project?.color ?? "#6a6b6c" };
    });
  }, [openTabs, sessions, projects]);

  const focusTab = (tab: TabModel) => {
    openSessionTab(tab.id);
    if (tab.session) {
      setActiveProject(tab.session.project_id);
      navigate(Routes.workspace.project(tab.session.project_id));
    }
  };

  const requestClose = (tab: TabModel) => {
    const status = runtimeAgents[tab.id]?.status;
    if (runtimeAgents[tab.id]?.alive && isAgentActive(status)) setClosing(tab);
    else closeTab.mutate({ id: tab.id, stopProcess: !!runtimeAgents[tab.id] });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    reorder(arrayMove(openTabs, openTabs.indexOf(String(active.id)), openTabs.indexOf(String(over.id))));
  };

  return (
    <nav className="flex h-9 shrink-0 items-stretch overflow-hidden border-b bg-surface" aria-label="AI sessions">
      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
        {tabs.length === 0 ? (
          <div className="flex items-center px-3 text-xs text-ash">No AI sessions open — start one with + or Ctrl T</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={openTabs} strategy={horizontalListSortingStrategy}>
              {tabs.map((tab) => (
                <SessionTab
                  key={tab.id}
                  tab={tab}
                  active={tab.id === activeId}
                  needsAttention={attention.includes(tab.id)}
                  runtimeStatus={runtimeAgents[tab.id]?.status}
                  onFocus={() => focusTab(tab)}
                  onClose={canUseAgents ? () => requestClose(tab) : undefined}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
      {can(PermissionKeys.AI_START_AGENTS) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => openNewSession({ project_id: activeProjectId })}
              className="flex w-9 shrink-0 items-center justify-center border-l text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
              aria-label="New AI session"
            >
              <Plus className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>New AI session (Ctrl T)</TooltipContent>
        </Tooltip>
      )}
      <CloseSessionDialog
        sessionName={closing?.session?.name ?? "This session"}
        open={!!closing}
        isPending={closeTab.isPending}
        onOpenChange={(o) => !o && setClosing(null)}
        onChoose={(stopProcess) => closing && closeTab.mutate({ id: closing.id, stopProcess }, { onSettled: () => setClosing(null) })}
      />
    </nav>
  );
}

interface SessionTabProps {
  tab: TabModel;
  active: boolean;
  needsAttention: boolean;
  runtimeStatus: AgentSession["status"] | undefined;
  onFocus: () => void;
  onClose?: () => void;
}

function SessionTab({ tab, active, needsAttention, runtimeStatus, onFocus, onClose }: SessionTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });
  const status = runtimeStatus ?? tab.session?.status ?? null;
  const statusLabel = status ? getDropdownOptionLabel(AgentStatusOptions, status) : "Unknown";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onFocus}
      onAuxClick={(e) => e.button === 1 && onClose?.()}
      title={`${tab.session?.name ?? "Session"} · ${tab.projectName} · ${tab.session ? getAgentTypeLabel(tab.session.agent_type) : ""} · ${statusLabel}`}
      className={cn(
        "group relative flex h-full min-w-36 max-w-56 cursor-pointer select-none items-center gap-1.5 border-r pl-2 pr-1.5 text-xs text-body hover:bg-surface-elevated",
        active && "bg-surface-elevated text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground",
        isDragging && "z-10 opacity-50",
      )}
    >
      <ProjectFlag color={tab.color} />
      <StatusDot status={agentStatusDot(status)} title={statusLabel} />
      <span className={cn("flex-1 truncate", needsAttention && "font-semibold text-foreground")}>{tab.session?.name ?? "Loading…"}</span>
      {onClose && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="flex size-4 shrink-0 items-center justify-center rounded-xs text-ash opacity-0 hover:bg-surface-card hover:text-foreground group-hover:opacity-100 data-[active=true]:opacity-100"
          data-active={active}
          aria-label="Close tab"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
