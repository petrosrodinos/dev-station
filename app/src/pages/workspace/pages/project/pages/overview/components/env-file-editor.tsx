import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightLeft, Eye, EyeOff, Plus, RotateCw, Search, Trash2, TriangleAlert } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEnvFile, useSaveEnvFile } from "@/features/env-files/hooks/use-env-files";
import { useProjectProcesses } from "@/features/processes/hooks/use-processes";
import { EnvOverrideSourceOptions, getEnvOverrideSourceDescription } from "@/config/constants/dropdowns/projects/env-override-source.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { getBridgeErrorCode } from "@/lib/desktop";
import { cn } from "@/lib/utils";
import { IpcErrorCodes, type EnvFileSummary, type EnvRuntimeOverride } from "@shared/contract";
import { envFileFormSchema, type EnvFileFormData } from "../../../validation-schemas/env-file.schema";

// Values whose names look like credentials are masked until "Show values" is on.
const SECRET_KEY_RE = /(SECRET|TOKEN|PASSWORD|PASSWD|PASS$|PRIVATE|CREDENTIAL|API_KEY|_KEY$|^KEY$|DSN|AUTH)/i;

interface EnvFileEditorProps {
  projectId: string;
  file: EnvFileSummary;
  /** Reports unsaved changes so the parent can confirm before switching files. */
  onDirtyChange: (dirty: boolean) => void;
}

