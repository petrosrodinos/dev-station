import { useEffect, useState, type FC } from "react";
import { Bot, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusDot } from "@/components/ui/status-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAgentSessions } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { AgentStatusFilterOptions, AgentStatusOptions } from "@/config/constants/dropdowns/agents/agent-status.options";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { agentStatusDot } from "@/lib/status";
import { formatDateTime, formatDuration } from "@/lib/date";
import { cn } from "@/lib/utils";
import { useRuntimeStore } from "@/stores/runtime";
import { useWorkspaceStore } from "@/stores/workspace";
import { useDialogsStore } from "@/stores/dialogs";
import type { AgentRuntimeStatus } from "@shared/contract";
import { useRowSelection } from "@/hooks/use-row-selection";
import { DeleteSessionsDialog } from "@/pages/workspace/components/session-context-menu";
import { useProjectContext } from "../../hooks/use-project-context";

/** Full session history for the project — find and reopen past sessions (Spec §13). */
const SessionsTab: FC = () => {
  const project = useProjectContext();
  const [status, setStatus] = useState<AgentRuntimeStatus | "all">("all");
  const [page, setPage] = useState(1);
  const { data, isPending } = useAgentSessions({ project_id: project.id, status: status === "all" ? undefined : status, page, limit: 25 });
  const runtimeAgents = useRuntimeStore((s) => s.agents);
  const openSessionTab = useWorkspaceStore((s) => s.openSessionTab);
  const openNewSession = useDialogsStore((s) => s.openNewSession);
  const { can } = usePermissions();
  const canDelete = can(PermissionKeys.AI_USE_AGENTS);
  const rows = data?.data ?? [];
  const { selected, allSelected, toggle, setAll, clear: clearSelection, onRowClick, onRowMouseDown } = useRowSelection(
    rows.map((r) => r.id),
    { enabled: canDelete },
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Selection is per visible page — drop it when the filter or page changes.
  useEffect(clearSelection, [status, page, clearSelection]);

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as AgentRuntimeStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AgentStatusFilterOptions.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {selected.size} selected
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>
              Clear
            </Button>
            <Button variant="destructive" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>
        )}
        {can(PermissionKeys.AI_START_AGENTS) && (
          <Button size="sm" className="ml-auto gap-1.5" onClick={() => openNewSession({ project_id: project.id })}>
            <Plus className="size-3.5" /> New session
          </Button>
        )}
      </div>

      <Panel className="overflow-x-auto">
        {isPending ? (
          <ListSkeleton rows={8} />
        ) : !data?.data.length ? (
          <EmptyState icon={<Bot />} title="No sessions" description="Sessions you start in this project are listed here, including finished ones." />
        ) : (
          <table className="w-full min-w-[44rem] text-[0.8125rem]">
            <thead>
              <tr className="border-b text-left text-[0.7188rem] uppercase tracking-[0.4px] text-muted-foreground">
                {canDelete && (
                  <th className="w-8 py-2 pl-4">
                    <Checkbox checked={allSelected} onCheckedChange={(v) => setAll(!!v)} aria-label="Select all sessions" />
                  </th>
                )}
                <th className={cn("py-2 font-medium", canDelete ? "px-2" : "px-4")}>Session</th>
                <th className="px-2 py-2 font-medium">Agent</th>
                <th className="px-2 py-2 font-medium">Issue</th>
                <th className="px-2 py-2 font-medium">Changes</th>
                <th className="px-2 py-2 font-medium">Commit</th>
                <th className="px-2 py-2 font-medium">Started</th>
                <th className="px-4 py-2 text-right font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const st = runtimeAgents[s.id]?.status ?? s.status;
                const isSelected = selected.has(s.id);
                return (
                  <tr
                    key={s.id}
                    onClick={(e) => onRowClick(e, s.id) || openSessionTab(s.id)}
                    onMouseDown={onRowMouseDown}
                    aria-selected={isSelected}
                    className={cn("cursor-pointer border-b border-hairline-soft last:border-b-0 hover:bg-surface-elevated", isSelected && "bg-accent hover:bg-accent")}
                  >
                    {canDelete && (
                      <td className="w-8 py-2 pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggle(s.id)} aria-label={`Select ${s.name}`} />
                      </td>
                    )}
                    <td className={cn("max-w-72 py-2", canDelete ? "px-2" : "px-4")}>
                      <div className="flex items-center gap-2">
                        <StatusDot status={agentStatusDot(st)} title={getDropdownOptionLabel(AgentStatusOptions, st)} />
                        <span className="truncate font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{getAgentTypeLabel(s.agent_type)}</td>
                    <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{s.issue_key ?? "—"}</td>
                    <td className="px-2 py-2 font-mono text-xs">
                      {s.files_changed ? (
                        <>
                          {s.files_changed}f <span className="text-success">+{s.additions}</span> <span className="text-danger">-{s.deletions}</span>
                        </>
                      ) : (
                        <span className="text-ash">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 font-mono text-xs text-info">{s.commit_sha?.slice(0, 7) ?? <span className="text-ash">—</span>}</td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{formatDateTime(s.started_at)}</td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">{formatDuration(s.started_at, s.ended_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      {data && data.pagination.total_pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          Page {data.pagination.page} of {data.pagination.total_pages}
          <Button variant="outline" size="sm" disabled={!data.pagination.has_prev} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={!data.pagination.has_next} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <DeleteSessionsDialog ids={[...selected]} open={confirmDelete} onOpenChange={setConfirmDelete} onDeleted={clearSelection} />
    </div>
  );
};

export default SessionsTab;
