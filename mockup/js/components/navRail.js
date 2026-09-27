// Left project navigation rail — grouped by client, Slack-workspace-icon style.

function renderRail() {
  const { state } = Store;
  const groups = state.clients
    .map((client) => ({
      client,
      projects: state.projects.filter((p) => p.clientId === client.id),
    }))
    .filter((g) => g.projects.length);

  const groupsHtml = groups
    .map(
      (g) => `
      <div class="rail-group">
        <div class="rail-group-label">${g.client.name}</div>
        ${g.projects.map((p) => railItemHtml(p)).join("")}
      </div>`
    )
    .join('<div class="rail-divider"></div>');

  return `
    <div class="rail-scroll">${groupsHtml}</div>
    <button class="rail-add" data-action="add-project" title="Add project">${icon("plus", { size: 16 })}</button>
    <div class="rail-bottom">
      <div class="rail-divider"></div>
      <button class="rail-item" data-action="open-settings" title="Settings" style="background:var(--color-surface-elevated)">${icon("settings", { size: 16 })}</button>
      <button class="rail-item" data-action="open-org" title="Organization" style="background:var(--color-surface-elevated)">${icon("building", { size: 16 })}</button>
    </div>
  `;
}

function railItemHtml(project) {
  const { state } = Store;
  const active = project.id === state.activeProjectId;
  const attention = Store.attentionCountForProject(project.id);
  return `
    <div class="rail-item-wrap" data-tooltip="${project.name}" style="position:relative;width:100%;display:flex;justify-content:center;">
      <button class="rail-item ${active ? "active" : ""}" data-action="select-project" data-project-id="${project.id}" style="background:${project.color}">
        <span class="rail-active-bar"></span>
        ${project.initials}
      </button>
      ${attention ? `<span class="badge-count rail-badge">${attention}</span>` : ""}
    </div>`;
}

function mountRail() {
  const el = document.getElementById("rail");
  el.innerHTML = renderRail();
}
