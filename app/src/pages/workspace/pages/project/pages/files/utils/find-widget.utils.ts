import type { Extension } from "@codemirror/state";
import { EditorView, runScopeHandlers, type Panel, type ViewUpdate } from "@codemirror/view";
import { SearchQuery, closeSearchPanel, findNext, findPrevious, getSearchQuery, replaceAll, replaceNext, search, setSearchQuery } from "@codemirror/search";

const MATCH_LIMIT = 1000;
const HISTORY_LIMIT = 50;
const EDGE_GAP = 16;

/** Search history and widget position outlive any one editor, so they carry across files like VS Code's find widget. */
const findHistory: string[] = [];
const widgetPosition = { right: EDGE_GAP, top: 8 };

const SVG_NS = "http://www.w3.org/2000/svg";
const ICONS = {
  chevronRight: "m9 18 6-6-6-6",
  chevronDown: "m6 9 6 6 6-6",
  arrowUp: "m18 15-6-6-6 6",
  arrowDown: "m6 9 6 6 6-6",
  close: "M18 6 6 18M6 6l12 12",
  grip: "M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01",
  replace: "M14 4c0-1.1.9-2 2-2M20 2c1.1 0 2 .9 2 2M22 8c0 1.1-.9 2-2 2M16 10c-1.1 0-2-.9-2-2M3 7l3 3 3-3M6 10V5c0-1.7 1.3-3 3-3h1M3 14h8v8H3zM15 14h6M15 18h6",
  replaceAll: "M14 14a2 2 0 0 1 2-2M16 12h4M18 12v0M21 14v4a2 2 0 0 1-2 2M3 5h8v6H3zM3 15h8v6H3z",
} as const;

function icon(name: keyof typeof ICONS): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", ICONS[name]);
  svg.append(path);
  return svg;
}

function button(className: string, title: string, content: Node | string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.title = title;
  btn.setAttribute("aria-label", title);
  btn.append(content);
  // Keep focus in the input so toggling an option or stepping through matches doesn't interrupt typing.
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.addEventListener("click", onClick);
  return btn;
}

function textInput(placeholder: string, label: string): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = placeholder;
  input.setAttribute("aria-label", label);
  input.spellcheck = false;
  input.autocomplete = "off";
  return input;
}

function rememberQuery(value: string) {
  if (!value) return;
  const existing = findHistory.indexOf(value);
  if (existing !== -1) findHistory.splice(existing, 1);
  findHistory.push(value);
  if (findHistory.length > HISTORY_LIMIT) findHistory.shift();
}

