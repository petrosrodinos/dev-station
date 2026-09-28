import { app, BrowserWindow, dialog, shell } from "electron";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { AgentTypes, EditorTargets, IpcChannels, ProcessStatuses } from "../shared/contract";
import { agentManager } from "../managers/agent-manager";
import { inspect } from "../managers/detection-manager";
import { filesystemManager } from "../managers/filesystem-manager";
import { gitManager } from "../managers/git-manager";
import { previewManager } from "../managers/preview-manager";
import { processManager } from "../managers/process-manager";
import { SECURE_KEYS, secureStore } from "../managers/secure-store";
import { terminalManager } from "../managers/terminal-manager";
import { workspaceConfig } from "../managers/workspace-config";
import { clearWhichCache, defaultShell } from "../utils/platform";
import { handle, zAbsPath, zCols, zId, zRelPath, zRows } from "./handle";
import { IpcError } from "./ipc-error";

const args = <T extends [z.ZodTypeAny, ...z.ZodTypeAny[]]>(...items: T) => z.tuple(items);
const none = z.tuple([]);

const zAgentType = z.enum([AgentTypes.CLAUDE_CODE, AgentTypes.CURSOR_CLI]);
const zPm = z.enum(["npm", "pnpm", "yarn", "bun"]).nullable();
const zEnv = z.record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), z.string().max(10_000)).nullable();
const zServiceSpec = z.object({
  service_id: zId,
  name: z.string().min(1).max(120),
  cwd: zRelPath,
  package_manager: zPm,
  script: z.string().max(100).nullable(),
  command: z.string().max(2000).nullable(),
  url: z.string().max(500).nullable(),
  env: zEnv,
});
const zSettings = z
  .object({
    workspace_dir: zAbsPath,
    default_shell: z.string().max(1000).nullable(),
    agent_executables: z.object({ CLAUDE_CODE: z.string().max(1000).nullable(), CURSOR_CLI: z.string().max(1000).nullable() }).partial(),
    editor_executables: z.object({ cursor: z.string().max(1000).nullable(), vscode: z.string().max(1000).nullable() }).partial(),
  })
  .partial();

function broadcast(channel: string, payload: unknown) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  }
}

