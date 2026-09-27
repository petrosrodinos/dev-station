import { Bot } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CloseSessionDialogProps {
  sessionName: string;
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  /** true = stop the process too, false = keep it running in the background. */
  onChoose: (stopProcess: boolean) => void;
}

/** Closing a tab of a running agent asks whether to stop the CLI process or leave it running (Spec §13). */
export function CloseSessionDialog({ sessionName, open, isPending, onOpenChange, onChoose }: CloseSessionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
              <Bot className="size-4" />
            </div>
            <div className="space-y-1">
              <DialogTitle>Close session tab?</DialogTitle>
              <DialogDescription>
                “{sessionName}” is still running. Stop the agent process, or keep it running in the background and only remove the tab? You can reopen it from AI Sessions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => onChoose(false)} disabled={isPending}>
            Keep running
          </Button>
          <Button variant="destructive" onClick={() => onChoose(true)} loading={isPending}>
            Stop process
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
