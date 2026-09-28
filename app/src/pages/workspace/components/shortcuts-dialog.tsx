import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShortcutKeys } from "@/components/ui/shortcut-keys";
import { ShortcutGroupOptions, ShortcutGroups } from "@/config/constants/dropdowns/shared/shortcut-action.options";
import { SettingsSections } from "@/config/constants/dropdowns/settings/settings-section.options";
import { useResolvedShortcuts } from "@/features/users/hooks/use-shortcuts";
import { formatComboParts } from "@/lib/shortcuts.utils";
import { useDialogsStore } from "@/stores/dialogs";
import { Routes } from "@/routes/routes";

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CheatSheetRow {
  id: string;
  label: string;
  parts: string[];
}

interface CheatSheetGroup {
  id: string;
  label: string;
  rows: CheatSheetRow[];
}

const CUSTOM_GROUP_ID = "custom";

/** Quick reference of the shortcuts currently in effect (defaults, the user's overrides and custom ones). */
export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  const navigate = useNavigate();
  const shortcuts = useResolvedShortcuts();
  const setShortcutsPractice = useDialogsStore((s) => s.setShortcutsPractice);

  const groups = useMemo<CheatSheetGroup[]>(() => {
    const result: CheatSheetGroup[] = ShortcutGroupOptions.map((group) => {
      const inGroup = shortcuts.filter((s) => s.kind === "action" && s.group === group.id && s.combo);
      const collapseProjects = group.id === ShortcutGroups.PROJECTS && inGroup.length === 9 && inGroup.every((s) => s.is_default);
      const rows: CheatSheetRow[] = collapseProjects
        ? [{ id: "switch-projects", label: "Switch to project 1–9", parts: [...formatComboParts("mod+1").slice(0, -1), "1–9"] }]
        : inGroup.map((s) => ({ id: s.id, label: s.label, parts: formatComboParts(s.combo as string) }));
      return { id: group.id, label: group.label, rows };
    });
    const custom = shortcuts.filter((s) => s.kind === "custom" && s.combo);
    if (custom.length) {
      result.push({ id: CUSTOM_GROUP_ID, label: "Custom", rows: custom.map((s) => ({ id: s.id, label: s.label, parts: formatComboParts(s.combo as string) })) });
    }
    return result.filter((group) => group.rows.length);
  }, [shortcuts]);

  const customize = () => {
    onOpenChange(false);
    navigate(Routes.workspace.settings_section(SettingsSections.SHORTCUTS));
  };

  const practice = () => {
    onOpenChange(false);
    setShortcutsPractice(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Use Ctrl on Windows and Linux, ⌘ on macOS.</DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto">
          {groups.map((group) => (
            <section key={group.id} className="flex flex-col gap-2">
              <h3 className="text-xs font-medium text-muted-foreground">{group.label}</h3>
              <ul className="flex flex-col gap-1.5">
                {group.rows.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-4 text-sm">
                    <span className="min-w-0 truncate">{row.label}</span>
                    <ShortcutKeys parts={row.parts} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={practice} className="gap-2">
            <Gamepad2 className="size-4" /> Practice
          </Button>
          <Button onClick={customize} className="gap-2">
            <SlidersHorizontal className="size-4" /> Customize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
