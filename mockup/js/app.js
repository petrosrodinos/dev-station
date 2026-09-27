// App entry point: mounts all chrome, wires event delegation, keeps everything in sync with Store.

function mountAll() {
  mountRail();
  mountTabStrip();
  mountWorkspace();
  mountAiPanel();
  mountStatusBar();
  syncAiPanelForceOpen();
}

function syncAiPanelForceOpen() {
  const el = document.getElementById("aipanel");
  const hasOpenTabs = Store.state.openSessionTabs.length > 0;
  el.classList.toggle("force-open", hasOpenTabs && window.innerWidth <= 1100);
}

Store.subscribe(mountAll);

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("search-icon-slot").innerHTML = icon("search", { size: 13 });
  document.getElementById("org-switcher-chevron").innerHTML = icon("chevron-down", { size: 12 });
  document.getElementById("topbar").querySelector('[data-action="open-settings"]').innerHTML = icon("settings", { size: 16 });
  mountAll();
});

// ---------------------------------------------------------------------------
// Event delegation — every interactive control uses data-action.
// ---------------------------------------------------------------------------

document.addEventListener("click", (e) => {
  const actionEl = e.target.closest("[data-action]");
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  const handler = ACTIONS[action];
  if (handler) handler(actionEl, e);
});

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    openCommandPalette();
  }
  if (e.key === "Escape") {
    Modal.close();
    closeCommandPalette();
  }
});

document.getElementById("global-search-input").addEventListener("click", openCommandPalette);

const ACTIONS = {
  "select-project": (el) => Store.setActiveProject(el.dataset.projectId),
  "goto-view": (el) => Store.setActiveView(el.dataset.view),
  "goto-integrations": () => Store.setActiveView("integrations"),
  "open-settings": () => Store.setActiveView("settings"),
  "open-org": () => Store.setActiveView("org"),
  "open-org-switcher": () => openOrgSwitcher(),

  "focus-session-tab": (el) => Store.openSessionTab(el.dataset.sessionId),
  "close-session-tab": (el, e) => {
    e.stopPropagation();
    const id = el.dataset.sessionId;
    const session = Store.getSession(id);
    if (!session || session.status === "stopped" || session.status === "finished" || session.status === "crashed") {
      Store.closeSessionTab(id, { stopProcess: false });
      return;
    }
    Modal.confirm({
      title: "Close session tab",
      body: `“${session.name}” is still running. Stop the underlying process, or leave it running in the background?`,
      confirmLabel: "Stop process",
      cancelLabel: "Keep running",
      destructive: true,
      onConfirm: () => Store.closeSessionTab(id, { stopProcess: true }),
    });
    // Secondary path: clicking backdrop / Escape just closes the modal without closing the tab.
    // Provide a lighter "leave running" affordance via the cancel button label above.
    const cancelBtn = document.querySelector('#modal-root [data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => Store.closeSessionTab(id, { stopProcess: false }), { once: true });
    }
  },
  "new-session-tab": () => openNewSessionModal(),

  "toggle-service": (el) => Store.toggleService(el.dataset.serviceId),
  "restart-service": (el) => {
    const proj = Store.getActiveProject();
    Store.pushActivity(proj.id, "Service restarted");
    Store.notify();
  },
  "open-url": () => infoModal("Open URL", "In the real app this opens the service URL in the default browser."),
  "open-external": (el) => infoModal("Open externally", `In the real app this launches ${el.dataset.target === "cursor" ? "Cursor" : "VS Code"} at the project's local path.`),
  "open-external-terminal": () => infoModal("Open in external terminal", "In the real app this reattaches the session's process to a standalone terminal window."),

  "git-fetch": () => Store.fetchChanges(),
  "git-pull": () => Store.pullChanges(),
  "git-push": () => Store.pushChanges(),
  "git-stash": () => Store.stashChanges(),
  "git-switch-branch": () => infoModal("Switch branch", "Branch switching UI would list local + remote branches here."),
  "git-new-branch": () => infoModal("Create branch", "This would prompt for a new branch name based on the current HEAD."),
  "git-commit-focus": () => {
    Store.setActiveView("git");
    setTimeout(() => document.getElementById("commit-message")?.focus(), 50);
  },
  "git-commit": () => {
    const textarea = document.getElementById("commit-message");
    const message = textarea ? textarea.value : "";
    if (!message.trim()) {
      infoModal("Commit message required", "Enter a commit message before committing.");
      return;
    }
    Store.commitChanges(message);
  },
  "git-discard": () => {
    Modal.confirm({
      title: "Discard all changes?",
      body: "This will permanently discard every uncommitted change in the working tree. This cannot be undone.",
      confirmLabel: "Discard changes",
      destructive: true,
      onConfirm: () => Store.discardChanges(),
    });
  },

  "select-file": (el) => Store.setSelectedFile(el.dataset.path),
  "toggle-tree": (el) => toggleTreePath(el.dataset.path),
  "open-file": (el) => infoModal("Open file", `In the real app this opens ${el.dataset.path} in the default editor.`),
  "reveal-file": (el) => infoModal("Reveal in file manager", `Would reveal ${el.dataset.path} in the system file manager.`),
  "copy-path": (el) => infoModal("Path copied", el.dataset.path),

  "select-issue": (el) => Store.setSelectedIssue(el.dataset.issueId),
  "work-with-ai": (el) => {
    const issue = Store.state.issues.find((i) => i.id === el.dataset.issueId);
    if (!issue) return;
    Store.startAgentForIssue(issue);
    aiPanelMode = "terminal";
  },

  "connect-account": (el) => infoModal("Connect account", `Would open the Composio OAuth flow for ${el.dataset.integ}.`),
  "disconnect-account": (el, e) => {
    e.stopPropagation();
    Modal.confirm({
      title: "Disconnect account?",
      body: "Projects using this account will need to be reassigned to a different connected account.",
      confirmLabel: "Disconnect",
      destructive: true,
      onConfirm: () => infoModal("Disconnected", "Account disconnected (mock)."),
    });
  },

  "settings-section": (el) => Store.setSettingsSection(el.dataset.section),

  "ai-panel-mode": (el) => {
    aiPanelMode = el.dataset.mode;
    mountAiPanel();
  },
  "restart-session": (el) => {
    const s = Store.getSession(el.dataset.sessionId);
    if (!s) return;
    s.status = "running";
    s.output.push({ type: "dim", text: "Session restarted." });
    Store.notify();
  },
  "stop-session": (el) => {
    const s = Store.getSession(el.dataset.sessionId);
    if (!s) return;
    s.status = "stopped";
    s.output.push({ type: "dim", text: "Process stopped by user." });
    Store.notify();
  },

  "toggle-activity": () => toggleActivityPopover(),

  "add-project": () => infoModal("Add project", "This would open the repository connection flow — pick a connected GitHub account or clone from a URL."),

  noop: () => {},
};

