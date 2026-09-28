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
}

export interface WorkspaceConfig {
  device_id: string;
  settings: DeviceSettings;
  project_paths: Record<string, string>;
}

export interface AppInfo {
  version: string;
  platform: NodeJS.Platform;
  device_id: string;
  home_dir: string;
  default_shell: string;
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
}

export interface AgentStatusEvent {
  session: AgentSessionInfo;
  previous: AgentRuntimeStatus | null;
}

export interface StartAgentInput {
  session_id: string;
  project_id: string;
  agent_type: AgentType;
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
    inspectProject(projectId: string): Promise<DetectionResult>;
    inspectPath(path: string): Promise<DetectionResult>;
  };
  files: {
    list(projectId: string, relDir: string): Promise<FileEntry[]>;
    search(projectId: string, query: string): Promise<FileEntry[]>;
    reveal(projectId: string, relPath: string): Promise<void>;
    openExternal(projectId: string, relPath: string): Promise<void>;
    openInEditor(projectId: string, editor: EditorTarget, relPath?: string): Promise<void>;
    copyPath(projectId: string, relPath: string): Promise<string>;
    readFile(projectId: string, relPath: string): Promise<FileContent>;
    writeFile(projectId: string, relPath: string, content: string): Promise<void>;
    /** Returns the created project-relative path. `relPath` may contain "/" to create intermediate folders. */
    createFile(projectId: string, relPath: string): Promise<string>;
    createFolder(projectId: string, relPath: string): Promise<string>;
    /** Renames within the same folder; returns the new project-relative path. */
    rename(projectId: string, relPath: string, newName: string): Promise<string>;
    /** Moves to the OS trash rather than deleting permanently. */
    delete(projectId: string, relPath: string): Promise<void>;
  };
  git: {
    status(projectId: string): Promise<GitStatus>;
    fileDiff(projectId: string, path: string): Promise<string>;
    branches(projectId: string): Promise<GitBranch[]>;
    log(projectId: string, limit?: number): Promise<GitCommitEntry[]>;
    stashes(projectId: string): Promise<GitStashEntry[]>;
    fetch(projectId: string): Promise<string>;
    pull(projectId: string): Promise<string>;
    push(projectId: string): Promise<string>;
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
  };
  preview: {
    show(input: { projectId: string; url: string; bounds: PreviewBounds }): Promise<void>;
    hide(input: { projectId: string }): Promise<void>;
    setBounds(input: { projectId: string; bounds: PreviewBounds }): Promise<void>;
    navigate(input: { projectId: string; action: "back" | "forward" | "reload" }): Promise<void>;
    load(input: { projectId: string; url: string }): Promise<void>;
    destroy(input: { projectId: string }): Promise<void>;
    onState(cb: (e: PreviewState) => void): Unsubscribe;
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
  FILES_LIST: "files:list",
  FILES_SEARCH: "files:search",
  FILES_REVEAL: "files:reveal",
  FILES_OPEN_EXTERNAL: "files:open-external",
  FILES_OPEN_EDITOR: "files:open-editor",
  FILES_COPY_PATH: "files:copy-path",
  FILES_READ: "files:read",
  FILES_WRITE: "files:write",
  FILES_CREATE_FILE: "files:create-file",
  FILES_CREATE_FOLDER: "files:create-folder",
  FILES_RENAME: "files:rename",
  FILES_DELETE: "files:delete",
  GIT_STATUS: "git:status",
  GIT_FILE_DIFF: "git:file-diff",
  GIT_BRANCHES: "git:branches",
  GIT_LOG: "git:log",
  GIT_STASHES: "git:stashes",
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
  PREVIEW_SHOW: "preview:show",
  PREVIEW_HIDE: "preview:hide",
  PREVIEW_SET_BOUNDS: "preview:set-bounds",
  PREVIEW_NAVIGATE: "preview:navigate",
  PREVIEW_LOAD: "preview:load",
  PREVIEW_DESTROY: "preview:destroy",
  PREVIEW_STATE: "preview:state",
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
} as const;
