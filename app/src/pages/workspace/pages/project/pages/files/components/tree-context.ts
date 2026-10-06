import { createContext } from "react";
import type { FileEntry } from "@shared/contract";

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
  onMove: (path: string, destDir: string) => void;
  onDropFiles: (files: File[], destDir: string) => void;
}
export const TreeActionsContext = createContext<TreeActions | null>(null);
