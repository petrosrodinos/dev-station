import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FolderInput, Github, Info, Link2, NotebookPen } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCreateProject, useGetProjects, useUpdateProject } from "@/features/projects/hooks/use-projects";
import { RepositoryProviders, type Project } from "@/features/projects/interfaces/projects.interfaces";
import { detectedToServiceInputs } from "@/features/projects/utils/services.utils";
import { useProviderConnections } from "@/features/integrations/hooks/use-integrations";
import { IntegrationProviders } from "@/features/integrations/interfaces/integrations.interfaces";
import { useInspectPath } from "@/features/local-workspace/hooks/use-local-workspace";
import { useCancelClone, useCloneProgress, useCloneProject, useLinkProjectFolder } from "@/features/local-workspace/hooks/use-project-setup";
import { suggestProjectPath } from "@/features/local-workspace/services/local-workspace.services";
import { ProjectColorOptions } from "@/config/constants/dropdowns/projects/project-color.options";
import { useDialogsStore } from "@/stores/dialogs";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { useWorkspaceStore } from "@/stores/workspace";
import { Routes } from "@/routes/routes";
import { baseName, repoFullNameFromUrl, repoNameFromUrl } from "@/lib/path";
import { isDesktop } from "@/lib/desktop";
import { cn } from "@/lib/utils";
import type { DetectionResult } from "@shared/contract";
import { projectFormSchema, ProjectSources, type ProjectFormData, type ProjectSource } from "../validation-schemas/workspace.schema";
import { toast } from "@/hooks/use-toast";
import { isBlockingMutation, willQueueWrite } from "@/lib/mutation-state";
import { useCloseWhenParked } from "@/hooks/use-close-when-parked";
import { AvatarPicker } from "./project-form/avatar-picker";
import { ColorSwatches } from "./project-form/color-swatches";
import { DirectoryField } from "./project-form/directory-field";
import { GithubRepoPicker } from "./project-form/github-repo-picker";

const defaultColor = (count: number) => ProjectColorOptions[count % ProjectColorOptions.length].id;

/** Shown above a source's fields when running outside the desktop app, whose fields stay visible but inert. */
function DesktopOnlyNotice() {
  return (
    <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-700 [&>svg]:text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:[&>svg]:text-amber-400">
      <Info className="size-4" />
      <AlertDescription className="text-current">
        Only available in the Dev Station desktop app — cloning and reading local folders needs its filesystem bridge, which a browser tab doesn't have. Use{" "}
        <span className="font-medium">No repository</span> here, or open the desktop app.
      </AlertDescription>
    </Alert>
  );
}

