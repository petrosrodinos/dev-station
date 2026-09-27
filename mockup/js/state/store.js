// Tiny observable state store for the mockup. No framework, just enough to keep views in sync.

function cloneSeed() {
  return JSON.parse(JSON.stringify(SEED));
}

const Store = (() => {
  const data = cloneSeed();

  const state = {
    org: data.org,
    clients: data.clients,
    projects: data.projects,
    issues: data.issues,
    sessions: data.sessions,
    activity: data.activity,
    integrations: data.integrations,
    members: data.members,
    fileTree: data.fileTree,

    activeProjectId: "proj-1",
    activeView: "overview", // overview | git | files | linear | notion | settings | integrations | org
    activeSessionTabId: "sess-1", // currently focused session (drives aipanel terminal)
    openSessionTabs: ["sess-1", "sess-2", "sess-3", "sess-4"], // order matters (draggable)
    selectedIssueId: null,
    selectedFilePath: null,
    settingsSection: "general",
    idCounter: 100,
  };

  const listeners = new Set();

  function nextId(prefix) {
    state.idCounter += 1;
    return `${prefix}-${state.idCounter}`;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notify() {
    listeners.forEach((fn) => fn(state));
  }

  function getProject(id) {
    return state.projects.find((p) => p.id === id);
  }

  function getSession(id) {
    return state.sessions.find((s) => s.id === id);
  }

  function getActiveProject() {
    return getProject(state.activeProjectId);
  }

  function setActiveProject(id) {
    const changingProject = state.activeProjectId !== id;
    state.activeProjectId = id;
    state.selectedIssueId = null;
    state.selectedFilePath = null;
    if (changingProject || ["settings", "integrations", "org"].includes(state.activeView)) {
      state.activeView = "overview";
    }
    notify();
  }

  function setActiveView(view) {
    state.activeView = view;
    notify();
  }

  function setSettingsSection(section) {
    state.settingsSection = section;
    state.activeView = "settings";
    notify();
  }

  function openSessionTab(sessionId) {
    if (!state.openSessionTabs.includes(sessionId)) {
      state.openSessionTabs.push(sessionId);
    }
    state.activeSessionTabId = sessionId;
    const sess = getSession(sessionId);
    if (sess) state.activeProjectId = sess.projectId;
    notify();
  }

  function closeSessionTab(sessionId, { stopProcess }) {
    state.openSessionTabs = state.openSessionTabs.filter((id) => id !== sessionId);
    if (stopProcess) {
      const sess = getSession(sessionId);
      if (sess) sess.status = "stopped";
    }
    if (state.activeSessionTabId === sessionId) {
      state.activeSessionTabId = state.openSessionTabs[state.openSessionTabs.length - 1] || null;
    }
    notify();
  }

  function reorderSessionTabs(fromId, toId) {
    const tabs = state.openSessionTabs;
    const fromIdx = tabs.indexOf(fromId);
    const toIdx = tabs.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    tabs.splice(fromIdx, 1);
    tabs.splice(toIdx, 0, fromId);
    notify();
  }

  function createSession({ projectId, agent, name, issueId }) {
    const id = nextId("sess");
    const session = {
      id,
      projectId,
      agent,
      name: name || "New session",
      status: "running",
      pid: 40000 + Math.floor(Math.random() * 9000),
      cwd: getProject(projectId)?.localPath || "~",
      startTime: nowLabel(),
      issueId: issueId || null,
      output: [
        { type: "dim", text: `$ ${agent === "Cursor CLI" ? "cursor-agent" : "claude"} --cwd ${getProject(projectId)?.localPath || "~"}` },
        { type: "dim", text: issueId ? `Loaded project context · Linear ${issueId}` : "Session ready." },
        { type: "agent", text: issueId ? "Reading the linked issue and relevant files before making changes…" : "Ready. What would you like to work on?" },
      ],
    };
    state.sessions.push(session);
    state.openSessionTabs.push(id);
    state.activeSessionTabId = id;
    state.activeProjectId = projectId;
    pushActivity(projectId, `${agent} started — ${session.name}`);
    notify();
    return session;
  }

  function sendToSession(sessionId, text) {
    const sess = getSession(sessionId);
    if (!sess) return;
    sess.output.push({ type: "user", text });
    sess.status = "running";
    notify();
    setTimeout(() => {
      sess.output.push({ type: "agent", text: simulateAgentReply(text) });
      notify();
    }, 500 + Math.random() * 500);
  }

  function simulateAgentReply(input) {
    const replies = [
      "Got it — making that change now.",
      "Looking at the relevant files before editing.",
      "Done. Let me know if you'd like me to also update the tests.",
      "That file doesn't exist yet in this branch — should I create it?",
      "Applied the change. Running the affected test suite now.",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  function pushActivity(projectId, text) {
    state.activity.unshift({ id: nextId("act"), projectId, time: nowLabel(), text });
    if (state.activity.length > 40) state.activity.pop();
  }

  function nowLabel() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function setSelectedIssue(id) {
    state.selectedIssueId = id;
    notify();
  }

  function setSelectedFile(path) {
    state.selectedFilePath = path;
    notify();
  }

  // --- Git mock actions ---
  function commitChanges(message) {
    const proj = getActiveProject();
    if (!proj || !message.trim()) return;
    const count = proj.git.files.length;
    proj.git.files = [];
    proj.git.modified = 0;
    proj.git.added = 0;
    proj.git.deleted = 0;
    proj.git.untracked = 0;
    proj.git.ahead += 1;
    pushActivity(proj.id, `Commit created — "${message.trim()}" (${count} files)`);
    notify();
  }

  function pushChanges() {
    const proj = getActiveProject();
    if (!proj) return;
    proj.git.ahead = 0;
    pushActivity(proj.id, "Push completed");
    notify();
  }

  function pullChanges() {
    const proj = getActiveProject();
    if (!proj) return;
    proj.git.behind = 0;
    pushActivity(proj.id, "Pull completed");
    notify();
  }

  function fetchChanges() {
    const proj = getActiveProject();
    if (!proj) return;
    pushActivity(proj.id, "Fetch completed");
    notify();
  }

  function discardChanges() {
    const proj = getActiveProject();
    if (!proj) return;
    const count = proj.git.files.length;
    proj.git.files = [];
    proj.git.modified = 0;
    proj.git.added = 0;
    proj.git.deleted = 0;
    proj.git.untracked = 0;
    pushActivity(proj.id, `Discarded ${count} changed file(s)`);
    notify();
  }

  function stashChanges() {
    const proj = getActiveProject();
    if (!proj) return;
    const count = proj.git.files.length;
    proj.git.files = [];
    proj.git.modified = 0;
    proj.git.added = 0;
    proj.git.deleted = 0;
    proj.git.untracked = 0;
    pushActivity(proj.id, `Stashed ${count} changed file(s)`);
    notify();
  }

  function toggleService(serviceId) {
    const proj = getActiveProject();
    const svc = proj?.services.find((s) => s.id === serviceId);
    if (!svc) return;
    svc.status = svc.status === "running" ? "stopped" : "running";
    pushActivity(proj.id, `${svc.name} ${svc.status === "running" ? "started" : "stopped"}`);
    notify();
  }

  function startAgentForIssue(issue) {
    return createSession({
      projectId: issue.projectId,
      agent: "Claude Code",
      name: `${issue.title} (${issue.key})`,
      issueId: issue.key,
    });
  }

  function sessionsForProject(projectId) {
    return state.sessions.filter((s) => s.projectId === projectId);
  }

  function attentionCountForProject(projectId) {
    return state.sessions.filter((s) => s.projectId === projectId && (s.status === "finished" || s.status === "awaiting")).length;
  }

  return {
    state,
    subscribe,
    notify,
    getProject,
    getSession,
    getActiveProject,
    setActiveProject,
    setActiveView,
    setSettingsSection,
    openSessionTab,
    closeSessionTab,
    reorderSessionTabs,
    createSession,
    sendToSession,
    pushActivity,
    setSelectedIssue,
    setSelectedFile,
    commitChanges,
    pushChanges,
    pullChanges,
    fetchChanges,
    discardChanges,
    stashChanges,
    toggleService,
    startAgentForIssue,
    sessionsForProject,
    attentionCountForProject,
    nextId,
  };
})();
