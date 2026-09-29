import { useState } from "react";
import { Bot, CheckCircle2, Copy, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import type { UpdateLinearIssueDto } from "@/features/integrations/interfaces/integrations.interfaces";
import {
  useGetLinearIssue,
  useGetLinearTeamMembers,
  useGetLinearTeamStates,
  useUpdateLinearIssue,
} from "@/features/integrations/hooks/use-integrations";
import { openUrl } from "@/features/local-workspace/services/local-workspace.services";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { LinearPriorityOptions } from "@/config/constants/dropdowns/integrations/linear-priority.options";
import { useDialogsStore } from "@/stores/dialogs";
import { formatRelative } from "@/lib/date";
import { toast } from "@/hooks/use-toast";

const UNASSIGNED = "none";
const COMPLETED_STATE_TYPE = "completed";

async function copyText(label: string, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} copied`, duration: 1500 });
  } catch {
    toast({ title: `Could not copy ${label.toLowerCase()}`, variant: "error" });
  }
}

export function IssueDetail({ project, issueId }: { project: Project; issueId: string }) {
  const { data: issue, isPending, isError, error } = useGetLinearIssue(project.linear_connection_id, issueId);
  const openNewSession = useDialogsStore((s) => s.openNewSession);
  const { can } = usePermissions();
  const canEdit = can(PermissionKeys.PROJECTS_EDIT);
  const teamId = issue?.team?.id;
  const { data: states } = useGetLinearTeamStates(project.linear_connection_id, teamId);
  const { data: members } = useGetLinearTeamMembers(project.linear_connection_id, teamId);
  const update = useUpdateLinearIssue();
  const [editing, setEditing] = useState<"title" | "description" | null>(null);
  const [draft, setDraft] = useState("");

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

  const save = (dto: UpdateLinearIssueDto, onSuccess?: () => void) =>
    update.mutate({ connectionId: project.linear_connection_id!, issueId: issue.id, ...dto }, { onSuccess });
  const startEdit = (kind: "title" | "description") => {
    setDraft(kind === "title" ? issue.title : (issue.description ?? ""));
    setEditing(kind);
  };
  const doneState = states?.find((st) => st.type === COMPLETED_STATE_TYPE);

  return (
    <div className="p-4">
      {editing === "title" ? (
        <div className="flex gap-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus className="h-8" aria-label="Issue title" />
          <Button size="sm" loading={update.isPending} disabled={!draft.trim()} onClick={() => save({ title: draft }, () => setEditing(null))}>
            Save
          </Button>
          <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => setEditing(null)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1 text-base font-medium leading-snug">{issue.title}</div>
          <Button variant="ghost" size="icon" className="size-6 shrink-0 text-muted-foreground" aria-label="Copy title" onClick={() => void copyText("Title", issue.title)}>
            <Copy className="size-3.5" />
          </Button>
          {canEdit && (
            <Button variant="ghost" size="icon" className="size-6 shrink-0 text-muted-foreground" aria-label="Edit title" onClick={() => startEdit("title")}>
              <Pencil className="size-3.5" />
            </Button>
          )}
        </div>
      )}
      <div className="mt-1 flex items-center gap-2 font-mono text-xs text-muted-foreground">
        {issue.identifier}
        {issue.url && (
          <button onClick={() => void openUrl(issue.url!)} className="inline-flex items-center gap-1 font-sans hover:text-foreground">
            <ExternalLink className="size-3" /> Open in Linear
          </button>
        )}
        {issue.url && (
          <button onClick={() => void copyText("Link", issue.url!)} className="inline-flex items-center gap-1 font-sans hover:text-foreground">
            <Copy className="size-3" /> Copy link
          </button>
        )}
      </div>

      <div className="my-4 grid grid-cols-[100px_1fr] items-center gap-x-3 gap-y-2 text-[0.7813rem]">
        <span className="text-muted-foreground">Status</span>
        {canEdit && states?.length ? (
          <Select value={issue.state?.id} onValueChange={(v) => save({ state_id: v ?? undefined })} disabled={update.isPending}>
            <SelectTrigger aria-label="Status" className="h-7 text-[0.7813rem]">
              <SelectValue placeholder="Set status" />
            </SelectTrigger>
            <SelectContent>
              {states.map((st) => (
                <SelectItem key={st.id} value={st.id}>
                  <span className="inline-flex items-center gap-2">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: st.color ?? "#6a6b6c" }} />
                    {st.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span>{issue.state?.name ?? "—"}</span>
        )}
        <span className="text-muted-foreground">Priority</span>
        {canEdit ? (
          <Select value={String(issue.priority ?? 0)} onValueChange={(v) => save({ priority: Number(v) })} disabled={update.isPending}>
            <SelectTrigger aria-label="Priority" className="h-7 text-[0.7813rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LinearPriorityOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span>{issue.priority_label}</span>
        )}
        <span className="text-muted-foreground">Assignee</span>
        {canEdit && members ? (
          <Select value={issue.assignee?.id ?? UNASSIGNED} onValueChange={(v) => save({ assignee_id: v === UNASSIGNED ? null : v })} disabled={update.isPending}>
            <SelectTrigger aria-label="Assignee" className="h-7 text-[0.7813rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span>{issue.assignee?.name ?? "Unassigned"}</span>
        )}
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

      {canEdit && doneState && issue.state?.type !== COMPLETED_STATE_TYPE && (
        <Button variant="outline" className="mb-2 w-full gap-2" loading={update.isPending} onClick={() => save({ state_id: doneState.id })}>
          <CheckCircle2 className="size-4" /> Mark as {doneState.name}
        </Button>
      )}

      {can(PermissionKeys.AI_START_AGENTS) && (
        <Button className="mb-4 w-full gap-2" onClick={() => openNewSession({ project_id: project.id, issue })}>
          <Bot className="size-4" /> Work on issue with AI
        </Button>
      )}

      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-[0.4px] text-muted-foreground">Description</div>
        {editing !== "description" && (
          <div className="flex gap-1">
            {!!issue.description?.trim() && (
              <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs text-muted-foreground" onClick={() => void copyText("Description", issue.description!)}>
                <Copy className="size-3" /> Copy
              </Button>
            )}
            {canEdit && (
              <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs text-muted-foreground" onClick={() => startEdit("description")}>
                <Pencil className="size-3" /> Edit
              </Button>
            )}
          </div>
        )}
      </div>
      {editing === "description" ? (
        <div className="space-y-2">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus rows={10} className="text-[0.8125rem]" aria-label="Issue description" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="sm" loading={update.isPending} onClick={() => save({ description: draft }, () => setEditing(null))}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border bg-surface-elevated p-3 text-[0.8125rem] leading-relaxed text-body">
          {issue.description?.trim() || <span className="text-ash">No description.</span>}
        </div>
      )}

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
