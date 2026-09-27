const ROLE_BADGE = { Owner: "badge-yellow", Admin: "badge-blue", Manager: "badge-green", Developer: "badge", Viewer: "badge" };

function renderOrg() {
  return `
    <div class="settings-section-title">${Store.state.org.name}</div>
    <div class="text-mute" style="font-size:12.5px;margin-bottom:16px;">Members, roles and organization-level permissions</div>

    <div class="card">
      <div class="card-header">
        <span>Members</span>
        <button class="btn btn-primary btn-sm">${icon("plus", { size: 13 })} Invite member</button>
      </div>
      <div class="card-body" style="padding-top:6px;">
        ${Store.state.members.map(memberRowHtml).join("")}
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <div class="card-header"><span>Role permissions</span></div>
      <div class="card-body" style="padding:0;">
        <table class="perm-table">
          <thead><tr><th>Capability</th><th class="center">Owner</th><th class="center">Admin</th><th class="center">Manager</th><th class="center">Developer</th><th class="center">Viewer</th></tr></thead>
          <tbody>
            ${rolePermRow("View projects", [1, 1, 1, 1, 1])}
            ${rolePermRow("Create / edit projects", [1, 1, 1, 0, 0])}
            ${rolePermRow("Commit & push", [1, 1, 1, 1, 0])}
            ${rolePermRow("Manage branches", [1, 1, 1, 1, 0])}
            ${rolePermRow("Start AI agents", [1, 1, 1, 1, 0])}
            ${rolePermRow("Manage integrations", [1, 1, 0, 0, 0])}
            ${rolePermRow("Manage members & roles", [1, 1, 0, 0, 0])}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function memberRowHtml(m) {
  const initials = m.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return `
    <div class="member-row">
      <div class="avatar">${initials}</div>
      <div class="flex-1">
        <div class="member-name">${m.name}</div>
        <div class="member-email">${m.email}</div>
      </div>
      <span class="badge ${ROLE_BADGE[m.role]}">${m.role}</span>
      <button class="btn-icon" title="More">${icon("more-horizontal", { size: 15 })}</button>
    </div>`;
}

function rolePermRow(label, flags) {
  return `<tr><td>${label}</td>${flags.map((f) => `<td class="center"><span class="perm-check ${f ? "allowed" : "denied"}">${icon(f ? "check" : "minus", { size: 12 })}</span></td>`).join("")}</tr>`;
}
