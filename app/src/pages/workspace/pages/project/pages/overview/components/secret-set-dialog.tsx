import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardPaste, Eye, EyeOff, Lock, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCreateSecretSet, useSecretSet, useUpdateSecretSet } from "@/features/project-secrets/hooks/use-project-secrets";
import { parseEnvText } from "@/features/project-secrets/utils/env-text.utils";
import type { SecretSet } from "@/features/project-secrets/interfaces/project-secrets.interfaces";
import { secretSetFormSchema, type SecretSetFormData } from "../../../validation-schemas/secret-set.schema";

// Values whose names look like credentials are masked until "Show values" is on.
const SECRET_KEY_RE = /(SECRET|TOKEN|PASSWORD|PASSWD|PASS$|PRIVATE|CREDENTIAL|API_KEY|_KEY$|^KEY$|DSN|AUTH)/i;

interface SecretSetDialogProps {
  projectId: string;
  /** `null` creates a new set; an id edits that set (its values are fetched and decrypted on open). */
  setId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SecretSetDialog({ projectId, setId, open, onOpenChange }: SecretSetDialogProps) {
  const editing = setId !== null;
  const existing = useSecretSet(projectId, setId, open && editing);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="size-4" /> {editing ? "Edit shared secrets" : "New shared secrets"}
          </DialogTitle>
          <DialogDescription>Stored encrypted on Dev Station's servers and visible to members who can view secrets in this organization.</DialogDescription>
        </DialogHeader>
        {editing && existing.isPending ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : editing && existing.isError ? (
          <div className="py-6 text-center text-[0.8125rem] text-muted-foreground">{existing.error.message}</div>
        ) : (
          // Keyed so each opening starts from the freshly fetched values.
          <SecretSetForm key={existing.data?.id ?? "new"} projectId={projectId} set={existing.data ?? null} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SecretSetForm({ projectId, set, onDone }: { projectId: string; set: SecretSet | null; onDone: () => void }) {
  const create = useCreateSecretSet();
  const update = useUpdateSecretSet();
  const [showValues, setShowValues] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteNote, setPasteNote] = useState<string | null>(null);

  const form = useForm<SecretSetFormData>({
    resolver: zodResolver(secretSetFormSchema),
    defaultValues: { name: set?.name ?? "", description: set?.description ?? "", variables: set?.variables ?? [{ key: "", value: "" }] },
  });
  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "variables" });
  const rows = useWatch({ control: form.control, name: "variables" }) ?? [];
  const pending = create.isPending || update.isPending;

  const importPasted = () => {
    const { variables, skipped } = parseEnvText(pasteText);
    if (variables.length === 0) {
      setPasteNote("No KEY=value lines found.");
      return;
    }
    // Pasted keys overwrite rows with the same name; everything else is kept.
    const current = (form.getValues("variables") ?? []).filter((v) => v.key || v.value);
    const pastedByKey = new Map(variables.map((v) => [v.key, v.value]));
    const merged = current.map((v) => (pastedByKey.has(v.key) ? { key: v.key, value: pastedByKey.get(v.key)! } : v));
    const known = new Set(current.map((v) => v.key));
    replace([...merged, ...variables.filter((v) => !known.has(v.key))]);
    form.setValue("variables", form.getValues("variables"), { shouldDirty: true });
    setPasteText("");
    setPasteOpen(false);
    setPasteNote(skipped > 0 ? `Imported ${variables.length}; ${skipped} line${skipped === 1 ? "" : "s"} could not be read.` : `Imported ${variables.length} variable${variables.length === 1 ? "" : "s"}.`);
  };

  const onSubmit = (data: SecretSetFormData) => {
    const variables = data.variables.filter((v) => v.key || v.value).map((v) => ({ key: v.key.trim(), value: v.value }));
    const payload = { name: data.name.trim(), description: data.description?.trim() ?? "", variables };
    if (set) update.mutate({ projectId, setId: set.id, ...payload }, { onSuccess: onDone });
    else create.mutate({ projectId, ...payload }, { onSuccess: onDone });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} aria-label="Set name" placeholder="Name, e.g. api .env" className="h-8 text-xs" autoFocus={!set} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} aria-label="Description" placeholder="Description (optional)" className="h-8 text-xs" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[0.7188rem] text-muted-foreground">
            {fields.length} variable{fields.length === 1 ? "" : "s"}
          </span>
          {pasteNote && <span className="text-[0.7188rem] text-muted-foreground">· {pasteNote}</span>}
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setPasteOpen((o) => !o)}>
              <ClipboardPaste className="size-3.5" /> Paste .env
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setShowValues((v) => !v)}>
              {showValues ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {showValues ? "Hide secrets" : "Show secrets"}
            </Button>
          </div>
        </div>

        {pasteOpen && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-2">
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={6}
              spellCheck={false}
              autoComplete="off"
              aria-label="Paste .env content"
              placeholder={"DATABASE_URL=postgres://...\nAPI_KEY=..."}
              className="font-mono text-[0.7813rem]"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setPasteOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" disabled={!pasteText.trim()} onClick={importPasted}>
                Add to this set
              </Button>
            </div>
          </div>
        )}

        <div className="max-h-[40vh] space-y-1.5 overflow-y-auto pr-1">
          {fields.length === 0 && <div className="py-4 text-center text-[0.8125rem] text-muted-foreground">No variables yet.</div>}
          {fields.map((field, index) => {
            const key = rows[index]?.key ?? "";
            const masked = !showValues && SECRET_KEY_RE.test(key);
            return (
              <div key={field.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_2rem] items-start gap-2">
                <FormField
                  control={form.control}
                  name={`variables.${index}.key`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...f} aria-label="Variable name" placeholder="NAME" spellCheck={false} className="h-8 font-mono text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`variables.${index}.value`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...f}
                          type={masked ? "password" : "text"}
                          aria-label={`Value of ${key || "variable"}`}
                          placeholder="value"
                          spellCheck={false}
                          autoComplete="off"
                          className={cn("h-8 font-mono text-xs")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${key || "variable"}`} onClick={() => remove(index)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>

        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => append({ key: "", value: "" }, { shouldFocus: true })}>
          <Plus className="size-3.5" /> Add variable
        </Button>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {set ? "Save changes" : "Create set"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
