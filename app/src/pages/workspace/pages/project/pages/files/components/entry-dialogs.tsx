import { useEffect, useState, type FC, type FormEvent } from "react";
import { FilePlus, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateFile, useCreateFolder, useDeleteEntry, useRenameEntry } from "@/features/files/hooks/use-files";
import type { FileEntry } from "@shared/contract";
import type { CreateKind } from "./file-tree";

export type EntryDialogState = { type: "create"; dir: string; kind: CreateKind } | { type: "rename"; entry: FileEntry } | { type: "delete"; entry: FileEntry } | null;

interface Props {
  projectId: string;
  state: EntryDialogState;
  onClose: () => void;
  /** A file was created — the tab opens it. */
  onCreatedFile: (path: string) => void;
  onRenamed: (from: string, to: string) => void;
  onDeleted: (path: string) => void;
}

const joinPath = (dir: string, name: string) => (dir ? `${dir}/${name}` : name);

/** Name prompt for create / rename, plus the delete confirmation. */
export const EntryDialogs: FC<Props> = ({ projectId, state, onClose, onCreatedFile, onRenamed, onDeleted }) => {
  const createFile = useCreateFile();
  const createFolder = useCreateFolder();
  const rename = useRenameEntry();
  const remove = useDeleteEntry();
  const [name, setName] = useState("");

  useEffect(() => {
    setName(state?.type === "rename" ? state.entry.name : "");
  }, [state]);

  if (state?.type === "delete") {
    const { entry } = state;
    return (
      <ConfirmationDialog
        isOpen
        onClose={onClose}
        variant="destructive"
        icon={<Trash2 className="size-5" />}
        title={`Move ${entry.type === "dir" ? "folder" : "file"} to trash?`}
        description={`“${entry.path}” will be moved to the trash${entry.type === "dir" ? " with everything inside it" : ""}.`}
        confirmText="Move to trash"
        isLoading={remove.isPending}
        onConfirm={() =>
          remove.mutate(
            { projectId, path: entry.path },
            {
              onSuccess: () => {
                onDeleted(entry.path);
                onClose();
              },
            },
          )
        }
      />
    );
  }

  const isCreate = state?.type === "create";
  const busy = createFile.isPending || createFolder.isPending || rename.isPending;
  const trimmed = name.trim();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!state || !trimmed || busy) return;
    if (state.type === "create") {
      const path = joinPath(state.dir, trimmed);
      const done = (created: string) => {
        if (state.kind === "file") onCreatedFile(created);
        onClose();
      };
      if (state.kind === "file") createFile.mutate({ projectId, path }, { onSuccess: done });
      else createFolder.mutate({ projectId, path }, { onSuccess: done });
    } else if (state.type === "rename") {
      rename.mutate(
        { projectId, path: state.entry.path, name: trimmed },
        {
          onSuccess: (to) => {
            onRenamed(state.entry.path, to);
            onClose();
          },
        },
      );
    }
  };

  const kindLabel = state?.type === "create" ? (state.kind === "file" ? "file" : "folder") : state?.type === "rename" ? (state.entry.type === "dir" ? "folder" : "file") : "";
  const Icon = state?.type === "rename" ? Pencil : state?.type === "create" && state.kind === "folder" ? FolderPlus : FilePlus;

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="size-4" /> {isCreate ? `New ${kindLabel}` : `Rename ${kindLabel}`}
            </DialogTitle>
            <DialogDescription>
              {state?.type === "create"
                ? `Created in ${state.dir || "the project root"}. Use “/” to create nested folders.`
                : state?.type === "rename"
                  ? `Renaming ${state.entry.path}`
                  : ""}
            </DialogDescription>
          </DialogHeader>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={state?.type === "create" && state.kind === "file" ? "example.ts" : "name"} className="font-mono" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmed || busy}>
              {isCreate ? "Create" : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
