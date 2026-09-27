const MOCK_NOTION_PAGES = [
  { title: "Client A — Architecture Overview", updated: "3 days ago" },
  { title: "Auth flow & session handling", updated: "1 week ago" },
  { title: "API conventions", updated: "2 weeks ago" },
  { title: "Onboarding checklist", updated: "1 month ago" },
];

function renderNotion(proj) {
  if (!proj.integrations.notion) {
    return `<div class="empty-state" style="padding:60px 0;">
      ${icon("file", { size: 32 })}
      <div style="font-size:14px;color:var(--color-on-dark);">Notion isn't connected to this project</div>
      <div class="text-mute" style="max-width:320px;">Connect a Notion workspace in Integrations to give the team and AI agents access to project documentation.</div>
      <button class="btn btn-primary" style="margin-top:8px;" data-action="goto-integrations">Go to Integrations</button>
    </div>`;
  }

  return `
    <div class="card">
      <div class="card-header">
        <span>Project documentation</span>
        <span class="badge badge-blue">AI-accessible</span>
      </div>
      <div>
        ${MOCK_NOTION_PAGES.map(
          (p) => `
          <div class="file-row" data-action="noop">
            ${icon("file", { size: 14 })}
            <span class="file-path" style="font-family:var(--font-sans);">${p.title}</span>
            <span class="text-ash" style="font-size:12px;">${p.updated}</span>
          </div>`
        ).join("")}
      </div>
    </div>
    <div class="card" style="margin-top:16px;">
      <div class="card-body" style="display:flex;align-items:center;gap:10px;">
        ${icon("info", { size: 16, className: "text-mute" })}
        <span style="font-size:12.5px;color:var(--color-body);">Claude Code and Cursor CLI sessions in this project can read these pages as context while working.</span>
      </div>
    </div>
  `;
}
