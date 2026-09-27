let aiPanelMode = "terminal"; // "terminal" | "list"

function mountAiPanel() {
  const header = document.getElementById("aipanel-header");
  const body = document.getElementById("aipanel-body");
  const activeSession = Store.getSession(Store.state.activeSessionTabId);

  header.innerHTML = `
    <div class="pill-tabs">
      <button class="pill-tab ${aiPanelMode === "terminal" ? "active" : ""}" data-action="ai-panel-mode" data-mode="terminal">${icon("terminal", { size: 13 })} Terminal</button>
      <button class="pill-tab ${aiPanelMode === "list" ? "active" : ""}" data-action="ai-panel-mode" data-mode="list">${icon("bot", { size: 13 })} Sessions</button>
    </div>
    <button class="btn btn-tertiary btn-sm" data-action="new-session-tab">${icon("plus", { size: 13 })} New</button>
  `;

  body.innerHTML = aiPanelMode === "list" ? sessionListHtml() : terminalHtml(activeSession);

  if (aiPanelMode === "terminal" && activeSession) {
    const term = body.querySelector(".terminal");
    if (term) term.scrollTop = term.scrollHeight;
    const input = body.querySelector(".terminal-input-row input");
    if (input) input.focus({ preventScroll: true });
  }
}

function sessionListHtml() {
  const sessions = Store.state.sessions;
  if (!sessions.length) {
    return `<div class="empty-state" style="padding-top:60px;">${icon("bot", { size: 28 })}<div>No AI sessions</div></div>`;
  }
  return `<div class="scroll-y flex-1">${sessions
    .map((s) => {
      const proj = Store.getProject(s.projectId);
      const active = s.id === Store.state.activeSessionTabId;
      return `
      <div class="session-list-item ${active ? "active" : ""}" data-action="focus-session-tab" data-session-id="${s.id}">
        <span class="dot ${statusDotClass(s.status)}"></span>
        <div class="session-info">
          <div class="session-name">${s.name}</div>
          <div class="session-sub">${proj?.name || ""} &middot; ${s.agent} &middot; ${statusLabel(s.status)}</div>
        </div>
        <span class="proj-flag" style="background:${proj?.color || "#666"};height:22px;"></span>
      </div>`;
    })
    .join("")}</div>`;
}

function statusLabel(status) {
  switch (status) {
    case "running": return "Running";
    case "awaiting": return "Awaiting input";
    case "finished": return "Finished";
    case "crashed": return "Crashed";
    default: return "Stopped";
  }
}

function terminalHtml(session) {
  if (!session) {
    return `<div class="empty-state flex-1" style="justify-content:center;">${icon("terminal", { size: 28 })}<div>No session open</div><button class="btn btn-primary btn-sm" data-action="new-session-tab">New AI session</button></div>`;
  }
  const proj = Store.getProject(session.projectId);
  return `
    <div style="padding:8px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-shrink:0;">
      <span class="proj-flag" style="background:${proj?.color || "#666"};height:18px;"></span>
      <span style="font-size:12px;font-weight:500;" class="truncate">${session.name}</span>
      <span class="dot ${statusDotClass(session.status)}" style="margin-left:auto;"></span>
      <span class="text-mute" style="font-size:11.5px;">${statusLabel(session.status)}</span>
      <button class="btn-icon" data-action="restart-session" data-session-id="${session.id}" title="Restart">${icon("rotate-cw", { size: 13 })}</button>
      <button class="btn-icon" data-action="stop-session" data-session-id="${session.id}" title="Stop">${icon("square", { size: 13 })}</button>
      <button class="btn-icon" data-action="open-external-terminal" data-session-id="${session.id}" title="Open in external terminal">${icon("external-link", { size: 13 })}</button>
    </div>
    <div class="terminal">${terminalOutputHtml(session)}</div>
    <div class="terminal-input-row">
      <span class="prompt-mark">›</span>
      <input type="text" placeholder="${session.status === 'crashed' || session.status === 'stopped' ? 'Session ended' : 'Send a message to the agent…'}" data-action="terminal-input" data-session-id="${session.id}" ${session.status === 'crashed' || session.status === 'stopped' ? 'disabled' : ''} />
      <span class="keycap">Enter</span>
    </div>
  `;
}

function terminalOutputHtml(session) {
  const lines = session.output
    .map((l) => {
      const cls = l.type === "agent" ? "tl-agent" : l.type === "user" ? "tl-user" : l.type === "success" ? "tl-success" : l.type === "warn" ? "tl-warn" : "tl-dim";
      const prefix = l.type === "agent" ? "● " : l.type === "user" ? "› " : "";
      return `<div class="${cls}">${escapeHtml(prefix + l.text)}</div>`;
    })
    .join("");
  const cursor = session.status === "running" || session.status === "awaiting"
    ? `<div class="cursor-line tl-dim"><span class="cursor-blink"></span></div>`
    : `<div class="tl-dim">Process exited${session.status === "crashed" ? " (1)" : " (0)"}</div>`;
  return lines + cursor;
}
