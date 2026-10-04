import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ArrowUp, Check, FileDiff, GitCommitHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { ShortcutKeys } from "@/components/ui/shortcut-keys";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGitCommit, useGitPush, useGitStatus } from "@/features/git/hooks/use-git";
import { useGitIdentities } from "@/features/git-identities/hooks/use-git-identities";
import { useMarkSessionReviewed } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { SessionReviewStates } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useProjectLocalState } from "@/features/local-workspace/hooks/use-local-workspace";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { useResolvedShortcuts } from "@/features/users/hooks/use-shortcuts";
import { ShortcutActions } from "@/config/constants/dropdowns/shared/shortcut-action.options";
import { ProjectTabs } from "@/config/constants/dropdowns/projects/project-tab.options";
import { commitSchema, type CommitFormData } from "@/pages/workspace/pages/project/validation-schemas/project.schema";
import { Routes } from "@/routes/routes";
import { ProjectLocalStates } from "@shared/contract";
import type { SessionItem } from "../hooks/use-open-sessions";

interface SessionReviewBarProps {
  item: SessionItem;
  project: Project;
  /** Ready sessions other than this one. */
  remaining: number;
  onNext: () => void;
}

/**
 * Review footer under the agent terminal: what changed, a one-line commit, push, and the jump to the
 * next session waiting for review. Shown whenever the project has uncommitted changes — including
 * while the agent is working, since its status flips between working and idle many times a turn —
 * and otherwise only once the session is ready for review or already reviewed.
 */
export function SessionReviewBar({ item, project, remaining, onNext }: SessionReviewBarProps) {
  const navigate = useNavigate();
  const localState = useProjectLocalState(project.id);
  const isLocal = localState === ProjectLocalStates.LOCAL;
  const { data: git } = useGitStatus(project.id);
  const commit = useGitCommit();
  const push = useGitPush();
  const markReviewed = useMarkSessionReviewed();
  const { data: identities } = useGitIdentities();
  const identity = identities?.find((i) => i.is_default);
  const nextCombo = useResolvedShortcuts().find((s) => s.id === ShortcutActions.GO_TO_FINISHED_SESSION)?.combo;
  const { can } = usePermissions();
  const [committedSha, setCommittedSha] = useState<string | null>(null);
  // Focus "Next" only right after the developer finished reviewing here, not when revisiting a reviewed session.
  const [justReviewed, setJustReviewed] = useState(false);
  const form = useForm<CommitFormData>({ resolver: zodResolver(commitSchema), defaultValues: { message: item.name } });

  const state = item.review_state;
  const files = git?.files ?? [];
  const done = !!committedSha || state === SessionReviewStates.REVIEWED || state === SessionReviewStates.COMMITTED;
  const reviewable = state === SessionReviewStates.READY || done;
  const working = state === SessionReviewStates.WORKING;
  const hasChanges = isLocal && files.length > 0;
  if (!hasChanges && (working || !reviewable)) return null;

  // In the review layout the Git tab opens in a drawer over the preview.
  const openDiff = () => navigate(Routes.workspace.project_tab(project.id, ProjectTabs.GIT));

  const submit = form.handleSubmit((data) =>
    commit.mutate(
      { projectId: project.id, message: data.message, name: identity?.name, email: identity?.email },
      {
        onSuccess: (result) => {
          setCommittedSha(result.sha);
          setJustReviewed(true);
          markReviewed.mutate({ id: item.id, commit_sha: result.sha });
        },
      },
    ),
  );

  const ahead = git?.ahead ?? 0;
  const pushButton =
    isLocal && ahead > 0 && can(PermissionKeys.GIT_PUSH) ? (
      <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 gap-1.5" loading={push.isPending} onClick={() => push.mutate({ projectId: project.id })}>
        {!push.isPending && <ArrowUp className="size-3.5" />} Push <span className="font-mono text-muted-foreground">{ahead}</span>
      </Button>
    ) : null;

  const nextButton = (autoFocus: boolean) =>
    remaining > 0 ? (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button size="sm" variant={done ? "default" : "ghost"} className="h-8 shrink-0 gap-1.5" onClick={onNext} autoFocus={autoFocus}>
              {done ? `Next review (${remaining})` : "Skip"} <ArrowRight className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent className="flex items-center gap-2">
          Next session to review {nextCombo && <ShortcutKeys combo={nextCombo} />}
        </TooltipContent>
      </Tooltip>
    ) : null;

  if (done && !hasChanges) {
    return (
      <div className="flex shrink-0 items-center gap-2 border-t bg-surface px-3 py-2 text-xs">
        <Check className="size-3.5 shrink-0 text-success" />
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {committedSha || state === SessionReviewStates.COMMITTED ? (
            <>
              Committed <span className="font-mono text-info">{(committedSha ?? item.session?.commit_sha ?? "").slice(0, 7)}</span>
            </>
          ) : (
            "Reviewed"
          )}
          {remaining === 0 && " · nothing else waiting for review"}
        </span>
        {pushButton}
        {nextButton(justReviewed)}
      </div>
    );
  }

  const canCommit = hasChanges && can(PermissionKeys.GIT_COMMIT);

  return (
    <div className="shrink-0 space-y-2 border-t bg-surface px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {hasChanges ? (
          <>
            <span>
              {files.length} file{files.length === 1 ? "" : "s"} changed{" "}
              <span className="font-mono">
                <span className="text-success">+{git?.totals.additions ?? 0}</span> <span className="text-danger">-{git?.totals.deletions ?? 0}</span>
              </span>
            </span>
            {can(PermissionKeys.GIT_VIEW_CHANGES) && (
              <button onClick={openDiff} className="inline-flex items-center gap-1 hover:text-foreground">
                <FileDiff className="size-3.5" /> Diff
              </button>
            )}
          </>
        ) : (
          <span>{isLocal ? "No uncommitted changes" : "Changes are tracked on the device that ran this session"}</span>
        )}
        <span className="ml-auto" />
        {state === SessionReviewStates.READY && (
          <button
            onClick={() => {
              setJustReviewed(true);
              markReviewed.mutate({ id: item.id });
            }}
            className="hover:text-foreground"
          >
            Mark reviewed
          </button>
        )}
      </div>
      {canCommit ? (
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="flex items-center gap-2"
          >
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="min-w-0 flex-1">
                  <FormControl>
                    <Input aria-label="Commit message" placeholder="Commit message" className="h-8 font-mono text-[0.7813rem]" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" size="sm" className="h-8 shrink-0 gap-1.5" loading={commit.isPending} disabled={!form.watch("message").trim()}>
              {!commit.isPending && <GitCommitHorizontal className="size-3.5" />} Commit
            </Button>
            {pushButton}
            {nextButton(false)}
          </form>
        </Form>
      ) : (
        (remaining > 0 || pushButton) && (
          <div className="flex justify-end gap-2">
            {pushButton}
            {nextButton(false)}
          </div>
        )
      )}
    </div>
  );
}
