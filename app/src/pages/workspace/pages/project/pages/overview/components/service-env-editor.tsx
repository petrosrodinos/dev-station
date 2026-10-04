import { useState } from "react";
import { Braces, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ServiceReferenceFieldOptions } from "@/config/constants/dropdowns/projects/service-reference-field.options";
import type { ServicesFormData } from "../../../validation-schemas/project.schema";

export interface ServiceReferenceTarget {
  slug: string;
  name: string;
  hasPort: boolean;
  isSelf: boolean;
}

interface ServiceEnvEditorProps {
  form: UseFormReturn<ServicesFormData>;
  index: number;
  targets: ServiceReferenceTarget[];
}

/**
 * Environment variables passed to one service. Values can reference other services (`{{api.url}}`) so they
 * follow the port that service actually gets when its preferred port is already taken.
 */
export function ServiceEnvEditor({
  form,
  index,
  targets,
}: ServiceEnvEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `services.${index}.env`,
  });
  const withPort = targets.filter((t) => t.hasPort);
  const [open, setOpen] = useState(false);

  const insert = (row: number, token: string) => {
    const path = `services.${index}.env.${row}.value` as const;
    form.setValue(path, `${form.getValues(path) ?? ""}${token}`, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="col-span-12 space-y-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronRight
          className={cn("size-3.5 transition-transform", open && "rotate-90")}
        />
        Environment variables{fields.length > 0 && ` (${fields.length})`}
      </button>
      {open && (
        <p className="text-[0.6875rem] text-muted-foreground">
          Use <code className="font-mono">{"{{api.url}}"}</code> to point at
          another service's port. <code className="font-mono">PORT</code> is set
          automatically.
        </p>
      )}

      {open &&
        fields.map((row, i) => (
          <div key={row.id} className="grid grid-cols-12 items-start gap-2">
            <FormField
              control={form.control}
              name={`services.${index}.env.${i}.key`}
              render={({ field }) => (
                <FormItem className="col-span-12 sm:col-span-4">
                  <FormControl>
                    <Input
                      className="font-mono text-xs"
                      placeholder="VITE_API_URL"
                      aria-label="Variable name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`services.${index}.env.${i}.value`}
              render={({ field }) => (
                <FormItem className="col-span-12 sm:col-span-7">
                  <FormControl>
                    <Input
                      className="font-mono text-xs"
                      placeholder="{{api.url}}"
                      aria-label="Variable value"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="col-span-12 sm:col-span-1 flex items-center gap-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground"
                      aria-label="Insert service reference"
                      disabled={!withPort.length}
                    >
                      <Braces className="size-3.5" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-56">
                  {withPort.map((t, n) => (
                    <div key={t.slug}>
                      {n > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel className="text-xs">
                        {t.name}
                        {t.isSelf ? " (this service)" : ""}
                      </DropdownMenuLabel>
                      {ServiceReferenceFieldOptions.map((o) => {
                        const token = t.isSelf
                          ? `{{${o.id}}}`
                          : `{{${t.slug}.${o.id}}}`;
                        return (
                          <DropdownMenuItem
                            key={o.id}
                            className="justify-between font-mono text-xs"
                            onSelect={() => insert(i, token)}
                          >
                            <span className="font-sans">{o.label}</span>
                            {token}
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-danger"
                onClick={() => remove(i)}
                aria-label="Remove variable"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}

      {open && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => append({ key: "", value: "" })}
        >
          <Plus className="size-3.5" /> Add variable
        </Button>
      )}
    </div>
  );
}
