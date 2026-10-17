import { useContext, useEffect, useState } from "react";
import { ChevronRight, Copy, ExternalLink, File, Folder, FolderOpen, FilePlus, FolderPlus, FolderSearch, ImageIcon, Pencil, FileText, Scissors, Search, SearchX, Trash2, ClipboardPaste, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAddToGitignore, useCopyEntry, useCopyFilePath, useCopyRelativePath, useDirectory, useOpenFileExternally, useRevealFile } from "@/features/files/hooks/use-files";
import { GitFileStateOptions } from "@/config/constants/dropdowns/git/git-file-state.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { cn } from "@/lib/utils";
import { useEntryClipboard } from "../hooks/use-entry-clipboard";
import { ENTRY_DRAG_TYPE, setDraggedPath, useTreeDropTarget } from "../hooks/use-tree-drop-target";
import { TreeActionsContext, TreeCommandContext } from "./tree-context";
import { FilePreviewKinds, previewTypeFor, type FileEntry, type FilePreviewKind, type GitFileState } from "@shared/contract";

const GIT_DOT: Record<GitFileState, string> = {
  M: "bg-warning",
  A: "bg-success",
  D: "bg-danger",
  R: "bg-info",
  U: "bg-info",
  C: "bg-danger",
};

/** Files the viewer can preview get a kind-specific icon in the tree. */
const PREVIEW_ICONS: Record<FilePreviewKind, typeof File> = {
  [FilePreviewKinds.IMAGE]: ImageIcon,
  [FilePreviewKinds.PDF]: FileText,
};

const HEAVY_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo"]);

/** Native drag source props for a tree row. */
const dragSourceProps = (path: string) => ({
  draggable: true,
  onDragStart: (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData(ENTRY_DRAG_TYPE, path);
    setDraggedPath(path);
  },
  onDragEnd: () => setDraggedPath(null),
});

interface TreeProps {
  projectId: string;
  dir: string;
  depth: number;
  gitStates: Map<string, GitFileState>;
  activePath?: string | null;
  onSelect?: (path: string) => void;
}

/** Lazily loaded directory level. */
export function FileTreeNode({ projectId, dir, depth, gitStates, activePath, onSelect }: TreeProps) {
  const { data, isPending, isError, error } = useDirectory(projectId, dir);

  if (isPending) {
    return (
      <div className="space-y-1 py-1" style={{ paddingLeft: depth * 16 + 8 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-40" />
        ))}
      </div>
    );
  }
  if (isError) return <div className="px-2 py-1 text-xs text-danger">{error.message}</div>;
  if (!data?.length) return <div className="py-1 text-xs text-ash" style={{ paddingLeft: depth * 16 + 28 }}>Empty folder</div>;

  return (
    <>
      {data.map((entry) =>
        entry.type === "dir" ? (
          <DirRow key={entry.path} projectId={projectId} entry={entry} depth={depth} gitStates={gitStates} activePath={activePath} onSelect={onSelect} />
        ) : (
          <FileRow key={entry.path} projectId={projectId} entry={entry} depth={depth} gitState={gitStates.get(entry.path)} active={activePath === entry.path} onSelect={onSelect} />
        ),
      )}
    </>
  );
}

