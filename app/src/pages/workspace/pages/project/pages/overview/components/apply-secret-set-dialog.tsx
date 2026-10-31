import { useEffect, useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useProjectEnvConsent } from "@/features/projects/hooks/use-projects";
import { useEnvFile, useEnvFiles, useSaveEnvFile } from "@/features/env-files/hooks/use-env-files";
import { useSecretSet } from "@/features/project-secrets/hooks/use-project-secrets";
import { diffVariables, mergeVariables } from "@/features/project-secrets/utils/env-text.utils";
import type { SecretSetSummary } from "@/features/project-secrets/interfaces/project-secrets.interfaces";
import type { EnvFileSummary } from "@shared/contract";

interface ApplySecretSetDialogProps {
  project: Project;
  set: SecretSetSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const keyList = (keys: string[]) => (keys.length > 6 ? `${keys.slice(0, 6).join(", ")} +${keys.length - 6} more` : keys.join(", "));

/** Merges a shared set into one of this project's local `.env*` files. Shared values win; local-only keys stay. */
export function ApplySecretSetDialog({ project, set, open, onOpenChange }: ApplySecretSetDialogProps) {
  const consent = useProjectEnvConsent(project.id);
  const allowed = consent.data?.accepted === true;
  const files = useEnvFiles(project.id, open && allowed);
  const shared = useSecretSet(project.id, set?.id ?? null, open && allowed);
  const save = useSaveEnvFile();
  const [path, setPath] = useState<string | null>(null);

  const list = files.data ?? [];
  const groups = list.reduce<Map<string, EnvFileSummary[]>>((acc, f) => acc.set(f.dir, [...(acc.get(f.dir) ?? []), f]), new Map());
  const selected = path ?? list.find((f) => !f.is_template)?.path ?? list[0]?.path ?? null;
  const local = useEnvFile(project.id, selected, open && allowed);

  useEffect(() => {
    if (!open) setPath(null);
  }, [open]);

  const diff = useMemo(() => (local.data && shared.data ? diffVariables(local.data.variables, shared.data.variables) : null), [local.data, shared.data]);
  const nothingToDo = diff !== null && diff.added.length === 0 && diff.changed.length === 0;

  const apply = () => {
    if (!local.data || !shared.data || !selected) return;
    save.mutate(
      { projectId: project.id, path: selected, variables: mergeVariables(local.data.variables, shared.data.variables), mtimeMs: local.data.mtime_ms },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !save.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="size-4" /> Apply to a local file
          </DialogTitle>
          <DialogDescription>
            {set ? <>Merge “{set.name}” into a .env file on this computer. Shared values replace local ones with the same name; other local variables stay.</> : null}
          </DialogDescription>
        </DialogHeader>

        {consent.isPending ? (
          <Skeleton className="h-8 w-full" />
        ) : !allowed ? (
          <p className="text-[0.8125rem] text-muted-foreground">Allow Dev Station to read this project's .env files first, from the Environment files card.</p>
        ) : files.isPending ? (
          <Skeleton className="h-8 w-full" />
        ) : list.length === 0 ? (
          <p className="text-[0.8125rem] text-muted-foreground">No .env files found in this project. Create one first, then apply the set.</p>
        ) : (
          <div className="space-y-3">
            <Select value={selected ?? undefined} onValueChange={(v) => v && setPath(String(v))}>
              <SelectTrigger aria-label="Local .env file" className="h-8 w-full font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...groups].map(([dir, items]) => (
                  <SelectGroup key={dir}>
                    <SelectLabel>{dir === "." ? "Project root" : dir}</SelectLabel>
                    {items.map((f) => (
                      <SelectItem key={f.path} value={f.path} className="font-mono text-xs">
                        {f.path}
                        {f.is_template && <span className="ml-2 font-sans text-[0.6875rem] text-muted-foreground">template</span>}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>

            {local.isPending || shared.isPending ? (
              <Skeleton className="h-12 w-full" />
            ) : local.isError || shared.isError ? (
              <p className="text-[0.8125rem] text-destructive">{(local.error ?? shared.error)?.message}</p>
            ) : diff ? (
              <ul className="space-y-1 rounded-md border bg-muted/30 p-3 text-[0.75rem]">
                <li>
                  <span className="font-medium">{diff.added.length}</span> new{diff.added.length > 0 && <span className="font-mono text-muted-foreground"> · {keyList(diff.added)}</span>}
                </li>
                <li>
                  <span className="font-medium">{diff.changed.length}</span> will change{diff.changed.length > 0 && <span className="font-mono text-muted-foreground"> · {keyList(diff.changed)}</span>}
                </li>
                <li className="text-muted-foreground">{diff.unchanged} already match</li>
              </ul>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={apply} loading={save.isPending} disabled={!allowed || !local.data || !shared.data || nothingToDo}>
            {nothingToDo ? "Nothing to apply" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
