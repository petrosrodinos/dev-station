import { useEffect, type FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateNotionPage } from "@/features/integrations/hooks/use-integrations";
import type { NotionPage, NotionPageContent } from "@/features/integrations/interfaces/integrations.interfaces";
import { createNotionPageSchema, type CreateNotionPageFormData } from "../validation-schemas/notion.schema";

interface NewPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  /** Candidate parents — Notion can't create workspace-level pages through the API. */
  parents: NotionPage[];
  defaultParentId: string | null;
  onCreated: (page: NotionPageContent) => void;
}

export const NewPageDialog: FC<NewPageDialogProps> = ({ open, onOpenChange, connectionId, parents, defaultParentId, onCreated }) => {
  const create = useCreateNotionPage();
  const form = useForm<CreateNotionPageFormData>({ resolver: zodResolver(createNotionPageSchema), defaultValues: { title: "", parent_id: defaultParentId ?? "" } });

  useEffect(() => {
    if (open) form.reset({ title: "", parent_id: defaultParentId ?? "" });
  }, [open, defaultParentId, form]);

  const onSubmit = (data: CreateNotionPageFormData) =>
    create.mutate(
      { connectionId, ...data },
      {
        onSuccess: (page) => {
          onOpenChange(false);
          onCreated(page);
        },
      },
    );

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Notion page</DialogTitle>
          <DialogDescription>The page is created inside the parent you choose, then opens for editing.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Architecture notes" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent page</FormLabel>
                  <Select value={field.value || null} onValueChange={(v: string | null) => field.onChange(v ?? "")}>
                    <FormControl>
                      <SelectTrigger aria-label="Parent page" className="w-full">
                        <SelectValue placeholder="Choose a parent page" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {parents.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title || "Untitled"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={create.isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
