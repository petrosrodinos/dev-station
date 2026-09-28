import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Building2, CircleDot, FolderGit2, PanelRight, Plug, Plus, Settings } from "lucide-react";
import { isDesktop } from "@/lib/desktop";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { useGetLinearIssues } from "@/features/integrations/hooks/use-integrations";
import { useAgentSessions } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { useDialogsStore } from "@/stores/dialogs";
import { useWorkspaceStore } from "@/stores/workspace";
import { Routes } from "@/routes/routes";
import { filterByAccess, type AccessGated } from "@/lib/access.utils";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys, type PermissionKey } from "@/features/organizations/interfaces/organizations.interfaces";
import { SettingsSections } from "@/config/constants/dropdowns/settings/settings-section.options";
import { projectRouteKeepingTab } from "@/lib/project-route.utils";

interface PaletteAction extends AccessGated<PermissionKey> {
  id: string;
  value: string;
  label: string;
  icon: ReactNode;
  visible?: boolean;
  run: () => void;
}

/** Ctrl/⌘+K: jump to projects, sessions and Linear issues, or run common actions. */
export function CommandPalette() {
  const navigate = useNavigate();
  const open = useDialogsStore((s) => s.command_palette);
  const setOpen = useDialogsStore((s) => s.setCommandPalette);
  const openNewSession = useDialogsStore((s) => s.openNewSession);
  const openProjectDialog = useDialogsStore((s) => s.openProjectDialog);
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const openSessionTab = useWorkspaceStore((s) => s.openSessionTab);
  const setProjectPreview = useWorkspaceStore((s) => s.setProjectPreview);
  const previews = useWorkspaceStore((s) => s.preview_by_project);
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const { data: projects } = useGetProjects();
  const { data: sessions } = useAgentSessions();
  const activeProject = projects?.find((p) => p.id === activeProjectId);
  const { data: issues } = useGetLinearIssues(open && can(PermissionKeys.INTEGRATIONS_VIEW) && activeProject?.linear_connection_id ? activeProject.linear_connection_id : null, {
    team_id: activeProject?.linear_team_id,
    project_id: activeProject?.linear_project_id,
    search: search.length > 1 ? search : undefined,
  });

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
    setSearch("");
  };

  const actions: PaletteAction[] = [
    { id: "new-session", value: "action new ai session", label: "New AI session", icon: <Bot className="size-4" />, permission: PermissionKeys.AI_START_AGENTS, run: () => openNewSession({ project_id: activeProjectId }) },
    {
      id: "toggle-preview",
      value: "action toggle preview",
      label: "Toggle preview",
      icon: <PanelRight className="size-4" />,
      visible: !!activeProjectId && isDesktop(),
      run: () => activeProjectId && setProjectPreview(activeProjectId, { previewOpen: !previews[activeProjectId]?.previewOpen }),
    },
    { id: "add-project", value: "action add project", label: "Add project", icon: <Plus className="size-4" />, permission: PermissionKeys.PROJECTS_CREATE, run: () => openProjectDialog(null) },
    { id: "imported", value: "action set up imported projects", label: "Set up imported projects", icon: <FolderGit2 className="size-4" />, run: () => navigate(Routes.workspace.imported) },
    { id: "integrations", value: "action integrations", label: "Integrations", icon: <Plug className="size-4" />, permission: PermissionKeys.INTEGRATIONS_VIEW, run: () => navigate(Routes.workspace.integrations) },
    {
      id: "organization",
      value: "action organization members roles",
      label: "Organization",
      icon: <Building2 className="size-4" />,
      permission: { any: [PermissionKeys.ORG_MANAGE_MEMBERS, PermissionKeys.ORG_MANAGE_ROLES, PermissionKeys.ORG_MANAGE_SETTINGS] },
      run: () => navigate(Routes.workspace.settings_section(SettingsSections.ORGANIZATION)),
    },
    { id: "settings", value: "action settings", label: "Settings", icon: <Settings className="size-4" />, run: () => navigate(Routes.workspace.settings) },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search projects, sessions, issues, actions…" value={search} onValueChange={setSearch} />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Projects">
          {projects?.map((p) => (
            <CommandItem
              key={p.id}
              value={`project ${p.name}`}
              onSelect={() =>
                run(() => {
                  setActiveProject(p.id);
                  navigate(projectRouteKeepingTab(p.id, window.location.pathname));
                })
              }
            >
              <ProjectAvatar name={p.name} color={p.color} seed={p.avatar_seed} size="xs" />
              <span>{p.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {!!sessions?.data.length && can(PermissionKeys.AI_USE_AGENTS) && (
          <CommandGroup heading="AI sessions">
            {sessions.data.slice(0, 12).map((s) => (
              <CommandItem
                key={s.id}
                value={`session ${s.name}`}
                onSelect={() =>
                  run(() => {
                    setActiveProject(s.project_id);
                    openSessionTab(s.id);
                    navigate(Routes.workspace.project(s.project_id));
                  })
                }
              >
                <Bot className="size-4" />
                <span className="truncate">{s.name}</span>
                <span className="ml-auto text-[0.7188rem] text-ash">{projects?.find((p) => p.id === s.project_id)?.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!!issues?.length && !!activeProject && (
          <CommandGroup heading={`Linear — ${activeProject.name}`}>
            {issues.slice(0, 10).map((i) => (
              <CommandItem
                key={i.id}
                value={`issue ${i.identifier} ${i.title}`}
                onSelect={() => run(() => navigate(Routes.workspace.project_linear_issue(activeProject.id, i.id)))}
              >
                <CircleDot className="size-4" />
                <span className="truncate">{i.title}</span>
                <span className="ml-auto font-mono text-[0.7188rem] text-ash">{i.identifier}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {filterByAccess(actions.filter((a) => a.visible ?? true), can).map((a) => (
            <CommandItem key={a.id} value={a.value} onSelect={() => run(a.run)}>
              {a.icon} {a.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
