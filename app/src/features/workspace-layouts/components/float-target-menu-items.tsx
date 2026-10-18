import { useMemo } from "react";
import { PictureInPicture2 } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useLayoutStore } from "@/stores/layout";
import { listFloatingWindows } from "../utils/float-panel.utils";

interface FloatTargetMenuItemsProps {
  onFloat: (windowId: string | undefined) => void;
  /** The menu's item component: dropdown by default, pass `ContextMenuItem` inside a context menu. */
  Item?: typeof DropdownMenuItem;
}

/** Items for choosing where a panel floats: a new window, or one of the windows already open. */
export function FloatTargetMenuItems({ onFloat, Item = DropdownMenuItem }: FloatTargetMenuItemsProps) {
  const floating = useLayoutStore((s) => s.floating);
  const windows = useMemo(() => listFloatingWindows(floating), [floating]);

  return (
    <>
      <Item onSelect={() => onFloat(undefined)} className="gap-2 whitespace-nowrap">
        <PictureInPicture2 className="size-3.5" /> Float in new window
      </Item>
      {windows.map((window) => (
        <Item key={window.windowId} onSelect={() => onFloat(window.windowId)} className="gap-2 whitespace-nowrap">
          <PictureInPicture2 className="size-3.5" /> Float into {window.label}
        </Item>
      ))}
    </>
  );
}
