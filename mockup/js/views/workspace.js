const PROJECT_TABS = [
  { id: "overview", label: "Overview", icon: "home" },
  { id: "git", label: "Git", icon: "git-branch" },
  { id: "files", label: "Files", icon: "folder" },
  { id: "linear", label: "Linear", icon: "list-checks" },
  { id: "notion", label: "Notion", icon: "file" },
];

const GLOBAL_VIEWS = { integrations: "Integrations", settings: "Settings", org: "Organization" };

function mountWorkspace() {
  const header = document.getElementById("workspace-header");
  const content = document.getElementById("workspace-content");
  const view = Store.state.activeView;

  if (GLOBAL_VIEWS[view]) {
    header.innerHTML = `
      <div class="ws-title-row">
        <div class="ws-icon" style="background:var(--color-surface-elevated);">${icon(view === "org" ? "building" : view === "settings" ? "settings" : "link", { size: 18, className: "text-mute" })}</div>
        <div>
          <div class="ws-title">${GLOBAL_VIEWS[view]}</div>
        </div>
      </div>
      <div class="divider"></div>`;
    content.innerHTML = view === "integrations" ? renderIntegrations() : view === "settings" ? renderSettings() : renderOrg();
    return;
  }

  const proj = Store.getActiveProject();
  if (!proj) {
    header.innerHTML = "";
    content.innerHTML = `<div class="empty-state" style="padding-top:80px;">${icon("folder", { size: 32 })}<div>No project selected</div></div>`;
    return;
  }

  header.innerHTML = `
    <div class="ws-title-row">
      <div class="ws-icon" style="background:${proj.color};">${proj.initials}</div>
      <div>
        <div class="ws-title">${proj.name}</div>
        <div class="ws-subtitle">${clientName(proj.clientId)} &middot; ${proj.repo}</div>
      </div>
      <div class="ws-meta">
        <span class="branch-chip">${icon("git-branch", { size: 13 })} ${proj.branch}</span>
      </div>
    </div>
    <div class="subnav">
      ${PROJECT_TABS.map(
        (t) => `<button class="subnav-item ${t.id === view ? "active" : ""}" data-action="goto-view" data-view="${t.id}">
          ${icon(t.icon, { size: 14 })} ${t.label}
        </button>`
      ).join("")}
    </div>`;

  let html = "";
  switch (view) {
    case "git": html = renderGit(proj); break;
    case "files": html = renderFiles(proj); break;
    case "linear": html = renderLinear(proj); break;
    case "notion": html = renderNotion(proj); break;
    default: html = renderOverview(proj);
  }
  content.innerHTML = html;
}

function refreshWorkspace() {
  mountWorkspace();
}
