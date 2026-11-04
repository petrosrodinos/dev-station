import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { Panel, PanelBody } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { useAbortOperation, useContinueOperation } from "@/features/git/hooks/use-git";
import { useGitIdentities } from "@/features/git-identities/hooks/use-git-identities";
import type { GitStatus } from "@shared/contract";

/** Shown while a merge/rebase is unfinished: conflicts left, continue once clean, or abort back to where you were. */
export function OperationBanner({ projectId, status }: { projectId: string; status: GitStatus }) {
  const [confirmAbort, setConfirmAbort] = useState(false);
  const cont = useContinueOperation();
  const abort = useAbortOperation();
  const { data: identities } = useGitIdentities();
  const identity = identities?.find((i) => i.is_default);
  const op = status.operation ?? "merge";
  const conflicts = status.counts.conflicted;
  const noun = op === "rebase" ? "Rebase" : "Merge";

  return (
    <Panel className="border-warning/60">
      <PanelBody className="flex flex-wrap items-center gap-2.5 py-3">
        <AlertTriangle className="size-4 shrink-0 text-warning" />
        <span className="mr-auto min-w-0 text-[0.8125rem]">
          {noun} in progress —{" "}
          {conflicts > 0 ? `${conflicts} file${conflicts === 1 ? " has" : "s have"} conflicts to resolve.` : "all conflicts resolved. Continue to finish."}
        </span>
        <Button variant="outline" size="sm" disabled={cont.isPending} loading={abort.isPending} onClick={() => setConfirmAbort(true)}>
          Abort {noun.toLowerCase()}
        </Button>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={conflicts > 0 || abort.isPending}
          loading={cont.isPending}
          onClick={() => cont.mutate({ projectId, name: identity?.name, email: identity?.email })}
        >
          {!cont.isPending && <Check className="size-3.5" />} {op === "rebase" ? "Continue rebase" : "Complete merge"}
        </Button>
      </PanelBody>
      <ConfirmationDialog
        isOpen={confirmAbort}
        onClose={() => setConfirmAbort(false)}
        onConfirm={() => abort.mutate({ projectId }, { onSettled: () => setConfirmAbort(false) })}
        title={`Abort ${noun.toLowerCase()}?`}
        description={`Discards the ${noun.toLowerCase()} and any conflict resolutions made so far, returning the branch to how it was before. Your commits are kept.`}
        confirmText={`Abort ${noun.toLowerCase()}`}
        variant="destructive"
        isLoading={abort.isPending}
      />
    </Panel>
  );
}
