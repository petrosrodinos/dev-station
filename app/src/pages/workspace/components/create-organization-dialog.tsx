import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateOrganization } from "@/features/organizations/hooks/use-organizations";
import { createOrganizationSchema, type CreateOrganizationFormData } from "../validation-schemas/workspace.schema";

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationDialog({ open, onOpenChange }: CreateOrganizationDialogProps) {
  const createOrganization = useCreateOrganization();
  const form = useForm<CreateOrganizationFormData>({ resolver: zodResolver(createOrganizationSchema), defaultValues: { name: "" } });

  const onSubmit = (data: CreateOrganizationFormData) =>
    createOrganization.mutate(data, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !createOrganization.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New organization</DialogTitle>
          <DialogDescription>Organizations have their own members, roles, projects and integrations.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="LogiqDev" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createOrganization.isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={createOrganization.isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
