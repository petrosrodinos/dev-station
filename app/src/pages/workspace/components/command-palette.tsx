import { useState } from "react";
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
  const [search, setSearch] = useState("");
  const { data: projects } = useGetProjects();
  const { data: sessions } = useAgentSessions();
  const activeProject = projects?.find((p) => p.id === activeProjectId);
  const { data: issues } = useGetLinearIssues(open && activeProject?.linear_connection_id ? activeProject.linear_connection_id : null, {
    team_id: activeProject?.linear_team_id,
    project_id: activeProject?.linear_project_id,
    search: search.length > 1 ? search : undefined,
  });

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
    setSearch("");
  };

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
                  navigate(Routes.workspace.project(p.id));
                })
              }
            >
              <ProjectAvatar name={p.name} color={p.color} size="xs" />
              <span>{p.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {!!sessions?.data.length && (
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
                <span className="ml-auto text-[11.5px] text-ash">{projects?.find((p) => p.id === s.project_id)?.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!!issues?.length && activeProject && (
          <CommandGroup heading={`Linear — ${activeProject.name}`}>
            {issues.slice(0, 10).map((i) => (
              <CommandItem
                key={i.id}
                value={`issue ${i.identifier} ${i.title}`}
                onSelect={() => run(() => navigate(Routes.workspace.project_linear_issue(activeProject.id, i.id)))}
              >
                <CircleDot className="size-4" />
                <span className="truncate">{i.title}</span>
                <span className="ml-auto font-mono text-[11.5px] text-ash">{i.identifier}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem value="action new ai session" onSelect={() => run(() => openNewSession({ project_id: activeProjectId }))}>
            <Bot className="size-4" /> New AI session
          </CommandItem>
          {activeProjectId && isDesktop() && (
            <CommandItem
              value="action toggle preview"
              onSelect={() => run(() => setProjectPreview(activeProjectId, { previewOpen: !previews[activeProjectId]?.previewOpen }))}
            >
              <PanelRight className="size-4" /> Toggle preview
            </CommandItem>
          )}
          <CommandItem value="action add project" onSelect={() => run(() => openProjectDialog(null))}>
            <Plus className="size-4" /> Add project
          </CommandItem>
          <CommandItem value="action set up imported projects" onSelect={() => run(() => navigate(Routes.workspace.imported))}>
            <FolderGit2 className="size-4" /> Set up imported projects
          </CommandItem>
          <CommandItem value="action integrations" onSelect={() => run(() => navigate(Routes.workspace.integrations))}>
            <Plug className="size-4" /> Integrations
          </CommandItem>
          <CommandItem value="action organization members roles" onSelect={() => run(() => navigate(Routes.workspace.organization))}>
            <Building2 className="size-4" /> Organization
          </CommandItem>
          <CommandItem value="action settings" onSelect={() => run(() => navigate(Routes.workspace.settings))}>
            <Settings className="size-4" /> Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
