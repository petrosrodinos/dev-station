import { useState } from "react";
import { ArrowDown, ArrowUp, Archive, ChevronDown, GitBranch, GitMerge, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useBranches, useGitCheckout, useGitFetch, useGitMerge, useGitPull, useGitPush, useGitStash, useGitStashPop, useStashes } from "@/features/git/hooks/use-git";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import type { GitStatus } from "@shared/contract";
import { CreateBranchDialog } from "./create-branch-dialog";

export function GitToolbar({ project, status, onDiscardAll }: { project: Project; status: GitStatus; onDiscardAll: () => void }) {
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const { data: branches } = useBranches(project.id, branchMenuOpen);
  const { data: stashes } = useStashes(project.id);
  const fetch = useGitFetch();
  const pull = useGitPull();
  const push = useGitPush();
  const checkout = useGitCheckout();
  const merge = useGitMerge();
  const stash = useGitStash();
  const stashPop = useGitStashPop();
  const { can } = usePermissions();
  const dirty = status.files.length > 0;
  const projectId = project.id;
  const canCommit = can(PermissionKeys.GIT_COMMIT);
  const canBranch = can(PermissionKeys.GIT_MANAGE_BRANCHES);

  const local = branches?.filter((b) => !b.remote) ?? [];
  const remote = branches?.filter((b) => b.remote && !local.some((l) => b.name.endsWith(`/${l.name}`))) ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!canBranch && (
        <Badge variant="secondary" className="h-[30px] gap-1.5 font-mono">
          <GitBranch className="size-3.5" /> {status.branch ?? "detached HEAD"}
        </Badge>
      )}
      {canBranch && (
      <DropdownMenu open={branchMenuOpen} onOpenChange={setBranchMenuOpen}>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="h-[30px] gap-1.5 font-mono">
              <GitBranch className="size-3.5" /> {status.branch ?? "detached HEAD"} <ChevronDown className="size-3" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="max-h-96 w-72 overflow-y-auto">
          <DropdownMenuItem onSelect={() => setCreating(true)} className="gap-2">
            <Plus className="size-3.5" /> New branch…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Local branches</DropdownMenuLabel>
          {local.map((b) => (
            <DropdownMenuSub key={b.name}>
              <DropdownMenuSubTrigger className="gap-2 font-mono text-xs" disabled={b.current}>
                <span className="flex-1 truncate">{b.name}</span>
                {b.current && <Badge variant="secondary">current</Badge>}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onSelect={() => checkout.mutate({ projectId, branch: b.name })}>Switch to branch</DropdownMenuItem>
                {canCommit && (
                  <DropdownMenuItem onSelect={() => setMergeTarget(b.name)} className="gap-2">
                    <GitMerge className="size-3.5" /> Merge into {status.branch}
                  </DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}
          {remote.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Remote branches</DropdownMenuLabel>
              {remote.slice(0, 30).map((b) => (
                <DropdownMenuItem key={b.name} onSelect={() => checkout.mutate({ projectId, branch: b.name })} className="font-mono text-xs">
                  {b.name}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      )}

      {canCommit && (
        <>
          <Button variant="outline" size="sm" className="h-[30px] gap-1.5" loading={fetch.isPending} onClick={() => fetch.mutate({ projectId })}>
            {!fetch.isPending && <RefreshCw className="size-3.5" />} Fetch
          </Button>
          <Button variant="outline" size="sm" className="h-[30px] gap-1.5" loading={pull.isPending} onClick={() => pull.mutate({ projectId })}>
            {!pull.isPending && <ArrowDown className="size-3.5" />} Pull
            {status.behind > 0 && <span className="rounded-xs bg-info-soft px-1.5 text-[0.6875rem] text-info">{status.behind}</span>}
          </Button>
        </>
      )}
      {can(PermissionKeys.GIT_PUSH) && (
        <Button variant="outline" size="sm" className="h-[30px] gap-1.5" loading={push.isPending} onClick={() => push.mutate({ projectId })}>
          {!push.isPending && <ArrowUp className="size-3.5" />} Push
          {status.ahead > 0 && <span className="rounded-xs bg-success-soft px-1.5 text-[0.6875rem] text-success">{status.ahead}</span>}
          {!status.upstream && status.branch && <span className="text-[0.6875rem] text-ash">(publish)</span>}
        </Button>
      )}

      <div className="ml-auto flex items-center gap-2">
        {canCommit && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="h-[30px] gap-1.5">
                <Archive className="size-3.5" /> Stash {stashes?.length ? `(${stashes.length})` : ""} <ChevronDown className="size-3" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuItem disabled={!dirty} onSelect={() => stash.mutate({ projectId, message: `Dev Station stash ${new Date().toLocaleString()}` })}>
              Stash all changes
            </DropdownMenuItem>
            {!!stashes?.length && <DropdownMenuSeparator />}
            {stashes?.map((s) => (
              <DropdownMenuItem key={s.ref} onSelect={() => stashPop.mutate({ projectId, ref: s.ref })} className="flex-col items-start gap-0">
                <span className="font-mono text-[0.6875rem] text-muted-foreground">Apply & drop {s.ref}</span>
                <span className="w-full truncate text-xs">{s.message}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        )}
        {canCommit && (
          <Button variant="destructive" size="sm" className="h-[30px] gap-1.5" disabled={!dirty} onClick={onDiscardAll}>
            <Trash2 className="size-3.5" /> Discard all
          </Button>
        )}
      </div>

      <CreateBranchDialog projectId={projectId} open={creating && canBranch} onOpenChange={setCreating} />
      <ConfirmationDialog
        isOpen={!!mergeTarget}
        onClose={() => setMergeTarget(null)}
        onConfirm={() => mergeTarget && merge.mutate({ projectId, branch: mergeTarget }, { onSettled: () => setMergeTarget(null) })}
        title={`Merge ${mergeTarget} into ${status.branch}?`}
        description="Creates a merge commit if needed. Conflicts must be resolved in your editor."
        confirmText="Merge"
        isLoading={merge.isPending}
      />
    </div>
  );
}