/** Add a project (GitHub via Composio / clone URL / existing folder / metadata only) or edit one (Spec §5/§7). */
export function ProjectDialog() {
  const navigate = useNavigate();
  const state = useDialogsStore((s) => s.project);
  const close = useDialogsStore((s) => s.closeProjectDialog);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const { data: projects } = useGetProjects();
  const { connections: githubConnections } = useProviderConnections(IntegrationProviders.GITHUB);
  const editing = projects?.find((p) => p.id === state.project_id) ?? null;
  const { can } = usePermissions();
  const allowed = can(state.project_id ? PermissionKeys.PROJECTS_EDIT : PermissionKeys.PROJECTS_CREATE);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const cloneProject = useCloneProject();
  const linkFolder = useLinkProjectFolder();
  const inspectPath = useInspectPath();
  const cancelClone = useCancelClone();
  const progress = useCloneProgress();
  const [operationId, setOperationId] = useState<string | null>(null);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const destinationTouched = useRef(false);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { source: isDesktop() ? ProjectSources.GITHUB : ProjectSources.NONE, name: "", color: ProjectColorOptions[0].id },
  });

  useEffect(() => {
    if (!state.open) return;
    destinationTouched.current = false;
    setDetection(null);
    setOperationId(null);
    if (editing) {
      form.reset({
        source: ProjectSources.NONE,
        name: editing.name,
        color: editing.color,
        avatar_seed: editing.avatar_seed,
        description: editing.description ?? "",
        sub_path: editing.sub_path ?? "",
      });
    } else {
      form.reset({
        source: isDesktop() ? (githubConnections.length ? ProjectSources.GITHUB : ProjectSources.URL) : ProjectSources.NONE,
        name: "",
        color: defaultColor(projects?.length ?? 0),
        avatar_seed: null,
        github_connection_id: githubConnections[0]?.id,
        description: "",
        sub_path: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.project_id]);

  const source = form.watch("source");
  const name = form.watch("name");

  // Suggest <workspace>/<Project> as the clone destination until the user edits it (Spec §25).
  useEffect(() => {
    if (editing || destinationTouched.current || !isDesktop() || !name.trim()) return;
    if (source !== ProjectSources.GITHUB && source !== ProjectSources.URL) return;
    const t = setTimeout(() => {
      void suggestProjectPath(name.trim()).then((p) => !destinationTouched.current && form.setValue("destination", p));
    }, 200);
    return () => clearTimeout(t);
  }, [name, source, editing, form]);

  const busy = isBlockingMutation(createProject) || isBlockingMutation(updateProject) || cloneProject.isPending || linkFolder.isPending;

  // A submit that goes offline mid-flight parks in the outbox: close, and don't navigate when it finally syncs.
  const parkedRef = useRef(false);
  useCloseWhenParked(createProject, () => {
    parkedRef.current = true;
    close();
  });
  useCloseWhenParked(updateProject, close);
  const cloneEvent = operationId ? progress[operationId] : undefined;

  const finish = (project: Project) => {
    close();
    setActiveProject(project.id);
    navigate(Routes.workspace.project(project.id));
  };

  const onSubmit = async (data: ProjectFormData) => {
    parkedRef.current = false;
    if (editing) {
      updateProject.mutate(
        {
          id: editing.id,
          name: data.name,
          color: data.color,
          avatar_seed: data.avatar_seed ?? null,
          description: data.description || null,
          sub_path: data.sub_path || null,
        },
        { onSuccess: close },
      );
      if (willQueueWrite()) close();
      return;
    }

    const repositoryUrl = data.source === ProjectSources.FOLDER ? detection?.git.remote_url ?? null : data.clone_url ?? null;
    const payload = {
        name: data.name,
        color: data.color,
        avatar_seed: data.avatar_seed ?? null,
        description: data.description || null,
        sub_path: data.sub_path || null,
        github_connection_id: data.source === ProjectSources.GITHUB ? data.github_connection_id ?? null : null,
        repository: repositoryUrl
          ? {
              clone_url: repositoryUrl,
              provider: /github\.com/i.test(repositoryUrl) ? RepositoryProviders.GITHUB : RepositoryProviders.OTHER,
              full_name: data.github_repo_full_name ?? repoFullNameFromUrl(repositoryUrl),
              default_branch: data.default_branch ?? detection?.git.branch ?? null,
              connection_id: data.source === ProjectSources.GITHUB ? data.github_connection_id ?? null : null,
            }
          : null,
        services: data.source === ProjectSources.FOLDER && detection ? detectedToServiceInputs(detection.services) : undefined,
    };

    if (willQueueWrite()) {
      // Offline: the outbox saves the project and syncs it later. Cloning and folder linking need the
      // server-issued id and a connection, so they can't run now; the user does them once back online.
      createProject.mutate(payload);
      if (data.source !== ProjectSources.NONE) {
        toast({ title: "Local setup waits for the connection", description: "Clone or link the folder once you're back online.", variant: "info", duration: 5000 });
      }
      close();
      return;
    }

    const project = await createProject.mutateAsync(payload).catch(() => null);
    if (!project || parkedRef.current) return;

    if (data.source === ProjectSources.GITHUB || data.source === ProjectSources.URL) {
      const opId = crypto.randomUUID();
      setOperationId(opId);
      cloneProject.mutate(
        { project, operation_id: opId, url: data.clone_url!, destination: data.destination!, branch: null },
        // Even if the clone fails the project exists — the setup screen offers retry / choose folder.
        { onSettled: () => finish(project) },
      );
    } else if (data.source === ProjectSources.FOLDER) {
      linkFolder.mutate({ project, path: data.local_path! }, { onSettled: () => finish(project) });
    } else {
      finish(project);
    }
  };

  const onFolderPicked = (path: string) => {
    inspectPath.mutate(path, {
      onSuccess: (result) => {
        setDetection(result);
        if (!form.getValues("name")) form.setValue("name", result.packages.find((p) => p.path === ".")?.name?.replace(/^@[^/]+\//, "") || baseName(path));
      },
    });
  };

  return (
    <Dialog open={state.open && allowed} onOpenChange={(o) => !o && !busy && close()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : "Add project"}</DialogTitle>
          <DialogDescription>
            {editing ? "Project details are shared with your organization." : "Connect a repository, then Dev Station detects its services and scripts automatically."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0 space-y-4">
            {!editing && (
              <Tabs value={source} onValueChange={(v) => form.setValue("source", v as ProjectSource)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value={ProjectSources.GITHUB} className="gap-1.5 text-xs">
                    <Github className="size-3.5" /> GitHub
                  </TabsTrigger>
                  <TabsTrigger value={ProjectSources.URL} className="gap-1.5 text-xs">
                    <Link2 className="size-3.5" /> Clone URL
                  </TabsTrigger>
                  <TabsTrigger value={ProjectSources.FOLDER} className="gap-1.5 text-xs">
                    <FolderInput className="size-3.5" /> Existing folder
                  </TabsTrigger>
                  <TabsTrigger value={ProjectSources.NONE} className="gap-1.5 text-xs">
                    <NotebookPen className="size-3.5" /> No repository
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {!editing && source === ProjectSources.GITHUB && (
              <div className="space-y-3">
                {!isDesktop() && <DesktopOnlyNotice />}
                <div className={cn("space-y-3", !isDesktop() && "pointer-events-none select-none opacity-50")} aria-disabled={!isDesktop()} inert={!isDesktop()}>
                  {isDesktop() && githubConnections.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-center text-[0.8125rem] text-muted-foreground">
                      No GitHub account is connected.{" "}
                      <button
                        type="button"
                        className="text-foreground underline underline-offset-4 hover:text-primary"
                        onClick={() => {
                          close();
                          navigate(Routes.workspace.integrations);
                        }}
                      >
                        Connect one in Integrations
                      </button>{" "}
                      or use Clone URL.
                    </div>
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="github_connection_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GitHub account</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange} disabled={!isDesktop()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose an account" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {githubConnections.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.label}
                                    {c.external_account ? ` (${c.external_account})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="github_repo_full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Repository</FormLabel>
                            <GithubRepoPicker
                              connectionId={form.watch("github_connection_id") ?? null}
                              selected={field.value}
                              onSelect={(repo) => {
                                field.onChange(repo.full_name);
                                form.setValue("clone_url", repo.clone_url);
                                form.setValue("default_branch", repo.default_branch ?? undefined);
                                if (!form.getValues("name")) form.setValue("name", repo.name);
                              }}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {!editing && source === ProjectSources.URL && (
              <div className="space-y-3">
                {!isDesktop() && <DesktopOnlyNotice />}
                <div className={cn(!isDesktop() && "pointer-events-none select-none opacity-50")} aria-disabled={!isDesktop()} inert={!isDesktop()}>
                  <FormField
                    control={form.control}
                    name="clone_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repository URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://github.com/company/project.git"
                            className="font-mono text-[0.7813rem]"
                            disabled={!isDesktop()}
                            {...field}
                            value={field.value ?? ""}
                            onBlur={() => {
                              field.onBlur();
                              const repoName = repoNameFromUrl(field.value ?? "");
                              if (repoName && !form.getValues("name")) form.setValue("name", repoName);
                            }}
                          />
                        </FormControl>
                        <FormDescription>Cloned with your local Git credentials (credential manager or SSH keys).</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {!editing && source === ProjectSources.FOLDER && (
              <div className="space-y-3">
                {!isDesktop() && <DesktopOnlyNotice />}
                <div className={cn(!isDesktop() && "pointer-events-none select-none opacity-50")} aria-disabled={!isDesktop()} inert={!isDesktop()}>
                  <FormField
                    control={form.control}
                    name="local_path"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project folder</FormLabel>
                        <DirectoryField value={field.value ?? ""} onChange={field.onChange} onPicked={onFolderPicked} placeholder="C:\Users\you\Development\Project" />
                        {detection && (
                          <FormDescription>
                            {detection.git.is_repo ? `Git repo${detection.git.remote_url ? ` · ${detection.git.remote_url}` : ""}` : "Not a Git repository"} ·{" "}
                            {detection.package_manager ?? "no package manager"} · {detection.services.length} service(s) detected
                            {detection.monorepo_tools.length ? ` · ${detection.monorepo_tools.join(", ")}` : ""}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project name</FormLabel>
                  <FormControl>
                    <Input placeholder="Platform — API" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!editing && (source === ProjectSources.GITHUB || source === ProjectSources.URL) && (
              <div className={cn(!isDesktop() && "pointer-events-none select-none opacity-50")} aria-disabled={!isDesktop()} inert={!isDesktop()}>
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clone to</FormLabel>
                      <DirectoryField
                        value={field.value ?? ""}
                        onChange={(v) => {
                          destinationTouched.current = true;
                          field.onChange(v);
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="sub_path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Folder inside the repository (monorepos)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. apps/api — leave empty for the repository root" className="font-mono text-[0.7813rem]" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>One repository can hold several projects — each project can point at its own sub-folder.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <ColorSwatches value={field.value} onChange={field.onChange} />
                  <FormDescription>Used for the project's icon and its AI session tabs.</FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatar_seed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar (optional)</FormLabel>
                  <AvatarPicker name={name} color={form.watch("color")} value={field.value ?? null} onChange={field.onChange} />
                  <FormDescription>Generate a random identicon, or keep the project's initials.</FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />

            {cloneProject.isPending && (
              <div className="space-y-1.5 rounded-md border bg-surface-elevated p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate font-mono text-muted-foreground">{cloneEvent?.line ?? "Starting clone…"}</span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => operationId && cancelClone.mutate(operationId)}>
                    Cancel
                  </Button>
                </div>
                <Progress value={cloneEvent?.percent ?? 5} className="h-1.5" />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" loading={busy} disabled={!editing && !isDesktop() && source !== ProjectSources.NONE}>
                {editing ? "Save changes" : source === ProjectSources.GITHUB || source === ProjectSources.URL ? "Create & clone" : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
