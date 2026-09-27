import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useGetActivities } from "@/features/activities/hooks/use-activities";
import { formatTimelineTime } from "@/lib/date";
import { useWorkspaceStore } from "@/stores/workspace";

/** Project activity timeline (Spec §27): "09:45 Claude Code finished — awaiting review". */
export function ProjectActivityCard({ projectId }: { projectId: string }) {
  const { data, isPending } = useGetActivities({ project_id: projectId, limit: 12 });
  const openSessionTab = useWorkspaceStore((s) => s.openSessionTab);

  return (
    <Panel>
      <PanelHeader title="Recent activity" />
      <PanelBody className="py-1">
        {isPending ? (
          <ListSkeleton rows={5} withIcon={false} className="px-0" />
        ) : !data?.data.length ? (
          <div className="py-6 text-center text-[13px] text-ash">No activity yet</div>
        ) : (
          data.data.map((a) => (
            <button
              key={a.id}
              disabled={!a.agent_session_id}
              onClick={() => a.agent_session_id && openSessionTab(a.agent_session_id)}
              className="flex w-full gap-3 border-b border-hairline-soft py-1.5 text-left text-[12.5px] last:border-b-0 enabled:hover:text-foreground"
            >
              <span className="w-24 shrink-0 font-mono text-[11px] leading-5 text-ash">{formatTimelineTime(a.created_at)}</span>
              <span className="min-w-0 text-body">
                {a.message}
                {a.user?.full_name && <span className="text-ash"> · {a.user.full_name}</span>}
              </span>
            </button>
          ))
        )}
      </PanelBody>
    </Panel>
  );
}
