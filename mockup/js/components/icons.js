// Minimal lucide-style inline icon set (hand-drawn, MIT-style stroke icons).
// Usage: icon("home", { size: 16, className: "..." })
const ICON_PATHS = {
  home: '<path d="M3 10.5 12 4l9 6.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
  "git-branch": '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10"/><path d="M6 12c0-3 3-4 6-4h4"/>',
  "git-commit": '<circle cx="12" cy="12" r="3"/><path d="M3 12h6"/><path d="M15 12h6"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3"/><path d="M13 15h4"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
  file: '<path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v6h6"/>',
  "list-checks": '<path d="M4 6h2"/><path d="M4 12h2"/><path d="M4 18h2"/><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/>',
  layers: '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="M3 13l9 5 9-5"/>',
  shield: '<path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3Z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><circle cx="18" cy="9" r="2.7"/><path d="M15.7 14.2c2.7.4 4.8 2.5 4.8 5.8"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
  "chevron-down": '<path d="M6 9l6 6 6-6"/>',
  "chevron-right": '<path d="M9 6l6 6-6 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  "more-horizontal": '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  "alert-circle": '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/>',
  "external-link": '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/>',
  play: '<path d="M6 4l14 8-14 8V4Z"/>',
  square: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  "rotate-cw": '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/>',
  "refresh-cw": '<path d="M4 12a8 8 0 0 1 14-5.3L20 8"/><path d="M20 12a8 8 0 0 1-14 5.3L4 16"/><path d="M20 3v5h-5"/><path d="M4 21v-5h5"/>',
  "arrow-down": '<path d="M12 4v16"/><path d="M6 14l6 6 6-6"/>',
  "arrow-up": '<path d="M12 20V4"/><path d="M18 10 12 4 6 10"/>',
  "arrow-down-up": '<path d="M7 3v14"/><path d="M3 13l4 4 4-4"/><path d="M17 21V7"/><path d="M13 11l4-4 4 4"/>',
  download: '<path d="M12 3v12"/><path d="M6 11l6 6 6-6"/><path d="M4 20h16"/>',
  upload: '<path d="M12 21V9"/><path d="M6 13l6-6 6 6"/><path d="M4 20h16"/>',
  save: '<path d="M5 4h11l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M8 4v5h8V4"/>',
  trash: '<path d="M4 7h16"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  bell: '<path d="M7 8a5 5 0 0 1 10 0v5l2 3H5l2-3Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  activity: '<path d="M3 12h4l2 7 4-14 2 7h6"/>',
  sparkles: '<path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="M6 6l2 2"/><path d="M16 16l2 2"/><path d="M18 6l-2 2"/><path d="M8 16l-2 2"/>',
  bot: '<rect x="4" y="8" width="16" height="11" rx="2"/><path d="M12 2v4"/><circle cx="9" cy="13" r="1.3"/><circle cx="15" cy="13" r="1.3"/><path d="M2 13h2"/><path d="M20 13h2"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h1"/><path d="M14 8h1"/><path d="M9 12h1"/><path d="M14 12h1"/><path d="M9 16h1"/><path d="M14 16h1"/>',
  link: '<path d="M9 15l6-6"/><path d="M11 5l1-1a4 4 0 1 1 6 6l-1 1"/><path d="M13 19l-1 1a4 4 0 1 1-6-6l1-1"/>',
  message: '<path d="M4 5h16v11H9l-5 4V5Z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
  "folder-open": '<path d="M3 8V6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1"/><path d="M2.5 8h19l-2 11H4.5L2.5 8Z"/>',
  minus: '<path d="M5 12h14"/>',
  code: '<path d="M9 6 3 12l6 6"/><path d="M15 6l6 6-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
};

function icon(name, opts = {}) {
  const { size = 16, className = "", strokeWidth = 1.8 } = opts;
  const paths = ICON_PATHS[name] || ICON_PATHS.info;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}">${paths}</svg>`;
}
