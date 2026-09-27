function renderIntegrations() {
  return `
    <div class="grid-2">
      ${Store.state.integrations.map(integrationCardHtml).join("")}
    </div>
  `;
}

function integrationCardHtml(integ) {
  const connected = integ.accounts.length > 0;
  return `
    <div class="card">
      <div class="integration-card">
        <div class="integration-icon">${icon(integ.icon, { size: 20 })}</div>
        <div class="flex-1">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-weight:500;font-size:14px;">${integ.name}</span>
            ${connected ? '<span class="badge badge-green">Connected</span>' : '<span class="badge">Not connected</span>'}
          </div>
          <div class="integration-accounts">
            ${integ.accounts
              .map(
                (a) => `<div class="account-chip">
                  <span class="dot dot-running"></span> ${a.label} ${a.default ? '<span class="badge">Default</span>' : ""}
                  <button class="btn-icon" style="margin-left:auto;width:22px;height:22px;" data-action="disconnect-account" data-integ="${integ.id}" data-account="${a.id}" title="Disconnect">${icon("x", { size: 12 })}</button>
                </div>`
              )
              .join("")}
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" data-action="connect-account" data-integ="${integ.id}">
          ${icon("plus", { size: 13 })} Connect account
        </button>
      </div>
    </div>`;
}
