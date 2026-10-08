// Types shared by the Electron main process, the preload bridge and the React renderer.
// Only plain data crosses the bridge — never functions, handles or secrets.

import type { ServiceRef } from "./service-refs";

export const ProjectLocalStates = {
  LOCAL: "LOCAL",
  IMPORTED: "IMPORTED",
  MISSING: "MISSING",
} as const;
export type ProjectLocalState = (typeof ProjectLocalStates)[keyof typeof ProjectLocalStates];

export const AgentTypes = {
  CLAUDE_CODE: "CLAUDE_CODE",
  CURSOR_CLI: "CURSOR_CLI",
} as const;
export type AgentType = (typeof AgentTypes)[keyof typeof AgentTypes];

export const AgentRuntimeStatuses = {
  RUNNING: "RUNNING",
  AWAITING_INPUT: "AWAITING_INPUT",
  FINISHED: "FINISHED",
  STOPPED: "STOPPED",
  CRASHED: "CRASHED",
} as const;
export type AgentRuntimeStatus = (typeof AgentRuntimeStatuses)[keyof typeof AgentRuntimeStatuses];

export const ProcessStatuses = {
  RUNNING: "RUNNING",
  STOPPED: "STOPPED",
  CRASHED: "CRASHED",
  STARTING: "STARTING",
} as const;
export type ProcessStatus = (typeof ProcessStatuses)[keyof typeof ProcessStatuses];

/** What the user picked when closing the window. Background keeps services running and the app in the tray. */
export const CloseChoices = {
  QUIT: "quit",
  BACKGROUND: "background",
} as const;
export type CloseChoice = (typeof CloseChoices)[keyof typeof CloseChoices];

export const EditorTargets = {
  CURSOR: "cursor",
  VSCODE: "vscode",
  DEFAULT: "default",
} as const;
export type EditorTarget = (typeof EditorTargets)[keyof typeof EditorTargets];

export interface IpcOk<T> {
  ok: true;
  data: T;
}
export interface IpcFail {
  ok: false;
  error: string;
  code?: string;
}
export type IpcResult<T> = IpcOk<T> | IpcFail;

// ---------------------------------------------------------------------------
// Workspace (device-local configuration)
// ---------------------------------------------------------------------------

export interface DeviceSettings {
  workspace_dir: string;
  default_shell: string | null;
  agent_executables: Record<AgentType, string | null>;
  editor_executables: { cursor: string | null; vscode: string | null };
  /** Extra absolute folders scanned for agent skills (in addition to the built-in provider locations). */
  skill_folders: string[];
  /**
   * When a service's port is taken, start it on the next free port (and point `{{refs}}` / .env URLs at it).
   * Off: services always use their configured port and fail to start if it is busy. Applies to every project.
   */
  auto_shift_ports: boolean;
}

export interface WorkspaceConfig {
  device_id: string;
  settings: DeviceSettings;
  project_paths: Record<string, string>;
}

export interface AppInfo {
  version: string;
  platform: NodeJS.Platform;
  arch: string;
  device_id: string;
  home_dir: string;
  default_shell: string;
}

// ---------------------------------------------------------------------------
// Auto-update (electron-updater)
// ---------------------------------------------------------------------------

export const AppUpdateStates = {
  IDLE: "idle",
  CHECKING: "checking",
  AVAILABLE: "available",
  NOT_AVAILABLE: "not-available",
  DOWNLOADING: "downloading",
  DOWNLOADED: "downloaded",
  ERROR: "error",
} as const;
export type AppUpdateState = (typeof AppUpdateStates)[keyof typeof AppUpdateStates];

