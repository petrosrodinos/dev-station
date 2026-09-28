import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { useCreateGitIdentity, useDeleteGitIdentity, useGitIdentities, useUpdateGitIdentity } from "@/features/git-identities/hooks/use-git-identities";
import type { GitIdentity } from "@/features/git-identities/interfaces/git-identities.interfaces";
import { gitIdentitySchema, type GitIdentityFormData } from "../validation-schemas/settings.schema";
import { SettingsSectionHeader } from "./settings-row";

const PLACEHOLDERS = { label: "Work", name: "Jane Doe", email: "jane@company.com" } as const;

const EMPTY: GitIdentityFormData = { label: "", name: "", email: "" };

function IdentityDialog({ identity, open, onClose }: { identity: GitIdentity | null; open: boolean; onClose: () => void }) {
  const create = useCreateGitIdentity();
  const update = useUpdateGitIdentity();
  const form = useForm<GitIdentityFormData>({ resolver: zodResolver(gitIdentitySchema), defaultValues: EMPTY });

  useEffect(() => {
    if (open) form.reset(identity ? { label: identity.label, name: identity.name, email: identity.email } : EMPTY);
  }, [open, identity, form]);

  const onSubmit = (data: GitIdentityFormData) => {
    const options = { onSuccess: onClose };
    if (identity) update.mutate({ id: identity.id, ...data }, options);
    else create.mutate(data, options);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{identity ? "Edit identity" : "Add identity"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {(["label", "name", "email"] as const).map((key) => (
              <FormField
                key={key}
                control={form.control}
                name={key}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="capitalize">{key === "label" ? "Label (e.g. Work)" : key}</FormLabel>
                    <FormControl>
                      <Input placeholder={PLACEHOLDERS[key]} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={create.isPending || update.isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function GitIdentitiesSection() {
  const { data: identities, isPending } = useGitIdentities();
  const update = useUpdateGitIdentity();
  const remove = useDeleteGitIdentity();
  const [editing, setEditing] = useState<GitIdentity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removing, setRemoving] = useState<GitIdentity | null>(null);

  const openDialog = (identity: GitIdentity | null) => {
    setEditing(identity);
    setDialogOpen(true);
  };

  return (
    <section>
      <SettingsSectionHeader title="Identities" description="Commit author identities. The default is used unless you pick another when committing. With none, your global Git config applies." />
      {isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        identities?.map((i) => (
          <div key={i.id} className="flex items-center gap-2 border-b border-hairline-soft py-2 text-[0.8125rem]">
            <span className="font-medium">{i.label}</span>
            <span className="truncate text-muted-foreground">
              {i.name} &lt;{i.email}&gt;
            </span>
            {i.is_default && <Badge variant="secondary">default</Badge>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-auto size-7" aria-label={`Actions for ${i.label}`}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => openDialog(i)}>Edit</DropdownMenuItem>
                {!i.is_default && <DropdownMenuItem onSelect={() => update.mutate({ id: i.id, is_default: true })}>Make default</DropdownMenuItem>}
                <DropdownMenuItem className="text-destructive" onSelect={() => setRemoving(i)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))
      )}
      <Button variant="ghost" size="sm" className="mt-2 gap-1 text-muted-foreground" onClick={() => openDialog(null)}>
        <Plus className="size-3.5" /> Add identity
      </Button>

      <IdentityDialog identity={editing} open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <ConfirmationDialog
        isOpen={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
        title={`Delete ${removing?.label}?`}
        description={removing?.is_default ? "Your oldest remaining identity becomes the default." : "Commits already made keep their author."}
        confirmText="Delete identity"
        variant="destructive"
        isLoading={remove.isPending}
      />
    </section>
  );
}
