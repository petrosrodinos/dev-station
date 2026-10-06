import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isDesktop } from "@/lib/desktop";
import { useRuntimeStore } from "@/stores/runtime";
import { CloseChoices, ProcessStatuses, type CloseChoice } from "@shared/contract";

/** Asked when the window's close button is pressed: close everything, or keep running in the background. */
export function CloseRequestDialog() {
  const [open, setOpen] = useState(false);
  const running = useRuntimeStore((s) => Object.values(s.processes).filter((p) => p.status === ProcessStatuses.RUNNING).length);

  useEffect(() => {
    if (!isDesktop()) return;
    return window.devStation!.app.onCloseRequest(() => setOpen(true));
  }, []);

  // Closing the dialog (Cancel, Escape, outside click) leaves the window open: the main process already held the close.
  const respond = (choice: CloseChoice) => {
    setOpen(false);
    void window.devStation?.app.respondClose(choice);
  };

  const servicesLine =
    running === 0 ? "No services are running." : `${running} ${running === 1 ? "service is" : "services are"} running.`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Close Dev Station?</DialogTitle>
          <DialogDescription>
            {servicesLine} Closing Dev Station stops them. Keep it running in the background to leave them up; it stays in the tray so you can reopen it.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => respond(CloseChoices.QUIT)}>
            Close Dev Station
          </Button>
          <Button onClick={() => respond(CloseChoices.BACKGROUND)}>Keep running in background</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