document.addEventListener("keydown", (e) => {
  if (e.target.matches('[data-action="terminal-input"]') && e.key === "Enter") {
    const input = e.target;
    const text = input.value.trim();
    if (!text) return;
    Store.sendToSession(input.dataset.sessionId, text);
    input.value = "";
  }
});

// ---------------------------------------------------------------------------
// Tooltips for rail items
// ---------------------------------------------------------------------------

let tooltipEl = null;
document.addEventListener("mouseover", (e) => {
  const target = e.target.closest("[data-tooltip]");
  if (!target) return;
  tooltipEl = document.createElement("div");
  tooltipEl.className = "tooltip";
  tooltipEl.textContent = target.dataset.tooltip;
  document.body.appendChild(tooltipEl);
  const rect = target.getBoundingClientRect();
  tooltipEl.style.left = `${rect.right + 8}px`;
  tooltipEl.style.top = `${rect.top + rect.height / 2 - tooltipEl.offsetHeight / 2}px`;
});
document.addEventListener("mouseout", (e) => {
  if (e.target.closest("[data-tooltip]") && tooltipEl) {
    tooltipEl.remove();
    tooltipEl = null;
  }
});

// ---------------------------------------------------------------------------
// Helpers: simple info modal, org switcher, new-session modal, command palette
// ---------------------------------------------------------------------------

function infoModal(title, body) {
  Modal.custom(
    `<div class="modal">
      <div class="modal-header">${title}</div>
      <div class="modal-body">${body}</div>
      <div class="modal-footer"><button class="btn btn-primary" data-action="close-info">Got it</button></div>
    </div>`,
    (root, close) => root.querySelector('[data-action="close-info"]').addEventListener("click", close)
  );
}

function openOrgSwitcher() {
  Modal.custom(
    `<div class="modal">
      <div class="modal-header">Switch organization</div>
      <div class="modal-body" style="padding:8px;">
        ${Store.state.org.orgs
          .map(
            (name) => `<div class="settings-nav-item ${name === Store.state.org.name ? "active" : ""}" style="cursor:pointer;padding:8px 10px;" data-org="${name}">
              ${icon("building", { size: 14 })} ${name}
            </div>`
          )
          .join("")}
      </div>
    </div>`,
    (root, close) => {
      root.querySelectorAll("[data-org]").forEach((elx) =>
        elx.addEventListener("click", () => {
          Store.state.org.name = elx.dataset.org;
          document.getElementById("org-switcher-label").textContent = elx.dataset.org;
          close();
        })
      );
    }
  );
}

