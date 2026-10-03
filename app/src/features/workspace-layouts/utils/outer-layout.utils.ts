import type { DockviewApi } from "dockview-react";

type Orientation = "HORIZONTAL" | "VERTICAL";

interface LeafNode {
  type: "leaf";
  size: number;
  data: { views: string[]; activeView?: string };
}

interface BranchNode {
  type: "branch";
  size: number;
  data: GridNode[];
}

type GridNode = LeafNode | BranchNode;

/** The subset of `DockviewApi.toJSON()` the outer split uses. */
export interface SerializedOuterLayout {
  grid: { root: BranchNode; orientation: Orientation };
}

const opposite = (o: Orientation): Orientation => (o === "HORIZONTAL" ? "VERTICAL" : "HORIZONTAL");

const shapeOf = (node: GridNode): unknown => (node.type === "leaf" ? node.data.views : node.data.map(shapeOf));

/** True when two layouts differ only in pane sizes, so the same panels can be kept and resized. */
export const sameOuterShape = (a: unknown, b: unknown): boolean => {
  const shape = (layout: unknown) => {
    const grid = (layout as SerializedOuterLayout | undefined)?.grid;
    return JSON.stringify({ orientation: grid?.orientation, root: grid ? shapeOf(grid.root) : null });
  };
  return shape(a) === shape(b);
};

/** Resizes the existing panels to a stored layout's pane sizes without rebuilding them. */
export const applyOuterSizes = (api: DockviewApi, layout: SerializedOuterLayout) => {
  const walk = (branch: BranchNode, along: Orientation) => {
    for (const child of branch.data) {
      if (child.type === "branch") {
        walk(child, opposite(along));
        continue;
      }
      const panel = api.getPanel(child.data.activeView ?? child.data.views[0]);
      panel?.api.setSize(along === "HORIZONTAL" ? { width: child.size } : { height: child.size });
    }
  };
  walk(layout.grid.root, layout.grid.orientation);
};