export interface AppUpdateStatus {
  state: AppUpdateState;
  version?: string;
  percent?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Agent skills (read from disk, in every provider's format)
// ---------------------------------------------------------------------------

export const SkillProviders = {
  CLAUDE: "claude",
  CURSOR: "cursor",
  CODEX: "codex",
  GEMINI: "gemini",
  COPILOT: "copilot",
  GENERIC: "generic",
} as const;
export type SkillProvider = (typeof SkillProviders)[keyof typeof SkillProviders];

export const SkillScopes = {
  USER: "user",
  PROJECT: "project",
  CUSTOM: "custom",
} as const;
export type SkillScope = (typeof SkillScopes)[keyof typeof SkillScopes];

export const SkillKinds = {
  SKILL: "skill",
  COMMAND: "command",
  RULE: "rule",
  CONTEXT: "context",
  DOC: "doc",
} as const;
export type SkillKind = (typeof SkillKinds)[keyof typeof SkillKinds];

export const SkillSendModes = {
  CONTENT: "content",
  REFERENCE: "reference",
} as const;
export type SkillSendMode = (typeof SkillSendModes)[keyof typeof SkillSendModes];

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  provider: SkillProvider;
  scope: SkillScope;
  kind: SkillKind;
  /** Absolute path of the file that defines the skill. */
  path: string;
  size_bytes: number;
  /** Frontmatter fields (globs, allowed-tools, ...), flattened to strings. */
  meta: Record<string, string>;
}

export interface SkillDetail extends SkillSummary {
  /** File content without the frontmatter block. */
  body: string;
  /** True when the file was larger than the read limit and the body was cut. */
  truncated: boolean;
}

export interface SkillListResult {
  skills: SkillSummary[];
  /** Absolute paths that were scanned, so the UI can explain where skills come from. */
  scanned: string[];
}

export interface SendSkillInput {
  session_id: string;
  skill_id: string;
  mode: SkillSendMode;
  /** Press Enter after pasting. Off by default so the user can review first. */
  submit?: boolean;
}

/** Sends a DB-backed custom skill (no file on disk, so only "content" mode applies). */
export interface SendCustomSkillInput {
  session_id: string;
  name: string;
  kind: SkillKind;
  body: string;
  submit?: boolean;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface DetectedService {
  name: string;
  kind: "FRONTEND" | "API" | "WORKER" | "DATABASE" | "STORYBOOK" | "OTHER";
  cwd: string;
  package_manager: PackageManager | null;
  script: string | null;
  command: string | null;
  port: number | null;
  url: string | null;
  /** Suggested env, e.g. `VITE_API_URL` -> `{{api.url}}`, found by matching `.env` values to sibling ports. */
  env?: Record<string, string> | null;
}

export interface EnvKeyEntry {
  key: string;
  /** `.env*` files (relative to the directory) that declare it. */
  files: string[];
}

/** A `.env*` file found in a project (root or a service folder). */
export interface EnvFileSummary {
  /** Project-relative path, `/`-separated (`api/.env.staging`). */
  path: string;
  /** Project-relative folder (`.` for the root). */
  dir: string;
  name: string;
  /** `.env.example` / `.env.template`: documentation, not loaded by apps. */
  is_template: boolean;
}

export interface EnvVariable {
  key: string;
  value: string;
}

export const EnvOverrideSources = {
  /** Dev Station moved a service to another port and rewrote this `localhost:<port>` value at start. */
  PORT_SHIFT: "PORT_SHIFT",
  /** Set in the service's Dev Station environment settings, which win over the file. */
  SERVICE_ENV: "SERVICE_ENV",
} as const;
export type EnvOverrideSource = (typeof EnvOverrideSources)[keyof typeof EnvOverrideSources];

/** The value a running service actually received for a variable, when it differs from the file. */
export interface EnvRuntimeOverride {
  key: string;
  value: string;
  source: EnvOverrideSource;
  service_id: string;
  service_name: string;
}

export interface EnvFileContent {
  path: string;
  variables: EnvVariable[];
  overrides: EnvRuntimeOverride[];
  /** Modification time when read; a save is refused if the file changed on disk since. */
  mtime_ms: number;
}

export interface DetectedPackage {
  name: string;
  path: string;
  frameworks: string[];
  scripts: Record<string, string>;
}

export interface DetectionResult {
  root: string;
  package_manager: PackageManager | null;
  monorepo_tools: string[];
  has_docker: boolean;
  docker_compose_files: string[];
  languages: string[];
  packages: DetectedPackage[];
  services: DetectedService[];
  git: { is_repo: boolean; remote_url: string | null; branch: string | null };
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export interface FileEntry {
  name: string;
  path: string; // relative to project root, forward slashes
  type: "file" | "dir";
  size?: number;
}

export interface FileContent {
  content: string;
}

export const FilePreviewKinds = {
  IMAGE: "image",
  PDF: "pdf",
} as const;
export type FilePreviewKind = (typeof FilePreviewKinds)[keyof typeof FilePreviewKinds];

/** Extensions the viewer can show without opening them in an editor (lowercase, no dot). */
export const PREVIEW_FILE_TYPES: Record<string, { kind: FilePreviewKind; mime: string }> = {
  png: { kind: FilePreviewKinds.IMAGE, mime: "image/png" },
  jpg: { kind: FilePreviewKinds.IMAGE, mime: "image/jpeg" },
  jpeg: { kind: FilePreviewKinds.IMAGE, mime: "image/jpeg" },
  gif: { kind: FilePreviewKinds.IMAGE, mime: "image/gif" },
  webp: { kind: FilePreviewKinds.IMAGE, mime: "image/webp" },
  avif: { kind: FilePreviewKinds.IMAGE, mime: "image/avif" },
  bmp: { kind: FilePreviewKinds.IMAGE, mime: "image/bmp" },
  ico: { kind: FilePreviewKinds.IMAGE, mime: "image/x-icon" },
  svg: { kind: FilePreviewKinds.IMAGE, mime: "image/svg+xml" },
  pdf: { kind: FilePreviewKinds.PDF, mime: "application/pdf" },
};

/** Preview type for a file or project-relative path (by extension), or null when the viewer has no preview for it. */
export const previewTypeFor = (filePath: string) => {
  const name = filePath.slice(filePath.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  return Object.hasOwn(PREVIEW_FILE_TYPES, ext) ? PREVIEW_FILE_TYPES[ext] : null;
};

export interface FileBinary {
  kind: FilePreviewKind;
  mime: string;
  data: Uint8Array;
}

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

export type GitFileState = "M" | "A" | "D" | "R" | "U" | "C";

export interface GitFileChange {
  path: string;
  orig_path?: string;
  state: GitFileState;
  staged: boolean;
  additions: number;
  deletions: number;
  binary: boolean;
}

export interface GitStatus {
  is_repo: boolean;
  branch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  commits: number;
  detached: boolean;
  files: GitFileChange[];
  counts: { modified: number; added: number; deleted: number; untracked: number; conflicted: number; renamed: number };
  totals: { additions: number; deletions: number };
}

export interface GitBranch {
  name: string;
  remote: boolean;
  current: boolean;
  upstream: string | null;
  last_commit: string | null;
}

export interface GitCommitEntry {
  sha: string;
  short_sha: string;
  author: string;
  relative_date: string;
  subject: string;
}

export interface GitStashEntry {
  ref: string;
  message: string;
}

export interface CloneProgressEvent {
  operation_id: string;
  stage: string;
  percent: number | null;
  line: string;
  done: boolean;
  error: string | null;
  path: string;
}

// ---------------------------------------------------------------------------
// Processes (project services)
// ---------------------------------------------------------------------------

export interface ServiceSpec {
  service_id: string;
  name: string;
  cwd: string;
  package_manager: PackageManager | null;
  script: string | null;
  command: string | null;
  url: string | null;
  env: Record<string, string> | null;
  /** The port this service asks for; the process manager may run it on another one if that is taken. */
  port: number | null;
  /** Every service of the project (including this one), so `{{other.port}}` references can be resolved. */
  siblings: ServiceRef[];
}

export interface ProcessInfo {
  key: string; // `${project_id}:${service_id}`
  project_id: string;
  service_id: string;
  name: string;
  pid: number | null;
  command: string;
  cwd: string;
  status: ProcessStatus;
  started_at: string | null;
  exited_at: string | null;
  exit_code: number | null;
  url: string | null;
  env_keys: string[];
  /** The port the process actually runs on (may differ from `requested_port`). */
  port: number | null;
  requested_port: number | null;
  /** A service this one references moved to another port after this one started. */
  needs_restart: boolean;
}

export interface LogLine {
  stream: "stdout" | "stderr" | "system";
  text: string;
  at: number;
}

export interface PortKillResult {
  port: number;
  /** Process ids that were listening on the port when the kill started (empty = nothing was using it). */
  pids: number[];
  /** True when nothing is listening on the port any more. */
  freed: boolean;
}

export interface ProcessEvent {
  type: "status" | "log";
  process: ProcessInfo;
  lines?: LogLine[];
}

// ---------------------------------------------------------------------------
// Terminals & agents (PTY-backed)
// ---------------------------------------------------------------------------

export interface TerminalInfo {
  id: string;
  project_id: string;
  title: string;
  shell: string;
  cwd: string;
  pid: number;
  alive: boolean;
  created_at: string;
}

export interface PtyDataEvent {
  id: string;
  data: string;
}

export interface PtyExitEvent {
  id: string;
  exit_code: number;
}

export interface AgentAdapterInfo {
  type: AgentType;
  name: string;
  executable: string;
  resolved_path: string | null;
  available: boolean;
}

export interface AgentChanges {
  files_changed: number;
  additions: number;
  deletions: number;
}

export interface AgentSessionInfo {
  id: string; // server AgentSession id
  project_id: string;
  agent_type: AgentType;
  name: string;
  status: AgentRuntimeStatus;
  pid: number | null;
  command: string;
  cwd: string;
  started_at: string;
  ended_at: string | null;
  exit_code: number | null;
  changes: AgentChanges;
  alive: boolean;
  /** The agent CLI's own title for this conversation, when it has one. */
  agent_title?: string | null;
  /** Someone has worked in it (a prompt was sent or the agent ran). A session opened and left alone has nothing to review. */
  engaged: boolean;
}

export interface AgentStatusEvent {
  session: AgentSessionInfo;
  previous: AgentRuntimeStatus | null;
}

export interface StartAgentInput {
  session_id: string;
  project_id: string;
  agent_type: AgentType;
  /** Full launch command line (executable + flags, quotes group spaces), e.g. `claude --dangerously-skip-permissions`. Overrides the executable setting. */
  command?: string;
  name: string;
  prompt: string | null;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
  idle_threshold_seconds?: number;
}

// ---------------------------------------------------------------------------
// Preview (embedded WebContentsView for localhost dev services)
// ---------------------------------------------------------------------------

/** Rectangle in window (CSS pixel) coordinates. */
export interface PreviewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewState {
  projectId: string;
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Floating panels (docking system §C): a dock panel popped out into its own real OS window.
// ---------------------------------------------------------------------------

/** Window bounds in screen (CSS pixel) coordinates, plus which display it was last on. */
export interface FloatingWindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  displayId?: number;
}

export interface OpenFloatingPanelInput {
  panelId: string;
  /** Dock component type (e.g. "session-terminal") — resolved to a React component renderer-side. */
  componentType: string;
  params: Record<string, unknown>;
  title: string;
  /** Floating window to add the panel to; a window with this id is opened when none exists yet. */
  windowId: string;
  bounds?: Partial<FloatingWindowBounds>;
}

/** One dock panel hosted by a floating window. */
export interface FloatingWindowPanel {
  panelId: string;
  componentType: string;
  params: Record<string, unknown>;
  title: string;
}

/** Full panel list of one floating window; pushed after every change so a late subscriber can't miss one. */
export interface FloatingWindowSnapshot {
  windowId: string;
  panels: FloatingWindowPanel[];
}

/** Fired when a floating panel is docked back (closed from its window, or its window closed). */
export interface FloatingPanelClosedEvent {
  panelId: string;
  bounds: FloatingWindowBounds;
}

// ---------------------------------------------------------------------------
// Bridge surface exposed on window.devStation
// ---------------------------------------------------------------------------

export type Unsubscribe = () => void;

export interface OsNotificationInput {
  title: string;
  body: string;
  project_id?: string;
  session_id?: string;
}

export interface OsNotificationClick {
  project_id?: string;
  session_id?: string;
}

export interface DevStationBridge {
  access: {
    /** Pushes the signed-in user's permission keys to the main process (defense-in-depth). */
    sync(permissions: string[]): Promise<void>;
  };
  app: {
    info(): Promise<AppInfo>;
    openUrl(url: string): Promise<void>;
    /** Toggles the window's native full-screen state; returns the new state. */
    toggleFullScreen(): Promise<boolean>;
    onFullScreenChange(cb: (isFullScreen: boolean) => void): Unsubscribe;
    /** The window's close button was pressed: the renderer asks what to do (see CloseChoices). */
    onCloseRequest(cb: () => void): Unsubscribe;
    respondClose(choice: CloseChoice): Promise<void>;
  };
  appUpdates: {
    /** Current electron-updater status — lets a renderer that mounted late (or reloaded) catch up. */
    getStatus(): Promise<AppUpdateStatus>;
    /** Triggers a manual electron-updater check (no-ops outside a packaged build). */
    check(): Promise<void>;
    /** Starts downloading an already-detected update. */
    download(): Promise<void>;
    /** Quits and installs a downloaded update. Only ever call this on explicit user action. */
    install(): Promise<void>;
    onStatus(cb: (status: AppUpdateStatus) => void): Unsubscribe;
  };
  secure: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
  };
  workspace: {
    getConfig(): Promise<WorkspaceConfig>;
    updateSettings(settings: Partial<DeviceSettings>): Promise<WorkspaceConfig>;
    setProjectPath(projectId: string, path: string | null): Promise<WorkspaceConfig>;
    projectStates(projectIds: string[]): Promise<Record<string, ProjectLocalState>>;
    suggestPath(projectName: string): Promise<string>;
    pickDirectory(defaultPath?: string): Promise<string | null>;
  };
  detect: {
    /** Names (not values) of the variables in the `.env*` files of a project directory. */
    listEnvKeys(projectId: string, relDir: string): Promise<EnvKeyEntry[]>;
    inspectProject(projectId: string): Promise<DetectionResult>;
    inspectPath(path: string): Promise<DetectionResult>;
  };
  env: {
    /** Every `.env*` file in the project root and its service folders. */
    listFiles(projectId: string): Promise<EnvFileSummary[]>;
    readFile(projectId: string, relPath: string): Promise<EnvFileContent>;
    /** Replaces the file's variables (order kept; comments preserved). Fails if the file changed since `mtimeMs`. */
    writeFile(projectId: string, relPath: string, variables: EnvVariable[], mtimeMs: number): Promise<EnvFileContent>;
  };
  files: {
    list(projectId: string, relDir: string): Promise<FileEntry[]>;
    search(projectId: string, query: string): Promise<FileEntry[]>;
    reveal(projectId: string, relPath: string): Promise<void>;
    openExternal(projectId: string, relPath: string): Promise<void>;
    openInEditor(projectId: string, editor: EditorTarget, relPath?: string): Promise<void>;
    copyPath(projectId: string, relPath: string): Promise<string>;
    readFile(projectId: string, relPath: string): Promise<FileContent>;
    /** Raw bytes of an image or PDF for the in-app viewer (see PREVIEW_FILE_TYPES). */
    readBinary(projectId: string, relPath: string): Promise<FileBinary>;
    writeFile(projectId: string, relPath: string, content: string): Promise<void>;
    /** Returns the created project-relative path. `relPath` may contain "/" to create intermediate folders. */
    createFile(projectId: string, relPath: string): Promise<string>;
    createFolder(projectId: string, relPath: string): Promise<string>;
    /** Renames within the same folder; returns the new project-relative path. */
    rename(projectId: string, relPath: string, newName: string): Promise<string>;
    /** Moves an entry into another project folder ("" = root); returns the new project-relative path. */
    move(projectId: string, relPath: string, destDir: string): Promise<string>;
    /** Copies files/folders from anywhere on disk (absolute paths) into a project folder; returns the new relative paths. */
    importExternal(projectId: string, destDir: string, sourcePaths: string[]): Promise<string[]>;
    /** Resolves the absolute path of a File from a drag-and-drop event. */
    pathForFile(file: File): string;
    /** Moves to the OS trash rather than deleting permanently. */
    delete(projectId: string, relPath: string): Promise<void>;
  };
  git: {
    status(projectId: string): Promise<GitStatus>;
    fileDiff(projectId: string, path: string): Promise<string>;
    branches(projectId: string): Promise<GitBranch[]>;
    log(projectId: string, limit?: number): Promise<GitCommitEntry[]>;
    stashes(projectId: string): Promise<GitStashEntry[]>;
    /** Runs `git init` in the project folder. */
    init(projectId: string): Promise<string>;
    fetch(projectId: string): Promise<string>;
    pull(projectId: string): Promise<string>;
    push(projectId: string): Promise<{ pushed: boolean; output: string }>;
    commit(projectId: string, input: { message: string; paths?: string[]; name?: string | null; email?: string | null }): Promise<{ sha: string; output: string }>;
    checkout(projectId: string, branch: string): Promise<string>;
    createBranch(projectId: string, name: string, checkout: boolean): Promise<string>;
    merge(projectId: string, branch: string): Promise<string>;
    stash(projectId: string, message?: string): Promise<string>;
    stashPop(projectId: string, ref?: string): Promise<string>;
    discard(projectId: string, input: { paths?: string[]; confirm: true }): Promise<string>;
    clone(input: { operation_id: string; url: string; destination: string; branch?: string | null }): Promise<string>;
    cancelClone(operationId: string): Promise<void>;
    onCloneProgress(cb: (e: CloneProgressEvent) => void): Unsubscribe;
  };
  processes: {
    list(): Promise<ProcessInfo[]>;
    start(projectId: string, spec: ServiceSpec): Promise<ProcessInfo>;
    stop(key: string): Promise<void>;
    restart(projectId: string, spec: ServiceSpec): Promise<ProcessInfo>;
    logs(key: string): Promise<LogLine[]>;
    approveCommand(projectId: string, command: string): Promise<void>;
    onEvent(cb: (e: ProcessEvent) => void): Unsubscribe;
  };
  ports: {
    /** Terminates whatever is listening on each port. */
    kill(ports: number[]): Promise<PortKillResult[]>;
  };
  terminals: {
    list(): Promise<TerminalInfo[]>;
    create(projectId: string, input?: { cols?: number; rows?: number }): Promise<TerminalInfo>;
    write(id: string, data: string): Promise<void>;
    resize(id: string, cols: number, rows: number): Promise<void>;
    kill(id: string): Promise<void>;
    scrollback(id: string): Promise<string>;
    onData(cb: (e: PtyDataEvent) => void): Unsubscribe;
    onExit(cb: (e: PtyExitEvent) => void): Unsubscribe;
  };
  agents: {
    adapters(): Promise<AgentAdapterInfo[]>;
    list(): Promise<AgentSessionInfo[]>;
    start(input: StartAgentInput): Promise<AgentSessionInfo>;
    write(id: string, data: string): Promise<void>;
    resize(id: string, cols: number, rows: number): Promise<void>;
    stop(id: string): Promise<void>;
    restart(id: string): Promise<AgentSessionInfo>;
    forget(id: string): Promise<void>;
    openExternal(id: string): Promise<void>;
    scrollback(id: string): Promise<string>;
    setIdleThreshold(seconds: number): Promise<void>;
    onData(cb: (e: PtyDataEvent) => void): Unsubscribe;
    onStatus(cb: (e: AgentStatusEvent) => void): Unsubscribe;
  };
  skills: {
    /** Skills visible to `projectId` (user-level + that project's + custom folders); user-level only when null. */
    list(projectId: string | null): Promise<SkillListResult>;
    read(skillId: string): Promise<SkillDetail>;
    send(input: SendSkillInput): Promise<void>;
    /** Same as `send`, but for a DB-backed custom skill that has no file to read. */
    sendCustom(input: SendCustomSkillInput): Promise<void>;
  };
  preview: {
    show(input: { projectId: string; url: string; bounds: PreviewBounds }): Promise<void>;
    hide(input: { projectId: string }): Promise<void>;
    setBounds(input: { projectId: string; bounds: PreviewBounds }): Promise<void>;
    navigate(input: { projectId: string; action: "back" | "forward" | "reload" }): Promise<void>;
    load(input: { projectId: string; url: string }): Promise<void>;
    destroy(input: { projectId: string }): Promise<void>;
    /** Opens/closes a detached DevTools window for the previewed view; returns the new open state. */
    toggleDevTools(input: { projectId: string }): Promise<boolean>;
    onState(cb: (e: PreviewState) => void): Unsubscribe;
  };
  layout: {
    /** Pops a panel out into a floating OS window (adding it to that window if it already exists). */
    openFloatingPanel(input: OpenFloatingPanelInput): Promise<void>;
    /** Docks a floating panel back into its project or session (closes its window when it was the last one). */
    closeFloatingPanel(panelId: string): Promise<void>;
    getFloatingWindow(windowId: string): Promise<FloatingWindowSnapshot>;
    onFloatingWindowChanged(cb: (e: FloatingWindowSnapshot) => void): Unsubscribe;
    onFloatingPanelClosed(cb: (e: FloatingPanelClosedEvent) => void): Unsubscribe;
  };
  notifications: {
    /** Resolves to false when the OS does not support notifications. */
    show(input: OsNotificationInput): Promise<boolean>;
    onClick(cb: (e: OsNotificationClick) => void): Unsubscribe;
  };
}

export const IpcChannels = {
  ACCESS_SYNC: "access:sync",
  APP_INFO: "app:info",
  APP_OPEN_URL: "app:open-url",
  APP_TOGGLE_FULLSCREEN: "app:toggle-fullscreen",
  APP_FULLSCREEN_CHANGE: "app:fullscreen-change",
  APP_CLOSE_REQUEST: "app:close-request",
  APP_CLOSE_RESPOND: "app:close-respond",
  APP_UPDATE_STATUS_GET: "app:update-status-get",
  APP_UPDATE_CHECK: "app:update-check",
  APP_UPDATE_DOWNLOAD: "app:update-download",
  APP_UPDATE_INSTALL: "app:update-install",
  APP_UPDATE_STATUS: "app:update-status",
  SECURE_GET: "secure:get",
  SECURE_SET: "secure:set",
  SECURE_REMOVE: "secure:remove",
  WS_GET_CONFIG: "workspace:get-config",
  WS_UPDATE_SETTINGS: "workspace:update-settings",
  WS_SET_PROJECT_PATH: "workspace:set-project-path",
  WS_PROJECT_STATES: "workspace:project-states",
  WS_SUGGEST_PATH: "workspace:suggest-path",
  WS_PICK_DIRECTORY: "workspace:pick-directory",
  DETECT_PROJECT: "detect:project",
  DETECT_PATH: "detect:path",
  DETECT_ENV_KEYS: "detect:env-keys",
  ENV_LIST_FILES: "env:list-files",
  ENV_READ_FILE: "env:read-file",
  ENV_WRITE_FILE: "env:write-file",
  FILES_LIST: "files:list",
  FILES_SEARCH: "files:search",
  FILES_REVEAL: "files:reveal",
  FILES_OPEN_EXTERNAL: "files:open-external",
  FILES_OPEN_EDITOR: "files:open-editor",
  FILES_COPY_PATH: "files:copy-path",
  FILES_READ: "files:read",
  FILES_READ_BINARY: "files:read-binary",
  FILES_WRITE: "files:write",
  FILES_CREATE_FILE: "files:create-file",
  FILES_CREATE_FOLDER: "files:create-folder",
  FILES_RENAME: "files:rename",
  FILES_MOVE: "files:move",
  FILES_IMPORT: "files:import",
  FILES_DELETE: "files:delete",
  GIT_STATUS: "git:status",
  GIT_FILE_DIFF: "git:file-diff",
  GIT_BRANCHES: "git:branches",
  GIT_LOG: "git:log",
  GIT_STASHES: "git:stashes",
  GIT_INIT: "git:init",
  GIT_FETCH: "git:fetch",
  GIT_PULL: "git:pull",
  GIT_PUSH: "git:push",
  GIT_COMMIT: "git:commit",
  GIT_CHECKOUT: "git:checkout",
  GIT_CREATE_BRANCH: "git:create-branch",
  GIT_MERGE: "git:merge",
  GIT_STASH: "git:stash",
  GIT_STASH_POP: "git:stash-pop",
  GIT_DISCARD: "git:discard",
  GIT_CLONE: "git:clone",
  GIT_CANCEL_CLONE: "git:cancel-clone",
  GIT_CLONE_PROGRESS: "git:clone-progress",
  PROC_LIST: "process:list",
  PROC_START: "process:start",
  PROC_STOP: "process:stop",
  PROC_RESTART: "process:restart",
  PROC_LOGS: "process:logs",
  PROC_APPROVE: "process:approve-command",
  PROC_EVENT: "process:event",
  PORT_KILL: "port:kill",
  TERM_LIST: "terminal:list",
  TERM_CREATE: "terminal:create",
  TERM_WRITE: "terminal:write",
  TERM_RESIZE: "terminal:resize",
  TERM_KILL: "terminal:kill",
  TERM_SCROLLBACK: "terminal:scrollback",
  TERM_DATA: "terminal:data",
  TERM_EXIT: "terminal:exit",
  AGENT_ADAPTERS: "agent:adapters",
  AGENT_LIST: "agent:list",
  AGENT_START: "agent:start",
  AGENT_WRITE: "agent:write",
  AGENT_RESIZE: "agent:resize",
  AGENT_STOP: "agent:stop",
  AGENT_RESTART: "agent:restart",
  AGENT_FORGET: "agent:forget",
  AGENT_OPEN_EXTERNAL: "agent:open-external",
  AGENT_SCROLLBACK: "agent:scrollback",
  AGENT_SET_IDLE: "agent:set-idle",
  AGENT_DATA: "agent:data",
  AGENT_STATUS: "agent:status",
  SKILLS_LIST: "skills:list",
  SKILLS_READ: "skills:read",
  SKILLS_SEND: "skills:send",
  SKILLS_SEND_CUSTOM: "skills:send-custom",
  PREVIEW_SHOW: "preview:show",
  PREVIEW_HIDE: "preview:hide",
  PREVIEW_SET_BOUNDS: "preview:set-bounds",
  PREVIEW_NAVIGATE: "preview:navigate",
  PREVIEW_LOAD: "preview:load",
  PREVIEW_DESTROY: "preview:destroy",
  PREVIEW_TOGGLE_DEVTOOLS: "preview:toggle-devtools",
  PREVIEW_STATE: "preview:state",
  LAYOUT_OPEN_FLOATING: "layout:open-floating",
  LAYOUT_CLOSE_FLOATING: "layout:close-floating",
  LAYOUT_GET_FLOATING_WINDOW: "layout:get-floating-window",
  LAYOUT_FLOATING_WINDOW_CHANGED: "layout:floating-window-changed",
  LAYOUT_FLOATING_CLOSED: "layout:floating-closed",
  NOTIF_SHOW: "notification:show",
  NOTIF_CLICK: "notification:click",
} as const;

export const IpcErrorCodes = {
  COMMAND_NOT_APPROVED: "COMMAND_NOT_APPROVED",
  PROJECT_NOT_LOCAL: "PROJECT_NOT_LOCAL",
  PATH_OUTSIDE_PROJECT: "PATH_OUTSIDE_PROJECT",
  VALIDATION: "VALIDATION",
  FORBIDDEN: "FORBIDDEN",
  AGENT_NOT_FOUND: "AGENT_NOT_FOUND",
  GIT_FAILED: "GIT_FAILED",
  PREVIEW_URL_NOT_ALLOWED: "PREVIEW_URL_NOT_ALLOWED",
  /** The file changed on disk after it was read; reload before saving. */
  FILE_CHANGED: "FILE_CHANGED",
} as const;