function openNewSessionModal() {
  const projects = Store.state.projects;
  Modal.custom(
    `<div class="modal">
      <div class="modal-header">New AI session</div>
      <div class="modal-body">
        <div style="margin-bottom:12px;">
          <label class="text-mute" style="font-size:12px;display:block;margin-bottom:4px;">Project</label>
          <select class="select" id="ns-project">${projects.map((p) => `<option value="${p.id}" ${p.id === Store.state.activeProjectId ? "selected" : ""}>${p.name}</option>`).join("")}</select>
        </div>
        <div style="margin-bottom:12px;">
          <label class="text-mute" style="font-size:12px;display:block;margin-bottom:4px;">Agent</label>
          <select class="select" id="ns-agent"><option>Claude Code</option><option>Cursor CLI</option></select>
        </div>
        <div>
          <label class="text-mute" style="font-size:12px;display:block;margin-bottom:4px;">Initial prompt (optional)</label>
          <textarea class="textarea" id="ns-prompt" rows="3" placeholder="e.g. Fix the failing tests in apps/api/auth"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-action="ns-cancel">Cancel</button>
        <button class="btn btn-primary" data-action="ns-start">${icon("bot", { size: 14 })} Start session</button>
      </div>
    </div>`,
    (root, close) => {
      root.querySelector('[data-action="ns-cancel"]').addEventListener("click", close);
      root.querySelector('[data-action="ns-start"]').addEventListener("click", () => {
        const projectId = root.querySelector("#ns-project").value;
        const agent = root.querySelector("#ns-agent").value;
        const prompt = root.querySelector("#ns-prompt").value.trim();
        const session = Store.createSession({ projectId, agent, name: prompt ? prompt.slice(0, 48) : "New session" });
        if (prompt) session.output.push({ type: "user", text: prompt });
        aiPanelMode = "terminal";
        close();
      });
    }
  );
}

function openCommandPalette() {
  const projects = Store.state.projects;
  const issues = Store.state.issues;

  function resultsHtml(query) {
    const q = query.trim().toLowerCase();
    const projMatches = projects.filter((p) => !q || p.name.toLowerCase().includes(q));
    const issueMatches = issues.filter((i) => !q || i.title.toLowerCase().includes(q) || i.key.toLowerCase().includes(q));
    let html = "";
    if (projMatches.length) {
      html += `<div class="text-ash" style="font-size:11px;padding:6px 10px;">PROJECTS</div>`;
      html += projMatches
        .slice(0, 6)
        .map((p) => `<div class="cmdk-item" data-cmdk-project="${p.id}">${icon("home", { size: 14 })} ${p.name} <span class="cmdk-sub">${clientName(p.clientId)}</span></div>`)
        .join("");
    }
    if (issueMatches.length) {
      html += `<div class="text-ash" style="font-size:11px;padding:6px 10px;">ISSUES</div>`;
      html += issueMatches
        .slice(0, 6)
        .map((i) => `<div class="cmdk-item" data-cmdk-issue="${i.id}">${icon("list-checks", { size: 14 })} ${i.title} <span class="cmdk-sub">${i.key}</span></div>`)
        .join("");
    }
    return html || `<div class="empty-state" style="padding:24px 0;">No results</div>`;
  }

  Modal.custom(
    `<div id="cmdk">
      <div id="cmdk-input-row">${icon("search", { size: 15 })}<input type="text" placeholder="Search projects, issues, settings…" autofocus /><span class="keycap">Esc</span></div>
      <div id="cmdk-results">${resultsHtml("")}</div>
    </div>`,
    (root, close) => {
      const input = root.querySelector("input");
      const results = root.querySelector("#cmdk-results");
      input.addEventListener("input", () => (results.innerHTML = resultsHtml(input.value)));
      results.addEventListener("click", (e) => {
        const projEl = e.target.closest("[data-cmdk-project]");
        const issueEl = e.target.closest("[data-cmdk-issue]");
        if (projEl) {
          Store.setActiveProject(projEl.dataset.cmdkProject);
          Store.setActiveView("overview");
          close();
        } else if (issueEl) {
          const issue = issues.find((i) => i.id === issueEl.dataset.cmdkIssue);
          Store.setActiveProject(issue.projectId);
          Store.setActiveView("linear");
          Store.setSelectedIssue(issue.id);
          close();
        }
      });
      setTimeout(() => input.focus(), 0);
    }
  );
}

function closeCommandPalette() {
  const cmdk = document.getElementById("cmdk");
  if (cmdk) Modal.close();
}

window.addEventListener("resize", syncAiPanelForceOpen);
