import { History } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useGitLog } from "@/features/git/hooks/use-git";

export function RecentCommits({ projectId }: { projectId: string }) {
  const { data, isPending } = useGitLog(projectId);

  return (
    <Panel>
      <PanelHeader
        title={
          <>
            <History className="size-3.5 text-muted-foreground" /> Recent commits
          </>
        }
      />
      {isPending ? (
        <ListSkeleton rows={4} withIcon={false} />
      ) : !data?.length ? (
        <div className="py-6 text-center text-[0.8125rem] text-ash">No commits yet</div>
      ) : (
        data.map((c) => (
          <div key={c.sha} className="flex items-center gap-3 border-b border-hairline-soft px-4 py-2 text-[0.8125rem] last:border-b-0">
            <span className="shrink-0 font-mono text-xs text-info">{c.short_sha}</span>
            <span className="min-w-0 flex-1 truncate">{c.subject}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{c.author}</span>
            <span className="w-24 shrink-0 text-right text-xs text-ash">{c.relative_date}</span>
          </div>
        ))
      )}
    </Panel>
  );
}
