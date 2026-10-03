import { useMemo } from "react";
import { PictureInPicture2 } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useLayoutStore } from "@/stores/layout";
import { listFloatingWindows } from "../utils/float-panel.utils";

/** Items for choosing where a panel floats: a new window, or one of the windows already open. */
export function FloatTargetMenuItems({ onFloat }: { onFloat: (windowId: string | undefined) => void }) {
  const floating = useLayoutStore((s) => s.floating);
  const windows = useMemo(() => listFloatingWindows(floating), [floating]);

  return (
    <>
      <DropdownMenuItem onSelect={() => onFloat(undefined)} className="gap-2 whitespace-nowrap">
        <PictureInPicture2 className="size-3.5" /> Float in new window
      </DropdownMenuItem>
      {windows.map((window) => (
        <DropdownMenuItem key={window.windowId} onSelect={() => onFloat(window.windowId)} className="gap-2 whitespace-nowrap">
          <PictureInPicture2 className="size-3.5" /> Float into {window.label}
        </DropdownMenuItem>
      ))}
    </>
  );
}
