// Persistent global AI-session tab strip (browser/editor-tab style), spans every project.

function statusDotClass(status) {
  switch (status) {
    case "running": return "dot-running";
    case "awaiting": return "dot-awaiting";
    case "finished": return "dot-finished";
    case "crashed": return "dot-crashed";
    default: return "dot-stopped";
  }
}

function renderTabStrip() {
  const { state } = Store;
  const tabs = state.openSessionTabs
    .map((id) => Store.getSession(id))
    .filter(Boolean);

  if (!tabs.length) {
    return `
      <div class="tab-list"><div class="tab-empty">No AI sessions open</div></div>
      <button class="tab-new" data-action="new-session-tab" title="New AI session">${icon("plus", { size: 15 })}</button>`;
  }

  const items = tabs
    .map((s) => {
      const proj = Store.getProject(s.projectId);
      const active = s.id === state.activeSessionTabId;
      return `
      <div class="session-tab ${active ? "active" : ""}" draggable="true" data-session-id="${s.id}" data-action="focus-session-tab" title="${s.name}">
        <span class="proj-flag" style="background:${proj?.color || "#666"}"></span>
        <span class="dot ${statusDotClass(s.status)}"></span>
        <span class="tab-label">${s.name}</span>
        <span class="tab-close" data-action="close-session-tab" data-session-id="${s.id}" title="Close">${icon("x", { size: 12 })}</span>
      </div>`;
    })
    .join("");

  return `
    <div class="tab-list">${items}</div>
    <button class="tab-new" data-action="new-session-tab" title="New AI session">${icon("plus", { size: 15 })}</button>`;
}

function mountTabStrip() {
  const el = document.getElementById("tabstrip");
  el.innerHTML = renderTabStrip();
  wireTabDragAndDrop(el);
}

function wireTabDragAndDrop(container) {
  let dragId = null;
  container.querySelectorAll(".session-tab").forEach((tabEl) => {
    tabEl.addEventListener("dragstart", () => {
      dragId = tabEl.dataset.sessionId;
      tabEl.classList.add("dragging");
    });
    tabEl.addEventListener("dragend", () => {
      tabEl.classList.remove("dragging");
    });
    tabEl.addEventListener("dragover", (e) => e.preventDefault());
    tabEl.addEventListener("drop", (e) => {
      e.preventDefault();
      const targetId = tabEl.dataset.sessionId;
      if (dragId && targetId && dragId !== targetId) {
        Store.reorderSessionTabs(dragId, targetId);
      }
    });
  });
}
