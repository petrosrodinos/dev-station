import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getComboConflict, type ResolvedShortcut } from "@/lib/shortcuts.utils";
import { ShortcutRecorder } from "./shortcut-recorder";

interface ShortcutBindingDialogProps {
  shortcut: ResolvedShortcut | null;
  shortcuts: ResolvedShortcut[];
  onSave: (actionId: string, combo: string) => void;
  onResetToDefault: (actionId: string) => void;
  onClose: () => void;
}

export function ShortcutBindingDialog({ shortcut, shortcuts, onSave, onResetToDefault, onClose }: ShortcutBindingDialogProps) {
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    setDraft(shortcut?.combo ?? null);
  }, [shortcut]);

  const conflict = draft && draft !== shortcut?.combo && shortcut ? getComboConflict(draft, shortcuts, shortcut.id) : null;
  const canSave = !!shortcut && !!draft && draft !== shortcut.combo && !conflict;

  return (
    <Dialog open={!!shortcut} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change shortcut</DialogTitle>
          <DialogDescription>{shortcut?.label}</DialogDescription>
        </DialogHeader>
        <ShortcutRecorder value={draft} onChange={setDraft} error={conflict} />
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            disabled={!shortcut || shortcut.is_default}
            onClick={() => {
              if (shortcut) onResetToDefault(shortcut.id);
              onClose();
            }}
          >
            Reset to default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!canSave}
              onClick={() => {
                if (shortcut && draft) onSave(shortcut.id, draft);
                onClose();
              }}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
