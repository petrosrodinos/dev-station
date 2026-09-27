const SETTINGS_SECTIONS = [
  { id: "general", label: "General", icon: "settings" },
  { id: "git", label: "Git", icon: "git-branch" },
  { id: "ai", label: "AI", icon: "bot" },
  { id: "integrations", label: "Integrations", icon: "link" },
  { id: "org", label: "Organization", icon: "building" },
];

function renderSettings() {
  const section = Store.state.settingsSection;
  return `
    <div class="settings-layout">
      <div class="settings-nav">
        ${SETTINGS_SECTIONS.map(
          (s) => `<button class="settings-nav-item ${s.id === section ? "active" : ""}" data-action="settings-section" data-section="${s.id}">
            ${icon(s.icon, { size: 14 })} ${s.label}
          </button>`
        ).join("")}
      </div>
      <div class="flex-1 scroll-y">${settingsSectionHtml(section)}</div>
    </div>
  `;
}

function settingsSectionHtml(section) {
  switch (section) {
    case "general": return settingsGeneral();
    case "git": return settingsGit();
    case "ai": return settingsAi();
    case "integrations": return settingsIntegrations();
    case "org": return renderOrg();
    default: return "";
  }
}

function settingsGeneral() {
  return `
    <div class="settings-section-title">General</div>
    <div class="text-mute" style="font-size:12.5px;margin-bottom:16px;">Workspace-wide defaults</div>
    ${settingsRow("Workspace directory", "Where new projects are cloned to by default", `<span class="mono text-mute" style="font-size:12px;">~/Development</span><button class="btn btn-secondary btn-sm" style="margin-left:8px;">Change</button>`)}
    ${settingsRow("Default shell", "Used for the integrated terminal", `<select class="select"><option>zsh</option><option>bash</option><option>PowerShell</option></select>`)}
    ${settingsRow("Theme", "Dark mode is the primary theme", `<div class="pill-tabs"><button class="pill-tab active">Dark</button><button class="pill-tab">Light</button><button class="pill-tab">System</button></div>`)}
    ${settingsRow("Notifications", "Nav-rail badges + activity feed only — no toasts", `<button class="switch on"></button>`)}
  `;
}

function settingsGit() {
  return `
    <div class="settings-section-title">Git</div>
    <div class="text-mute" style="font-size:12.5px;margin-bottom:16px;">Identity and branch defaults</div>
    ${settingsRow("Git name", "", `<input class="input" value="Petros Rodinos" />`)}
    ${settingsRow("Git email", "", `<input class="input" value="petros@hosperly.com" />`)}
    ${settingsRow("Default branch behavior", "Applies when creating a new project", `<select class="select"><option>main</option><option>master</option><option>Ask each time</option></select>`)}
    ${settingsRow("Confirm destructive operations", "Discard, force operations", `<button class="switch on"></button>`)}
  `;
}

function settingsAi() {
  return `
    <div class="settings-section-title">AI</div>
    <div class="text-mute" style="font-size:12.5px;margin-bottom:16px;">Agent defaults and executables</div>
    ${settingsRow("Preferred agent", "Used when starting a session without specifying one", `<select class="select"><option>Claude Code</option><option>Cursor CLI</option></select>`)}
    ${settingsRow("Claude Code executable", "", `<span class="mono text-mute" style="font-size:12px;">/usr/local/bin/claude</span>`)}
    ${settingsRow("Cursor CLI executable", "", `<span class="mono text-mute" style="font-size:12px;">/usr/local/bin/cursor-agent</span>`)}
    ${settingsRow("Idle threshold", "Time with no output before a session is marked “Awaiting input”", `<select class="select"><option>30s</option><option>60s</option><option>2m</option></select>`)}
  `;
}

function settingsIntegrations() {
  return `
    <div class="settings-section-title">Integrations</div>
    <div class="text-mute" style="font-size:12.5px;margin-bottom:16px;">Manage connections via Composio</div>
    ${renderIntegrations()}
  `;
}

function settingsRow(label, desc, controlHtml) {
  return `
    <div class="settings-row">
      <div>
        <div class="settings-row-label">${label}</div>
        ${desc ? `<div class="settings-row-desc">${desc}</div>` : ""}
      </div>
      <div class="settings-row-control">${controlHtml}</div>
    </div>`;
}