function createFindWidget(view: EditorView): Panel {
  const initial = getSearchQuery(view.state);
  let lastQuery = initial;
  let historyIndex = findHistory.length;
  let historyDraft = "";

  const dom = document.createElement("div");
  dom.className = "cm-find-widget";

  const grip = document.createElement("div");
  grip.className = "cm-find-grip";
  grip.title = "Drag to move";
  grip.append(icon("grip"));

  const expand = button("cm-find-btn cm-find-expand", "Toggle replace", icon("chevronRight"), () => setReplaceOpen(!dom.classList.contains("cm-find-replace-open")));

  const findInput = textInput("Find (⇅ for history)", "Find");
  findInput.value = initial.search;
  findInput.setAttribute("main-field", "true");
  const replaceInput = textInput("Replace", "Replace");
  replaceInput.value = initial.replace;

  let caseSensitive = initial.caseSensitive;
  let wholeWord = initial.wholeWord;
  let regexp = initial.regexp;

  const toggleCase = button("cm-find-btn cm-find-toggle", "Match case (Alt+C)", "Aa", () => { caseSensitive = !caseSensitive; commit(); });
  const toggleWord = button("cm-find-btn cm-find-toggle cm-find-word", "Match whole word (Alt+W)", "ab", () => { wholeWord = !wholeWord; commit(); });
  const toggleRegexp = button("cm-find-btn cm-find-toggle", "Use regular expression (Alt+R)", ".*", () => { regexp = !regexp; commit(); });

  const field = document.createElement("div");
  field.className = "cm-find-field";
  field.append(findInput, toggleCase, toggleWord, toggleRegexp);

  const status = document.createElement("span");
  status.className = "cm-find-status";
  status.setAttribute("aria-live", "polite");

  const prev = button("cm-find-btn", "Previous match (Shift+Enter)", icon("arrowUp"), () => step(findPrevious));
  const next = button("cm-find-btn", "Next match (Enter)", icon("arrowDown"), () => step(findNext));
  const close = button("cm-find-btn", "Close (Escape)", icon("close"), () => closeSearchPanel(view));

  const findRow = document.createElement("div");
  findRow.className = "cm-find-row";
  findRow.append(field, status, prev, next, close);

  const replaceField = document.createElement("div");
  replaceField.className = "cm-find-field";
  replaceField.append(replaceInput);
  const replaceOne = button("cm-find-btn", "Replace (Enter)", icon("replace"), () => replaceNext(view));
  const replaceEvery = button("cm-find-btn", "Replace all (Ctrl+Alt+Enter)", icon("replaceAll"), () => replaceAll(view));

  const replaceRow = document.createElement("div");
  replaceRow.className = "cm-find-row cm-find-replace-row";
  replaceRow.append(replaceField, replaceOne, replaceEvery);

  const rows = document.createElement("div");
  rows.className = "cm-find-rows";
  rows.append(findRow, replaceRow);

  dom.append(grip, expand, rows);

  function setReplaceOpen(open: boolean) {
    dom.classList.toggle("cm-find-replace-open", open);
    expand.replaceChildren(icon(open ? "chevronDown" : "chevronRight"));
  }

  if (view.state.readOnly) expand.hidden = true;

  function currentQuery(): SearchQuery {
    return new SearchQuery({ search: findInput.value, caseSensitive, wholeWord, regexp, replace: replaceInput.value });
  }

  function commit() {
    const query = currentQuery();
    toggleCase.classList.toggle("cm-find-active", caseSensitive);
    toggleWord.classList.toggle("cm-find-active", wholeWord);
    toggleRegexp.classList.toggle("cm-find-active", regexp);
    if (query.eq(lastQuery)) return;
    lastQuery = query;
    view.dispatch({ effects: setSearchQuery.of(query) });
  }

  function step(move: (v: EditorView) => boolean) {
    commit();
    rememberQuery(findInput.value);
    historyIndex = findHistory.length;
    move(view);
  }

  function refreshStatus() {
    const query = getSearchQuery(view.state);
    findInput.classList.toggle("cm-find-invalid", Boolean(query.search) && !query.valid);
    const empty = !query.search || !query.valid;
    prev.disabled = next.disabled = empty;
    if (!query.search) { status.textContent = ""; status.classList.remove("cm-find-none"); return; }
    if (!query.valid) { status.textContent = "Invalid pattern"; status.classList.add("cm-find-none"); return; }

    const { from, to } = view.state.selection.main;
    const cursor = query.getCursor(view.state.doc);
    let total = 0;
    let index = 0;
    for (let r = cursor.next(); !r.done && total < MATCH_LIMIT; r = cursor.next()) {
      total++;
      if (r.value.from === from && r.value.to === to) index = total;
    }
    status.classList.toggle("cm-find-none", total === 0);
    if (total === 0) status.textContent = "No results";
    else {
      const count = total >= MATCH_LIMIT ? `${MATCH_LIMIT - 1}+` : String(total);
      status.textContent = index ? `${index} of ${count}` : `${count} found`;
    }
  }

  function syncFromState() {
    const query = getSearchQuery(view.state);
    if (query.eq(lastQuery)) return;
    lastQuery = query;
    if (findInput.value !== query.search) findInput.value = query.search;
    if (replaceInput.value !== query.replace) replaceInput.value = query.replace;
    ({ caseSensitive, wholeWord, regexp } = query);
    toggleCase.classList.toggle("cm-find-active", caseSensitive);
    toggleWord.classList.toggle("cm-find-active", wholeWord);
    toggleRegexp.classList.toggle("cm-find-active", regexp);
  }

  function browseHistory(direction: -1 | 1) {
    if (!findHistory.length) return;
    if (historyIndex === findHistory.length) historyDraft = findInput.value;
    historyIndex = Math.min(Math.max(historyIndex + direction, 0), findHistory.length);
    findInput.value = historyIndex === findHistory.length ? historyDraft : findHistory[historyIndex];
    commit();
  }

  findInput.addEventListener("input", () => { historyIndex = findHistory.length; commit(); });
  replaceInput.addEventListener("input", commit);

  dom.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (e.altKey && !mod && ["c", "w", "r"].includes(e.key.toLowerCase())) {
      e.preventDefault();
      const key = e.key.toLowerCase();
      if (key === "c") caseSensitive = !caseSensitive;
      else if (key === "w") wholeWord = !wholeWord;
      else regexp = !regexp;
      commit();
    } else if (e.key === "Enter" && e.target === findInput) {
      e.preventDefault();
      step(e.shiftKey ? findPrevious : findNext);
    } else if (e.key === "Enter" && e.target === replaceInput) {
      e.preventDefault();
      if (mod && e.altKey) replaceAll(view);
      else replaceNext(view);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeSearchPanel(view);
    } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && e.target === findInput) {
      e.preventDefault();
      browseHistory(e.key === "ArrowUp" ? -1 : 1);
    } else if (runScopeHandlers(view, e, "search-panel")) {
      e.preventDefault();
    }
  });

  // --- dragging -----------------------------------------------------------------------------
  function applyPosition() {
    const maxRight = Math.max(0, (dom.parentElement?.clientWidth ?? view.dom.clientWidth) - dom.offsetWidth);
    const maxTop = Math.max(0, view.dom.clientHeight - dom.offsetHeight);
    widgetPosition.right = Math.min(Math.max(widgetPosition.right, 0), maxRight);
    widgetPosition.top = Math.min(Math.max(widgetPosition.top, 0), maxTop);
    dom.style.right = `${widgetPosition.right}px`;
    dom.style.top = `${widgetPosition.top}px`;
  }

  grip.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    dom.classList.add("cm-find-dragging");
    let lastX = e.clientX;
    let lastY = e.clientY;
    const onMove = (ev: PointerEvent) => {
      widgetPosition.right -= ev.clientX - lastX;
      widgetPosition.top += ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      applyPosition();
    };
    const onUp = () => {
      dom.classList.remove("cm-find-dragging");
      grip.removeEventListener("pointermove", onMove);
      grip.removeEventListener("pointerup", onUp);
      grip.removeEventListener("pointercancel", onUp);
    };
    grip.addEventListener("pointermove", onMove);
    grip.addEventListener("pointerup", onUp);
    grip.addEventListener("pointercancel", onUp);
  });
  // Double-click the grip to snap back to the default corner.
  grip.addEventListener("dblclick", () => {
    widgetPosition.right = EDGE_GAP;
    widgetPosition.top = 8;
    applyPosition();
  });

  const resizeObserver = new ResizeObserver(applyPosition);

  toggleCase.classList.toggle("cm-find-active", caseSensitive);
  toggleWord.classList.toggle("cm-find-active", wholeWord);
  toggleRegexp.classList.toggle("cm-find-active", regexp);

  return {
    dom,
    top: true,
    mount() {
      findInput.focus();
      findInput.select();
      resizeObserver.observe(view.dom);
      applyPosition();
      refreshStatus();
    },
    update(update: ViewUpdate) {
      syncFromState();
      if (update.docChanged || update.selectionSet || update.transactions.some((tr) => tr.effects.some((ef) => ef.is(setSearchQuery)))) refreshStatus();
    },
    destroy() {
      resizeObserver.disconnect();
    },
  };
}

