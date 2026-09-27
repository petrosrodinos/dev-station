import { useMemo } from "react";
import { DiffViewer } from "@/components/ui/diff-viewer";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useFileDiff } from "@/features/git/hooks/use-git";
import { parseUnifiedDiff } from "@/lib/diff";

export function FileDiffPanel({ projectId, path }: { projectId: string; path: string }) {
  const { data, isPending, isError, error } = useFileDiff(projectId, path);
  const parsed = useMemo(() => (data !== undefined ? parseUnifiedDiff(data) : null), [data]);

  if (isPending) return <ListSkeleton rows={10} withIcon={false} />;
  if (isError) return <EmptyState title="Could not load the diff" description={error.message} />;
  if (!parsed) return null;
  if (parsed.binary) return <EmptyState title="Binary file" description="Binary changes can't be previewed." />;
  if (!parsed.lines.length) return <EmptyState title="No textual changes" description="Only file mode or whitespace changed." />;

  return (
    <div>
      <DiffViewer lines={parsed.lines} className="max-h-[60vh] rounded-none" />
      {parsed.truncated && <div className="border-t px-3 py-2 text-xs text-muted-foreground">Diff truncated — open the file in your editor to see everything.</div>}
    </div>
  );
}
