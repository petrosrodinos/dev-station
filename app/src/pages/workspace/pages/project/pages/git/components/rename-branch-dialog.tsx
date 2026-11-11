import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGitRenameBranch } from "@/features/git/hooks/use-git";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { renameBranchSchema, type RenameBranchFormData } from "../../../validation-schemas/project.schema";

/** Local rename (`git branch -m`). `published` warns that the remote branch keeps its old name. */
export function RenameBranchDialog({ projectId, branch, published, onClose }: { projectId: string; branch: string | null; published: boolean; onClose: () => void }) {
  const rename = useGitRenameBranch();
  const { can } = usePermissions();
  const form = useForm<RenameBranchFormData>({ resolver: zodResolver(renameBranchSchema), defaultValues: { name: branch ?? "" } });

  useEffect(() => {
    if (branch) form.reset({ name: branch });
  }, [branch, form]);

  if (!can(PermissionKeys.GIT_MANAGE_BRANCHES)) return null;

  const onSubmit = (data: RenameBranchFormData) => {
    if (!branch) return;
    if (data.name === branch) return onClose();
    rename.mutate({ projectId, from: branch, to: data.name }, { onSuccess: onClose });
  };

  return (
    <Dialog open={!!branch} onOpenChange={(o) => !o && !rename.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rename {branch}</DialogTitle>
          <DialogDescription>
            {published ? "Only the local branch is renamed. The remote keeps the old name until you push the new one." : "Renames the local branch."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New name</FormLabel>
                  <FormControl>
                    <Input className="font-mono" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={rename.isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={rename.isPending}>
                Rename
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
