import { useEffect, useMemo, useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, CloudDownload, FolderInput, XCircle } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useProjectLocalStates } from "@/features/local-workspace/hooks/use-local-workspace";
import { useCancelClone, useCloneProgress, useCloneProject, useLinkProjectFolder } from "@/features/local-workspace/hooks/use-project-setup";
import { pickDirectory, suggestProjectPath } from "@/features/local-workspace/services/local-workspace.services";
import { Routes } from "@/routes/routes";
import { isDesktop } from "@/lib/desktop";
import { ProjectLocalStates } from "@shared/contract";

type RowStatus = { state: "idle" | "cloning" | "done" | "error"; operation_id?: string; error?: string };

/** Bulk setup of projects that exist in the organization but not on this device (Spec §26). */
const ImportedProjectsPage: FC = () => {
  const navigate = useNavigate();
  const { data: projects, isPending } = useGetProjects();
  const { data: localStates } = useProjectLocalStates();
  const clone = useCloneProject({ silent: true });
  const cancel = useCancelClone();
  const link = useLinkProjectFolder();
  const progress = useCloneProgress();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [destinations, setDestinations] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<Record<string, RowStatus>>({});

  const imported = useMemo(() => (projects ?? []).filter((p) => localStates?.[p.id] === ProjectLocalStates.IMPORTED || rows[p.id]), [projects, localStates, rows]);

  useEffect(() => {
    for (const p of imported) {
      if (destinations[p.id]) continue;
      void suggestProjectPath(p.name).then((d) => setDestinations((prev) => ({ ...prev, [p.id]: prev[p.id] ?? d })));
    }
  }, [imported, destinations]);

  const setRow = (id: string, row: RowStatus) => setRows((prev) => ({ ...prev, [id]: row }));

  const cloneOne = async (project: Project) => {
    if (!project.repository || !destinations[project.id]) return;
    const operation_id = crypto.randomUUID();
    setRow(project.id, { state: "cloning", operation_id });
    try {
      await clone.mutateAsync({ project, operation_id, url: project.repository.clone_url, destination: destinations[project.id] });
      setRow(project.id, { state: "done" });
    } catch (error) {
      setRow(project.id, { state: "error", error: error instanceof Error ? error.message : "Clone failed" });
    }
  };

  // Each clone is an independent operation running in parallel.
  const cloneSelected = () => imported.filter((p) => selected.has(p.id) && p.repository).forEach((p) => void cloneOne(p));

  const chooseFolders = async () => {
    for (const p of imported.filter((x) => selected.has(x.id))) {
      const folder = await pickDirectory().catch(() => null);
      if (!folder) break;
      link.mutate({ project: p, path: folder }, { onSuccess: () => setRow(p.id, { state: "done" }) });
    }
  };

  if (!isDesktop()) return <EmptyState className="py-16" title="Local setup is available in the desktop app" />;
  if (isPending) return <ListSkeleton rows={6} className="p-6" />;

  const allSelected = imported.length > 0 && imported.every((p) => selected.has(p.id));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 overflow-y-auto p-6">
      <div>
        <h1 className="text-lg font-medium">Imported projects</h1>
        <p className="text-[0.8125rem] text-muted-foreground">
          These projects exist in your organization but aren't on this device yet. Clone them into your workspace folder, point them at existing folders, or leave them for later.
        </p>
      </div>

      {imported.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<CheckCircle2 />}
            title="Everything is set up on this device"
            action={
              <Button variant="outline" onClick={() => navigate(Routes.workspace.root)}>
                Back to workspace
              </Button>
            }
          />
        </Panel>
      ) : (
        <Panel className="overflow-hidden">
          <PanelHeader
            title={
              <>
                <Checkbox checked={allSelected} onCheckedChange={(v) => setSelected(v ? new Set(imported.map((p) => p.id)) : new Set())} aria-label="Select all" />
                Imported projects ({imported.length})
              </>
            }
            actions={
              <>
                <Button size="sm" variant="outline" className="gap-1.5" disabled={!selected.size} onClick={() => void chooseFolders()}>
                  <FolderInput className="size-3.5" /> Choose local paths…
                </Button>
                <Button size="sm" className="gap-1.5" disabled={!selected.size} onClick={cloneSelected}>
                  <CloudDownload className="size-3.5" /> Clone selected
                </Button>
              </>
            }
          />
          {imported.map((p) => {
            const row = rows[p.id];
            const event = row?.operation_id ? progress[row.operation_id] : undefined;
            return (
              <div key={p.id} className="border-b border-hairline-soft px-4 py-3 last:border-b-0">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selected.has(p.id)}
                    disabled={row?.state === "cloning" || row?.state === "done"}
                    onCheckedChange={(v) =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(p.id);
                        else next.delete(p.id);
                        return next;
                      })
                    }
                    aria-label={`Select ${p.name}`}
                  />
                  <ProjectAvatar name={p.name} color={p.color} seed={p.avatar_seed} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.8125rem] font-medium">
                      {p.name}
                    </div>
                    <div className="truncate font-mono text-[0.7188rem] text-ash">{p.repository ? `${p.repository.clone_url} → ${destinations[p.id] ?? "…"}` : "No repository — choose a local path"}</div>
                  </div>
                  {row?.state === "done" && <CheckCircle2 className="size-4 text-success" />}
                  {row?.state === "error" && (
                    <span className="flex items-center gap-1 text-xs text-danger" title={row.error}>
                      <XCircle className="size-4" /> Failed
                    </span>
                  )}
                  {row?.state === "cloning" ? (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => row.operation_id && cancel.mutate(row.operation_id)}>
                      Cancel
                    </Button>
                  ) : row?.state === "done" ? (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate(Routes.workspace.project(p.id))}>
                      Open
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate(Routes.workspace.project_setup(p.id))}>
                      Set up…
                    </Button>
                  )}
                </div>
                {row?.state === "cloning" && (
                  <div className="mt-2 space-y-1 pl-[68px]">
                    <div className="truncate font-mono text-[0.6875rem] text-muted-foreground">{event?.line ?? "Starting…"}</div>
                    <Progress value={event?.percent ?? 5} className="h-1" />
                  </div>
                )}
                {row?.state === "error" && <div className="mt-1 pl-[68px] text-xs text-danger">{row.error}</div>}
              </div>
            );
          })}
        </Panel>
      )}
    </div>
  );
};

export default ImportedProjectsPage;
