import type { OpenFileTab } from "@/stores/workspace";

export const isWithin = (path: string, parent: string) => path === parent || path.startsWith(`${parent}/`);

/**
 * Opens a file in the tab row. A single click (`pin` false) previews it in the one unpinned slot, replacing
 * the previous preview in place; a double click (`pin` true) keeps it open as its own tab.
 */
export function openFileTab(tabs: OpenFileTab[], path: string, pin: boolean): OpenFileTab[] {
  const existing = tabs.find((t) => t.path === path);
  if (existing) return pin && !existing.pinned ? pinFileTab(tabs, path) : tabs;
  if (pin) return [...tabs, { path, pinned: true }];
  const preview = tabs.findIndex((t) => !t.pinned);
  if (preview === -1) return [...tabs, { path, pinned: false }];
  return tabs.map((t, i) => (i === preview ? { path, pinned: false } : t));
}

export const pinFileTab = (tabs: OpenFileTab[], path: string): OpenFileTab[] =>
  tabs.map((t) => (t.path === path && !t.pinned ? { ...t, pinned: true } : t));

export const closeFileTab = (tabs: OpenFileTab[], path: string): OpenFileTab[] => tabs.filter((t) => t.path !== path);

/** Moves a tab so it sits before the tab currently at index `insertAt` (`tabs.length` = end of the row). */
export function moveFileTab(tabs: OpenFileTab[], path: string, insertAt: number): OpenFileTab[] {
  const from = tabs.findIndex((t) => t.path === path);
  if (from === -1 || insertAt === from || insertAt === from + 1) return tabs;
  const next = [...tabs];
  const [tab] = next.splice(from, 1);
  next.splice(insertAt > from ? insertAt - 1 : insertAt, 0, tab);
  return next;
}

/** Rewrites tab paths after a rename or move; a null result drops the tab (its file was deleted). */
export const remapFileTabs = (tabs: OpenFileTab[], remap: (path: string) => string | null): OpenFileTab[] =>
  tabs.flatMap((t) => {
    const path = remap(t.path);
    return path === null ? [] : [{ ...t, path }];
  });
