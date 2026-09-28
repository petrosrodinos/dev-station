import { useState, type FormEvent, type ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeleteAgentSession, useRenameAgentSession } from "@/features/agent-sessions/hooks/use-agent-sessions";
import type { AgentSession } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";

/** Right-click a session (tab or list row) to rename or delete it. */
export function SessionContextMenu({ session, children }: { session: AgentSession; children: ReactNode }) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={() => setRenaming(true)}>
            <Pencil /> Rename
          </ContextMenuItem>
          <ContextMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
            <Trash2 /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <RenameSessionDialog session={session} open={renaming} onOpenChange={setRenaming} />
      <DeleteSessionDialog session={session} open={deleting} onOpenChange={setDeleting} />
    </>
  );
}

interface SessionDialogProps {
  session: AgentSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function RenameSessionDialog({ session, open, onOpenChange }: SessionDialogProps) {
  const rename = useRenameAgentSession();
  const [name, setName] = useState(session.name);
  const trimmed = name.trim();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed || trimmed === session.name) return onOpenChange(false);
    rename.mutate({ id: session.id, name: trimmed }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (rename.isPending) return;
        if (o) setName(session.name);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Rename session</DialogTitle>
            <DialogDescription>A name you set here is kept — it won't be replaced by the agent's own title.</DialogDescription>
          </DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus onFocus={(e) => e.currentTarget.select()} aria-label="Session name" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={rename.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={rename.isPending} disabled={!trimmed}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteSessionDialog({ session, open, onOpenChange }: SessionDialogProps) {
  const remove = useDeleteAgentSession();

  return (
    <Dialog open={open} onOpenChange={(o) => !remove.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete session?</DialogTitle>
          <DialogDescription>
            “{session.name}” will be removed from AI Sessions and its agent process stopped if it is running. Activity entries stay in the feed. This can't be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" loading={remove.isPending} onClick={() => remove.mutate(session.id, { onSuccess: () => onOpenChange(false) })}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