/** Key/value editor for one `.env*` file, with the values running services actually received. */
export function EnvFileEditor({ projectId, file, onDirtyChange }: EnvFileEditorProps) {
  const query = useEnvFile(projectId, file.path, true);
  const save = useSaveEnvFile();
  const [search, setSearch] = useState("");
  const [showValues, setShowValues] = useState(false);
  const [conflict, setConflict] = useState(false);

  const form = useForm<EnvFileFormData>({ resolver: zodResolver(envFileFormSchema), defaultValues: { variables: [] } });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "variables" });
  const rows = useWatch({ control: form.control, name: "variables" }) ?? [];
  const dirty = form.formState.isDirty;

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  // Load the file into the form; later refetches (overrides changed) only reset when nothing is being edited.
  const content = query.data;
  useEffect(() => {
    if (content && !form.formState.isDirty) form.reset({ variables: content.variables });
  }, [content, form]);

  // Running services changed (started, restarted, moved port) -> re-read to refresh the "running with" hints.
  const processes = useProjectProcesses(projectId);
  const runSignature = Object.values(processes)
    .map((p) => `${p.service_id}:${p.status}:${p.started_at}:${p.port}`)
    .sort()
    .join("|");
  const { refetch } = query;
  useEffect(() => {
    void refetch();
  }, [runSignature, refetch]);

  const overridesByKey = useMemo(() => {
    const map = new Map<string, EnvRuntimeOverride[]>();
    for (const o of content?.overrides ?? []) map.set(o.key, [...(map.get(o.key) ?? []), o]);
    return map;
  }, [content]);

  if (query.isPending) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_2rem] gap-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ))}
      </div>
    );
  }
  if (query.isError) {
    return <div className="px-4 py-6 text-center text-[0.8125rem] text-muted-foreground">{query.error.message}</div>;
  }

  const needle = search.trim().toLowerCase();
  const visible = fields
    .map((field, index) => ({ field, index }))
    .filter(({ index }) => !needle || `${rows[index]?.key ?? ""} ${rows[index]?.value ?? ""}`.toLowerCase().includes(needle));
  const pendingOverrides = [...overridesByKey.values()].flat().filter((o) => rows.find((r) => r.key === o.key)?.value !== o.value);

  const reload = async () => {
    setConflict(false);
    const fresh = await refetch();
    if (fresh.data) form.reset({ variables: fresh.data.variables });
  };

  const onSubmit = (data: EnvFileFormData) => {
    if (!content) return;
    const variables = data.variables.filter((v) => v.key || v.value).map((v) => ({ key: v.key.trim(), value: v.value }));
    save.mutate(
      { projectId, path: file.path, variables, mtimeMs: content.mtime_ms },
      {
        onSuccess: (saved) => form.reset({ variables: saved.variables }),
        onError: (error) => setConflict(getBridgeErrorCode(error) === IpcErrorCodes.FILE_CHANGED),
      },
    );
  };

  const applyOverride = (o: EnvRuntimeOverride) => {
    const index = rows.findIndex((r) => r.key === o.key);
    if (index >= 0) form.setValue(`variables.${index}.value`, o.value, { shouldDirty: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
        {conflict && (
          <Alert variant="destructive" className="m-4 mb-0 w-auto">
            <TriangleAlert />
            <AlertTitle>The file changed on disk</AlertTitle>
            <AlertDescription>Another program edited it after you opened it. Reload to see the new version; your unsaved edits will be lost.</AlertDescription>
            <AlertAction>
              <Button type="button" size="sm" variant="outline" onClick={reload}>
                Reload
              </Button>
            </AlertAction>
          </Alert>
        )}

        {pendingOverrides.length > 0 && (
          <Alert className="m-4 mb-0 w-auto">
            <ArrowRightLeft />
            <AlertTitle>
              {pendingOverrides.length} variable{pendingOverrides.length === 1 ? " differs" : "s differ"} from what running services received
            </AlertTitle>
            <AlertDescription>
              The service runs fine as is — Dev Station passes the right values at start. Write them to the file only if you want them to stay this way outside Dev Station.
            </AlertDescription>
            <AlertAction>
              <Button type="button" size="sm" variant="outline" onClick={() => pendingOverrides.forEach(applyOverride)}>
                Write all to file
              </Button>
            </AlertAction>
          </Alert>
        )}

        <div className="flex items-center gap-2 px-4 pt-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter variables" aria-label="Filter variables" className="h-8 pl-8 text-xs" />
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setShowValues((v) => !v)}>
            {showValues ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {showValues ? "Hide secrets" : "Show secrets"}
          </Button>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Reload from disk" onClick={reload} disabled={save.isPending}>
                  <RotateCw className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Reload from disk</TooltipContent>
          </Tooltip>
        </div>

        <div className="space-y-1.5 p-4">
          {fields.length === 0 && <div className="py-6 text-center text-[0.8125rem] text-muted-foreground">This file has no variables yet.</div>}
          {fields.length > 0 && visible.length === 0 && <div className="py-6 text-center text-[0.8125rem] text-muted-foreground">No variable matches “{search}”.</div>}
          {visible.map(({ field, index }) => {
            const key = rows[index]?.key ?? "";
            const value = rows[index]?.value ?? "";
            const masked = !showValues && SECRET_KEY_RE.test(key);
            const overrides = (overridesByKey.get(key) ?? []).filter((o) => o.value !== value);
            return (
              <div key={field.id} className="space-y-1">
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_2rem] items-start gap-2">
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
                            className={cn("h-8 font-mono text-xs", overrides.length > 0 && "border-info/60")}
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
                {overrides.map((o) => (
                  <div key={`${o.service_id}:${o.source}`} className="ml-[calc(40%+0.25rem)] flex min-w-0 items-center gap-1.5 text-[0.7188rem] text-info">
                    <ArrowRightLeft className="size-3 shrink-0" />
                    <span className="truncate">
                      {o.service_name} is running with <span className="font-mono">{masked ? "••••••" : o.value}</span>
                    </span>
                    <Tooltip>
                      <TooltipTrigger render={<span className="shrink-0 rounded bg-info-soft px-1.5 py-0.5 text-[0.6563rem]">{getDropdownOptionLabel(EnvOverrideSourceOptions, o.source)}</span>} />
                      <TooltipContent className="max-w-xs">{getEnvOverrideSourceDescription(o.source)}</TooltipContent>
                    </Tooltip>
                    <Button type="button" variant="link" size="sm" className="h-auto shrink-0 p-0 text-[0.7188rem]" onClick={() => applyOverride(o)}>
                      Write to file
                    </Button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 border-t px-4 py-3">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => append({ key: "", value: "" }, { shouldFocus: true })}>
            <Plus className="size-3.5" /> Add variable
          </Button>
          <span className="ml-auto text-[0.7188rem] text-muted-foreground">{dirty ? "Unsaved changes" : `${fields.length} variable${fields.length === 1 ? "" : "s"}`}</span>
          <Button type="button" variant="ghost" size="sm" disabled={!dirty || save.isPending} onClick={() => content && form.reset({ variables: content.variables })}>
            Discard
          </Button>
          <Button type="submit" size="sm" disabled={!dirty} loading={save.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}
