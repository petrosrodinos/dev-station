import { useMemo, useState, type FC } from "react";
import { useSearchParams } from "react-router-dom";
import { Code2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useFileSearch } from "@/features/files/hooks/use-files";
import { useGitStatus } from "@/features/git/hooks/use-git";
import { useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { GitFileState } from "@shared/contract";
import { useProjectContext } from "../../hooks/use-project-context";
import { FileTreeNode, FileRow } from "./components/file-tree";
import { CodeEditor } from "./components/code-editor";

/** Browse, search, and edit project files in place; hand off to Cursor / VS Code for anything heavier (Spec §11). */
const FilesTab: FC = () => {
  const project = useProjectContext();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250);
  const { data: results, isFetching } = useFileSearch(project.id, debounced);
  const { data: git } = useGitStatus(project.id);
  const { data: config } = useWorkspaceConfig();
  const activeFile = params.get("file");
  const selectFile = (path: string) => setParams((p) => (p.set("file", path), p), { replace: true });

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

      <div className="grid grid-cols-1 items-start gap-4 2xl:grid-cols-[minmax(280px,1fr)_2fr]">
        <Panel className="max-h-[70vh] overflow-y-auto p-2">
          {searching ? (
            isFetching && !results ? (
              <ListSkeleton rows={6} />
            ) : !results?.length ? (
              <EmptyState title="No files match" description={`Nothing matched “${debounced}”.`} />
            ) : (
              results.map((entry) => (
                <FileRow key={entry.path} projectId={project.id} entry={entry} depth={0} gitState={gitStates.get(entry.path)} showPath active={activeFile === entry.path} onSelect={selectFile} />
              ))
            )
          ) : (
            <FileTreeNode projectId={project.id} dir="" depth={0} gitStates={gitStates} activePath={activeFile} onSelect={selectFile} />
          )}
        </Panel>

        <Panel className="flex min-h-[70vh] min-w-0 flex-col overflow-hidden">
          <PanelHeader title={<><Code2 className="size-3.5 text-muted-foreground" /> {activeFile ? <span className="truncate font-mono text-xs font-normal text-muted-foreground">{activeFile}</span> : "Editor"}</>} />
          <PanelBody className="min-h-0 flex-1 p-0">
            {activeFile ? <CodeEditor key={activeFile} projectId={project.id} path={activeFile} /> : <EmptyState icon={<Code2 />} title="Select a file to view or edit it" />}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
};

export default FilesTab;
