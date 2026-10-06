import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronsDownUp, ChevronsUpDown, Code2, FilePlus, Folder, FolderPlus, MoreHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useFileSearch, useImportFiles, useMoveEntry } from "@/features/files/hooks/use-files";
import { useGitStatus } from "@/features/git/hooks/use-git";
import { useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { DEFAULT_FILES_TREE_WIDTH, useWorkspaceStore, type OpenFileTab } from "@/stores/workspace";
import { previewTypeFor, type FileEntry, type GitFileState } from "@shared/contract";
import { useProjectContext } from "../../hooks/use-project-context";
import { FileTreeNode, FileRow } from "./components/file-tree";
import { TreeActionsContext, TreeCommandContext, type CreateKind, type TreeActions, type TreeCommand } from "./components/tree-context";
import { useTreeDropTarget } from "./hooks/use-tree-drop-target";
import { EntryDialogs, type EntryDialogState } from "./components/entry-dialogs";
import { CodeEditor } from "./components/code-editor";
import { BinaryPreview } from "./components/binary-preview";
import { EditorTabs } from "./components/editor-tabs";
import { closeFileTab, isWithin, moveFileTab, openFileTab, remapFileTabs } from "./utils/file-tabs.utils";

/** Grid padding and the handle between the tree and the editor (the grid is `p-4` with a 1rem handle column at `@5xl`). */
const GRID_PADDING = 16;
const HANDLE_WIDTH = 16;
const MIN_TREE_WIDTH = 220;
const MIN_EDITOR_WIDTH = 360;
const KEYBOARD_RESIZE_STEP = 16;
const NO_TABS: OpenFileTab[] = [];

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
  const showFile = (path: string) => setParams((p) => (p.set("file", path), p), { replace: true });
  const clearFile = () => setParams((p) => (p.delete("file"), p), { replace: true });

  const openTabs = useWorkspaceStore((s) => s.open_file_tabs[project.id]) ?? NO_TABS;
  const currentTabs = () => useWorkspaceStore.getState().open_file_tabs[project.id] ?? NO_TABS;
  const updateTabs = (update: (tabs: OpenFileTab[]) => OpenFileTab[]) => {
    const current = currentTabs();
    const next = update(current);
    if (next !== current) useWorkspaceStore.getState().setOpenFileTabs(project.id, next);
  };
  // A single click previews the file in the unpinned slot; the file itself is always shown via the URL.
  const selectFile = (path: string) => {
    updateTabs((tabs) => openFileTab(tabs, path, false));
    showFile(path);
  };
  const pinFile = (path: string) => {
    updateTabs((tabs) => openFileTab(tabs, path, true));
    showFile(path);
  };
  const closeTab = (path: string) => {
    const tabs = currentTabs();
    const index = tabs.findIndex((t) => t.path === path);
    const next = closeFileTab(tabs, path);
    updateTabs(() => next);
    // Like VS Code: closing the shown file shows the tab that took its place, or the one before it.
    if (activeFile === path) {
      const neighbor = next[Math.min(index, next.length - 1)];
      if (neighbor) showFile(neighbor.path);
      else clearFile();
    }
  };
  // Files opened by link or history (not by clicking the tree) still get a tab.
  useEffect(() => {
    if (activeFile) updateTabs((tabs) => openFileTab(tabs, activeFile, false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, project.id]);

  const moveEntry = useMoveEntry();
  const importFiles = useImportFiles();
  const activeRef = useRef(activeFile);
  activeRef.current = activeFile;

  const actions = useMemo<TreeActions>(
    () => ({
      onCreate: (dir: string, kind: CreateKind) => setDialog({ type: "create", dir, kind }),
      onRename: (entry: FileEntry) => setDialog({ type: "rename", entry }),
      onDelete: (entry: FileEntry) => setDialog({ type: "delete", entry }),
      onPin: pinFile,
      onMove: (path: string, destDir: string) =>
        moveEntry.mutate(
          { projectId: project.id, path, destDir },
          {
            onSuccess: (next) => {
              const remap = (p: string) => (isWithin(p, path) ? next + p.slice(path.length) : p);
              useWorkspaceStore.getState().setOpenFileTabs(project.id, remapFileTabs(currentTabs(), remap));
              const active = activeRef.current;
              if (active && isWithin(active, path)) showFile(remap(active));
            },
          },
        ),
      onDropFiles: (files: File[], destDir: string) => importFiles.mutate({ projectId: project.id, destDir, files }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project.id, moveEntry.mutate, importFiles.mutate],
  );
  const rootDrop = useTreeDropTarget("", actions);

  // Git paths are repo-relative; the tree is rooted at the project folder (monorepo sub_path).
  const gitStates = useMemo(() => {
    const prefix = project.sub_path ? `${project.sub_path.replace(/[\\/]+$/, "")}/` : "";
    const map = new Map<string, GitFileState>();
    for (const f of git?.files ?? []) if (f.path.startsWith(prefix)) map.set(f.path.slice(prefix.length), f.state);
    return map;
  }, [git, project.sub_path]);

  const searching = debounced.trim().length > 1;

  const projectPath = config?.project_paths[project.id];

  // Tree width: the stored width on this device, previewed live while the handle is dragged and saved on release.
  const storedTreeWidth = useWorkspaceStore((s) => s.files_tree_width);
  const setFilesTreeWidth = useWorkspaceStore((s) => s.setFilesTreeWidth);
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const treeWidth = dragWidth ?? storedTreeWidth;
  const liveWidth = useRef(treeWidth);
  const resizing = useRef(false);

  const clampTreeWidth = (width: number) => {
    const grid = gridRef.current;
    const max = grid ? Math.max(MIN_TREE_WIDTH, grid.clientWidth - 2 * GRID_PADDING - HANDLE_WIDTH - MIN_EDITOR_WIDTH) : width;
    return Math.round(Math.min(Math.max(width, MIN_TREE_WIDTH), max));
  };
  const setLiveWidth = (width: number) => {
    liveWidth.current = width;
    setDragWidth(width);
  };

  return (
    <TreeActionsContext.Provider value={actions}>
      <div
        ref={gridRef}
        className="grid grid-cols-1 items-start gap-4 p-4 @5xl:gap-0 @5xl:grid-cols-[var(--files-tree-w)_var(--files-handle-w)_minmax(0,1fr)]"
        style={{ "--files-tree-w": `${treeWidth}px`, "--files-handle-w": `${HANDLE_WIDTH}px` } as React.CSSProperties}
      >
        <Panel className={cn("min-w-0 p-2", rootDrop.isOver && "ring-1 ring-primary")} {...rootDrop.dropProps}>
          <TreeCommandContext.Provider value={command}>
            <div className="mb-1 flex items-center gap-1 border-b pb-1">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ash" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files…" aria-label="Search files" className="h-8 pl-8" />
              </div>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label="Tree actions">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                    }
                  />
                  <TooltipContent>Tree actions</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-56">
                  {projectPath && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <div className="flex items-center gap-2 px-1.5 py-1 text-xs text-muted-foreground">
                            <Folder className="size-3.5 shrink-0" />
                            <span className="truncate">Project path</span>
                          </div>
                        }
                      />
                      <TooltipContent side="left" className="max-w-96 break-all font-mono">
                        {projectPath}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => actions.onCreate("", "file")}>
                    <FilePlus className="size-3.5" />
                    New file
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => actions.onCreate("", "folder")}>
                    <FolderPlus className="size-3.5" />
                    New folder
                  </DropdownMenuItem>
                  {!searching && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => sendCommand(true)}>
                        <ChevronsUpDown className="size-3.5" />
                        Expand all
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => sendCommand(false)}>
                        <ChevronsDownUp className="size-3.5" />
                        Collapse all
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
          </TreeCommandContext.Provider>
        </Panel>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize folder tree"
          aria-valuenow={treeWidth}
          tabIndex={0}
          onPointerDown={(e) => {
            resizing.current = true;
            liveWidth.current = treeWidth;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const grid = gridRef.current;
            if (!resizing.current || !grid) return;
            // The handle sits in the middle of its column, so the tree ends half a handle left of the pointer.
            const treeLeft = grid.getBoundingClientRect().left + GRID_PADDING;
            setLiveWidth(clampTreeWidth(e.clientX - treeLeft - HANDLE_WIDTH / 2));
          }}
          onPointerUp={(e) => {
            if (!resizing.current) return;
            resizing.current = false;
            e.currentTarget.releasePointerCapture(e.pointerId);
            setFilesTreeWidth(liveWidth.current);
            setDragWidth(null);
          }}
          onPointerCancel={() => {
            resizing.current = false;
            setDragWidth(null);
          }}
          onDoubleClick={() => setFilesTreeWidth(DEFAULT_FILES_TREE_WIDTH)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            setFilesTreeWidth(clampTreeWidth(treeWidth + (e.key === "ArrowRight" ? KEYBOARD_RESIZE_STEP : -KEYBOARD_RESIZE_STEP)));
          }}
          className="group hidden cursor-col-resize touch-none justify-center self-stretch rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-ring @5xl:flex"
          style={{ width: HANDLE_WIDTH }}
        >
          <div className={cn("h-full w-0.5 rounded-full transition-colors group-hover:bg-primary/40", dragWidth !== null && "bg-primary/60")} />
        </div>

        <Panel className="sticky top-4 flex h-[calc(100vh-9rem)] min-w-0 flex-col overflow-hidden">
          {openTabs.length > 0 && (
            <EditorTabs
              tabs={openTabs}
              activePath={activeFile}
              onSelect={showFile}
              onPin={pinFile}
              onClose={closeTab}
              onMove={(path, insertAt) => updateTabs((tabs) => moveFileTab(tabs, path, insertAt))}
            />
          )}
          {!activeFile ? (
            <>
              <PanelHeader title={<><Code2 className="size-3.5 text-muted-foreground" /> Editor</>} />
              <PanelBody className="min-h-0 flex-1 p-0">
                <EmptyState icon={<Code2 />} title="Select a file to view or edit it" />
              </PanelBody>
            </>
          ) : previewTypeFor(activeFile) ? (
            <BinaryPreview key={activeFile} projectId={project.id} path={activeFile} />
          ) : (
            <CodeEditor key={activeFile} projectId={project.id} path={activeFile} />
          )}
        </Panel>
      </div>

      <EntryDialogs
        projectId={project.id}
        state={dialog}
        onClose={() => setDialog(null)}
        onCreatedFile={selectFile}
        onRenamed={(from, to) => {
          const remap = (p: string) => (isWithin(p, from) ? to + p.slice(from.length) : p);
          updateTabs((tabs) => remapFileTabs(tabs, remap));
          if (activeFile && isWithin(activeFile, from)) showFile(remap(activeFile));
        }}
        onDeleted={(path) => {
          const tabs = currentTabs();
          const index = tabs.findIndex((t) => isWithin(t.path, path));
          updateTabs((all) => remapFileTabs(all, (p) => (isWithin(p, path) ? null : p)));
          if (activeFile && isWithin(activeFile, path)) {
            const remaining = tabs.filter((t) => !isWithin(t.path, path));
            const neighbor = remaining[Math.min(index, remaining.length - 1)];
            if (neighbor) showFile(neighbor.path);
            else clearFile();
          }
        }}
      />
    </TreeActionsContext.Provider>
  );
};

export default FilesTab;
