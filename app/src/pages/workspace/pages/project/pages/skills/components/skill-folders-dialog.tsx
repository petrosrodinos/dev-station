import { useQueryClient } from "@tanstack/react-query";
import { FolderPlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUpdateDeviceSettings, useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { pickDirectory } from "@/features/local-workspace/services/local-workspace.services";
import { getErrorMessage } from "@/lib/desktop";
import { toast } from "@/hooks/use-toast";

interface SkillFoldersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Extra folders (per device) that are scanned for skills on top of the built-in provider locations. */
export function SkillFoldersDialog({ open, onOpenChange }: SkillFoldersDialogProps) {
  const queryClient = useQueryClient();
  const { data: config } = useWorkspaceConfig();
  const { mutate, isPending } = useUpdateDeviceSettings();
  const folders = config?.settings.skill_folders ?? [];

  const save = (next: string[]) => mutate({ skill_folders: next }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills"] }) });

  const add = async () => {
    try {
      const dir = await pickDirectory(folders[folders.length - 1]);
      if (dir && !folders.includes(dir)) save([...folders, dir]);
    } catch (error) {
      toast({ title: "Could not pick a folder", description: getErrorMessage(error), variant: "error" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Skill folders</DialogTitle>
          <DialogDescription>
            Claude, Cursor, Codex, Gemini and Copilot locations are scanned automatically. Add other folders here: every <code>SKILL.md</code> and markdown file inside is listed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {folders.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-4 text-center text-[0.8125rem] text-muted-foreground">No custom folders yet.</p>
          ) : (
            folders.map((f) => (
              <div key={f} className="flex items-center gap-2 rounded-md border px-3 py-1.5">
                <span className="min-w-0 flex-1 truncate font-mono text-xs" title={f}>
                  {f}
                </span>
                <Button variant="ghost" size="icon" className="size-7" aria-label={`Remove ${f}`} disabled={isPending} onClick={() => save(folders.filter((x) => x !== f))}>
                  <X className="size-3.5" />
                </Button>
              </div>
            ))
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={add} disabled={isPending}>
            <FolderPlus className="size-3.5" /> Add folder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
