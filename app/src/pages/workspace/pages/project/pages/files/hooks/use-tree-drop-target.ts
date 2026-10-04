import { useEffect, useRef, useState, type DragEvent } from "react";

export const ENTRY_DRAG_TYPE = "application/x-dev-station-entry";

/** The entry being dragged inside the tree (dataTransfer contents are unreadable during dragover). */
let draggedPath: string | null = null;
export const setDraggedPath = (path: string | null) => {
  draggedPath = path;
};

const parentOf = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf("/")));
const isWithin = (path: string, parent: string) => path === parent || path.startsWith(`${parent}/`);

/** An internal drop is pointless when it targets the entry itself, its own subtree, or its current folder. */
const isValidInternalDrop = (source: string, destDir: string) => !isWithin(destDir, source) && parentOf(source) !== destDir;

export interface TreeDropHandlers {
  onMove: (path: string, destDir: string) => void;
  onDropFiles: (files: File[], destDir: string) => void;
}

/** Drag-over / drop wiring for one folder target. `onHoverOpen` lets a collapsed folder spring open while hovered. */
export function useTreeDropTarget(destDir: string, handlers: TreeDropHandlers | null, onHoverOpen?: () => void) {
  const [isOver, setIsOver] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const accepts = (e: DragEvent) => {
    if (!handlers) return false;
    if (draggedPath) return isValidInternalDrop(draggedPath, destDir);
    return e.dataTransfer.types.includes("Files");
  };

  const reset = () => {
    setIsOver(false);
    clearTimer();
  };

  return {
    isOver,
    dropProps: {
      onDragOver: (e: DragEvent) => {
        if (!accepts(e)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = draggedPath ? "move" : "copy";
        if (!isOver) setIsOver(true);
        if (onHoverOpen && !timer.current) timer.current = setTimeout(onHoverOpen, 600);
      },
      onDragLeave: (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) reset();
      },
      onDrop: (e: DragEvent) => {
        if (!accepts(e) || !handlers) return;
        e.preventDefault();
        e.stopPropagation();
        reset();
        if (draggedPath) handlers.onMove(draggedPath, destDir);
        else handlers.onDropFiles(Array.from(e.dataTransfer.files), destDir);
        draggedPath = null;
      },
    },
  };
}