function DirRow({ projectId, entry, depth, gitStates, activePath, onSelect }: { projectId: string; entry: FileEntry; depth: number; gitStates: Map<string, GitFileState>; activePath?: string | null; onSelect?: (path: string) => void }) {
  const command = useContext(TreeCommandContext);
  const actions = useContext(TreeActionsContext);
  const followsCommand = command.open && !HEAVY_DIRS.has(entry.name);
  const [open, setOpen] = useState(command.id > 0 && followsCommand);
  useEffect(() => {
    if (command.id > 0) setOpen(followsCommand);
  }, [command.id, followsCommand]);
  const reveal = useRevealFile();
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const { isOver, dropProps } = useTreeDropTarget(entry.path, actions, () => setOpen(true));
  const changed = [...gitStates.keys()].some((p) => p.startsWith(`${entry.path}/`));

  return (
    <div {...dropProps}>
      <EntryContextMenu projectId={projectId} entry={entry} onOpen={() => setOpen((o) => !o)} onBeforeCreate={() => setOpen(true)}>
      <div
        role="treeitem"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        {...(actions ? dragSourceProps(entry.path) : {})}
        className={cn("group flex h-[26px] cursor-pointer items-center gap-1.5 rounded-sm pr-1 text-[0.8125rem] text-body hover:bg-surface-elevated", isOver && "bg-surface-card ring-1 ring-inset ring-primary")}
        style={{ paddingLeft: depth * 16 + 6 }}
      >
        <ChevronRight className={cn("size-3.5 text-ash transition-transform", open && "rotate-90")} />
        {open ? <FolderOpen className="size-3.5 text-muted-foreground" /> : <Folder className="size-3.5 text-muted-foreground" />}
        <span className={cn("truncate", HEAVY_DIRS.has(entry.name) && "text-ash")}>{entry.name}</span>
        {changed && <span className="size-1.5 rounded-full bg-warning" />}
        <div className={cn("ml-auto gap-0.5 group-hover:flex", copyMenuOpen ? "flex" : "hidden")}>
          <CopyPathMenu projectId={projectId} path={entry.path} open={copyMenuOpen} onOpenChange={setCopyMenuOpen} />
          {actions && (
            <>
              <RowAction label="New file" onClick={() => { setOpen(true); actions.onCreate(entry.path, "file"); }}>
                <FilePlus className="size-3" />
              </RowAction>
              <RowAction label="New folder" onClick={() => { setOpen(true); actions.onCreate(entry.path, "folder"); }}>
                <FolderPlus className="size-3" />
              </RowAction>
              <RowAction label="Rename" onClick={() => actions.onRename(entry)}>
                <Pencil className="size-3" />
              </RowAction>
              <RowAction label="Move to trash" onClick={() => actions.onDelete(entry)}>
                <Trash2 className="size-3" />
              </RowAction>
            </>
          )}
          <RowAction label="Reveal in file manager" onClick={() => reveal.mutate({ projectId, path: entry.path })}>
            <FolderSearch className="size-3" />
          </RowAction>
        </div>
      </div>
      </EntryContextMenu>
      {open && <FileTreeNode projectId={projectId} dir={entry.path} depth={depth + 1} gitStates={gitStates} activePath={activePath} onSelect={onSelect} />}
    </div>
  );
}

export function FileRow({ projectId, entry, depth, gitState, showPath = false, active = false, onSelect }: { projectId: string; entry: FileEntry; depth: number; gitState?: GitFileState; showPath?: boolean; active?: boolean; onSelect?: (path: string) => void }) {
  const previewKind = previewTypeFor(entry.name)?.kind;
  const Icon = previewKind ? PREVIEW_ICONS[previewKind] : File;
  const reveal = useRevealFile();
  // The hover-only action bar is display:none once the pointer leaves the row; keep it
  // rendered while the menu is open so the popup keeps its anchor.
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const actions = useContext(TreeActionsContext);

  return (
    <EntryContextMenu projectId={projectId} entry={entry} onOpen={() => onSelect?.(entry.path)}>
    <div
      onClick={() => onSelect?.(entry.path)}
      onDoubleClick={() => actions?.onPin(entry.path)}
      {...(actions ? dragSourceProps(entry.path) : {})}
      className={cn("group flex h-[26px] cursor-pointer items-center gap-1.5 rounded-sm pr-1 text-[0.8125rem] text-body hover:bg-surface-elevated", active && "bg-surface-card")}
      style={{ paddingLeft: depth * 16 + 26 }}
      title="Click to preview · double-click to keep open"
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{showPath ? entry.path : entry.name}</span>
      {gitState && <span className={cn("size-1.5 shrink-0 rounded-full", GIT_DOT[gitState])} title={getDropdownOptionLabel(GitFileStateOptions, gitState)} />}
      <div className={cn("ml-auto gap-0.5 group-hover:flex", copyMenuOpen ? "flex" : "hidden")}>
        <CopyPathMenu projectId={projectId} path={entry.path} open={copyMenuOpen} onOpenChange={setCopyMenuOpen} />
        {actions && (
          <>
            <RowAction label="Rename" onClick={() => actions.onRename(entry)}>
              <Pencil className="size-3" />
            </RowAction>
            <RowAction label="Move to trash" onClick={() => actions.onDelete(entry)}>
              <Trash2 className="size-3" />
            </RowAction>
          </>
        )}
        <RowAction label="Reveal in file manager" onClick={() => reveal.mutate({ projectId, path: entry.path })}>
          <FolderSearch className="size-3" />
        </RowAction>
      </div>
    </div>
    </EntryContextMenu>
  );
}

