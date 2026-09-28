import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useGetLinearIssues } from "@/features/integrations/hooks/use-integrations";
import { ProjectIntegrations } from "@/config/constants/dropdowns/projects/project-integration.options";
import { getLinearPriorityLabel } from "@/config/constants/dropdowns/integrations/linear-priority.options";
import { Routes } from "@/routes/routes";

export function LinearSummaryCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const connected = !!project.linear_connection_id;
  const { data: issues, isPending, isError } = useGetLinearIssues(project.linear_connection_id, {
    team_id: project.linear_team_id,
    project_id: project.linear_project_id,
  });

  return (
    <Panel>
      <PanelHeader
        title={
          <>
            Linear {connected && issues && <span className="text-muted-foreground">({issues.length} open)</span>}
          </>
        }
        actions={
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => navigate(Routes.workspace.project_integration(project.id, ProjectIntegrations.LINEAR))}>
            {connected ? "Open" : "Set up"} <ChevronRight className="size-3.5" />
          </Button>
        }
      />
      <PanelBody className="py-1">
        {!connected ? (
          <div className="py-6 text-center text-[13px] text-ash">Linear isn't linked to this project.</div>
        ) : isPending ? (
          <ListSkeleton rows={4} withIcon={false} className="px-0" />
        ) : isError ? (
          <div className="py-6 text-center text-[13px] text-danger">Could not load issues.</div>
        ) : !issues?.length ? (
          <div className="py-6 text-center text-[13px] text-ash">No open issues.</div>
        ) : (
          issues.slice(0, 5).map((issue) => (
            <button
              key={issue.id}
              onClick={() => navigate(Routes.workspace.project_linear_issue(project.id, issue.id))}
              className="flex w-full items-center gap-2 border-b border-hairline-soft py-2 text-left last:border-b-0"
            >
              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{issue.identifier}</span>
              <span className="flex-1 truncate text-[13px]">{issue.title}</span>
              <span className="shrink-0 text-[11px] text-ash">{getLinearPriorityLabel(issue.priority)}</span>
            </button>
          ))
        )}
      </PanelBody>
    </Panel>
  );
}
