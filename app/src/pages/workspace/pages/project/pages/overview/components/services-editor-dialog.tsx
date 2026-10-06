import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight, Plus, ScanSearch, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  Project,
  ServiceInput,
} from "@/features/projects/interfaces/projects.interfaces";
import { useReplaceProjectServices } from "@/features/projects/hooks/use-projects";
import { isBlockingMutation, willQueueWrite } from "@/lib/mutation-state";
import { useCloseWhenParked } from "@/hooks/use-close-when-parked";
import { useInspectProject } from "@/features/local-workspace/hooks/use-local-workspace";
import { ServiceKindFormOptions } from "@/config/constants/dropdowns/projects/service-kind-form.options";
import { PackageManagerFormOptions } from "@/config/constants/dropdowns/projects/package-manager-form.options";
import { isDesktop } from "@/lib/desktop";
import { cn } from "@/lib/utils";
import type { DetectedService } from "@shared/contract";
import { assignServiceSlugs } from "@shared/service-refs";
import {
  servicesFormSchema,
  type ServiceFormValue,
  type ServicesFormData,
} from "../../../validation-schemas/project.schema";
import {
  ServiceEnvEditor,
  type ServiceReferenceTarget,
} from "./service-env-editor";

const toFormValue = (s: {
  name: string;
  kind: string;
  cwd: string;
  package_manager: string | null;
  script: string | null;
  command: string | null;
  port: number | null;
  env?: Record<string, string> | null;
  auto_detected?: boolean;
}): ServiceFormValue => ({
  name: s.name,
  kind: s.kind as ServiceFormValue["kind"],
  cwd: s.cwd || ".",
  mode: s.script ? "script" : "command",
  package_manager: (s.package_manager ??
    undefined) as ServiceFormValue["package_manager"],
  script: s.script ?? "",
  command: s.command ?? "",
  port: s.port ? String(s.port) : "",
  env: Object.entries(s.env ?? {}).map(([key, value]) => ({
    key,
    value: String(value),
  })),
  auto_detected: s.auto_detected ?? false,
});

const toInput = (v: ServiceFormValue): ServiceInput => {
  const port = v.port ? Number(v.port) : null;
  const env = Object.fromEntries(
    v.env.filter((row) => row.key).map((row) => [row.key, row.value]),
  );
  return {
    name: v.name,
    kind: v.kind,
    cwd: v.cwd || ".",
    package_manager: v.mode === "script" ? (v.package_manager ?? "npm") : null,
    script: v.mode === "script" ? v.script || null : null,
    command: v.mode === "command" ? v.command || null : null,
    port,
    url: port ? `http://localhost:${port}` : null,
    env: Object.keys(env).length ? env : null,
    auto_detected: v.auto_detected ?? false,
  };
};

