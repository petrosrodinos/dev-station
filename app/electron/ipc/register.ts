import { app, BrowserWindow, dialog, shell } from "electron";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { AgentTypes, EditorTargets, IpcChannels, ProcessStatuses, SkillKinds, SkillSendModes } from "../shared/contract";
import { accessManager } from "../managers/access-manager";
import { agentManager } from "../managers/agent-manager";
import { inspect } from "../managers/detection-manager";
import { filesystemManager } from "../managers/filesystem-manager";
import { floatingPanelManager } from "../managers/floating-panel-manager";
import { gitManager } from "../managers/git-manager";
import { notificationManager } from "../managers/notification-manager";
import { previewManager } from "../managers/preview-manager";
import { processManager } from "../managers/process-manager";
import { skillManager } from "../managers/skill-manager";
import { SECURE_KEYS, secureStore } from "../managers/secure-store";
import { terminalManager } from "../managers/terminal-manager";
import { updateManager } from "../managers/update-manager";
import { workspaceConfig } from "../managers/workspace-config";
import { clearWhichCache, defaultShell } from "../utils/platform";
import { killPorts } from "../utils/port-killer";
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
  port: z.number().int().min(1).max(65535).nullable(),
  siblings: z.array(z.object({ service_id: zId, name: z.string().min(1).max(120), port: z.number().int().min(1).max(65535).nullable() })).max(60),
});
const zSettings = z
  .object({
    workspace_dir: zAbsPath,
    default_shell: z.string().max(1000).nullable(),
    agent_executables: z.object({ CLAUDE_CODE: z.string().max(1000).nullable(), CURSOR_CLI: z.string().max(1000).nullable() }).partial(),
    editor_executables: z.object({ cursor: z.string().max(1000).nullable(), vscode: z.string().max(1000).nullable() }).partial(),
    skill_folders: z.array(zAbsPath).max(50),
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
  updateManager.init((status) => broadcast(IpcChannels.APP_UPDATE_STATUS, status));

  // Access snapshot (defense-in-depth only; the API is the real enforcement point) ----
  handle(IpcChannels.ACCESS_SYNC, args(z.array(z.string().max(64)).max(100)), ([permissions]) => accessManager.sync(permissions));

  // Notifications -------------------------------------------------------------
  handle(
    IpcChannels.NOTIF_SHOW,
    args(z.object({ title: z.string().max(200), body: z.string().max(500), project_id: zId.optional(), session_id: zId.optional() })),
    ([input]) => notificationManager.show(input),
  );

  // App ----------------------------------------------------------------------
  handle(IpcChannels.APP_INFO, none, () => ({
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    device_id: workspaceConfig.deviceId,
    home_dir: os.homedir(),
    default_shell: defaultShell(),
  }));
  handle(IpcChannels.APP_OPEN_URL, args(z.string().url().max(4000)), async ([url]) => {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new IpcError("Only http(s) links can be opened.");
    await shell.openExternal(parsed.toString());
  });
  handle(IpcChannels.APP_TOGGLE_FULLSCREEN, none, () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    if (!win) return false;
    const next = !win.isFullScreen();
    win.setFullScreen(next);
    return next;
  });

  // Auto-update ----------------------------------------------------------------
  handle(IpcChannels.APP_UPDATE_CHECK, none, () => updateManager.check());
  handle(IpcChannels.APP_UPDATE_DOWNLOAD, none, () => updateManager.download());
  handle(IpcChannels.APP_UPDATE_INSTALL, none, () => updateManager.install());

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
  handle(IpcChannels.WS_SUGGEST_PATH, args(z.string().min(1).max(200)), ([name]) => workspaceConfig.suggestPath(name));
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
  handle(IpcChannels.FILES_READ, args(zId, zRelPath), ([id, rel]) => filesystemManager.readFile(id, rel));
  handle(IpcChannels.FILES_WRITE, args(zId, zRelPath, z.string().max(5_000_000)), ([id, rel, content]) => filesystemManager.writeFile(id, rel, content));
  handle(IpcChannels.FILES_CREATE_FILE, args(zId, zRelPath), ([id, rel]) => filesystemManager.createFile(id, rel));
  handle(IpcChannels.FILES_CREATE_FOLDER, args(zId, zRelPath), ([id, rel]) => filesystemManager.createFolder(id, rel));
  handle(IpcChannels.FILES_RENAME, args(zId, zRelPath, z.string().max(255)), ([id, rel, name]) => filesystemManager.rename(id, rel, name));
  handle(IpcChannels.FILES_MOVE, args(zId, zRelPath, zRelPath), ([id, rel, dest]) => filesystemManager.move(id, rel, dest));
  handle(IpcChannels.FILES_IMPORT, args(zId, zRelPath, z.array(z.string().min(1).max(4096)).min(1).max(500)), ([id, dest, sources]) => filesystemManager.importExternal(id, dest, sources));
  handle(IpcChannels.FILES_DELETE, args(zId, zRelPath), ([id, rel]) => filesystemManager.delete(id, rel));

  // Git ----------------------------------------------------------------------------
  // Git runs at the repository top-level (projects may be monorepo sub-folders).
  const root = (id: string) => gitManager.toplevel(workspaceConfig.projectRoot(id));
  const zPaths = z.array(zRelPath).max(5000);
  handle(IpcChannels.GIT_STATUS, args(zId), async ([id]) => gitManager.status(await root(id)));
  handle(IpcChannels.GIT_FILE_DIFF, args(zId, zRelPath), async ([id, file]) => gitManager.fileDiff(await root(id), file));
  handle(IpcChannels.GIT_BRANCHES, args(zId), async ([id]) => gitManager.branches(await root(id)));
  handle(IpcChannels.GIT_LOG, args(zId, z.number().int().min(1).max(200).optional()), async ([id, limit]) => gitManager.log(await root(id), limit));
  handle(IpcChannels.GIT_STASHES, args(zId), async ([id]) => gitManager.stashes(await root(id)));
  handle(IpcChannels.GIT_FETCH, args(zId), async ([id]) => gitManager.fetch(await root(id)), { requires: ["GIT_COMMIT"] });
  handle(IpcChannels.GIT_PULL, args(zId), async ([id]) => gitManager.pull(await root(id)), { requires: ["GIT_COMMIT"] });
  handle(IpcChannels.GIT_PUSH, args(zId), async ([id]) => gitManager.push(await root(id)), { requires: ["GIT_PUSH"] });
  handle(
    IpcChannels.GIT_COMMIT,
    args(zId, z.object({ message: z.string().min(1).max(20_000), paths: zPaths.optional(), name: z.string().max(200).nullable().optional(), email: z.string().max(320).nullable().optional() })),
    async ([id, input]) => gitManager.commit(await root(id), input.message, input.paths, { name: input.name, email: input.email }),
    { requires: ["GIT_COMMIT"] },
  );
  handle(IpcChannels.GIT_CHECKOUT, args(zId, z.string().min(1).max(250)), async ([id, branch]) => gitManager.checkout(await root(id), branch), { requires: ["GIT_MANAGE_BRANCHES"] });
  handle(IpcChannels.GIT_CREATE_BRANCH, args(zId, z.string().min(1).max(200), z.boolean()), async ([id, name, checkout]) => gitManager.createBranch(await root(id), name, checkout), { requires: ["GIT_MANAGE_BRANCHES"] });
  handle(IpcChannels.GIT_MERGE, args(zId, z.string().min(1).max(250)), async ([id, branch]) => gitManager.merge(await root(id), branch), { requires: ["GIT_COMMIT"] });
  handle(IpcChannels.GIT_STASH, args(zId, z.string().max(500).optional()), async ([id, msg]) => gitManager.stash(await root(id), msg), { requires: ["GIT_COMMIT"] });
  handle(IpcChannels.GIT_STASH_POP, args(zId, z.string().max(50).optional()), async ([id, ref]) => gitManager.stashPop(await root(id), ref), { requires: ["GIT_COMMIT"] });
  handle(IpcChannels.GIT_DISCARD, args(zId, z.object({ paths: zPaths.optional(), confirm: z.literal(true) })), async ([id, input]) =>
    gitManager.discard(await root(id), input.paths, input.confirm),
    { requires: ["GIT_COMMIT"] },
  );
  handle(
    IpcChannels.GIT_CLONE,
    args(z.object({ operation_id: zId, url: z.string().min(1).max(2000), destination: zAbsPath, branch: z.string().max(200).nullable().optional() })),
    ([input]) => gitManager.clone(input.operation_id, input.url, input.destination, input.branch, (e) => broadcast(IpcChannels.GIT_CLONE_PROGRESS, e)),
  );
  handle(IpcChannels.GIT_CANCEL_CLONE, args(zId), ([opId]) => gitManager.cancelClone(opId));

  // Processes ------------------------------------------------------------------------
  handle(IpcChannels.PROC_LIST, none, () => processManager.list());
  handle(IpcChannels.PROC_START, args(zId, zServiceSpec), ([id, spec]) => processManager.start(id, spec), { requires: ["PROJECTS_EDIT"] });
  handle(IpcChannels.PROC_STOP, args(zId), ([key]) => processManager.stop(key), { requires: ["PROJECTS_EDIT"] });
  handle(IpcChannels.PROC_RESTART, args(zId, zServiceSpec), ([id, spec]) => processManager.restart(id, spec), { requires: ["PROJECTS_EDIT"] });
  handle(IpcChannels.PROC_LOGS, args(zId), ([key]) => processManager.logs(key));
  handle(IpcChannels.PROC_APPROVE, args(zId, z.string().min(1).max(2000)), ([id, command]) => processManager.approveCommand(id, command), { requires: ["PROJECTS_EDIT"] });

  handle(IpcChannels.PORT_KILL, args(z.array(z.number().int().min(1).max(65535)).min(1).max(30)), ([ports]) => killPorts(ports), { requires: ["PROJECTS_EDIT"] });

  // Terminals ----------------------------------------------------------------------------
  handle(IpcChannels.TERM_LIST, none, () => terminalManager.list());
  handle(IpcChannels.TERM_CREATE, args(zId, z.object({ cols: zCols.optional(), rows: zRows.optional() }).optional()), ([id, size]) => terminalManager.create(id, size?.cols, size?.rows), { requires: ["PROJECTS_EDIT"] });
  handle(IpcChannels.TERM_WRITE, args(zId, z.string().max(100_000)), ([id, data]) => terminalManager.write(id, data), { requires: ["PROJECTS_EDIT"] });
  handle(IpcChannels.TERM_RESIZE, args(zId, zCols, zRows), ([id, c, r]) => terminalManager.resize(id, c, r));
  handle(IpcChannels.TERM_KILL, args(zId), ([id]) => terminalManager.kill(id), { requires: ["PROJECTS_EDIT"] });
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
        command: z.string().trim().min(1).max(2000).optional(),
        name: z.string().min(1).max(200),
        prompt: z.string().max(100_000).nullable(),
        env: zEnv.optional().transform((v) => v ?? undefined),
        cols: zCols.optional(),
        rows: zRows.optional(),
        idle_threshold_seconds: z.number().int().min(10).max(600).optional(),
      }),
    ),
    ([input]) => agentManager.start(input),
    { requires: ["AI_START_AGENTS"] },
  );
  handle(IpcChannels.AGENT_WRITE, args(zId, z.string().max(100_000)), ([id, data]) => agentManager.write(id, data), { requires: ["AI_USE_AGENTS"] });
  handle(IpcChannels.AGENT_RESIZE, args(zId, zCols, zRows), ([id, c, r]) => agentManager.resize(id, c, r));
  handle(IpcChannels.AGENT_STOP, args(zId), ([id]) => agentManager.stop(id), { requires: ["AI_USE_AGENTS"] });
  handle(IpcChannels.AGENT_RESTART, args(zId), ([id]) => agentManager.restart(id), { requires: ["AI_USE_AGENTS"] });
  handle(IpcChannels.AGENT_FORGET, args(zId), ([id]) => agentManager.forget(id));
  handle(IpcChannels.AGENT_OPEN_EXTERNAL, args(zId), ([id]) => agentManager.openExternal(id), { requires: ["AI_USE_AGENTS"] });
  handle(IpcChannels.AGENT_SCROLLBACK, args(zId), ([id]) => agentManager.scrollback(id));
  handle(IpcChannels.AGENT_SET_IDLE, args(z.number().int().min(10).max(600)), ([s]) => agentManager.setIdleThreshold(s));

  // Skills ---------------------------------------------------------------------------------
  handle(IpcChannels.SKILLS_LIST, args(zId.nullable()), ([projectId]) => skillManager.list(projectId));
  handle(IpcChannels.SKILLS_READ, args(z.string().min(1).max(100)), ([id]) => skillManager.read(id));
  handle(
    IpcChannels.SKILLS_SEND,
    args(z.object({ session_id: zId, skill_id: z.string().min(1).max(100), mode: z.enum([SkillSendModes.CONTENT, SkillSendModes.REFERENCE]), submit: z.boolean().optional() })),
    ([input]) => skillManager.send(input),
    { requires: ["AI_USE_AGENTS"] },
  );
  handle(
    IpcChannels.SKILLS_SEND_CUSTOM,
    args(
      z.object({
        session_id: zId,
        name: z.string().min(1).max(120),
        kind: z.enum([SkillKinds.SKILL, SkillKinds.COMMAND, SkillKinds.RULE, SkillKinds.CONTEXT, SkillKinds.DOC]),
        body: z.string().min(1).max(90_000),
        submit: z.boolean().optional(),
      }),
    ),
    ([input]) => skillManager.sendCustom(input),
    { requires: ["AI_USE_AGENTS"] },
  );

  // Preview --------------------------------------------------------------------------------
  const zBounds = z.object({ x: z.number().finite(), y: z.number().finite(), width: z.number().finite(), height: z.number().finite() });
  const zPreviewUrl = z.string().min(1).max(4000);
  handle(IpcChannels.PREVIEW_SHOW, args(z.object({ projectId: zId, url: zPreviewUrl, bounds: zBounds })), ([i]) => previewManager.show(i.projectId, i.url, i.bounds));
  handle(IpcChannels.PREVIEW_HIDE, args(z.object({ projectId: zId })), ([i]) => previewManager.hide(i.projectId));
  handle(IpcChannels.PREVIEW_SET_BOUNDS, args(z.object({ projectId: zId, bounds: zBounds })), ([i]) => previewManager.setBounds(i.projectId, i.bounds));
  handle(IpcChannels.PREVIEW_NAVIGATE, args(z.object({ projectId: zId, action: z.enum(["back", "forward", "reload"]) })), ([i]) => previewManager.navigate(i.projectId, i.action));
  handle(IpcChannels.PREVIEW_LOAD, args(z.object({ projectId: zId, url: zPreviewUrl })), ([i]) => previewManager.load(i.projectId, i.url));
  handle(IpcChannels.PREVIEW_DESTROY, args(z.object({ projectId: zId })), ([i]) => previewManager.destroy(i.projectId));
  handle(IpcChannels.PREVIEW_TOGGLE_DEVTOOLS, args(z.object({ projectId: zId })), ([i]) => previewManager.toggleDevTools(i.projectId));

  // Floating panels (docking system §C) -----------------------------------------------------
  const zFloatingBounds = z.object({ x: z.number().finite(), y: z.number().finite(), width: z.number().finite(), height: z.number().finite(), displayId: z.number().optional() }).partial();
  handle(
    IpcChannels.LAYOUT_OPEN_FLOATING,
    args(
      z.object({
        panelId: z.string().min(1).max(200),
        componentType: z.string().min(1).max(100),
        params: z.record(z.string(), z.unknown()),
        title: z.string().max(200),
        windowId: z.string().min(1).max(200),
        bounds: zFloatingBounds.optional(),
      }),
    ),
    ([input]) => floatingPanelManager.open(input),
  );
  handle(IpcChannels.LAYOUT_CLOSE_FLOATING, args(z.string().min(1).max(200)), ([panelId]) => floatingPanelManager.closePanel(panelId));
  handle(IpcChannels.LAYOUT_GET_FLOATING_WINDOW, args(z.string().min(1).max(200)), ([windowId]) => floatingPanelManager.getWindow(windowId));
}