/** Right-click a tree row for everything its hover buttons do, plus search scoping. */
function EntryContextMenu({ projectId, entry, onOpen, onBeforeCreate, children }: { projectId: string; entry: FileEntry; onOpen: () => void; onBeforeCreate?: () => void; children: React.ReactElement }) {
  const actions = useContext(TreeActionsContext);
  const copyPath = useCopyFilePath();
  const copyRelativePath = useCopyRelativePath();
  const reveal = useRevealFile();
  const openExternally = useOpenFileExternally();
  const addToGitignore = useAddToGitignore();
  const copyEntry = useCopyEntry();
  const clipboard = useEntryClipboard((s) => s.entry);
  const isDir = entry.type === "dir";
  // Paste into the folder itself, or beside a file.
  const pasteDir = isDir ? entry.path : entry.path.slice(0, Math.max(0, entry.path.lastIndexOf("/")));
  const paste = () => {
    if (!clipboard || !actions || clipboard.projectId !== projectId) return;
    onBeforeCreate?.();
    if (clipboard.mode === "copy") copyEntry.mutate({ projectId, path: clipboard.path, destDir: pasteDir });
    else {
      actions.onMove(clipboard.path, pasteDir);
      useEntryClipboard.getState().clear();
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger render={children} />
      <ContextMenuContent className="w-56" onClick={(e) => e.stopPropagation()}>
        <ContextMenuItem onSelect={onOpen}>
          {isDir ? <FolderOpen /> : <File />} {isDir ? "Expand / Collapse" : "Open"}
        </ContextMenuItem>
        {!isDir && (
          <ContextMenuItem onSelect={() => openExternally.mutate({ projectId, path: entry.path })}>
            <ExternalLink /> Open in Default App
          </ContextMenuItem>
        )}
        <ContextMenuItem onSelect={() => addToGitignore.mutate({ projectId, path: entry.path })}>
          <EyeOff /> Add to .gitignore
        </ContextMenuItem>
        {actions && isDir && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onSelect={() => {
                onBeforeCreate?.();
                actions.onCreate(entry.path, "file");
              }}
            >
              <FilePlus /> New File…
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => {
                onBeforeCreate?.();
                actions.onCreate(entry.path, "folder");
              }}
            >
              <FolderPlus /> New Folder…
            </ContextMenuItem>
          </>
        )}
        {actions && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => actions.onRename(entry)}>
              <Pencil /> Rename…
            </ContextMenuItem>
            <ContextMenuItem variant="destructive" onSelect={() => actions.onDelete(entry)}>
              <Trash2 /> Move to Trash
            </ContextMenuItem>
          </>
        )}
        <ContextMenuSeparator />
        {actions && (
          <ContextMenuItem onSelect={() => useEntryClipboard.getState().set({ projectId, path: entry.path, mode: "cut" })}>
            <Scissors /> Cut
          </ContextMenuItem>
        )}
        <ContextMenuItem onSelect={() => useEntryClipboard.getState().set({ projectId, path: entry.path, mode: "copy" })}>
          <Copy /> Copy
        </ContextMenuItem>
        {actions && (
          <ContextMenuItem disabled={!clipboard || clipboard.projectId !== projectId} onSelect={paste}>
            <ClipboardPaste /> Paste
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => copyPath.mutate({ projectId, path: entry.path })}>
          <Copy /> Copy Path
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => copyRelativePath.mutate({ path: entry.path })}>Copy Relative Path</ContextMenuItem>
        <ContextMenuItem onSelect={() => reveal.mutate({ projectId, path: entry.path })}>
          <FolderSearch /> Reveal in File Manager
        </ContextMenuItem>
        {actions && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => actions.onSearchScope(entry.path, "include", entry.type)}>
              <Search /> {isDir ? "Find in Folder…" : "Find in This File…"}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => actions.onSearchScope(entry.path, "exclude", entry.type)}>
              <SearchX /> Exclude from Search
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function CopyPathMenu({ projectId, path, open, onOpenChange }: { projectId: string; path: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const copyPath = useCopyFilePath();
  const copyRelativePath = useCopyRelativePath();

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="size-5 text-muted-foreground" onClick={(e) => e.stopPropagation()} aria-label="Copy path">
                  <Copy className="size-3" />
                </Button>
              }
            />
          }
        />
        <TooltipContent>Copy path</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => copyPath.mutate({ projectId, path })}>Copy absolute path</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copyRelativePath.mutate({ path })}>Copy relative path</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RowAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-5 text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            aria-label={label}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
