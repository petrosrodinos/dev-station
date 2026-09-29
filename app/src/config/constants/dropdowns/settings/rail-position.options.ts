export const RailPositions = {
    LEFT: "left",
    RIGHT: "right",
    TOP: "top",
    BOTTOM: "bottom",
} as const;
export type RailPosition = (typeof RailPositions)[keyof typeof RailPositions];

export const DEFAULT_RAIL_POSITION: RailPosition = RailPositions.LEFT;

export const RailPositionOptions: { id: RailPosition; label: string }[] = [
    { id: RailPositions.LEFT, label: "Left" },
    { id: RailPositions.RIGHT, label: "Right" },
    { id: RailPositions.TOP, label: "Top" },
    { id: RailPositions.BOTTOM, label: "Bottom" },
];

export const isHorizontalRail = (position: RailPosition) => position === RailPositions.TOP || position === RailPositions.BOTTOM;
