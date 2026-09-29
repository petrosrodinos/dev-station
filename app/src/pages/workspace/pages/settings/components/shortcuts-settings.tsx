import { Fragment, useMemo, useState } from "react";
import {
  AlertTriangle,
  Gamepad2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { ShortcutKeys } from "@/components/ui/shortcut-keys";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShortcutGroupOptions } from "@/config/constants/dropdowns/shared/shortcut-action.options";
import { useShortcutSettings } from "@/features/users/hooks/use-shortcuts";
import {
  CustomShortcutTypes,
  type CustomShortcut,
} from "@/features/users/interfaces/users.interfaces";
import {
  describeShortcutTarget,
  findConflictingIds,
  type ResolvedShortcut,
} from "@/lib/shortcuts.utils";
import { useDialogsStore } from "@/stores/dialogs";
import type { CustomShortcutFormData } from "../validation-schemas/shortcut.schema";
import { SettingsSectionHeader } from "./settings-row";
import { ShortcutBindingDialog } from "./shortcut-binding-dialog";
import { CustomShortcutDialog } from "./custom-shortcut-dialog";

const MAX_CUSTOM_SHORTCUTS = 20;
const SHOW_CUSTOM_SHORTCUTS = false;

function RowAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={onClick}
            aria-label={label}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ShortcutsSettings() {
  const {
    shortcuts,
    setBinding,
    resetBinding,
    addCustom,
    updateCustom,
    removeCustom,
    resetAll,
  } = useShortcutSettings();
  const setShortcutsPractice = useDialogsStore((s) => s.setShortcutsPractice);
  const [editing, setEditing] = useState<ResolvedShortcut | null>(null);
  const [customDialog, setCustomDialog] = useState<{
    open: boolean;
    editing: CustomShortcut | null;
  }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<CustomShortcut | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const conflicting = useMemo(() => findConflictingIds(shortcuts), [shortcuts]);
  const customShortcuts = useMemo(
    () => shortcuts.filter((s) => s.kind === "custom"),
    [shortcuts],
  );
  const hasChanges = shortcuts.some(
    (s) => (s.kind === "action" && !s.is_default) || s.kind === "custom",
  );

  const submitCustom = (
    data: CustomShortcutFormData,
    editingId: string | null,
  ) => {
    const shortcut: Omit<CustomShortcut, "id"> =
      data.type === CustomShortcutTypes.ACTION
        ? {
            name: data.name,
            combo: data.combo,
            type: data.type,
            action_id: data.action_id,
          }
        : {
            name: data.name,
            combo: data.combo,
            type: data.type,
            prompt: data.prompt,
          };
    if (editingId)
      updateCustom(editingId, {
        action_id: undefined,
        prompt: undefined,
        ...shortcut,
      });
    else addCustom({ id: crypto.randomUUID(), ...shortcut });
    setCustomDialog({ open: false, editing: null });
  };

  const conflictIcon = (id: string) =>
    conflicting.has(id) && (
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertTriangle
              className="size-3.5 text-warning"
              aria-label="Shortcut conflict"
            />
          }
        />
        <TooltipContent>
          Another shortcut uses the same keys. Change one of them.
        </TooltipContent>
      </Tooltip>
    );

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-col gap-x-4 sm:flex-row sm:items-start sm:justify-between">
          <SettingsSectionHeader
            title="Keyboard shortcuts"
            description="Change the keys for built-in actions. Synced to your account."
          />
          <div className="mb-3 flex shrink-0 gap-2 sm:mb-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShortcutsPractice(true)}
            >
              <Gamepad2 className="size-4" /> Practice
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!hasChanges}
              onClick={() => setResetOpen(true)}
            >
              <RotateCcw className="size-4" /> Reset all
            </Button>
          </div>
        </div>
        <Table>
          <TableBody>
            {ShortcutGroupOptions.map((group) => {
              const rows = shortcuts.filter(
                (s) => s.kind === "action" && s.group === group.id,
              );
              if (!rows.length) return null;
              return (
                <Fragment key={group.id}>
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={3}
                      className="pb-1 pt-4 text-xs font-medium text-muted-foreground"
                    >
                      {group.label}
                    </TableCell>
                  </TableRow>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-[0.8125rem]">
                        <span className="flex flex-wrap items-center gap-2">
                          {row.label}
                          {conflictIcon(row.id)}
                          {!row.rebindable && (
                            <Badge variant="outline">Fixed</Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="sm:w-56">
                        {row.combo ? (
                          <ShortcutKeys combo={row.combo} />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Not set
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="w-16 text-right sm:w-20">
                        {row.rebindable && (
                          <span className="inline-flex gap-0.5">
                            <RowAction
                              label="Change shortcut"
                              onClick={() => setEditing(row)}
                            >
                              <Pencil className="size-3.5" />
                            </RowAction>
                            {!row.is_default && (
                              <RowAction
                                label="Reset to default"
                                onClick={() => resetBinding(row.id)}
                              >
                                <RotateCcw className="size-3.5" />
                              </RowAction>
                            )}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </section>

      {SHOW_CUSTOM_SHORTCUTS && (
        <section>
          <div className="flex flex-col gap-x-4 sm:flex-row sm:items-start sm:justify-between">
            <SettingsSectionHeader
              title="Custom shortcuts"
              description="Run an action or open a new AI session with a saved prompt."
            />
            <Button
              size="sm"
              className="mb-3 gap-2 self-start sm:mb-0"
              disabled={customShortcuts.length >= MAX_CUSTOM_SHORTCUTS}
              onClick={() => setCustomDialog({ open: true, editing: null })}
            >
              <Plus className="size-4" /> Add shortcut
            </Button>
          </div>
          {customShortcuts.length === 0 ? (
            <div className="rounded-md border border-dashed px-4 py-6 text-center text-[0.8125rem] text-muted-foreground">
              No custom shortcuts yet.
            </div>
          ) : (
            <Table>
              <TableBody>
                {customShortcuts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-[0.8125rem]">
                      <span className="flex items-center gap-2">
                        <span className="truncate">{row.label}</span>
                        {conflictIcon(row.id)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {row.custom?.type === CustomShortcutTypes.ACTION
                          ? describeShortcutTarget(row)
                          : row.custom?.prompt}
                      </span>
                    </TableCell>
                    <TableCell className="sm:w-56">
                      {row.combo && <ShortcutKeys combo={row.combo} />}
                    </TableCell>
                    <TableCell className="w-16 text-right sm:w-20">
                      <span className="inline-flex gap-0.5">
                        <RowAction
                          label="Edit shortcut"
                          onClick={() =>
                            row.custom &&
                            setCustomDialog({ open: true, editing: row.custom })
                          }
                        >
                          <Pencil className="size-3.5" />
                        </RowAction>
                        <RowAction
                          label="Delete shortcut"
                          onClick={() => setDeleting(row.custom ?? null)}
                        >
                          <Trash2 className="size-3.5" />
                        </RowAction>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      )}

      <ShortcutBindingDialog
        shortcut={editing}
        shortcuts={shortcuts}
        onSave={setBinding}
        onResetToDefault={resetBinding}
        onClose={() => setEditing(null)}
      />
      <CustomShortcutDialog
        open={customDialog.open}
        editing={customDialog.editing}
        shortcuts={shortcuts}
        onSubmit={submitCustom}
        onClose={() => setCustomDialog({ open: false, editing: null })}
      />
      <ConfirmationDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete custom shortcut?"
        description={`"${deleting?.name}" will stop working. This can't be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleting) removeCustom(deleting.id);
          setDeleting(null);
        }}
      />
      <ConfirmationDialog
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset all shortcuts?"
        description="Built-in shortcuts return to their defaults."
        confirmText="Reset all"
        variant="destructive"
        onConfirm={() => {
          resetAll();
          setResetOpen(false);
        }}
      />
    </div>
  );
}