export function registerIpc() {
  // Push events from managers to the renderer.
  processManager.setEmitter((e) => {
    broadcast(IpcChannels.PROC_EVENT, e);
    // A service (re)started: refresh the embedded preview of that project.
    if (e.type === "status" && e.process.status === ProcessStatuses.RUNNING) previewManager.reloadProject(e.process.project_id, e.process.url);
  });
  terminalManager.setEmitters(
    (e) => broadcast(IpcChannels.TERM_DATA, e),
    (e) => broadcast(IpcChannels.TERM_EXIT, e),
  );
  agentManager.setEmitters(
    (e) => broadcast(IpcChannels.AGENT_DATA, e),
    (e) => broadcast(IpcChannels.AGENT_STATUS, e),
  );

  // App ----------------------------------------------------------------------
  handle(IpcChannels.APP_INFO, none, () => ({
    version: app.getVersion(),
    platform: process.platform,
    device_id: workspaceConfig.deviceId,
    home_dir: os.homedir(),
    default_shell: defaultShell(),
  }));
  handle(IpcChannels.APP_OPEN_URL, args(z.string().url().max(4000)), async ([url]) => {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new IpcError("Only http(s) links can be opened.");
    await shell.openExternal(parsed.toString());
  });

  // Secure storage -------------------------------------------------------------
  const zSecureKey = z.enum(SECURE_KEYS);
  handle(IpcChannels.SECURE_GET, args(zSecureKey), ([key]) => secureStore.get(key));
  handle(IpcChannels.SECURE_SET, args(zSecureKey, z.string().max(64_000)), ([key, value]) => secureStore.set(key, value));
  handle(IpcChannels.SECURE_REMOVE, args(zSecureKey), ([key]) => secureStore.remove(key));

  // Workspace config -----------------------------------------------------------
  handle(IpcChannels.WS_GET_CONFIG, none, () => workspaceConfig.getPublic());
  handle(IpcChannels.WS_UPDATE_SETTINGS, args(zSettings), ([patch]) => {
    clearWhichCache();
    return workspaceConfig.updateSettings(patch as never);
  });
  handle(IpcChannels.WS_SET_PROJECT_PATH, args(zId, zAbsPath.nullable()), ([id, dir]) => workspaceConfig.setProjectPath(id, dir));
  handle(IpcChannels.WS_PROJECT_STATES, args(z.array(zId).max(1000)), ([ids]) => workspaceConfig.projectStates(ids));
  handle(IpcChannels.WS_SUGGEST_PATH, args(z.string().max(200).nullable(), z.string().min(1).max(200)), ([client, name]) => workspaceConfig.suggestPath(client, name));
  handle(IpcChannels.WS_PICK_DIRECTORY, args(zAbsPath.optional()), async ([defaultPath]) => {
    const win = BrowserWindow.getFocusedWindow();
    const opts: Electron.OpenDialogOptions = { properties: ["openDirectory", "createDirectory"], defaultPath };
    const result = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  // Detection ------------------------------------------------------------------
  handle(IpcChannels.DETECT_PROJECT, args(zId), ([id]) => inspect(workspaceConfig.projectRoot(id)));
  handle(IpcChannels.DETECT_PATH, args(zAbsPath), ([dir]) => inspect(path.resolve(dir)));

  // Files ------------------------------------------------------------------------
  handle(IpcChannels.FILES_LIST, args(zId, zRelPath), ([id, rel]) => filesystemManager.list(id, rel));
  handle(IpcChannels.FILES_SEARCH, args(zId, z.string().max(200)), ([id, q]) => filesystemManager.search(id, q));
  handle(IpcChannels.FILES_REVEAL, args(zId, zRelPath), ([id, rel]) => filesystemManager.reveal(id, rel));
  handle(IpcChannels.FILES_OPEN_EXTERNAL, args(zId, zRelPath), ([id, rel]) => filesystemManager.openExternal(id, rel));
  handle(IpcChannels.FILES_OPEN_EDITOR, args(zId, z.enum([EditorTargets.CURSOR, EditorTargets.VSCODE, EditorTargets.DEFAULT]), zRelPath.optional()), ([id, editor, rel]) =>
    filesystemManager.openInEditor(id, editor, rel),
  );
  handle(IpcChannels.FILES_COPY_PATH, args(zId, zRelPath), ([id, rel]) => filesystemManager.copyPath(id, rel));

  // Git ----------------------------------------------------------------------------
  // Git runs at the repository top-level (projects may be monorepo sub-folders).
  const root = (id: string) => gitManager.toplevel(workspaceConfig.projectRoot(id));
  const zPaths = z.array(zRelPath).max(5000);
  handle(IpcChannels.GIT_STATUS, args(zId), async ([id]) => gitManager.status(await root(id)));
  handle(IpcChannels.GIT_FILE_DIFF, args(zId, zRelPath), async ([id, file]) => gitManager.fileDiff(await root(id), file));
  handle(IpcChannels.GIT_BRANCHES, args(zId), async ([id]) => gitManager.branches(await root(id)));
  handle(IpcChannels.GIT_LOG, args(zId, z.number().int().min(1).max(200).optional()), async ([id, limit]) => gitManager.log(await root(id), limit));
  handle(IpcChannels.GIT_STASHES, args(zId), async ([id]) => gitManager.stashes(await root(id)));
  handle(IpcChannels.GIT_FETCH, args(zId), async ([id]) => gitManager.fetch(await root(id)));
  handle(IpcChannels.GIT_PULL, args(zId), async ([id]) => gitManager.pull(await root(id)));
  handle(IpcChannels.GIT_PUSH, args(zId), async ([id]) => gitManager.push(await root(id)));
  handle(
    IpcChannels.GIT_COMMIT,
    args(zId, z.object({ message: z.string().min(1).max(20_000), paths: zPaths.optional(), name: z.string().max(200).nullable().optional(), email: z.string().max(320).nullable().optional() })),
    async ([id, input]) => gitManager.commit(await root(id), input.message, input.paths, { name: input.name, email: input.email }),
  );
  handle(IpcChannels.GIT_CHECKOUT, args(zId, z.string().min(1).max(250)), async ([id, branch]) => gitManager.checkout(await root(id), branch));
  handle(IpcChannels.GIT_CREATE_BRANCH, args(zId, z.string().min(1).max(200), z.boolean()), async ([id, name, checkout]) => gitManager.createBranch(await root(id), name, checkout));
  handle(IpcChannels.GIT_MERGE, args(zId, z.string().min(1).max(250)), async ([id, branch]) => gitManager.merge(await root(id), branch));
  handle(IpcChannels.GIT_STASH, args(zId, z.string().max(500).optional()), async ([id, msg]) => gitManager.stash(await root(id), msg));
  handle(IpcChannels.GIT_STASH_POP, args(zId, z.string().max(50).optional()), async ([id, ref]) => gitManager.stashPop(await root(id), ref));
  handle(IpcChannels.GIT_DISCARD, args(zId, z.object({ paths: zPaths.optional(), confirm: z.literal(true) })), async ([id, input]) =>
    gitManager.discard(await root(id), input.paths, input.confirm),
  );
  handle(
    IpcChannels.GIT_CLONE,
    args(z.object({ operation_id: zId, url: z.string().min(1).max(2000), destination: zAbsPath, branch: z.string().max(200).nullable().optional() })),
    ([input]) => gitManager.clone(input.operation_id, input.url, input.destination, input.branch, (e) => broadcast(IpcChannels.GIT_CLONE_PROGRESS, e)),
  );
  handle(IpcChannels.GIT_CANCEL_CLONE, args(zId), ([opId]) => gitManager.cancelClone(opId));

  // Processes ------------------------------------------------------------------------
  handle(IpcChannels.PROC_LIST, none, () => processManager.list());
  handle(IpcChannels.PROC_START, args(zId, zServiceSpec), ([id, spec]) => processManager.start(id, spec));
  handle(IpcChannels.PROC_STOP, args(zId), ([key]) => processManager.stop(key));
  handle(IpcChannels.PROC_RESTART, args(zId, zServiceSpec), ([id, spec]) => processManager.restart(id, spec));
  handle(IpcChannels.PROC_LOGS, args(zId), ([key]) => processManager.logs(key));
  handle(IpcChannels.PROC_APPROVE, args(zId, z.string().min(1).max(2000)), ([id, command]) => processManager.approveCommand(id, command));

  // Terminals ----------------------------------------------------------------------------
  handle(IpcChannels.TERM_LIST, none, () => terminalManager.list());
  handle(IpcChannels.TERM_CREATE, args(zId, z.object({ cols: zCols.optional(), rows: zRows.optional() }).optional()), ([id, size]) => terminalManager.create(id, size?.cols, size?.rows));
  handle(IpcChannels.TERM_WRITE, args(zId, z.string().max(100_000)), ([id, data]) => terminalManager.write(id, data));
  handle(IpcChannels.TERM_RESIZE, args(zId, zCols, zRows), ([id, c, r]) => terminalManager.resize(id, c, r));
  handle(IpcChannels.TERM_KILL, args(zId), ([id]) => terminalManager.kill(id));
  handle(IpcChannels.TERM_SCROLLBACK, args(zId), ([id]) => terminalManager.scrollback(id));

  // Agents ---------------------------------------------------------------------------------
  handle(IpcChannels.AGENT_ADAPTERS, none, () => agentManager.adapters());
  handle(IpcChannels.AGENT_LIST, none, () => agentManager.list());
  handle(
    IpcChannels.AGENT_START,
    args(
      z.object({
        session_id: zId,
        project_id: zId,
        agent_type: zAgentType,
        name: z.string().min(1).max(200),
        prompt: z.string().max(100_000).nullable(),
        env: zEnv.optional().transform((v) => v ?? undefined),
        cols: zCols.optional(),
        rows: zRows.optional(),
        idle_threshold_seconds: z.number().int().min(10).max(600).optional(),
      }),
    ),
    ([input]) => agentManager.start(input),
  );
  handle(IpcChannels.AGENT_WRITE, args(zId, z.string().max(100_000)), ([id, data]) => agentManager.write(id, data));
  handle(IpcChannels.AGENT_RESIZE, args(zId, zCols, zRows), ([id, c, r]) => agentManager.resize(id, c, r));
  handle(IpcChannels.AGENT_STOP, args(zId), ([id]) => agentManager.stop(id));
  handle(IpcChannels.AGENT_RESTART, args(zId), ([id]) => agentManager.restart(id));
  handle(IpcChannels.AGENT_FORGET, args(zId), ([id]) => agentManager.forget(id));
  handle(IpcChannels.AGENT_OPEN_EXTERNAL, args(zId), ([id]) => agentManager.openExternal(id));
  handle(IpcChannels.AGENT_SCROLLBACK, args(zId), ([id]) => agentManager.scrollback(id));
  handle(IpcChannels.AGENT_SET_IDLE, args(z.number().int().min(10).max(600)), ([s]) => agentManager.setIdleThreshold(s));

  // Preview --------------------------------------------------------------------------------
  const zBounds = z.object({ x: z.number().finite(), y: z.number().finite(), width: z.number().finite(), height: z.number().finite() });
  const zPreviewUrl = z.string().min(1).max(4000);
  handle(IpcChannels.PREVIEW_SHOW, args(z.object({ projectId: zId, url: zPreviewUrl, bounds: zBounds })), ([i]) => previewManager.show(i.projectId, i.url, i.bounds));
  handle(IpcChannels.PREVIEW_HIDE, args(z.object({ projectId: zId })), ([i]) => previewManager.hide(i.projectId));
  handle(IpcChannels.PREVIEW_SET_BOUNDS, args(z.object({ projectId: zId, bounds: zBounds })), ([i]) => previewManager.setBounds(i.projectId, i.bounds));
  handle(IpcChannels.PREVIEW_NAVIGATE, args(z.object({ projectId: zId, action: z.enum(["back", "forward", "reload"]) })), ([i]) => previewManager.navigate(i.projectId, i.action));
  handle(IpcChannels.PREVIEW_LOAD, args(z.object({ projectId: zId, url: zPreviewUrl })), ([i]) => previewManager.load(i.projectId, i.url));
  handle(IpcChannels.PREVIEW_DESTROY, args(z.object({ projectId: zId })), ([i]) => previewManager.destroy(i.projectId));
}
