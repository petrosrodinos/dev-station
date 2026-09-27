import type { FC } from "react";
import { useShallow } from "zustand/react/shallow";
import { useNavigate } from "react-router-dom";
import { Bot, CloudDownload, FolderGit2, GitBranch, Plug, Plus } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { CardGridSkeleton } from "@/components/ui/list-skeleton";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useProjectLocalStates } from "@/features/local-workspace/hooks/use-local-workspace";
import { useGitStatus } from "@/features/git/hooks/use-git";
import { useProjectProcesses } from "@/features/processes/hooks/use-processes";
import { useCurrentOrganization, usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { ProjectLocalStateOptions } from "@/config/constants/dropdowns/projects/project-local-state.options";
import { AgentStatusOptions } from "@/config/constants/dropdowns/agents/agent-status.options";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { agentStatusDot, processStatusDot } from "@/lib/status";
import { formatRelative } from "@/lib/date";
import { useRuntimeStore } from "@/stores/runtime";
import { useWorkspaceStore } from "@/stores/workspace";
import { useDialogsStore } from "@/stores/dialogs";
import { Routes } from "@/routes/routes";
import { ProjectLocalStates, ProcessStatuses, type ProjectLocalState } from "@shared/contract";

/** Command center (Spec §36): every project's Git, services and agents at a glance. */
const WorkspaceHomePage: FC = () => {
  const navigate = useNavigate();
  const { data: projects, isPending } = useGetProjects();
  const { data: localStates } = useProjectLocalStates();
  const { organization } = useCurrentOrganization();
  const openProjectDialog = useDialogsStore((s) => s.openProjectDialog);
  const { can } = usePermissions();
  const importedCount = Object.values(localStates ?? {}).filter((s) => s === ProjectLocalStates.IMPORTED).length;

  if (isPending) return <CardGridSkeleton cards={6} className="p-6" />;

  if (!projects?.length) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          icon={<FolderGit2 />}
          title={`Welcome to ${organization?.name ?? "your workspace"}`}
          description="Add a project from a connected GitHub account, clone one from a URL, or point Dev Station at a folder you already have. Services, scripts and Git state are detected automatically."
          action={
            <>
              {can(PermissionKeys.PROJECTS_CREATE) && (
                <Button className="gap-1.5" onClick={() => openProjectDialog(null)}>
                  <Plus className="size-4" /> Add project
                </Button>
              )}
              <Button variant="outline" className="gap-1.5" onClick={() => navigate(Routes.workspace.integrations)}>
                <Plug className="size-4" /> Connect GitHub, Linear, Notion
              </Button>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="h-full space-y-4 overflow-y-auto p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium">{organization?.name}</h1>
          <p className="text-[13px] text-muted-foreground">
            {projects.length} project{projects.length === 1 ? "" : "s"} — pick one from the rail or below.
          </p>
        </div>
        {importedCount > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(Routes.workspace.imported)}>
            <CloudDownload className="size-3.5" /> Set up {importedCount} imported project{importedCount === 1 ? "" : "s"}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} localState={localStates?.[p.id] ?? null} />
        ))}
      </div>
    </div>
  );
};

function ProjectCard({ project, localState }: { project: Project; localState: ProjectLocalState | null }) {
  const navigate = useNavigate();
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const { data: git } = useGitStatus(project.id, { refetchInterval: 20_000 });
  const processes = useProjectProcesses(project.id);
  const agents = useRuntimeStore(useShallow((s) => Object.values(s.agents).filter((a) => a.project_id === project.id && a.alive)));
  const running = Object.values(processes).filter((p) => p.status === ProcessStatuses.RUNNING).length;

  const open = () => {
    setActiveProject(project.id);
    navigate(Routes.workspace.project(project.id));
  };

  return (
    <Panel role="button" tabIndex={0} onClick={open} onKeyDown={(e) => e.key === "Enter" && open()} className="cursor-pointer p-4 transition-colors hover:border-hairline-strong">
      <div className="flex items-center gap-3">
        <ProjectAvatar name={project.name} color={project.color} size="md" muted={localState === ProjectLocalStates.IMPORTED} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{project.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {project.client?.name ?? "Internal"} · {formatRelative(project.last_activity_at)}
          </div>
        </div>
        {localState && localState !== ProjectLocalStates.LOCAL && (
          <span className="rounded-xs bg-surface-elevated px-2 py-0.5 text-[11px] text-muted-foreground">{getDropdownOptionLabel(ProjectLocalStateOptions, localState)}</span>
        )}
      </div>
      {localState === ProjectLocalStates.LOCAL && (
        <div className="mt-3 space-y-1.5 text-[12.5px]">
          <div className="flex items-center gap-2 text-body">
            <GitBranch className="size-3.5 text-muted-foreground" />
            <span className="font-mono">{git?.branch ?? "—"}</span>
            {git && git.files.length > 0 && <span className="text-warning">{git.files.length} changed</span>}
            {git && git.ahead > 0 && <span className="text-success">↑{git.ahead}</span>}
            {git && git.behind > 0 && <span className="text-info">↓{git.behind}</span>}
          </div>
          {project.services.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {project.services.slice(0, 4).map((s) => (
                <span key={s.id} className="flex items-center gap-1.5 text-body">
                  <StatusDot status={processStatusDot(processes[s.id]?.status)} />
                  {s.name}
                </span>
              ))}
              {running === 0 && <span className="text-ash">not running</span>}
            </div>
          )}
          {agents.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {agents.map((a) => (
                <span key={a.id} className="flex items-center gap-1.5 text-body">
                  <Bot className="size-3.5 text-muted-foreground" />
                  {getAgentTypeLabel(a.agent_type)}
                  <StatusDot status={agentStatusDot(a.status)} />
                  <span className="text-ash">{getDropdownOptionLabel(AgentStatusOptions, a.status)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

export default WorkspaceHomePage;
