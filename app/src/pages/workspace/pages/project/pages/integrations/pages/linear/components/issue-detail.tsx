import { Bot, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useGetLinearIssue } from "@/features/integrations/hooks/use-integrations";
import { openUrl } from "@/features/local-workspace/services/local-workspace.services";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { getLinearPriorityLabel } from "@/config/constants/dropdowns/integrations/linear-priority.options";
import { useDialogsStore } from "@/stores/dialogs";
import { formatRelative } from "@/lib/date";

export function IssueDetail({ project, issueId }: { project: Project; issueId: string }) {
  const { data: issue, isPending, isError, error } = useGetLinearIssue(project.linear_connection_id, issueId);
  const openNewSession = useDialogsStore((s) => s.openNewSession);
  const { can } = usePermissions();

  if (isPending) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }
  if (isError || !issue) return <EmptyState title="Could not load the issue" description={error?.message} />;

  return (
    <div className="p-4">
      <div className="text-base font-medium leading-snug">{issue.title}</div>
      <div className="mt-1 flex items-center gap-2 font-mono text-xs text-muted-foreground">
        {issue.identifier}
        {issue.url && (
          <button onClick={() => void openUrl(issue.url!)} className="inline-flex items-center gap-1 font-sans hover:text-foreground">
            <ExternalLink className="size-3" /> Open in Linear
          </button>
        )}
      </div>

      <div className="my-4 grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-[0.7813rem]">
        <span className="text-muted-foreground">Status</span>
        <span>{issue.state?.name ?? "—"}</span>
        <span className="text-muted-foreground">Priority</span>
        <span>{issue.priority_label ?? getLinearPriorityLabel(issue.priority)}</span>
        <span className="text-muted-foreground">Assignee</span>
        <span>{issue.assignee?.name ?? "Unassigned"}</span>
        <span className="text-muted-foreground">Team</span>
        <span>{issue.team ? `${issue.team.name} (${issue.team.key})` : "—"}</span>
        {issue.project && (
          <>
            <span className="text-muted-foreground">Project</span>
            <span>{issue.project.name}</span>
          </>
        )}
        <span className="text-muted-foreground">Labels</span>
        <span className="flex flex-wrap gap-1.5">
          {issue.labels.length
            ? issue.labels.map((l) => (
                <span key={l.id} className="inline-flex h-5 items-center gap-1 rounded-xs bg-surface-elevated px-2 text-[0.7188rem]">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: l.color ?? "#6a6b6c" }} />
                  {l.name}
                </span>
              ))
            : "—"}
        </span>
      </div>

      {can(PermissionKeys.AI_START_AGENTS) && (
        <Button className="mb-4 w-full gap-2" onClick={() => openNewSession({ project_id: project.id, issue })}>
          <Bot className="size-4" /> Work on issue with AI
        </Button>
      )}

      <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border bg-surface-elevated p-3 text-[0.8125rem] leading-relaxed text-body">
        {issue.description?.trim() || <span className="text-ash">No description.</span>}
      </div>

      {!!issue.comments?.length && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-medium uppercase tracking-[0.4px] text-muted-foreground">Comments</div>
          {issue.comments.map((c) => (
            <div key={c.id} className="rounded-md border p-2.5 text-[0.7813rem]">
              <div className="mb-1 flex justify-between text-[0.7188rem] text-muted-foreground">
                <span>{c.user?.name ?? "Someone"}</span>
                <span>{formatRelative(c.created_at)}</span>
              </div>
              <div className="whitespace-pre-wrap text-body">{c.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
