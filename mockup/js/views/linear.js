const PRIORITY_COLOR = { urgent: "var(--color-accent-red)", high: "var(--color-accent-yellow)", medium: "var(--color-accent-blue)", low: "var(--color-ash)" };

function renderLinear(proj) {
  if (!proj.integrations.linear) {
    return `<div class="empty-state" style="padding:60px 0;">
      ${icon("list-checks", { size: 32 })}
      <div style="font-size:14px;color:var(--color-on-dark);">Linear isn't connected to this project</div>
      <div class="text-mute" style="max-width:320px;">Connect a Linear workspace in Integrations to see issues for this project here.</div>
      <button class="btn btn-primary" style="margin-top:8px;" data-action="goto-integrations">Go to Integrations</button>
    </div>`;
  }

  const issues = Store.state.issues.filter((i) => i.projectId === proj.id);
  const selected = Store.state.issues.find((i) => i.id === Store.state.selectedIssueId);

  return `
    <div class="grid-2" style="grid-template-columns: 1.1fr 1fr; align-items:start;">
      <div class="card">
        <div class="card-header">
          <span>Issues — Client Platform</span>
          <span class="badge">${issues.length} open</span>
        </div>
        <div>
          ${issues.map((i) => issueRowHtml(i, i.id === Store.state.selectedIssueId)).join("") || emptyRow("No linked issues")}
        </div>
      </div>

      <div class="card">
        <div class="card-body issue-detail">
          ${selected ? issueDetailHtml(selected) : `<div class="empty-state" style="padding:40px 0;">${icon("list-checks", { size: 28 })}<div>Select an issue to view details</div></div>`}
        </div>
      </div>
    </div>
  `;
}

function issueRowHtml(issue, selected) {
  return `
    <div class="issue-row ${selected ? "selected" : ""}" data-action="select-issue" data-issue-id="${issue.id}" style="${selected ? "background:var(--color-surface-elevated)" : ""}">
      <span class="issue-key">${issue.key}</span>
      <span class="issue-priority" style="background:${PRIORITY_COLOR[issue.priority]};border-radius:3px;"></span>
      <span class="issue-title">${issue.title}</span>
      <span class="badge">${issue.status}</span>
    </div>`;
}

function issueDetailHtml(issue) {
  return `
    <div class="issue-detail-title">${issue.title}</div>
    <div class="text-mute mono" style="font-size:12px;margin-bottom:8px;">${issue.key}</div>
    <p style="font-size:13px;color:var(--color-body);line-height:1.6;">${issue.description}</p>

    <div class="issue-meta-grid">
      <span class="text-mute">Status</span><span>${issue.status}</span>
      <span class="text-mute">Priority</span><span style="text-transform:capitalize;">${issue.priority}</span>
      <span class="text-mute">Assignee</span><span>${issue.assignee}</span>
      <span class="text-mute">Labels</span>
      <span class="issue-labels">${issue.labels.map((l) => `<span class="badge">${l}</span>`).join("")}</span>
    </div>

    <button class="btn btn-primary" style="width:100%;justify-content:center;" data-action="work-with-ai" data-issue-id="${issue.id}">
      ${icon("bot", { size: 15 })} Work on issue with AI
    </button>
  `;
}
