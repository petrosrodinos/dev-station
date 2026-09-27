import { app } from "electron";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DeviceSettings, ProjectLocalState, WorkspaceConfig } from "../shared/contract";
import { IpcErrorCodes, ProjectLocalStates } from "../shared/contract";
import { IpcError } from "../ipc/ipc-error";
import { defaultShell } from "../utils/platform";

// Device-local workspace configuration (Spec §25/§26). Never synced to the server:
// local paths, device id, executables and approved custom commands are per machine.

interface StoredConfig extends WorkspaceConfig {
  approved_commands: Record<string, string[]>; // project_id -> sha256(command)
}

const FILE_NAME = "workspace.json";

function defaults(): StoredConfig {
  return {
    device_id: crypto.randomUUID(),
    settings: {
      workspace_dir: path.join(os.homedir(), "Development"),
      default_shell: null,
      agent_executables: { CLAUDE_CODE: null, CURSOR_CLI: null },
      editor_executables: { cursor: null, vscode: null },
    },
    project_paths: {},
    approved_commands: {},
  };
}

class WorkspaceConfigManager {
  private config: StoredConfig | null = null;

  private get file() {
    return path.join(app.getPath("userData"), FILE_NAME);
  }

  private load(): StoredConfig {
    if (this.config) return this.config;
    const base = defaults();
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, "utf8")) as Partial<StoredConfig>;
      this.config = {
        ...base,
        ...raw,
        settings: {
          ...base.settings,
          ...raw.settings,
          agent_executables: { ...base.settings.agent_executables, ...raw.settings?.agent_executables },
          editor_executables: { ...base.settings.editor_executables, ...raw.settings?.editor_executables },
        },
        project_paths: raw.project_paths ?? {},
        approved_commands: raw.approved_commands ?? {},
      };
    } catch {
      this.config = base;
      this.save();
    }
    return this.config;
  }

  private save() {
    if (!this.config) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.config, null, 2));
    fs.renameSync(tmp, this.file);
  }

  getPublic(): WorkspaceConfig {
    const { device_id, settings, project_paths } = this.load();
    return { device_id, settings, project_paths };
  }

  get deviceId() {
    return this.load().device_id;
  }

  get settings(): DeviceSettings {
    return this.load().settings;
  }

  shell(): string {
    return this.load().settings.default_shell || defaultShell();
  }

  updateSettings(patch: Partial<DeviceSettings>): WorkspaceConfig {
    const cfg = this.load();
    cfg.settings = {
      ...cfg.settings,
      ...patch,
      agent_executables: { ...cfg.settings.agent_executables, ...patch.agent_executables },
      editor_executables: { ...cfg.settings.editor_executables, ...patch.editor_executables },
    };
    this.save();
    return this.getPublic();
  }

  setProjectPath(projectId: string, dir: string | null): WorkspaceConfig {
    const cfg = this.load();
    if (dir === null) {
      delete cfg.project_paths[projectId];
    } else {
      const resolved = path.resolve(dir);
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
        throw new IpcError(`Directory does not exist: ${resolved}`);
      }
      cfg.project_paths[projectId] = resolved;
    }
    this.save();
    return this.getPublic();
  }

  projectStates(ids: string[]): Record<string, ProjectLocalState> {
    const cfg = this.load();
    const result: Record<string, ProjectLocalState> = {};
    for (const id of ids) {
      const p = cfg.project_paths[id];
      if (!p) result[id] = ProjectLocalStates.IMPORTED;
      else result[id] = fs.existsSync(p) ? ProjectLocalStates.LOCAL : ProjectLocalStates.MISSING;
    }
    return result;
  }

  /** `<workspace>/<Client>/<Project>` — the default destination convention (Spec §25/§26). */
  suggestPath(clientName: string | null, projectName: string): string {
    // Strip characters that are invalid in Windows/macOS/Linux folder names (incl. control chars).
    // eslint-disable-next-line no-control-regex
    const clean = (s: string) => s.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim() || "Project";
    const parts = [this.load().settings.workspace_dir];
    if (clientName) parts.push(clean(clientName));
    parts.push(clean(projectName));
    return path.join(...parts);
  }

  /** Absolute root of a project on this device, or a clear error for the recovery flow. */
  projectRoot(projectId: string): string {
    const root = this.load().project_paths[projectId];
    if (!root) throw new IpcError("This project is not set up on this device yet.", IpcErrorCodes.PROJECT_NOT_LOCAL);
    if (!fs.existsSync(root)) throw new IpcError(`The project directory no longer exists: ${root}`, IpcErrorCodes.PROJECT_NOT_LOCAL);
    return root;
  }

  /** Resolves a renderer-supplied relative path and refuses anything escaping the project root. */
  resolveInProject(projectId: string, rel: string): string {
    const root = this.projectRoot(projectId);
    const target = path.resolve(root, rel || ".");
    const relative = path.relative(root, target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new IpcError("Path is outside the project directory.", IpcErrorCodes.PATH_OUTSIDE_PROJECT);
    }
    return target;
  }

  isCommandApproved(projectId: string, command: string) {
    return (this.load().approved_commands[projectId] ?? []).includes(hash(command));
  }

  approveCommand(projectId: string, command: string) {
    const cfg = this.load();
    const list = new Set(cfg.approved_commands[projectId] ?? []);
    list.add(hash(command));
    cfg.approved_commands[projectId] = [...list];
    this.save();
  }
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export const workspaceConfig = new WorkspaceConfigManager();
