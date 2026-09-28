import { useEffect, useMemo, useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CloudDownload, FolderInput, GitFork, Link2Off } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { useProjectLocalState, useProjectLocalStates, useSetProjectPath, useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { useCancelClone, useCloneProgress, useCloneProject, useLinkProjectFolder } from "@/features/local-workspace/hooks/use-project-setup";
import { suggestProjectPath } from "@/features/local-workspace/services/local-workspace.services";
import { getProjectLocalStateDescription, ProjectLocalStateOptions } from "@/config/constants/dropdowns/projects/project-local-state.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { joinLocalPath } from "@/lib/path";
import { isDesktop } from "@/lib/desktop";
import { Routes } from "@/routes/routes";
import { ProjectLocalStates } from "@shared/contract";
import { useProjectContext } from "../../hooks/use-project-context";
import { DirectoryField } from "@/pages/workspace/components/project-form/directory-field";

/** Lightweight setup flow for a project that isn't on this device yet (Spec §26) or whose folder vanished (Spec §25). */
const ProjectSetupPage: FC = () => {
  const project = useProjectContext();
  const navigate = useNavigate();
  const localState = useProjectLocalState(project.id);
  const { data: config } = useWorkspaceConfig();
  const { data: projects } = useGetProjects();
  const { data: localStates } = useProjectLocalStates();
  const clone = useCloneProject();
  const cancel = useCancelClone();
  const link = useLinkProjectFolder();
  const unlink = useSetProjectPath();
  const progress = useCloneProgress();
  const [destination, setDestination] = useState("");
  const [folder, setFolder] = useState("");
  const [operationId, setOperationId] = useState<string | null>(null);

  useEffect(() => {
    void suggestProjectPath(project.name).then(setDestination).catch(() => undefined);
  }, [project.name]);

  // Another project backed by the same repository already cloned here → reuse that clone (monorepos).
  const siblingClone = useMemo(() => {
    if (!project.repository) return null;
    const sibling = projects?.find((p) => p.id !== project.id && p.repository?.id === project.repository?.id && localStates?.[p.id] === ProjectLocalStates.LOCAL);
    const siblingPath = sibling ? config?.project_paths[sibling.id] : undefined;
    if (!sibling || !siblingPath) return null;
    const root = sibling.sub_path ? siblingPath.slice(0, siblingPath.length - sibling.sub_path.length).replace(/[\\/]+$/, "") : siblingPath;
    return { name: sibling.name, path: joinLocalPath(root, project.sub_path) };
  }, [project, projects, localStates, config]);

  const done = () => navigate(Routes.workspace.project(project.id));

  const startClone = () => {
    if (!project.repository) return;
    const opId = crypto.randomUUID();
    setOperationId(opId);
    clone.mutate({ project, operation_id: opId, url: project.repository.clone_url, destination, branch: null }, { onSuccess: done });
  };

  const cloneEvent = operationId ? progress[operationId] : undefined;
  const missingPath = config?.project_paths[project.id];

  if (!isDesktop()) {
    return <div className="p-4 text-[13px] text-muted-foreground">Local setup is available in the Dev Station desktop app.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <Panel className={localState === ProjectLocalStates.MISSING ? "border-warning/60" : undefined}>
        <PanelBody className="flex items-start gap-3">
          {localState === ProjectLocalStates.MISSING ? <AlertTriangle className="mt-0.5 size-5 text-warning" /> : <CloudDownload className="mt-0.5 size-5 text-info" />}
          <div>
            <div className="text-sm font-medium">{localState ? getDropdownOptionLabel(ProjectLocalStateOptions, localState) : "Set up locally"}</div>
            <div className="text-[13px] text-muted-foreground">
              {localState ? getProjectLocalStateDescription(localState) : ""}
              {localState === ProjectLocalStates.MISSING && missingPath && (
                <>
                  {" "}
                  Expected at <span className="font-mono">{missingPath}</span>.
                </>
              )}
            </div>
          </div>
        </PanelBody>
      </Panel>

      {siblingClone && (
        <Panel>
          <PanelHeader title={<><GitFork className="size-3.5" /> Use existing clone</>} />
          <PanelBody className="flex items-center gap-3">
            <div className="min-w-0 flex-1 text-[13px]">
              The repository is already cloned for <b>{siblingClone.name}</b>. Point this project at <span className="font-mono text-xs">{siblingClone.path}</span>.
            </div>
            <Button onClick={() => link.mutate({ project, path: siblingClone.path }, { onSuccess: done })} loading={link.isPending}>
              Use this folder
            </Button>
          </PanelBody>
        </Panel>
      )}

      <Panel>
        <PanelHeader title={<><CloudDownload className="size-3.5" /> Clone project</>} />
        <PanelBody className="space-y-3">
          {project.repository ? (
            <>
              <div className="text-[13px] text-muted-foreground">
                Clones <span className="font-mono text-foreground">{project.repository.clone_url}</span>
                {project.sub_path && (
                  <>
                    {" "}
                    and opens <span className="font-mono">{project.sub_path}</span>
                  </>
                )}
                , then detects scripts and services.
              </div>
              <div className="space-y-1.5">
                <Label>Destination</Label>
                <DirectoryField value={destination} onChange={setDestination} />
              </div>
              {clone.isPending && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate font-mono">{cloneEvent?.line ?? "Starting…"}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => operationId && cancel.mutate(operationId)}>
                      Cancel
                    </Button>
                  </div>
                  <Progress value={cloneEvent?.percent ?? 5} className="h-1.5" />
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={startClone} loading={clone.isPending} disabled={!destination}>
                  Clone project
                </Button>
              </div>
            </>
          ) : (
            <div className="text-[13px] text-muted-foreground">This project has no repository URL. Edit the project to add one, or choose an existing folder below.</div>
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title={<><FolderInput className="size-3.5" /> Choose local path</>} />
        <PanelBody className="space-y-3">
          <div className="text-[13px] text-muted-foreground">Already have the repository on this machine (restored from a backup or cloned outside Dev Station)? Point the project at it.</div>
          <DirectoryField value={folder} onChange={setFolder} placeholder="Project folder" />
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => link.mutate({ project, path: folder }, { onSuccess: done })} loading={link.isPending} disabled={!folder}>
              Use this folder
            </Button>
          </div>
        </PanelBody>
      </Panel>

      <div className="flex items-center justify-between">
        {localState === ProjectLocalStates.MISSING ? (
          <Button variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => unlink.mutate({ projectId: project.id, path: null })} loading={unlink.isPending}>
            <Link2Off className="size-4" /> Forget the old folder
          </Button>
        ) : (
          <span />
        )}
        <Button variant="ghost" onClick={() => navigate(Routes.workspace.root)}>
          Skip for now
        </Button>
      </div>
    </div>
  );
};

export default ProjectSetupPage;
