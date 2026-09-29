export const DEFAULT_LAYOUT_PRESET_NAME = 'Default';

/** Current shape version of the `layout`/`floating` blobs. Bump when the dock view-type registry changes. */
export const CURRENT_LAYOUT_VERSION = 1;

/** Defensive upper bound so a malformed/huge client payload can never bloat the row unreasonably. */
export const MAX_LAYOUT_JSON_BYTES = 512_000;

export const MAX_LAYOUT_NAME_LENGTH = 60;
