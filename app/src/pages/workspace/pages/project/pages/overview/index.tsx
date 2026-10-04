import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowDown, ArrowUp, ChevronRight, ExternalLink, GitCommitHorizontal, Plus } from "lucide-react";
import { Panel, PanelBody, PanelHeader, StatRow } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { Skeleton } from "@/components/ui/skeleton";
import { useGitPull, useGitPush, useGitStatus } from "@/features/git/hooks/use-git";
import { useOpenInEditor } from "@/features/files/hooks/use-files";
import { useAgentSessions } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { useIntegrationConnectionLabel } from "@/features/integrations/hooks/use-connection-label";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { AgentStatusOptions } from "@/config/constants/dropdowns/agents/agent-status.options";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { ProjectTabs } from "@/config/constants/dropdowns/projects/project-tab.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { agentStatusDot } from "@/lib/status";
import { formatRelative } from "@/lib/date";
import { useRuntimeStore } from "@/stores/runtime";
import { useWorkspaceStore } from "@/stores/workspace";
import { useDialogsStore } from "@/stores/dialogs";
import { Routes } from "@/routes/routes";
import { AgentRuntimeStatuses, EditorTargets } from "@shared/contract";
import { useProjectContext } from "../../hooks/use-project-context";
import { ServicesCard } from "./components/services-card";
import { PortsCard } from "./components/ports-card";
import { isDesktop } from "@/lib/desktop";
import { ProjectActivityCard } from "./components/project-activity-card";
import { LinearSummaryCard } from "./components/linear-summary-card";

