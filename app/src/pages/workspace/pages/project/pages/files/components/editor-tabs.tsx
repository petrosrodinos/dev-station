import { useEffect, useRef, useState, type DragEvent } from "react";
import { File, X } from "lucide-react";
import type { OpenFileTab } from "@/stores/workspace";
import { cn } from "@/lib/utils";

const EDITOR_TAB_DRAG_TYPE = "application/x-dev-station-editor-tab";
/** The tab being dragged (dataTransfer contents are unreadable during dragover). */
let draggedTab: string | null = null;

const basename = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const parentName = (path: string) => {
  const parts = path.split("/");
  return parts.length > 1 ? parts[parts.length - 2] : "";
};

interface EditorTabsProps {
  tabs: OpenFileTab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onPin: (path: string) => void;
  onClose: (path: string) => void;
  onMove: (path: string, insertAt: number) => void;
}

/** The file row above the editor: one tab per open file, pinned or previewed, reorderable by dragging. */
export function EditorTabs({ tabs, activePath, onSelect, onPin, onClose, onMove }: EditorTabsProps) {
  // Insertion point while a tab is dragged over the row: the index a dropped tab would take.
  const [dropAt, setDropAt] = useState<number | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rowRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activePath]);

  const updateDropAt = (index: number) => setDropAt((current) => (current === index ? current : index));

  const onRowDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!draggedTab) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // Over the empty space after the last tab, the drop lands at the end of the row.
    if (e.target === e.currentTarget) updateDropAt(tabs.length);
  };

  const onTabDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (!draggedTab) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    updateDropAt(e.clientX > rect.left + rect.width / 2 ? index + 1 : index);
  };

  const finishDrag = () => {
    draggedTab = null;
    setDropAt(null);
  };

  const onRowDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!draggedTab) return;
    e.preventDefault();
    if (dropAt !== null) onMove(draggedTab, dropAt);
    finishDrag();
  };

  return (
    <div
      ref={rowRef}
      role="tablist"
      aria-label="Open files"
      className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b"
      onDragOver={onRowDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropAt(null);
      }}
      onDrop={onRowDrop}
    >
      {tabs.map((tab, index) => {
        const name = basename(tab.path);
        const active = tab.path === activePath;
        // Two open files with the same name get their folder shown too, so the tabs can be told apart.
        const duplicate = tabs.some((t) => t.path !== tab.path && basename(t.path) === name);
        return (
          <div key={tab.path} className="flex shrink-0 items-stretch">
            {dropAt === index && <span className="my-1.5 w-0.5 rounded-full bg-primary" />}
            <div
              role="tab"
              aria-selected={active}
              title={tab.path}
              draggable
              onClick={() => onSelect(tab.path)}
              onDoubleClick={() => onPin(tab.path)}
              onMouseDown={(e) => e.button === 1 && e.preventDefault()}
              onAuxClick={(e) => e.button === 1 && onClose(tab.path)}
              onDragStart={(e) => {
                draggedTab = tab.path;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData(EDITOR_TAB_DRAG_TYPE, tab.path);
              }}
              onDragEnd={finishDrag}
              onDragOver={(e) => onTabDragOver(e, index)}
              className={cn(
                "group flex min-w-0 max-w-56 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 text-xs",
                active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <File className="size-3.5 shrink-0 text-muted-foreground" />
              <span className={cn("truncate font-mono", !tab.pinned && "italic")}>{name}</span>
              {duplicate && <span className="truncate text-ash">{parentName(tab.path)}</span>}
              <button
                type="button"
                aria-label={`Close ${name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.path);
                }}
                onDoubleClick={(e) => e.stopPropagation()}
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-xs text-ash hover:bg-surface-card hover:text-foreground",
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              >
                <X className="size-3" />
              </button>
            </div>
          </div>
        );
      })}
      {dropAt === tabs.length && <span className="my-1.5 w-0.5 rounded-full bg-primary" />}
    </div>
  );
}
