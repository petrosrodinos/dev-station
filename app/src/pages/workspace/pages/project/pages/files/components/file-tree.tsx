import { createContext, useContext, useEffect, useState } from "react";
import { ChevronRight, Copy, File, Folder, FolderOpen, FilePlus, FolderPlus, FolderSearch, Pencil, SquarePen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCopyFilePath, useDirectory, useOpenInEditor, useRevealFile } from "@/features/files/hooks/use-files";
import { GitFileStateOptions } from "@/config/constants/dropdowns/git/git-file-state.options";
import { EditorTargetOptions } from "@/config/constants/dropdowns/settings/editor-target.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { cn } from "@/lib/utils";
import { EditorTargets, type FileEntry, type GitFileState } from "@shared/contract";

const GIT_DOT: Record<GitFileState, string> = {
  M: "bg-warning",
  A: "bg-success",
  D: "bg-danger",
  R: "bg-info",
  U: "bg-info",
  C: "bg-danger",
};

const HEAVY_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo"]);

/** Bulk expand/collapse: bumping `id` tells every mounted (and newly mounted) folder row to follow `open`. */
export interface TreeCommand {
  id: number;
  open: boolean;
}
export const TreeCommandContext = createContext<TreeCommand>({ id: 0, open: false });

export type CreateKind = "file" | "folder";

/** Row-level mutations are handled by the tab (dialogs + state); rows only request them. */
export interface TreeActions {
  onCreate: (dir: string, kind: CreateKind) => void;
  onRename: (entry: FileEntry) => void;
  onDelete: (entry: FileEntry) => void;
}
export const TreeActionsContext = createContext<TreeActions | null>(null);

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
  const changed = [...gitStates.keys()].some((p) => p.startsWith(`${entry.path}/`));

  return (
    <div>
      <div
        role="treeitem"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="group flex h-[26px] cursor-pointer items-center gap-1.5 rounded-sm pr-1 text-[0.8125rem] text-body hover:bg-surface-elevated"
        style={{ paddingLeft: depth * 16 + 6 }}
      >
        <ChevronRight className={cn("size-3.5 text-ash transition-transform", open && "rotate-90")} />
        {open ? <FolderOpen className="size-3.5 text-muted-foreground" /> : <Folder className="size-3.5 text-muted-foreground" />}
        <span className={cn("truncate", HEAVY_DIRS.has(entry.name) && "text-ash")}>{entry.name}</span>
        {changed && <span className="size-1.5 rounded-full bg-warning" />}
        <div className="ml-auto hidden gap-0.5 group-hover:flex">
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
      {open && <FileTreeNode projectId={projectId} dir={entry.path} depth={depth + 1} gitStates={gitStates} activePath={activePath} onSelect={onSelect} />}
    </div>
  );
}

export function FileRow({ projectId, entry, depth, gitState, showPath = false, active = false, onSelect }: { projectId: string; entry: FileEntry; depth: number; gitState?: GitFileState; showPath?: boolean; active?: boolean; onSelect?: (path: string) => void }) {
  const openInEditor = useOpenInEditor();
  const reveal = useRevealFile();
  const copyPath = useCopyFilePath();
  const actions = useContext(TreeActionsContext);

  return (
    <div
      onClick={() => onSelect?.(entry.path)}
      onDoubleClick={() => openInEditor.mutate({ projectId, editor: EditorTargets.CURSOR, path: entry.path })}
      className={cn("group flex h-[26px] cursor-pointer items-center gap-1.5 rounded-sm pr-1 text-[0.8125rem] text-body hover:bg-surface-elevated", active && "bg-surface-card")}
      style={{ paddingLeft: depth * 16 + 26 }}
      title="Click to open · double-click to open in Cursor"
    >
      <File className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{showPath ? entry.path : entry.name}</span>
      {gitState && <span className={cn("size-1.5 shrink-0 rounded-full", GIT_DOT[gitState])} title={getDropdownOptionLabel(GitFileStateOptions, gitState)} />}
      <div className="ml-auto hidden gap-0.5 group-hover:flex">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="size-5 text-muted-foreground" onClick={(e) => e.stopPropagation()} aria-label="Open with">
                      <SquarePen className="size-3" />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>Open with</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {EditorTargetOptions.map((o) => (
              <DropdownMenuItem key={o.id} onSelect={() => openInEditor.mutate({ projectId, editor: o.id, path: entry.path })}>
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
        <RowAction label="Copy path" onClick={() => copyPath.mutate({ projectId, path: entry.path })}>
          <Copy className="size-3" />
        </RowAction>
        <RowAction label="Reveal in file manager" onClick={() => reveal.mutate({ projectId, path: entry.path })}>
          <FolderSearch className="size-3" />
        </RowAction>
      </div>
    </div>
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