const OverviewTab: FC = () => {
  const project = useProjectContext();
  const navigate = useNavigate();
  const { data: git, isPending: gitPending } = useGitStatus(project.id);
  const { data: sessions } = useAgentSessions({ project_id: project.id });
  const { data: config } = useWorkspaceConfig();
  const runtimeAgents = useRuntimeStore((s) => s.agents);
  const attentionIds = useWorkspaceStore((s) => s.attention_session_ids);
  const openSessionTab = useWorkspaceStore((s) => s.openSessionTab);
  const openNewSession = useDialogsStore((s) => s.openNewSession);
  const push = useGitPush();
  const pull = useGitPull();
  const openInEditor = useOpenInEditor();
  const githubAccount = useIntegrationConnectionLabel(project.github_connection_id);
  const { can } = usePermissions();

  const projectSessions = sessions?.data ?? [];
  const needsAttention = projectSessions.filter((s) => attentionIds.includes(s.id));
  const localPath = config?.project_paths[project.id];

  return (
    <div className="space-y-4 p-4">
      <Panel>
        <PanelHeader title="Quick actions" />
        <PanelBody className="flex flex-wrap gap-2">
          {can(PermissionKeys.GIT_COMMIT) && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(Routes.workspace.project_tab(project.id, ProjectTabs.GIT))}>
              <GitCommitHorizontal className="size-3.5" /> Commit {git?.files.length ? `(${git.files.length})` : ""}
            </Button>
          )}
          {can(PermissionKeys.GIT_PUSH) && (
            <Button variant="outline" size="sm" className="gap-1.5" loading={push.isPending} onClick={() => push.mutate({ projectId: project.id })}>
              <ArrowUp className="size-3.5" /> Push {git?.ahead ? `(${git.ahead})` : ""}
            </Button>
          )}
          {can(PermissionKeys.GIT_COMMIT) && (
            <Button variant="outline" size="sm" className="gap-1.5" loading={pull.isPending} onClick={() => pull.mutate({ projectId: project.id })}>
              <ArrowDown className="size-3.5" /> Pull {git?.behind ? `(${git.behind})` : ""}
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openInEditor.mutate({ projectId: project.id, editor: EditorTargets.CURSOR })}>
            <ExternalLink className="size-3.5" /> Open in Cursor
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openInEditor.mutate({ projectId: project.id, editor: EditorTargets.VSCODE })}>
            <ExternalLink className="size-3.5" /> Open in VS Code
          </Button>
        </PanelBody>
      </Panel>

      {needsAttention.length > 0 && (
        <Panel className="border-warning/60">
          <PanelBody className="flex items-center gap-2.5 py-3">
            <AlertCircle className="size-4 text-warning" />
            <span className="text-[0.8125rem]">
              {needsAttention.length} session{needsAttention.length > 1 ? "s need" : " needs"} your attention in this project —{" "}
              {needsAttention
                .map((s) => `${s.name} (${getDropdownOptionLabel(AgentStatusOptions, runtimeAgents[s.id]?.status ?? s.status).toLowerCase()})`)
                .join(", ")}
            </span>
            <Button size="sm" variant="secondary" className="ml-auto" onClick={() => openSessionTab(needsAttention[0].id)}>
              Review
            </Button>
          </PanelBody>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-2">
        <ServicesCard project={project} />
        {isDesktop() && <PortsCard projectId={project.id} />}

        <Panel>
          <PanelHeader title="Project" />
          <PanelBody className="py-2">
            <StatRow label="Repository" value={<span className="font-mono text-[0.7813rem]">{project.repository?.full_name ?? project.repository?.clone_url ?? "—"}</span>} />
            <StatRow label="Branch" value={<span className="font-mono text-[0.7813rem]">{git?.branch ?? "—"}</span>} />
            <StatRow label="Local path" value={<span className="font-mono text-[0.75rem]" title={localPath}>{localPath ?? "Not on this device"}</span>} />
            <StatRow label="GitHub account" value={githubAccount ?? "—"} />
            <StatRow label="Last activity" value={formatRelative(project.last_activity_at)} />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            title="Git status"
            actions={
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => navigate(Routes.workspace.project_tab(project.id, ProjectTabs.GIT))}>
                Open <ChevronRight className="size-3.5" />
              </Button>
            }
          />
          <PanelBody className="py-2">
            {gitPending ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="my-2.5 h-3.5 w-full" />)
            ) : !git?.is_repo ? (
              <div className="py-6 text-center text-[0.8125rem] text-muted-foreground">This folder is not a Git repository.</div>
            ) : (
              <>
                <StatRow label="Modified" value={git.counts.modified + git.counts.renamed} />
                <StatRow label="Added" value={git.counts.added} />
                <StatRow label="Deleted" value={git.counts.deleted} />
                <StatRow label="Untracked" value={git.counts.untracked} />
                <StatRow
                  label="Ahead / behind"
                  value={
                    <span className="font-mono">
                      {git.ahead} ↑ &nbsp; {git.behind} ↓{!git.upstream && <span className="ml-2 font-sans text-xs text-ash">no upstream</span>}
                    </span>
                  }
                />
              </>
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            title="AI sessions"
            actions={
              can(PermissionKeys.AI_START_AGENTS) && (
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => openNewSession({ project_id: project.id })}>
                  <Plus className="size-3.5" /> New session
                </Button>
              )
            }
          />
          <PanelBody className="@container p-3">
            {projectSessions.length === 0 ? (
              <div className="py-6 text-center text-[0.8125rem] text-ash">No AI sessions yet</div>
            ) : (
              <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
                {projectSessions.slice(0, 6).map((s) => {
                  const status = runtimeAgents[s.id]?.status ?? s.status;
                  return (
                    <button
                      key={s.id}
                      onClick={() => openSessionTab(s.id)}
                      className="flex min-w-0 flex-col gap-1.5 rounded-md border border-hairline-soft px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <StatusDot status={agentStatusDot(status)} />
                        <span className="flex-1 truncate text-[0.8125rem] font-medium">{s.name}</span>
                        {status === AgentRuntimeStatuses.FINISHED && <span className="shrink-0 text-[0.6875rem] text-info">review</span>}
                      </div>
                      <div className="flex items-center gap-2 pl-4 font-mono text-[0.7188rem]">
                        <span className="truncate text-muted-foreground">{getAgentTypeLabel(s.agent_type)}</span>
                        {s.files_changed > 0 && (
                          <span className="ml-auto shrink-0">
                            <span className="text-success">+{s.additions}</span> <span className="text-danger">-{s.deletions}</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </PanelBody>
        </Panel>

        <LinearSummaryCard project={project} />
        <ProjectActivityCard projectId={project.id} />
      </div>
    </div>
  );
};

export default OverviewTab;
