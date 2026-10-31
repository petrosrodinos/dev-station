import { useState } from "react";
import { Copy, FileDown, KeyRound, Lock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { formatRelative } from "@/lib/date";
import { isDesktop } from "@/lib/desktop";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { useDeleteSecretSet, useSecretSets } from "@/features/project-secrets/hooks/use-project-secrets";
import { getSecretSet } from "@/features/project-secrets/services/project-secrets.services";
import { formatEnvText } from "@/features/project-secrets/utils/env-text.utils";
import type { SecretSetSummary } from "@/features/project-secrets/interfaces/project-secrets.interfaces";
import { SecretSetDialog } from "./secret-set-dialog";
import { ApplySecretSetDialog } from "./apply-secret-set-dialog";

/** Named sets of env values shared with the team. Encrypted by the API; the list never carries values. */
export function SharedSecretsCard({ project, hasLocalCopy }: { project: Project; hasLocalCopy: boolean }) {
  const { can } = usePermissions();
  const canManage = can(PermissionKeys.SECRETS_MANAGE);
  const sets = useSecretSets(project.id);
  const remove = useDeleteSecretSet();

  const [editor, setEditor] = useState<{ open: boolean; setId: string | null }>({ open: false, setId: null });
  const [applying, setApplying] = useState<SecretSetSummary | null>(null);
  const [deleting, setDeleting] = useState<SecretSetSummary | null>(null);

  const list = sets.data ?? [];
  const canApply = isDesktop() && hasLocalCopy;

  const copyAsEnv = async (set: SecretSetSummary) => {
    try {
      const full = await getSecretSet({ projectId: project.id, setId: set.id });
      await navigator.clipboard.writeText(formatEnvText(full.variables));
      toast({ title: "Copied as .env text", description: set.name, duration: 2000 });
    } catch (error) {
      toast({ title: "Could not copy the secrets", description: error instanceof Error ? error.message : undefined, variant: "error" });
    }
  };

  return (
    <Panel className="@4xl:col-span-2">
      <PanelHeader
        title={
          <span className="flex items-center gap-2 font-medium">
            <Lock className="size-4 text-muted-foreground" /> Shared secrets
            {list.length > 0 && <span className="text-xs font-normal text-muted-foreground">{list.length}</span>}
          </span>
        }
        actions={
          canManage && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setEditor({ open: true, setId: null })}>
              <Plus className="size-3.5" /> New set
            </Button>
          )
        }
      />

      <div className="border-b bg-muted/40 px-4 py-2 text-[0.7188rem] text-muted-foreground">
        Values are stored encrypted on Dev Station's servers and shared with members who have access to secrets. Your local .env files are never uploaded.
      </div>

      {sets.isPending ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : sets.isError ? (
        <div className="px-4 py-6 text-center text-[0.8125rem] text-muted-foreground">{sets.error.message}</div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<KeyRound />}
          title="No shared secrets yet"
          description={canManage ? "Add the env values your teammates need, by typing them or pasting a .env file's content." : "Nobody has shared env values for this project yet."}
          action={
            canManage ? (
              <Button size="sm" onClick={() => setEditor({ open: true, setId: null })}>
                New set
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y">
          {list.map((set) => (
            <li key={set.id} className="flex items-center gap-3 px-4 py-2.5">
              <KeyRound className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.8125rem] font-medium">{set.name}</div>
                <div className="truncate text-[0.7188rem] text-muted-foreground">
                  {set.variable_count} variable{set.variable_count === 1 ? "" : "s"}
                  {set.description ? ` · ${set.description}` : ""} · updated {formatRelative(set.updated_at)}
                  {set.updated_by ? ` by ${set.updated_by.full_name || set.updated_by.email}` : ""}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => copyAsEnv(set)}>
                <Copy className="size-3.5" /> Copy
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${set.name}`}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-52">
                  {canApply && (
                    <DropdownMenuItem onSelect={() => setApplying(set)} className="gap-2">
                      <FileDown className="size-3.5" /> Apply to local .env
                    </DropdownMenuItem>
                  )}
                  {canManage && (
                    <>
                      {canApply && <DropdownMenuSeparator />}
                      <DropdownMenuItem onSelect={() => setEditor({ open: true, setId: set.id })} className="gap-2">
                        <Pencil className="size-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setDeleting(set)} className="gap-2 text-destructive">
                        <Trash2 className="size-3.5" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <SecretSetDialog projectId={project.id} setId={editor.setId} open={editor.open} onOpenChange={(open) => setEditor((e) => ({ ...e, open }))} />
      <ApplySecretSetDialog project={project} set={applying} open={!!applying} onOpenChange={(open) => !open && setApplying(null)} />
      <ConfirmationDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete shared secrets?"
        description={`“${deleting?.name ?? "This set"}” will be removed for everyone on the team. This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={remove.isPending}
        onConfirm={() => deleting && remove.mutate({ projectId: project.id, setId: deleting.id }, { onSettled: () => setDeleting(null) })}
      />
    </Panel>
  );
}
