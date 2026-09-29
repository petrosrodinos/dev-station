import type { ReactElement } from "react";
import { Bot, PanelLeft } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { RailPositionOptions } from "@/config/constants/dropdowns/settings/rail-position.options";
import { useRailPosition } from "@/features/users/hooks/use-rail-position";
import { useDockApi } from "../context/dock-api-context";
import { AI_PANEL_ID, moveAiPanel } from "./dock/workspace-dock";

/**
 * Right-click menu for moving the workspace's big pieces around — the project sidebar and the AI
 * panel (relative to the main content). Wrapped around the sidebar and the AI panel header so
 * repositioning is always one right-click away, with no visible chrome taking up space.
 */
export function PlacementMenu({ children }: { children: ReactElement }) {
  const { api } = useDockApi();
  const { position, setPosition } = useRailPosition();
  const aiOpen = !!api?.getPanel(AI_PANEL_ID);

  return (
    <ContextMenu>
      <ContextMenuTrigger render={children} />
      <ContextMenuContent className="w-52">
        <ContextMenuLabel className="text-xs text-muted-foreground">Move project sidebar</ContextMenuLabel>
        {RailPositionOptions.map((o) => (
          <ContextMenuItem key={o.id} onSelect={() => setPosition(o.id)} disabled={o.id === position} className="gap-2">
            <PanelLeft className="size-3.5" /> {o.label}
          </ContextMenuItem>
        ))}
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2" disabled={!aiOpen}>
            <Bot className="size-3.5" /> Move AI panel
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {RailPositionOptions.map((o) => (
              <ContextMenuItem key={o.id} onSelect={() => api && moveAiPanel(api, o.id)}>
                {o.label}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}
