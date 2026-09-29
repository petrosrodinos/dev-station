import type { ReactElement } from "react";
import { Bot, PanelLeft } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { RailPositionOptions } from "@/config/constants/dropdowns/settings/rail-position.options";
import { useRailPosition } from "@/features/users/hooks/use-rail-position";
import { useDockApi } from "../context/dock-api-context";
import { AI_PANEL_ID, moveAiPanel } from "./dock/workspace-dock";

export const PlacementTargets = {
  SIDEBAR: "sidebar",
  AI_PANEL: "ai-panel",
} as const;
export type PlacementTarget = (typeof PlacementTargets)[keyof typeof PlacementTargets];

/**
 * Right-click menu for moving one of the workspace's big pieces. Each place it's used only offers
 * its own piece — the project sidebar's menu moves the sidebar, the AI panel's menu moves the AI
 * panel — so a choice can never move the wrong thing.
 */
export function PlacementMenu({ target, children }: { target: PlacementTarget; children: ReactElement }) {
  const { api } = useDockApi();
  const { position, setPosition } = useRailPosition();
  const sidebar = target === PlacementTargets.SIDEBAR;

  return (
    <ContextMenu>
      <ContextMenuTrigger render={children} />
      <ContextMenuContent className="w-52">
        <ContextMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
          {sidebar ? <PanelLeft className="size-3.5" /> : <Bot className="size-3.5" />}
          {sidebar ? "Move project sidebar to" : "Move AI panel to"}
        </ContextMenuLabel>
        {RailPositionOptions.map((o) =>
          sidebar ? (
            <ContextMenuItem key={o.id} onSelect={() => setPosition(o.id)} disabled={o.id === position}>
              {o.label}
            </ContextMenuItem>
          ) : (
            <ContextMenuItem key={o.id} onSelect={() => api && moveAiPanel(api, o.id)} disabled={!api?.getPanel(AI_PANEL_ID)}>
              {o.label}
            </ContextMenuItem>
          ),
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
