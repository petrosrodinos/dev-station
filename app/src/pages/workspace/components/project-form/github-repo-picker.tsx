import { useState } from "react";
import { Lock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useGetGithubRepositories } from "@/features/integrations/hooks/use-integrations";
import type { GithubRepository } from "@/features/integrations/interfaces/integrations.interfaces";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatRelative } from "@/lib/date";
import { cn } from "@/lib/utils";

interface GithubRepoPickerProps {
  connectionId: string | null;
  selected?: string;
  onSelect: (repo: GithubRepository) => void;
}

/** Searchable list of repositories from a connected GitHub account (via Composio). */
export function GithubRepoPicker({ connectionId, selected, onSelect }: GithubRepoPickerProps) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const { data, isPending, isError, error } = useGetGithubRepositories(connectionId, debounced);

  return (
    <div className="rounded-md border">
      <div className="relative border-b">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ash" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search repositories…" className="border-0 pl-8 shadow-none focus-visible:ring-0" />
      </div>
      <div className="max-h-56 overflow-y-auto">
        {!connectionId ? (
          <EmptyState title="Choose a GitHub account" className="py-6" />
        ) : isPending ? (
          <ListSkeleton rows={5} />
        ) : isError ? (
          <EmptyState title="Could not load repositories" description={error.message} className="py-6" />
        ) : !data?.length ? (
          <EmptyState title="No repositories found" className="py-6" />
        ) : (
          data.map((repo) => (
            <button
              type="button"
              key={repo.id}
              onClick={() => onSelect(repo)}
              className={cn("flex w-full items-center gap-2 border-b border-hairline-soft px-3 py-2 text-left last:border-b-0 hover:bg-surface-elevated", selected === repo.full_name && "bg-surface-card")}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate font-mono text-[12.5px]">
                  {repo.full_name}
                  {repo.private && <Lock className="size-3 text-ash" />}
                </div>
                {repo.description && <div className="truncate text-[11.5px] text-muted-foreground">{repo.description}</div>}
              </div>
              {repo.updated_at && <span className="shrink-0 text-[11px] text-ash">{formatRelative(repo.updated_at)}</span>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