const findWidgetTheme = EditorView.theme({
  // The panel container becomes a click-through overlay; only the widget itself takes pointer events.
  "&.cm-editor .cm-panels": { background: "transparent", border: "none", pointerEvents: "none", color: "inherit" },
  "&.cm-editor .cm-panels-top": { border: "none", borderBottom: "none" },
  ".cm-find-widget": {
    position: "absolute",
    display: "flex",
    alignItems: "flex-start",
    gap: "2px",
    padding: "4px 6px 4px 2px",
    pointerEvents: "auto",
    boxSizing: "border-box",
    fontFamily: "var(--app-font-sans, inherit)",
    fontSize: "12.5px",
    background: "var(--popover, var(--background))",
    color: "var(--foreground)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    boxShadow: "0 6px 20px rgb(0 0 0 / 0.28)",
    zIndex: "310",
  },
  ".cm-find-widget.cm-find-dragging": { userSelect: "none", boxShadow: "0 10px 28px rgb(0 0 0 / 0.4)" },
  ".cm-find-grip": { display: "flex", alignItems: "center", alignSelf: "stretch", padding: "0 2px", color: "var(--muted-foreground)", cursor: "grab", opacity: "0.6", touchAction: "none" },
  ".cm-find-grip:hover": { opacity: "1" },
  ".cm-find-dragging .cm-find-grip": { cursor: "grabbing", opacity: "1" },
  ".cm-find-rows": { display: "flex", flexDirection: "column", gap: "4px" },
  ".cm-find-row": { display: "flex", alignItems: "center", gap: "2px" },
  ".cm-find-replace-row": { display: "none" },
  ".cm-find-replace-open .cm-find-replace-row": { display: "flex" },
  ".cm-find-field": {
    display: "flex",
    alignItems: "center",
    width: "260px",
    height: "26px",
    padding: "0 3px 0 8px",
    boxSizing: "border-box",
    background: "var(--background)",
    border: "1px solid var(--border)",
    borderRadius: "5px",
  },
  ".cm-find-field:focus-within": { borderColor: "var(--ring, var(--foreground))", boxShadow: "0 0 0 1px var(--ring, var(--foreground))" },
  ".cm-find-field input": { flex: "1", minWidth: "0", height: "100%", padding: "0", color: "inherit", background: "transparent", border: "none", outline: "none", font: "inherit" },
  ".cm-find-field input::placeholder": { color: "var(--muted-foreground)" },
  ".cm-find-field input.cm-find-invalid": { color: "var(--destructive, #ef4444)" },
  ".cm-find-btn": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "22px",
    height: "22px",
    padding: "0 3px",
    color: "var(--muted-foreground)",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: "4px",
    font: "inherit",
    fontSize: "12px",
    lineHeight: "1",
    cursor: "pointer",
  },
  ".cm-find-btn:hover:not(:disabled)": { color: "var(--foreground)", background: "var(--accent)" },
  ".cm-find-btn:disabled": { opacity: "0.35", cursor: "default" },
  ".cm-find-expand": { alignSelf: "stretch", height: "auto", minWidth: "16px", padding: "0" },
  ".cm-find-toggle": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  ".cm-find-word": { textDecoration: "underline", textUnderlineOffset: "2px" },
  ".cm-find-btn.cm-find-active": { color: "var(--foreground)", background: "var(--accent)", borderColor: "var(--ring, var(--border))" },
  ".cm-find-status": { minWidth: "72px", padding: "0 6px", color: "var(--muted-foreground)", textAlign: "center", whiteSpace: "nowrap" },
  ".cm-find-status.cm-find-none": { color: "var(--destructive, #ef4444)" },
  ".cm-searchMatch": { backgroundColor: "rgb(234 179 8 / 0.3)", outline: "1px solid rgb(234 179 8 / 0.55)", borderRadius: "2px" },
  ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "rgb(59 130 246 / 0.4)", outline: "1px solid rgb(59 130 246 / 0.9)" },
});

/** VS Code–style find widget: floats over the editor, can be dragged anywhere, and remembers search history. */
export function findWidget(): Extension {
  return [search({ top: true, createPanel: createFindWidget }), findWidgetTheme];
}
