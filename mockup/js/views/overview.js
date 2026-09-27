function renderOverview(proj) {
  const attentionSessions = Store.sessionsForProject(proj.id).filter(
    (s) => s.status === "finished" || s.status === "awaiting"
  );

  return `
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span>Project</span></div>
        <div class="card-body">
          <div class="stat-row"><span class="label">Client</span><span class="value">${Store.getProject(proj.id) ? clientName(proj.clientId) : ""}</span></div>
          <div class="stat-row"><span class="label">Repository</span><span class="value mono">${proj.repo}</span></div>
          <div class="stat-row"><span class="label">Branch</span><span class="value mono">${proj.branch}</span></div>
          <div class="stat-row"><span class="label">Local path</span><span class="value mono truncate" style="max-width:220px;">${proj.localPath}</span></div>
          <div class="stat-row"><span class="label">GitHub account</span><span class="value">${proj.githubAccount}</span></div>
          <div class="stat-row"><span class="label">Last activity</span><span class="value">${proj.lastActivity}</span></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span>Git status</span>
          <button class="btn btn-ghost btn-sm" data-action="goto-view" data-view="git">Open <span style="display:inline-flex">${icon("chevron-right", { size: 13 })}</span></button>
        </div>
        <div class="card-body">
          <div class="stat-row"><span class="label">Modified</span><span class="value">${proj.git.modified}</span></div>
          <div class="stat-row"><span class="label">Added</span><span class="value">${proj.git.added}</span></div>
          <div class="stat-row"><span class="label">Deleted</span><span class="value">${proj.git.deleted}</span></div>
          <div class="stat-row"><span class="label">Untracked</span><span class="value">${proj.git.untracked}</span></div>
          <div class="stat-row"><span class="label">Ahead / behind</span><span class="value">${proj.git.ahead} ↑ &nbsp; ${proj.git.behind} ↓</span></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span>Services</span></div>
        <div class="card-body">
          ${proj.services.map(serviceRowHtml).join("") || emptyRow("No services detected")}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span>AI sessions</span>
          <button class="btn btn-ghost btn-sm" data-action="new-session-tab">New session</button>
        </div>
        <div class="card-body">
          ${Store.sessionsForProject(proj.id).map(sessionSummaryRow).join("") || emptyRow("No AI sessions yet")}
        </div>
      </div>
    </div>

    ${attentionSessions.length ? `
    <div class="card" style="margin-top:16px;border-color:var(--color-accent-yellow);">
      <div class="card-body" style="display:flex;align-items:center;gap:10px;">
        ${icon("alert-circle", { size: 16, className: "text-mute" })}
        <span style="font-size:13px;">${attentionSessions.length} session${attentionSessions.length > 1 ? "s" : ""} ${attentionSessions.length > 1 ? "need" : "needs"} your attention in this project.</span>
        <button class="btn btn-secondary btn-sm" style="margin-left:auto" data-action="focus-session-tab" data-session-id="${attentionSessions[0].id}">Review</button>
      </div>
    </div>` : ""}

    <div class="card" style="margin-top:16px;">
      <div class="card-header"><span>Quick actions</span></div>
      <div class="card-body quick-actions">
        <button class="btn btn-secondary" data-action="git-commit-focus">${icon("git-commit", { size: 14 })} Commit</button>
        <button class="btn btn-secondary" data-action="git-push">${icon("arrow-up", { size: 14 })} Push</button>
        <button class="btn btn-secondary" data-action="git-pull">${icon("arrow-down", { size: 14 })} Pull</button>
        <button class="btn btn-secondary" data-action="open-external" data-target="cursor">${icon("external-link", { size: 14 })} Open in Cursor</button>
        <button class="btn btn-secondary" data-action="open-external" data-target="vscode">${icon("external-link", { size: 14 })} Open in VS Code</button>
      </div>
    </div>
  `;
}

function clientName(clientId) {
  const c = Store.state.clients.find((c) => c.id === clientId);
  return c ? c.name : "—";
}

function serviceRowHtml(svc) {
  const dot = svc.status === "running" ? "dot-running" : svc.status === "crashed" ? "dot-crashed" : "dot-stopped";
  return `
    <div class="service-row">
      <span class="dot ${dot}"></span>
      <span class="service-name">${svc.name}</span>
      ${svc.url ? `<span class="service-url">${svc.url}</span>` : `<span class="service-url text-ash">not running</span>`}
      <div class="service-actions">
        ${svc.url ? `<button class="btn-icon" data-action="open-url" data-url="${svc.url}" title="Open">${icon("external-link", { size: 14 })}</button>` : ""}
        <button class="btn-icon" data-action="toggle-service" data-service-id="${svc.id}" title="${svc.status === "running" ? "Stop" : "Start"}">
          ${icon(svc.status === "running" ? "square" : "play", { size: 14 })}
        </button>
        <button class="btn-icon" data-action="restart-service" data-service-id="${svc.id}" title="Restart">${icon("rotate-cw", { size: 14 })}</button>
      </div>
    </div>`;
}

function sessionSummaryRow(s) {
  const dot = statusDotClass(s.status);
  return `
    <div class="service-row" style="cursor:pointer" data-action="focus-session-tab" data-session-id="${s.id}">
      <span class="dot ${dot}"></span>
      <span class="service-name" style="min-width:unset;">${s.name}</span>
      <span class="service-url">${s.agent}</span>
    </div>`;
}

function emptyRow(text) {
  return `<div class="text-ash" style="font-size:12.5px;padding:6px 0;">${text}</div>`;
}
