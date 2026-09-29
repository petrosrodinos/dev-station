import { useState } from "react";
import type { SerializedDockview } from "dockview-react";
import { Check, LayoutPanelLeft, Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useCreateLayout,
  useDeleteLayout,
  useGetLayouts,
  useUpdateLayout,
  useUpdateLayoutState,
} from "@/features/workspace-layouts/hooks/use-workspace-layouts";
import { useLayoutStore } from "@/stores/layout";
import { useWorkspaceStore } from "@/stores/workspace";
import { useDockApi } from "../context/dock-api-context";
import { cn } from "@/lib/utils";

/**
 * The single place users manage named layout presets (docking system spec §B): switch, save the
 * live arrangement as a new preset, rename/update/delete the current one, or reset it back to its
 * last-saved state. Reads/writes the workspace dock's `DockviewApi` directly for save/reset.
 */
export function LayoutMenu() {
  const { api } = useDockApi();
  const { data: presets } = useGetLayouts();
  const activePresetId = useLayoutStore((s) => s.active_preset_id);
  const dirty = useLayoutStore((s) => s.dirty);
  const setActivePreset = useLayoutStore((s) => s.setActivePreset);
  const markClean = useLayoutStore((s) => s.markClean);
  const rememberProjectPreset = useLayoutStore((s) => s.rememberProjectPreset);
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);

  const create = useCreateLayout();
  const update = useUpdateLayout({ silent: false });
  const remove = useDeleteLayout();
  const updateState = useUpdateLayoutState();

  const [saveDialog, setSaveDialog] = useState(false);
  const [renameDialog, setRenameDialog] = useState(false);
  const [name, setName] = useState("");

  const activePreset = presets?.find((p) => p.id === activePresetId);

  const switchTo = (id: string) => {
    setActivePreset(id);
    if (activeProjectId) rememberProjectPreset(activeProjectId, id);
    updateState.mutate({ active_preset_id: id, ...(activeProjectId ? { project_id: activeProjectId, preset_id: id } : {}) });
  };

  const saveAsNew = () => {
    if (!api || !name.trim()) return;
    create.mutate(
      { name: name.trim(), layout: api.toJSON() as unknown as Record<string, unknown> },
      {
        onSuccess: (preset) => {
          switchTo(preset.id);
          setSaveDialog(false);
          setName("");
        },
      },
    );
  };

  const renameCurrent = () => {
    if (!activePresetId || !name.trim()) return;
    update.mutate({ id: activePresetId, dto: { name: name.trim() } }, { onSuccess: () => setRenameDialog(false) });
  };

  const updateCurrent = () => {
    if (!api || !activePresetId) return;
    update.mutate({ id: activePresetId, dto: { layout: api.toJSON() as unknown as Record<string, unknown> } }, { onSuccess: markClean });
  };

  const resetCurrent = () => {
    if (!api || !activePreset || !Object.keys(activePreset.layout).length) return;
    try {
      api.fromJSON(activePreset.layout as unknown as SerializedDockview);
      markClean();
    } catch {
      // Corrupted saved layout — nothing to reset to; leave the current arrangement as-is.
    }
  };

  const deleteCurrent = () => {
    if (!activePresetId || activePreset?.is_default) return;
    remove.mutate(activePresetId, {
      onSuccess: () => {
        const fallback = presets?.find((p) => p.is_default);
        if (fallback) switchTo(fallback.id);
      },
    });
  };

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label="Layout">
                <LayoutPanelLeft className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Layout{activePreset ? `: ${activePreset.name}` : ""}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Saved layouts</DropdownMenuLabel>
          {presets?.map((preset) => (
            <DropdownMenuItem key={preset.id} onSelect={() => switchTo(preset.id)} className="gap-2">
              <span className={cn("flex-1 truncate", preset.id === activePresetId && "font-medium text-foreground")}>{preset.name}</span>
              {preset.id === activePresetId && <Check className="size-3.5" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setName("");
              setSaveDialog(true);
            }}
            className="gap-2"
          >
            <Plus className="size-3.5" /> Save as new layout…
          </DropdownMenuItem>
          {activePresetId && (
            <DropdownMenuItem onSelect={updateCurrent} disabled={!dirty} className="gap-2">
              <Save className="size-3.5" /> Update "{activePreset?.name}"
            </DropdownMenuItem>
          )}
          {activePresetId && (
            <DropdownMenuItem
              onSelect={() => {
                setName(activePreset?.name ?? "");
                setRenameDialog(true);
              }}
              className="gap-2"
            >
              <Pencil className="size-3.5" /> Rename…
            </DropdownMenuItem>
          )}
          {activePresetId && (
            <DropdownMenuItem onSelect={resetCurrent} className="gap-2">
              <RotateCcw className="size-3.5" /> Reset layout
            </DropdownMenuItem>
          )}
          {activePresetId && !activePreset?.is_default && (
            <DropdownMenuItem onSelect={deleteCurrent} className="gap-2 text-danger focus:text-danger">
              <Trash2 className="size-3.5" /> Delete "{activePreset?.name}"
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveDialog} onOpenChange={setSaveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as new layout</DialogTitle>
            <DialogDescription>Names the current panel arrangement so you can switch back to it later.</DialogDescription>
          </DialogHeader>
          <Input autoFocus placeholder="Development" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveAsNew()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveAsNew} disabled={!name.trim()} loading={create.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialog} onOpenChange={setRenameDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename layout</DialogTitle>
          </DialogHeader>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && renameCurrent()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={renameCurrent} disabled={!name.trim()} loading={update.isPending}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
