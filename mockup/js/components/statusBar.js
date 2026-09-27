// Bottom status bar: running-process summary + activity ticker + notifications popover trigger.

let activityPopoverOpen = false;

function renderStatusBar() {
  const { state } = Store;
  const proj = Store.getActiveProject();
  const runningCount = proj ? proj.services.filter((s) => s.status === "running").length : 0;
  const latest = state.activity[0];

  return `
    <div class="status-item">${icon("activity", { size: 13 })}<span>${runningCount} process${runningCount === 1 ? "" : "es"} running</span></div>
    <div class="status-item mono text-ash">${proj ? proj.branch : ""}</div>
    <button class="status-item activity-ticker" data-action="toggle-activity" style="border:none;background:none;">
      ${icon("bell", { size: 13 })}
      <span class="activity-text">${latest ? `${latest.time} · ${latest.text}` : "No recent activity"}</span>
    </button>
    <div class="status-item text-ash">Dev Station · v0.1 mockup</div>
  `;
}

function renderActivityPopover() {
  const { state } = Store;
  const items = state.activity
    .slice(0, 12)
    .map((a) => {
      const proj = Store.getProject(a.projectId);
      return `
      <div class="activity-item">
        <span class="activity-time">${a.time}</span>
        <span style="width:6px;height:6px;border-radius:50%;background:${proj?.color || "#666"};margin-top:5px;flex-shrink:0;"></span>
        <span>${a.text} <span class="text-ash">— ${proj?.name || ""}</span></span>
      </div>`;
    })
    .join("");
  return `<div id="activity-popover" class="card-elevated">${items || '<div class="empty-state">No activity yet</div>'}</div>`;
}

function mountStatusBar() {
  const el = document.getElementById("statusbar");
  el.innerHTML = renderStatusBar();

  let popoverEl = document.getElementById("activity-popover-root");
  if (!popoverEl) {
    popoverEl = document.createElement("div");
    popoverEl.id = "activity-popover-root";
    document.getElementById("app").appendChild(popoverEl);
  }
  popoverEl.innerHTML = activityPopoverOpen ? renderActivityPopover() : "";
}

function toggleActivityPopover() {
  activityPopoverOpen = !activityPopoverOpen;
  mountStatusBar();
}

document.addEventListener("click", (e) => {
  if (activityPopoverOpen && !e.target.closest("#activity-popover") && !e.target.closest('[data-action="toggle-activity"]')) {
    activityPopoverOpen = false;
    mountStatusBar();
  }
});
