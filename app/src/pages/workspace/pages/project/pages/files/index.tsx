import { useMemo, useState, type FC } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronsDownUp, ChevronsUpDown, Code2, FilePlus, FolderPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useFileSearch } from "@/features/files/hooks/use-files";
import { useGitStatus } from "@/features/git/hooks/use-git";
import { useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { FileEntry, GitFileState } from "@shared/contract";
import { useProjectContext } from "../../hooks/use-project-context";
import { FileTreeNode, FileRow, TreeActionsContext, TreeCommandContext, type CreateKind, type TreeActions, type TreeCommand } from "./components/file-tree";
import { EntryDialogs, type EntryDialogState } from "./components/entry-dialogs";
import { CodeEditor } from "./components/code-editor";

const TreeAction: FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" onClick={onClick} aria-label={label}>
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

const isWithin = (path: string, parent: string) => path === parent || path.startsWith(`${parent}/`);

/** Browse, search, and edit project files in place; hand off to Cursor / VS Code for anything heavier (Spec §11). */
const FilesTab: FC = () => {
  const project = useProjectContext();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250);
  const { data: results, isFetching } = useFileSearch(project.id, debounced);
  const { data: git } = useGitStatus(project.id);
  const { data: config } = useWorkspaceConfig();
  const [command, setCommand] = useState<TreeCommand>({ id: 0, open: false });
  const sendCommand = (open: boolean) => setCommand((c) => ({ id: c.id + 1, open }));
  const [dialog, setDialog] = useState<EntryDialogState>(null);
  const activeFile = params.get("file");
  const selectFile = (path: string) => setParams((p) => (p.set("file", path), p), { replace: true });
  const clearFile = () => setParams((p) => (p.delete("file"), p), { replace: true });

  const actions = useMemo<TreeActions>(
    () => ({
      onCreate: (dir: string, kind: CreateKind) => setDialog({ type: "create", dir, kind }),
      onRename: (entry: FileEntry) => setDialog({ type: "rename", entry }),
      onDelete: (entry: FileEntry) => setDialog({ type: "delete", entry }),
    }),
    [],
  );

  // Git paths are repo-relative; the tree is rooted at the project folder (monorepo sub_path).
  const gitStates = useMemo(() => {
    const prefix = project.sub_path ? `${project.sub_path.replace(/[\\/]+$/, "")}/` : "";
    const map = new Map<string, GitFileState>();
    for (const f of git?.files ?? []) if (f.path.startsWith(prefix)) map.set(f.path.slice(prefix.length), f.state);
    return map;
  }, [git, project.sub_path]);

  const searching = debounced.trim().length > 1;

  return (
    <TreeActionsContext.Provider value={actions}>
      <div className="space-y-3 p-4">
        <div className="sticky top-0 z-10 -mx-4 -mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 bg-background px-4 py-3">
          <div className="relative w-full max-w-80 min-w-0 flex-1 sm:flex-none sm:basis-80">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ash" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files…" className="h-8 pl-8" />
          </div>
          <span className="truncate font-mono text-xs text-ash" title={config?.project_paths[project.id]}>
            {config?.project_paths[project.id]}
          </span>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 @5xl:grid-cols-[minmax(280px,1fr)_2fr]">
          <Panel className="p-2">
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
              <TreeCommandContext.Provider value={command}>
                <div className="mb-1 flex justify-end gap-0.5 border-b pb-1">
                  <TreeAction label="New file" onClick={() => actions.onCreate("", "file")}>
                    <FilePlus className="size-3.5" />
                  </TreeAction>
                  <TreeAction label="New folder" onClick={() => actions.onCreate("", "folder")}>
                    <FolderPlus className="size-3.5" />
                  </TreeAction>
                  <TreeAction label="Expand all (skips node_modules, .git, build output)" onClick={() => sendCommand(true)}>
                    <ChevronsUpDown className="size-3.5" />
                  </TreeAction>
                  <TreeAction label="Collapse all" onClick={() => sendCommand(false)}>
                    <ChevronsDownUp className="size-3.5" />
                  </TreeAction>
                </div>
                <FileTreeNode projectId={project.id} dir="" depth={0} gitStates={gitStates} activePath={activeFile} onSelect={selectFile} />
              </TreeCommandContext.Provider>
            )}
          </Panel>

          <Panel className="sticky top-16 flex h-[calc(100vh-9rem)] min-w-0 flex-col overflow-hidden">
            <PanelHeader title={<><Code2 className="size-3.5 text-muted-foreground" /> {activeFile ? <span className="truncate font-mono text-xs font-normal text-muted-foreground">{activeFile}</span> : "Editor"}</>} />
            <PanelBody className="min-h-0 flex-1 p-0">
              {activeFile ? <CodeEditor key={activeFile} projectId={project.id} path={activeFile} /> : <EmptyState icon={<Code2 />} title="Select a file to view or edit it" />}
            </PanelBody>
          </Panel>
        </div>
      </div>

      <EntryDialogs
        projectId={project.id}
        state={dialog}
        onClose={() => setDialog(null)}
        onCreatedFile={selectFile}
        onRenamed={(from, to) => activeFile && isWithin(activeFile, from) && selectFile(to + activeFile.slice(from.length))}
        onDeleted={(path) => activeFile && isWithin(activeFile, path) && clearFile()}
      />
    </TreeActionsContext.Provider>
  );
};

export default FilesTab;
