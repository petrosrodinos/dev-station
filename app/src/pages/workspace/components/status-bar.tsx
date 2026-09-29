import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity as ActivityIcon, Bell, Copy, GitBranch, Square } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { useGetActivities } from "@/features/activities/hooks/use-activities";
import type { Activity } from "@/features/activities/interfaces/activities.interfaces";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { useGetPreferences } from "@/features/users/hooks/use-users";
import { NotificationChannels } from "@/features/users/interfaces/users.interfaces";
import { shouldNotify } from "@/features/users/utils/notification-settings.utils";
import { useGitStatus } from "@/features/git/hooks/use-git";
import { processKey, useRunningProcessCount, useStopService } from "@/features/processes/hooks/use-processes";
import { useRuntimeStore } from "@/stores/runtime";
import { useWorkspaceStore } from "@/stores/workspace";
import { formatTimelineTime, formatRelative } from "@/lib/date";
import { isAgentActive, processStatusDot } from "@/lib/status";
import { isDesktop } from "@/lib/desktop";
import { toast } from "@/hooks/use-toast";
import { environments } from "@/config/environments";
import { Routes } from "@/routes/routes";
import { ProcessStatuses } from "@shared/contract";
import { useAppInfo, useLatestRelease } from "@/features/app-releases/hooks/use-app-releases";
import { toReleasePlatform } from "@/features/app-releases/utils/app-releases.utils";
import { isVersionBelow } from "@/lib/semver";
import { SettingsSections } from "@/config/constants/dropdowns/settings/settings-section.options";

const Scopes = { PROJECT: "project", ALL: "all" } as const;
type Scope = (typeof Scopes)[keyof typeof Scopes];

