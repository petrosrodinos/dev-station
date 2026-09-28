import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useGitCreateBranch } from "@/features/git/hooks/use-git";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { branchSchema, type BranchFormData } from "../../../validation-schemas/project.schema";

export function CreateBranchDialog({ projectId, open, onOpenChange }: { projectId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = useGitCreateBranch();
  const { can } = usePermissions();
  const form = useForm<BranchFormData>({ resolver: zodResolver(branchSchema), defaultValues: { name: "", checkout: true } });

  useEffect(() => {
    if (open) form.reset({ name: "", checkout: true });
  }, [open, form]);

  if (!can(PermissionKeys.GIT_MANAGE_BRANCHES)) return null;

  const onSubmit = (data: BranchFormData) => create.mutate({ projectId, name: data.name, checkout: data.checkout }, { onSuccess: () => onOpenChange(false) });

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create branch</DialogTitle>
          <DialogDescription>Branches from the current HEAD.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch name</FormLabel>
                  <FormControl>
                    <Input placeholder="feature/lin-234-property-filtering" className="font-mono" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="checkout"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                  </FormControl>
                  <FormLabel className="font-normal">Switch to the new branch</FormLabel>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={create.isPending}>
                Create branch
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
