import { useState, type FC } from "react";
import { useSearchParams } from "react-router-dom";
import { ListChecks, Search, Settings2 } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useGetLinearIssues } from "@/features/integrations/hooks/use-integrations";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { useProjectContext } from "../../../../hooks/use-project-context";
import { LinearSettingsCard } from "./components/linear-settings-card";
import { IssueDetail } from "./components/issue-detail";
import { PriorityIcon } from "./components/priority-icon";

/** Linear issues for the project (Spec §16) with the "Work on issue with AI" hand-off (Spec §17). */
const LinearTab: FC = () => {
  const project = useProjectContext();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const debounced = useDebouncedValue(search, 350);
  const selectedId = params.get("issue");
  const { data: issues, isPending, isError, error, isFetching } = useGetLinearIssues(project.linear_connection_id, {
    team_id: project.linear_team_id,
    project_id: project.linear_project_id,
    search: debounced || undefined,
    include_completed: includeCompleted,
  });

  if (!project.linear_connection_id || configuring) {
    return (
      <div className="p-4">
        <LinearSettingsCard project={project} onDone={() => setConfiguring(false)} />
      </div>
    );
  }

  const select = (id: string) => setParams((p) => (p.set("issue", id), p), { replace: true });

  return (
    <div className="grid grid-cols-1 items-start gap-4 p-4 2xl:grid-cols-[1.1fr_1fr]">
      <Panel className="overflow-hidden">
        <PanelHeader
          title={
            <>
              Issues {issues && <span className="text-muted-foreground">({issues.length})</span>}
            </>
          }
          actions={
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => setConfiguring(true)}>
              <Settings2 className="size-3.5" /> Linear settings
            </Button>
          }
        />
        <div className="flex items-center gap-3 border-b px-3 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ash" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search issues…" className={cn("h-8 pl-8", isFetching && "opacity-80")} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="include-completed" checked={includeCompleted} onCheckedChange={setIncludeCompleted} />
            <Label htmlFor="include-completed" className="text-xs font-normal text-muted-foreground">
              Include done
            </Label>
          </div>
        </div>
        <div className="max-h-[65vh] overflow-y-auto">
          {isPending ? (
            <ListSkeleton rows={8} />
          ) : isError ? (
            <EmptyState title="Could not load Linear issues" description={error.message} />
          ) : !issues?.length ? (
            <EmptyState icon={<ListChecks />} title="No issues" description="Nothing matches the current filters." />
          ) : (
            issues.map((issue) => (
              <button
                key={issue.id}
                onClick={() => select(issue.id)}
                className={cn("flex w-full items-center gap-2 border-b border-hairline-soft px-3 py-2.5 text-left last:border-b-0 hover:bg-surface-elevated", selectedId === issue.id && "bg-surface-elevated")}
              >
                <span className="w-[70px] shrink-0 font-mono text-xs text-muted-foreground">{issue.identifier}</span>
                <PriorityIcon priority={issue.priority} />
                <span className="min-w-0 flex-1 truncate text-[0.8125rem]">{issue.title}</span>
                {issue.assignee && <span className="hidden shrink-0 text-[0.7188rem] text-ash xl:inline">{issue.assignee.name}</span>}
                {issue.state && (
                  <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-xs bg-surface-elevated px-2 text-[0.7188rem] text-body">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: issue.state.color ?? "#6a6b6c" }} />
                    {issue.state.name}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </Panel>

      <Panel className="min-w-0">
        {selectedId ? (
          <IssueDetail project={project} issueId={selectedId} />
        ) : (
          <EmptyState icon={<ListChecks />} title="Select an issue to view details" className="py-16" />
        )}
      </Panel>
    </div>
  );
};

export default LinearTab;