/** Bottom bar: processes, branch, and the activity feed (the notification surface, Spec §27). */
export function StatusBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const openSessionTab = useWorkspaceStore((s) => s.openSessionTab);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const runningProcesses = useRunningProcessCount();
  const processMap = useRuntimeStore((s) => s.processes);
  const activeAgents = useRuntimeStore((s) => Object.values(s.agents).filter((a) => a.alive && isAgentActive(a.status)).length);
  const { data: git } = useGitStatus(activeProjectId, { refetchInterval: 15_000 });
  const { data: projects } = useGetProjects();
  const stop = useStopService();
  const [open, setOpen] = useState(false);
  const [processesOpen, setProcessesOpen] = useState(false);
  const [scope, setScope] = useState<Scope>(Scopes.PROJECT);
  const projectScoped = scope === Scopes.PROJECT && !!activeProjectId;
  const { data: preferences } = useGetPreferences();
  const { data: appInfo } = useAppInfo();
  const { data: latestRelease } = useLatestRelease(appInfo ? toReleasePlatform(appInfo.platform) : null);
  const updateAvailable = !!appInfo && !!latestRelease && isVersionBelow(appInfo.version, latestRelease.version);
  // Over-fetch so hiding muted event types still leaves a full list.
  const { data: latest } = useGetActivities({ limit: 20, project_id: activeProjectId ?? undefined }, !!activeProjectId);
  const { data: feed, isPending } = useGetActivities({ limit: 100, project_id: projectScoped ? activeProjectId! : undefined }, open);
  const projectById = useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects]);
  const notificationSettings = preferences?.notification_settings;
  const feedItems = useMemo(
    () => (feed?.data ?? []).filter((a) => shouldNotify(notificationSettings, a.type, NotificationChannels.FEED)).slice(0, 40),
    [feed, notificationSettings],
  );

  const latestItem = latest?.data.find((a) => shouldNotify(notificationSettings, a.type, NotificationChannels.FEED));

  const copyPath = async () => {
    await navigator.clipboard.writeText(location.pathname + location.search);
    toast({ title: "Path copied", duration: 1500 });
  };

  const openActivity = (a: Activity) => {
    if (a.project_id) {
      setActiveProject(a.project_id);
      navigate(Routes.workspace.project(a.project_id));
    }
    if (a.agent_session_id) openSessionTab(a.agent_session_id);
    setOpen(false);
  };

  const openProcessProject = (projectId: string) => {
    setActiveProject(projectId);
    navigate(Routes.workspace.project(projectId));
    setProcessesOpen(false);
  };

  const sortedProcesses = useMemo(
    () => Object.values(processMap).sort((a, b) => Number(b.status === ProcessStatuses.RUNNING) - Number(a.status === ProcessStatuses.RUNNING) || a.name.localeCompare(b.name)),
    [processMap],
  );

  return (
    <footer className="flex h-8 shrink-0 items-center gap-3 sm:gap-4 overflow-hidden border-t bg-canvas px-4 text-xs text-muted-foreground">
      <Popover open={processesOpen} onOpenChange={setProcessesOpen}>
        <PopoverTrigger
          render={
            <button className="flex shrink-0 items-center gap-1.5 whitespace-nowrap hover:text-foreground" disabled={!sortedProcesses.length}>
              <ActivityIcon className="size-3.5" />
              {runningProcesses} process{runningProcesses === 1 ? "" : "es"} running
              {activeAgents > 0 && <span className="text-foreground">· {activeAgents} agent{activeAgents === 1 ? "" : "s"} active</span>}
            </button>
          }
        />
        <PopoverContent side="top" align="start" className="w-[min(380px,calc(100vw-1rem))] p-0">
          <div className="border-b px-3 py-2 text-[0.8125rem] font-medium">Processes</div>
          <div className="max-h-96 overflow-y-auto">
            {!sortedProcesses.length ? (
              <EmptyState title="No processes" description="Start a service from a project's overview to see it here." />
            ) : (
              sortedProcesses.map((p) => {
                const project = projectById.get(p.project_id);
                const running = p.status === ProcessStatuses.RUNNING;
                return (
                  <div key={p.key} className="flex items-center gap-2.5 border-b border-hairline-soft px-3 py-2 text-[0.7813rem] last:border-b-0 hover:bg-surface-elevated">
                    <StatusDot status={processStatusDot(p.status)} />
                    <button onClick={() => openProcessProject(p.project_id)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-body">{p.name}</span>
                        {project && <span className="truncate text-ash">— {project.name}</span>}
                      </div>
                      <div className="truncate font-mono text-[0.6875rem] text-ash">
                        {running && p.started_at ? `started ${formatRelative(p.started_at)}` : p.status.toLowerCase()}
                        {running && p.port ? ` · :${p.port}` : ""}
                      </div>
                    </button>
                    {isDesktop() && running && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0 text-muted-foreground"
                              aria-label="Stop"
                              onClick={() => stop.mutate(processKey(p.project_id, p.service_id))}
                            >
                              <Square className="size-3.5" />
                            </Button>
                          }
                        />
                        <TooltipContent>Stop</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
      {git?.branch && (
        <div className="flex shrink-0 items-center gap-1 whitespace-nowrap font-mono text-ash max-sm:hidden">
          <GitBranch className="size-3.5" />
          {git.branch}
          {git.files.length > 0 && <span className="text-warning">· {git.files.length} changed</span>}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-foreground">
              <Bell className="size-3.5 shrink-0" />
              <span className="truncate">{latestItem ? `${formatTimelineTime(latestItem.created_at)} · ${latestItem.message}` : "No recent activity"}</span>
            </button>
          }
        />
        <PopoverContent side="top" align="start" className="w-[min(420px,calc(100vw-1rem))] p-0">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-[0.8125rem] font-medium">Activity</span>
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
            ) : !feedItems.length ? (
              <EmptyState title="No activity yet" description="Agent sessions, Git operations and service events show up here." />
            ) : (
              feedItems.map((a) => {
                const project = a.project_id ? projectById.get(a.project_id) : undefined;
                return (
                  <button key={a.id} onClick={() => openActivity(a)} className="flex w-full gap-2.5 border-b border-hairline-soft px-3 py-2 text-left text-[0.7813rem] last:border-b-0 hover:bg-surface-elevated">
                    <span className="w-16 shrink-0 pt-px font-mono text-[0.6875rem] text-ash">{formatTimelineTime(a.created_at)}</span>
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
      <Tooltip>
        <TooltipTrigger
          render={
            <button onClick={copyPath} className="flex items-center gap-1.5 whitespace-nowrap font-mono text-ash hover:text-foreground max-lg:hidden" aria-label="Copy current path">
              <span className="max-w-64 truncate">{location.pathname}</span>
              <Copy className="size-3" />
            </button>
          }
        />
        <TooltipContent>Copy path — share with an AI agent to point it at this page</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={() => updateAvailable && navigate(Routes.workspace.settings_section(SettingsSections.GENERAL))}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-ash max-md:hidden hover:text-foreground"
            >
              {updateAvailable && <span className="size-1.5 rounded-full bg-info" />}
              {environments.APP_NAME} · v{appInfo?.version ?? environments.APP_VERSION}
            </button>
          }
        />
        {updateAvailable && <TooltipContent>Update available — v{latestRelease?.version}</TooltipContent>}
      </Tooltip>
    </footer>
  );
}
