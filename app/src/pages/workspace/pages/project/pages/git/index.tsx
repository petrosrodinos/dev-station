import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { useSearchParams } from "react-router-dom";
import { Code2, GitCommitHorizontal, Undo2 } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { useGitDiscard, useGitInit, useGitStatus } from "@/features/git/hooks/use-git";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { GitFileStateOptions } from "@/config/constants/dropdowns/git/git-file-state.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { cn } from "@/lib/utils";
import type { GitFileChange } from "@shared/contract";
import { useProjectContext } from "../../hooks/use-project-context";
import { GitToolbar } from "./components/git-toolbar";
import { FileDiffPanel } from "./components/file-diff-panel";
import { CommitBox } from "./components/commit-box";
import { RecentCommits } from "./components/recent-commits";

const STATE_TAG: Record<GitFileChange["state"], string> = {
  M: "bg-warning-soft text-warning",
  A: "bg-success-soft text-success",
  D: "bg-danger-soft text-danger",
  R: "bg-info-soft text-info",
  U: "bg-info-soft text-info",
  C: "bg-danger text-[#1a0505]",
};

/** Review-oriented Git view (Spec §19/§20) — not a full Git GUI. */
const GitTab: FC = () => {
  const project = useProjectContext();
  const [params, setParams] = useSearchParams();
  const { data: status, isPending } = useGitStatus(project.id, { refetchInterval: 5000 });
  const discard = useGitDiscard();
  const gitInit = useGitInit();
  const { can } = usePermissions();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [discardTarget, setDiscardTarget] = useState<string[] | "all" | null>(null);
  const activeFile = params.get("file");
  const files = useMemo(() => status?.files ?? [], [status]);

  // Keep the selection in sync with the working tree: newly appearing files are selected by default,
  // files the user unticked stay unticked.
  const knownPaths = useRef<Set<string>>(new Set());
  useEffect(() => {
    const known = knownPaths.current;
    setSelected((prev) => new Set(files.filter((f) => prev.has(f.path) || !known.has(f.path)).map((f) => f.path)));
    knownPaths.current = new Set(files.map((f) => f.path));
    if (!activeFile && files[0]) setParams((p) => (p.set("file", files[0].path), p), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const toggle = (path: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  if (isPending) return <ListSkeleton rows={8} className="p-4" />;
  if (!status?.is_repo)
    return (
      <EmptyState
        className="py-16"
        icon={<GitCommitHorizontal />}
        title="Not a Git repository"
        description="Initialize Git in this folder or link the project to a cloned repository."
        action={
          can(PermissionKeys.GIT_COMMIT) && (
            <Button size="sm" loading={gitInit.isPending} onClick={() => gitInit.mutate({ projectId: project.id })}>
              Initialize Git
            </Button>
          )
        }
      />
    );

  const allSelected = files.length > 0 && selected.size === files.length;
  const selectedPaths = files.filter((f) => selected.has(f.path)).map((f) => f.path);

  return (
    <div className="space-y-4 p-4">
      <GitToolbar project={project} status={status} onDiscardAll={() => setDiscardTarget("all")} />

      {files.length > 0 && can(PermissionKeys.GIT_COMMIT) && <CommitBox project={project} selectedPaths={selectedPaths} totalFiles={files.length} />}

      <div className="grid grid-cols-1 items-start gap-4 @5xl:grid-cols-[minmax(320px,2fr)_3fr]">
        <Panel className="overflow-hidden">
          <PanelHeader
            title={
              <>
                {can(PermissionKeys.GIT_COMMIT) && files.length > 0 && (
                  <Checkbox checked={allSelected} onCheckedChange={(v) => setSelected(v ? new Set(files.map((f) => f.path)) : new Set())} aria-label="Select all files" />
                )}
                Changed files ({files.length})
                <span className="font-mono text-xs font-normal">
                  <span className="text-success">+{status.totals.additions}</span> <span className="text-danger">-{status.totals.deletions}</span>
                </span>
              </>
            }
          />
          {files.length === 0 ? (
            <EmptyState icon={<GitCommitHorizontal />} title="Working tree clean" description="No uncommitted changes." />
          ) : (
            <div className="max-h-[50vh] overflow-y-auto">
              {files.map((f) => (
                <div
                  key={f.path}
                  onClick={() => setParams((p) => (p.set("file", f.path), p), { replace: true })}
                  className={cn("group flex cursor-pointer items-center gap-2 border-b border-hairline-soft px-3 py-2 text-[0.8125rem] last:border-b-0 hover:bg-surface-elevated", activeFile === f.path && "bg-surface-card")}
                >
                  {can(PermissionKeys.GIT_COMMIT) && <Checkbox checked={selected.has(f.path)} onCheckedChange={() => toggle(f.path)} onClick={(e) => e.stopPropagation()} aria-label={`Select ${f.path}`} />}
                  <span title={getDropdownOptionLabel(GitFileStateOptions, f.state)} className={cn("flex size-4 shrink-0 items-center justify-center rounded-xs text-[0.625rem] font-bold", STATE_TAG[f.state])}>
                    {f.state}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[0.7813rem]" title={f.orig_path ? `${f.orig_path} → ${f.path}` : f.path}>
                    {f.path}
                  </span>
                  <span className="shrink-0 font-mono text-[0.7188rem]">
                    {f.binary ? (
                      <span className="text-ash">binary</span>
                    ) : (
                      <>
                        <span className="text-success">+{f.additions}</span> <span className="text-danger">-{f.deletions}</span>
                      </>
                    )}
                  </span>
                  {can(PermissionKeys.GIT_COMMIT) && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground opacity-0 hover:text-danger group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDiscardTarget([f.path]);
                            }}
                            aria-label="Discard changes"
                          >
                            <Undo2 className="size-3.5" />
                          </Button>
                        }
                      />
                      <TooltipContent>Discard changes</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="min-w-0 overflow-hidden">
          <PanelHeader
            title={
              <>
                <Code2 className="size-3.5 text-muted-foreground" /> Diff
                {activeFile && <span className="truncate font-mono text-xs font-normal text-muted-foreground">{activeFile}</span>}
              </>
            }
          />
          <PanelBody className="p-0">
            {activeFile && files.some((f) => f.path === activeFile) ? (
              <FileDiffPanel projectId={project.id} path={activeFile} />
            ) : (
              <EmptyState icon={<Code2 />} title="Select a file to preview its diff" />
            )}
          </PanelBody>
        </Panel>
      </div>

      <RecentCommits projectId={project.id} />

      <ConfirmationDialog
        isOpen={!!discardTarget}
        onClose={() => setDiscardTarget(null)}
        onConfirm={() =>
          discardTarget &&
          discard.mutate({ projectId: project.id, paths: discardTarget === "all" ? undefined : discardTarget }, { onSuccess: () => setDiscardTarget(null) })
        }
        title={discardTarget === "all" ? "Discard all changes?" : `Discard changes to ${discardTarget?.[0]}?`}
        description={
          discardTarget === "all"
            ? "This permanently discards every uncommitted change in the working tree, including untracked files. This cannot be undone."
            : "This permanently discards the uncommitted changes in this file. This cannot be undone."
        }
        confirmText="Discard"
        variant="destructive"
        isLoading={discard.isPending}
      />
    </div>
  );
};

export default GitTab;
