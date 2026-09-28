import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CustomShortcutActionFormOptions, CustomShortcutTypeFormOptions } from "@/config/constants/dropdowns/shared/shortcut-action.options";
import { CustomShortcutTypes, type CustomShortcut } from "@/features/users/interfaces/users.interfaces";
import { getComboConflict, type ResolvedShortcut } from "@/lib/shortcuts.utils";
import { customShortcutSchema, type CustomShortcutFormData } from "../validation-schemas/shortcut.schema";
import { ShortcutRecorder } from "./shortcut-recorder";

interface CustomShortcutDialogProps {
  open: boolean;
  /** Null when creating a new shortcut. */
  editing: CustomShortcut | null;
  shortcuts: ResolvedShortcut[];
  onSubmit: (data: CustomShortcutFormData, editingId: string | null) => void;
  onClose: () => void;
}

const EMPTY_VALUES: CustomShortcutFormData = { name: "", type: CustomShortcutTypes.AI_PROMPT, action_id: "", prompt: "", combo: "" };

export function CustomShortcutDialog({ open, editing, shortcuts, onSubmit, onClose }: CustomShortcutDialogProps) {
  const form = useForm<CustomShortcutFormData>({ resolver: zodResolver(customShortcutSchema), defaultValues: EMPTY_VALUES });
  const type = form.watch("type");

  useEffect(() => {
    if (!open) return;
    form.reset(
      editing
        ? { name: editing.name, type: editing.type, action_id: editing.action_id ?? "", prompt: editing.prompt ?? "", combo: editing.combo }
        : EMPTY_VALUES,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const submit = (data: CustomShortcutFormData) => {
    const conflict = getComboConflict(data.combo, shortcuts, editing?.id ?? null);
    if (conflict) {
      form.setError("combo", { message: conflict });
      return;
    }
    onSubmit(data, editing?.id ?? null);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit custom shortcut" : "New custom shortcut"}</DialogTitle>
          <DialogDescription>Run an action or start an AI session from anywhere in the workspace.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Review my diff" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What should it do?</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CustomShortcutTypeFormOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {type === CustomShortcutTypes.ACTION ? (
              <FormField
                control={form.control}
                name="action_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action</FormLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an action" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72">
                        {CustomShortcutActionFormOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prompt</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Review the uncommitted changes and point out bugs." {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>Opens New AI session with this prompt filled in, so you can review it before starting.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="combo"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Shortcut</FormLabel>
                  <ShortcutRecorder
                    value={field.value || null}
                    onChange={(combo) => {
                      form.clearErrors("combo");
                      field.onChange(combo);
                      const conflict = getComboConflict(combo, shortcuts, editing?.id ?? null);
                      if (conflict) form.setError("combo", { message: conflict });
                    }}
                    error={fieldState.error?.message}
                  />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">{editing ? "Save" : "Add shortcut"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
