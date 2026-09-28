import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { DevStationBridge, IpcResult } from "./shared/contract";
import { IpcChannels as C } from "./shared/contract";

// The only surface the renderer gets: typed, allow-listed calls. No raw ipcRenderer, no Node APIs.

// Errors crossing the context bridge keep only their message, so the error code travels as a
// "[CODE] " prefix that the renderer parses (see src/lib/desktop.ts).
async function call<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<T>;
  if (!result.ok) throw new Error(result.code ? `[${result.code}] ${result.error}` : result.error);
  return result.data;
}

function on<T>(channel: string, cb: (payload: T) => void) {
  const listener = (_e: IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const bridge: DevStationBridge = {
  access: {
    sync: (permissions) => call(C.ACCESS_SYNC, permissions),
  },
  app: {
    info: () => call(C.APP_INFO),
    openUrl: (url) => call(C.APP_OPEN_URL, url),
  },
  secure: {
    get: (key) => call(C.SECURE_GET, key),
    set: (key, value) => call(C.SECURE_SET, key, value),
    remove: (key) => call(C.SECURE_REMOVE, key),
  },
  workspace: {
    getConfig: () => call(C.WS_GET_CONFIG),
    updateSettings: (settings) => call(C.WS_UPDATE_SETTINGS, settings),
    setProjectPath: (projectId, path) => call(C.WS_SET_PROJECT_PATH, projectId, path),
    projectStates: (ids) => call(C.WS_PROJECT_STATES, ids),
    suggestPath: (name) => call(C.WS_SUGGEST_PATH, name),
    pickDirectory: (defaultPath) => call(C.WS_PICK_DIRECTORY, defaultPath),
  },
  detect: {
    inspectProject: (id) => call(C.DETECT_PROJECT, id),
    inspectPath: (path) => call(C.DETECT_PATH, path),
  },
  files: {
    list: (id, rel) => call(C.FILES_LIST, id, rel),
    search: (id, q) => call(C.FILES_SEARCH, id, q),
    reveal: (id, rel) => call(C.FILES_REVEAL, id, rel),
    openExternal: (id, rel) => call(C.FILES_OPEN_EXTERNAL, id, rel),
    openInEditor: (id, editor, rel) => call(C.FILES_OPEN_EDITOR, id, editor, rel),
    copyPath: (id, rel) => call(C.FILES_COPY_PATH, id, rel),
    readFile: (id, rel) => call(C.FILES_READ, id, rel),
    writeFile: (id, rel, content) => call(C.FILES_WRITE, id, rel, content),
    createFile: (id, rel) => call(C.FILES_CREATE_FILE, id, rel),
    createFolder: (id, rel) => call(C.FILES_CREATE_FOLDER, id, rel),
    rename: (id, rel, name) => call(C.FILES_RENAME, id, rel, name),
    delete: (id, rel) => call(C.FILES_DELETE, id, rel),
  },
  git: {
    status: (id) => call(C.GIT_STATUS, id),
    fileDiff: (id, p) => call(C.GIT_FILE_DIFF, id, p),
    branches: (id) => call(C.GIT_BRANCHES, id),
    log: (id, limit) => call(C.GIT_LOG, id, limit),
    stashes: (id) => call(C.GIT_STASHES, id),
    fetch: (id) => call(C.GIT_FETCH, id),
    pull: (id) => call(C.GIT_PULL, id),
    push: (id) => call(C.GIT_PUSH, id),
    commit: (id, input) => call(C.GIT_COMMIT, id, input),
    checkout: (id, b) => call(C.GIT_CHECKOUT, id, b),
    createBranch: (id, name, checkout) => call(C.GIT_CREATE_BRANCH, id, name, checkout),
    merge: (id, b) => call(C.GIT_MERGE, id, b),
    stash: (id, m) => call(C.GIT_STASH, id, m),
    stashPop: (id, ref) => call(C.GIT_STASH_POP, id, ref),
    discard: (id, input) => call(C.GIT_DISCARD, id, input),
    clone: (input) => call(C.GIT_CLONE, input),
    cancelClone: (opId) => call(C.GIT_CANCEL_CLONE, opId),
    onCloneProgress: (cb) => on(C.GIT_CLONE_PROGRESS, cb),
  },
  processes: {
    list: () => call(C.PROC_LIST),
    start: (id, spec) => call(C.PROC_START, id, spec),
    stop: (key) => call(C.PROC_STOP, key),
    restart: (id, spec) => call(C.PROC_RESTART, id, spec),
    logs: (key) => call(C.PROC_LOGS, key),
    approveCommand: (id, command) => call(C.PROC_APPROVE, id, command),
    onEvent: (cb) => on(C.PROC_EVENT, cb),
  },
  terminals: {
    list: () => call(C.TERM_LIST),
    create: (id, input) => call(C.TERM_CREATE, id, input),
    write: (id, data) => call(C.TERM_WRITE, id, data),
    resize: (id, cols, rows) => call(C.TERM_RESIZE, id, cols, rows),
    kill: (id) => call(C.TERM_KILL, id),
    scrollback: (id) => call(C.TERM_SCROLLBACK, id),
    onData: (cb) => on(C.TERM_DATA, cb),
    onExit: (cb) => on(C.TERM_EXIT, cb),
  },
  agents: {
    adapters: () => call(C.AGENT_ADAPTERS),
    list: () => call(C.AGENT_LIST),
    start: (input) => call(C.AGENT_START, input),
    write: (id, data) => call(C.AGENT_WRITE, id, data),
    resize: (id, cols, rows) => call(C.AGENT_RESIZE, id, cols, rows),
    stop: (id) => call(C.AGENT_STOP, id),
    restart: (id) => call(C.AGENT_RESTART, id),
    forget: (id) => call(C.AGENT_FORGET, id),
    openExternal: (id) => call(C.AGENT_OPEN_EXTERNAL, id),
    scrollback: (id) => call(C.AGENT_SCROLLBACK, id),
    setIdleThreshold: (s) => call(C.AGENT_SET_IDLE, s),
    onData: (cb) => on(C.AGENT_DATA, cb),
    onStatus: (cb) => on(C.AGENT_STATUS, cb),
  },
  preview: {
    show: (input) => call(C.PREVIEW_SHOW, input),
    hide: (input) => call(C.PREVIEW_HIDE, input),
    setBounds: (input) => call(C.PREVIEW_SET_BOUNDS, input),
    navigate: (input) => call(C.PREVIEW_NAVIGATE, input),
    load: (input) => call(C.PREVIEW_LOAD, input),
    destroy: (input) => call(C.PREVIEW_DESTROY, input),
    onState: (cb) => on(C.PREVIEW_STATE, cb),
  },
  notifications: {
    show: (input) => call(C.NOTIF_SHOW, input),
    onClick: (cb) => on(C.NOTIF_CLICK, cb),
  },
};

contextBridge.exposeInMainWorld("devStation", bridge);