/** Edit the project's service definitions; "Detect" re-reads package.json / compose files from disk. */
export function ServicesEditorDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useReplaceProjectServices();
  useCloseWhenParked(save, () => onOpenChange(false));
  const detection = useInspectProject(project.id, open && isDesktop());
  const form = useForm<ServicesFormData>({
    resolver: zodResolver(servicesFormSchema),
    defaultValues: { services: [] },
  });
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "services",
  });
  const watched = form.watch("services");
  // The name other services use to reference each one (`{{api.url}}`); kept in sync with the live form.
  const slugs = assignServiceSlugs(watched.map((s) => s?.name || "service"));

  // Cards are collapsed by default (unless there is only one) so the list stays scannable; `toggled` flips that default per card.
  const [toggled, setToggled] = useState<Set<string>>(new Set());
  const openNewest = useRef(false);
  const isOpen = (id: string) => (fields.length === 1) !== toggled.has(id);
  const toggle = (id: string) =>
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  useEffect(() => {
    if (open) {
      form.reset({ services: project.services.map(toFormValue) });
      setToggled(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A freshly added service opens straight away so it can be filled in.
  useEffect(() => {
    if (!openNewest.current) return;
    openNewest.current = false;
    const last = fields[fields.length - 1];
    if (last && fields.length > 1)
      setToggled((prev) => new Set(prev).add(last.id));
  }, [fields]);

  // Expand cards that failed validation so the error is not hidden.
  const onInvalid = (errors: typeof form.formState.errors) => {
    const bad = (errors.services ?? []) as unknown[];
    setToggled((prev) => {
      const next = new Set(prev);
      fields.forEach((f, i) => {
        if (bad[i] && !((fields.length === 1) !== next.has(f.id)))
          next.add(f.id);
      });
      return next;
    });
  };

  const applyDetected = (detected: DetectedService[]) =>
    replace(detected.map((d) => toFormValue({ ...d, auto_detected: true })));

  const onSubmit = (data: ServicesFormData) => {
    save.mutate(
      { id: project.id, services: data.services.map(toInput) },
      { onSuccess: () => onOpenChange(false) },
    );
    if (willQueueWrite()) onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !isBlockingMutation(save) && onOpenChange(o)}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Services</DialogTitle>
          <DialogDescription>
            Processes you can start from Dev Station. If a port is taken, the
            next free one is used automatically.
          </DialogDescription>
        </DialogHeader>

        {detection.data && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-surface-elevated p-2.5 text-xs text-muted-foreground">
            <ScanSearch className="size-3.5" /> Detected:
            {detection.data.package_manager && (
              <Badge variant="secondary">
                {detection.data.package_manager}
              </Badge>
            )}
            {detection.data.monorepo_tools.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
            {[
              ...new Set(detection.data.packages.flatMap((p) => p.frameworks)),
            ].map((f) => (
              <Badge key={f} variant="outline">
                {f}
              </Badge>
            ))}
            {detection.data.has_docker && (
              <Badge variant="outline">Docker</Badge>
            )}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="ml-auto h-7 text-xs"
              onClick={() => applyDetected(detection.data!.services)}
            >
              Use {detection.data.services.length} detected service
              {detection.data.services.length === 1 ? "" : "s"}
            </Button>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onInvalid)}
            className="space-y-3"
          >
            {fields.length === 0 && (
              <div className="rounded-md border border-dashed py-8 text-center text-[0.8125rem] text-muted-foreground">
                No services defined.
              </div>
            )}
            {fields.map((field, index) => {
              const mode = form.watch(`services.${index}.mode`);
              const cwd = form.watch(`services.${index}.cwd`);
              const scripts =
                detection.data?.packages.find((p) => p.path === (cwd || "."))
                  ?.scripts ?? {};
              const current = watched[index];
              const expanded = isOpen(field.id);
              const kindLabel =
                ServiceKindFormOptions.find((o) => o.id === current?.kind)
                  ?.label ?? current?.kind;
              const summary =
                mode === "script"
                  ? [current?.package_manager ?? "npm", "run", current?.script]
                      .filter(Boolean)
                      .join(" ")
                  : current?.command;
              const targets: ServiceReferenceTarget[] = watched.map((s, n) => ({
                slug: slugs[n],
                name: s?.name || slugs[n],
                hasPort: /^\d+$/.test(s?.port ?? ""),
                isSelf: n === index,
              }));
              return (
                <div key={field.id} className="rounded-md border">
                  <div className="flex items-center gap-1 pr-1.5">
                    <button
                      type="button"
                      onClick={() => toggle(field.id)}
                      aria-expanded={expanded}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-3 py-2.5 text-left hover:bg-surface-elevated"
                    >
                      <ChevronRight
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform",
                          expanded && "rotate-90",
                        )}
                      />
                      <span className="truncate text-sm font-medium">
                        {current?.name || "Untitled service"}
                      </span>
                      <Badge variant="secondary" className="shrink-0">
                        {kindLabel}
                      </Badge>
                      {current?.port && (
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          :{current.port}
                        </span>
                      )}
                      <span className="ml-auto hidden min-w-0 truncate font-mono text-xs text-muted-foreground sm:block">
                        {summary}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground hover:text-danger"
                      onClick={() => remove(index)}
                      aria-label="Remove service"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  {expanded && (
                    <div className="grid grid-cols-12 gap-x-3 gap-y-3 border-t p-4">
                      <p className="col-span-12 -mt-1 text-xs text-muted-foreground">
                        Other services can refer to this one as{" "}
                        <code className="font-mono">{`{{${slugs[index]}.url}}`}</code>
                        .
                      </p>
                      <FormField
                        control={form.control}
                        name={`services.${index}.name`}
                        render={({ field: f }) => (
                          <FormItem className="col-span-12 sm:col-span-4">
                            <FormLabel className="text-xs">Name</FormLabel>
                            <FormControl>
                              <Input {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`services.${index}.kind`}
                        render={({ field: f }) => (
                          <FormItem className="col-span-12 sm:col-span-3">
                            <FormLabel className="text-xs">Type</FormLabel>
                            <Select value={f.value} onValueChange={f.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ServiceKindFormOptions.map((o) => (
                                  <SelectItem key={o.id} value={o.id}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`services.${index}.cwd`}
                        render={({ field: f }) => (
                          <FormItem className="col-span-12 sm:col-span-3">
                            <FormLabel className="text-xs">Folder</FormLabel>
                            <FormControl>
                              <Input
                                className="font-mono text-xs"
                                placeholder="."
                                {...f}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`services.${index}.port`}
                        render={({ field: f }) => (
                          <FormItem className="col-span-12 sm:col-span-2">
                            <FormLabel
                              className="text-xs"
                              title="Preferred port. If it is taken, the next free one is used."
                            >
                              Port
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="font-mono text-xs"
                                placeholder="5173"
                                {...f}
                                value={f.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`services.${index}.mode`}
                        render={({ field: f }) => (
                          <FormItem className="col-span-12 sm:col-span-4">
                            <FormLabel className="text-xs">Runs</FormLabel>
                            <Select value={f.value} onValueChange={f.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="script">
                                  package.json script
                                </SelectItem>
                                <SelectItem value="command">
                                  Custom command
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      {mode === "script" ? (
                        <>
                          <FormField
                            control={form.control}
                            name={`services.${index}.package_manager`}
                            render={({ field: f }) => (
                              <FormItem className="col-span-12 sm:col-span-3">
                                <FormLabel className="text-xs">
                                  Package manager
                                </FormLabel>
                                <Select
                                  value={f.value ?? "npm"}
                                  onValueChange={f.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {PackageManagerFormOptions.map((o) => (
                                      <SelectItem key={o.id} value={o.id}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`services.${index}.script`}
                            render={({ field: f }) => (
                              <FormItem className="col-span-12 sm:col-span-5">
                                <FormLabel className="text-xs">
                                  Script
                                </FormLabel>
                                {Object.keys(scripts).length ? (
                                  <Select
                                    // Explicit labels: the trigger shows only the script name, not the (possibly long) command.
                                    items={Object.keys(scripts).map((name) => ({ label: name, value: name }))}
                                    value={f.value ?? ""}
                                    onValueChange={f.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full min-w-0 font-mono text-xs">
                                        <SelectValue placeholder="Choose a script" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Object.entries(scripts).map(
                                        ([name, cmd]) => (
                                          <SelectItem
                                            key={name}
                                            value={name}
                                            className="font-mono text-xs"
                                          >
                                            {name}{" "}
                                            <span className="ml-2 text-ash">
                                              {cmd.slice(0, 40)}
                                            </span>
                                          </SelectItem>
                                        ),
                                      )}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <FormControl>
                                    <Input
                                      className="font-mono text-xs"
                                      placeholder="dev"
                                      {...f}
                                      value={f.value ?? ""}
                                    />
                                  </FormControl>
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      ) : (
                        <FormField
                          control={form.control}
                          name={`services.${index}.command`}
                          render={({ field: f }) => (
                            <FormItem className="col-span-12 sm:col-span-8">
                              <FormLabel className="text-xs">Command</FormLabel>
                              <FormControl>
                                <Input
                                  className="font-mono text-xs"
                                  placeholder="docker compose up db"
                                  {...f}
                                  value={f.value ?? ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <ServiceEnvEditor
                        form={form}
                        index={index}
                        targets={targets}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                openNewest.current = true;
                append({
                  name: "",
                  kind: "OTHER",
                  cwd: ".",
                  mode: "script",
                  package_manager: detection.data?.package_manager ?? "npm",
                  script: "",
                  command: "",
                  port: "",
                  env: [],
                });
              }}
            >
              <Plus className="size-3.5" /> Add service
            </Button>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isBlockingMutation(save)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={save.isPending}>
                Save services
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
