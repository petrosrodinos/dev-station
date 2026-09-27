import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity as ActivityIcon, Bell, GitBranch } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useGetActivities } from "@/features/activities/hooks/use-activities";
import type { Activity } from "@/features/activities/interfaces/activities.interfaces";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { useGitStatus } from "@/features/git/hooks/use-git";
import { useRunningProcessCount } from "@/features/processes/hooks/use-processes";
import { useRuntimeStore } from "@/stores/runtime";
import { useWorkspaceStore } from "@/stores/workspace";
import { formatTimelineTime } from "@/lib/date";
import { isAgentActive } from "@/lib/status";
import { environments } from "@/config/environments";
import { Routes } from "@/routes/routes";

const Scopes = { PROJECT: "project", ALL: "all" } as const;
type Scope = (typeof Scopes)[keyof typeof Scopes];

/** Bottom bar: processes, branch, and the activity feed (the notification surface, Spec §27). */
export function StatusBar() {
  const navigate = useNavigate();
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const openSessionTab = useWorkspaceStore((s) => s.openSessionTab);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const runningProcesses = useRunningProcessCount();
  const activeAgents = useRuntimeStore((s) => Object.values(s.agents).filter((a) => a.alive && isAgentActive(a.status)).length);
  const { data: git } = useGitStatus(activeProjectId, { refetchInterval: 15_000 });
  const { data: projects } = useGetProjects();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>(Scopes.PROJECT);
  const projectScoped = scope === Scopes.PROJECT && !!activeProjectId;
  const { data: latest } = useGetActivities({ limit: 1, project_id: activeProjectId ?? undefined }, !!activeProjectId);
  const { data: feed, isPending } = useGetActivities({ limit: 40, project_id: projectScoped ? activeProjectId! : undefined }, open);
  const projectById = useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects]);

  const latestItem = latest?.data[0];

  const openActivity = (a: Activity) => {
    if (a.project_id) {
      setActiveProject(a.project_id);
      navigate(Routes.workspace.project(a.project_id));
    }
    if (a.agent_session_id) openSessionTab(a.agent_session_id);
    setOpen(false);
  };

  return (
    <footer className="flex h-8 shrink-0 items-center gap-4 overflow-hidden border-t bg-canvas px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <ActivityIcon className="size-3.5" />
        {runningProcesses} process{runningProcesses === 1 ? "" : "es"} running
        {activeAgents > 0 && <span className="text-foreground">· {activeAgents} agent{activeAgents === 1 ? "" : "s"} active</span>}
      </div>
      {git?.branch && (
        <div className="flex items-center gap-1 whitespace-nowrap font-mono text-ash">
          <GitBranch className="size-3.5" />
          {git.branch}
          {git.files.length > 0 && <span className="text-warning">· {git.files.length} changed</span>}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-foreground">
            <Bell className="size-3.5 shrink-0" />
            <span className="truncate">{latestItem ? `${formatTimelineTime(latestItem.created_at)} · ${latestItem.message}` : "No recent activity"}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-[420px] p-0">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-[13px] font-medium">Activity</span>
            <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
              <TabsList className="h-7 p-0.5">
                <TabsTrigger value={Scopes.PROJECT} className="h-6 px-2 text-xs" disabled={!activeProjectId}>
                  This project
                </TabsTrigger>
                <TabsTrigger value={Scopes.ALL} className="h-6 px-2 text-xs">
                  All projects
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isPending ? (
              <ListSkeleton rows={6} withIcon={false} />
            ) : !feed?.data.length ? (
              <EmptyState title="No activity yet" description="Agent sessions, Git operations and service events show up here." />
            ) : (
              feed.data.map((a) => {
                const project = a.project_id ? projectById.get(a.project_id) : undefined;
                return (
                  <button key={a.id} onClick={() => openActivity(a)} className="flex w-full gap-2.5 border-b border-hairline-soft px-3 py-2 text-left text-[12.5px] last:border-b-0 hover:bg-surface-elevated">
                    <span className="w-16 shrink-0 pt-px font-mono text-[11px] text-ash">{formatTimelineTime(a.created_at)}</span>
                    <span className="mt-[5px] size-1.5 shrink-0 rounded-full" style={{ backgroundColor: project?.color ?? "#6a6b6c" }} />
                    <span className="min-w-0 text-body">
                      {a.message}
                      {!projectScoped && project && <span className="text-ash"> — {project.name}</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
      <div className="whitespace-nowrap text-ash">
        {environments.APP_NAME} · v{environments.APP_VERSION}
      </div>
    </footer>
  );
}
