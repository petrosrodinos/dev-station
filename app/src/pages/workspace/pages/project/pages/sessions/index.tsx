import { useState, type FC } from "react";
import { Bot, Plus } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
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
import { useRuntimeStore } from "@/stores/runtime";
import { useWorkspaceStore } from "@/stores/workspace";
import { useDialogsStore } from "@/stores/dialogs";
import type { AgentRuntimeStatus } from "@shared/contract";
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
                <th className="px-4 py-2 font-medium">Session</th>
                <th className="px-2 py-2 font-medium">Agent</th>
                <th className="px-2 py-2 font-medium">Issue</th>
                <th className="px-2 py-2 font-medium">Changes</th>
                <th className="px-2 py-2 font-medium">Commit</th>
                <th className="px-2 py-2 font-medium">Started</th>
                <th className="px-4 py-2 text-right font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((s) => {
                const st = runtimeAgents[s.id]?.status ?? s.status;
                return (
                  <tr key={s.id} onClick={() => openSessionTab(s.id)} className="cursor-pointer border-b border-hairline-soft last:border-b-0 hover:bg-surface-elevated">
                    <td className="max-w-72 px-4 py-2">
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
    </div>
  );
};

export default SessionsTab;
