import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useConflictFile, useResolveConflict, useTakeConflictSide } from "@/features/git/hooks/use-git";
import { countConflicts, parseConflicts, resolveBlock, type ConflictChoice, type ConflictSegment } from "@/lib/merge-conflicts";
import { cn } from "@/lib/utils";

const CONTEXT_LINES = 3;

/** Unchanged text between conflicts, collapsed to a few lines of context around each block. */
function ContextText({ text, first, last }: { text: string; first: boolean; last: boolean }) {
  const lines = text.replace(/\n$/, "").split("\n");
  const keepHead = first ? 0 : CONTEXT_LINES;
  const keepTail = last ? 0 : CONTEXT_LINES;
  const collapsed = lines.length > keepHead + keepTail + 1;
  const shown = collapsed ? [...lines.slice(0, keepHead), null, ...lines.slice(lines.length - keepTail)] : lines;
  return (
    <div className="text-muted-foreground">
      {shown.map((l, i) =>
        l === null ? (
          <div key={i} className="select-none px-3 py-0.5 text-center text-xs text-ash">
            ⋯ {lines.length - keepHead - keepTail} unchanged lines ⋯
          </div>
        ) : (
          <div key={i} className="whitespace-pre px-3">
            {l || " "}
          </div>
        ),
      )}
    </div>
  );
}

function Side({ label, text, tone }: { label: string; text: string; tone: "current" | "incoming" }) {
  return (
    <div className={cn("min-w-0 border-l-2", tone === "current" ? "border-success bg-success/[0.08]" : "border-info bg-info/[0.08]")}>
      <div className={cn("px-3 py-0.5 text-[0.6875rem] font-semibold", tone === "current" ? "text-success" : "text-info")}>
        {tone === "current" ? "Current change" : "Incoming change"} · <span className="font-mono font-normal">{label}</span>
      </div>
      {text ? (
        <div className="overflow-x-auto">
          {text.replace(/\n$/, "").split("\n").map((l, i) => (
            <div key={i} className="whitespace-pre px-3">
              {l || " "}
            </div>
          ))}
        </div>
      ) : (
        <div className="px-3 pb-1 text-xs italic text-ash">(empty)</div>
      )}
    </div>
  );
}

/** Block-by-block conflict resolution, like VS Code's merge editor: accept current, incoming, or both. */
export function ConflictResolver({ projectId, path }: { projectId: string; path: string }) {
  const { data, isPending, isError, error } = useConflictFile(projectId, path);
  const resolve = useResolveConflict();
  const take = useTakeConflictSide();
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    setContent(data && !data.binary && !data.too_large ? data.content : null);
  }, [data, path]);

  const segments = useMemo<ConflictSegment[]>(() => (content === null ? [] : parseConflicts(content)), [content]);
  const remaining = countConflicts(segments);

  if (isPending) return <ListSkeleton rows={8} withIcon={false} />;
  if (isError) return <EmptyState title="Could not load the conflict" description={error.message} />;

  const takeWholeFile = (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" loading={take.isPending} onClick={() => take.mutate({ projectId, path, side: "current" })}>
        Accept current file
      </Button>
      <Button size="sm" variant="outline" loading={take.isPending} onClick={() => take.mutate({ projectId, path, side: "incoming" })}>
        Accept incoming file
      </Button>
    </div>
  );

  if (data.binary || data.too_large || content === null) {
    return (
      <div className="space-y-3 p-4">
        <p className="text-[0.8125rem] text-muted-foreground">
          {data.too_large
            ? "This file is too large to merge here."
            : "This file can't be merged line by line (binary, or deleted on one side)."}{" "}
          Choose which version to keep.
        </p>
        {takeWholeFile}
      </div>
    );
  }

  const apply = (index: number, choice: ConflictChoice) => setContent(resolveBlock(segments, index, choice));
  const lastText = segments.length - 1;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <span className="mr-auto text-xs text-muted-foreground">{remaining === 0 ? "All conflicts resolved in this file" : `${remaining} conflict${remaining === 1 ? "" : "s"} remaining`}</span>
        {remaining > 0 && takeWholeFile}
        <Button size="sm" className="gap-1.5" disabled={remaining > 0} loading={resolve.isPending} onClick={() => resolve.mutate({ projectId, path, content })}>
          {!resolve.isPending && <Check className="size-3.5" />} Mark as resolved
        </Button>
      </div>
      <div className="max-h-[60vh] overflow-auto bg-canvas py-1 font-mono text-[0.7813rem] leading-[1.65]">
        <div className="min-w-fit">
          {segments.map((s, i) =>
            s.type === "text" ? (
              <ContextText key={i} text={s.text} first={i === 0} last={i === lastText} />
            ) : (
              <div key={i} className="my-2 border-y border-hairline-soft">
                <div className="flex flex-wrap items-center gap-1 bg-surface px-2 py-1 font-sans">
                  <span className="mr-auto text-[0.6875rem] text-muted-foreground">
                    Conflict {s.index + 1}
                  </span>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => apply(s.index, "current")}>
                    Accept current
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => apply(s.index, "incoming")}>
                    Accept incoming
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => apply(s.index, "both")}>
                    Accept both
                  </Button>
                </div>
                <Side label={s.currentLabel} text={s.current} tone="current" />
                <Side label={s.incomingLabel} text={s.incoming} tone="incoming" />
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
