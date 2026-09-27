import { useMemo, useState, type FC } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useFileSearch } from "@/features/files/hooks/use-files";
import { useGitStatus } from "@/features/git/hooks/use-git";
import { useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { GitFileState } from "@shared/contract";
import { useProjectContext } from "../../hooks/use-project-context";
import { FileTreeNode, FileRow } from "./components/file-tree";

/** Browse and hand off files (Spec §11). Editing happens in Cursor / VS Code, never here. */
const FilesTab: FC = () => {
  const project = useProjectContext();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250);
  const { data: results, isFetching } = useFileSearch(project.id, debounced);
  const { data: git } = useGitStatus(project.id);
  const { data: config } = useWorkspaceConfig();

  // Git paths are repo-relative; the tree is rooted at the project folder (monorepo sub_path).
  const gitStates = useMemo(() => {
    const prefix = project.sub_path ? `${project.sub_path.replace(/[\\/]+$/, "")}/` : "";
    const map = new Map<string, GitFileState>();
    for (const f of git?.files ?? []) if (f.path.startsWith(prefix)) map.set(f.path.slice(prefix.length), f.state);
    return map;
  }, [git, project.sub_path]);

  const searching = debounced.trim().length > 1;

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-3">
        <div className="relative w-80">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ash" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files…" className="h-8 pl-8" />
        </div>
        <span className="truncate font-mono text-xs text-ash" title={config?.project_paths[project.id]}>
          {config?.project_paths[project.id]}
        </span>
      </div>
      <Panel className="p-2">
        {searching ? (
          isFetching && !results ? (
            <ListSkeleton rows={6} />
          ) : !results?.length ? (
            <EmptyState title="No files match" description={`Nothing matched “${debounced}”.`} />
          ) : (
            results.map((entry) => <FileRow key={entry.path} projectId={project.id} entry={entry} depth={0} gitState={gitStates.get(entry.path)} showPath />)
          )
        ) : (
          <FileTreeNode projectId={project.id} dir="" depth={0} gitStates={gitStates} />
        )}
      </Panel>
    </div>
  );
};

export default FilesTab;
