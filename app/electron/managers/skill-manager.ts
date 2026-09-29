import os from "node:os";
import type { SendCustomSkillInput, SendSkillInput, SkillDetail, SkillListResult } from "../shared/contract";
import { IpcError } from "../ipc/ipc-error";
import { buildSkillText, toTerminalInput } from "../skills/skill-format.ts";
import { scanSkills, toDetail, type ScannedSkill } from "../skills/skill-scanner.ts";
import { agentManager } from "./agent-manager";
import { workspaceConfig } from "./workspace-config";

// Skill Manager: reads agent skills from disk (every provider's format) and hands them to running
// agent sessions. Read-only towards the filesystem; the only side effect is typing into a PTY.

const MAX_TERMINAL_INPUT = 90_000; // stays under the 100k agent:write limit, leaving room for the paste markers

class SkillManager {
  /** Everything found by scans since startup, so `read`/`send` only ever resolve ids the scanner produced. */
  private known = new Map<string, ScannedSkill>();

  list(projectId: string | null): SkillListResult {
    let projectRoot: string | null = null;
    if (projectId) {
      try {
        projectRoot = workspaceConfig.projectRoot(projectId);
      } catch {
        projectRoot = null; // project not on this device: still show user-level and custom skills
      }
    }
    const { entries, scanned } = scanSkills({ home: os.homedir(), projectRoot, customFolders: workspaceConfig.settings.skill_folders });
    for (const entry of entries) this.known.set(entry.summary.id, entry);
    return { skills: entries.map((e) => e.summary), scanned };
  }

  private resolve(id: string): ScannedSkill {
    const entry = this.known.get(id);
    if (!entry) throw new IpcError("That skill is no longer available. Refresh the list and try again.");
    return entry;
  }

  read(id: string): SkillDetail {
    return toDetail(this.resolve(id));
  }

  send(input: SendSkillInput): void {
    const info = agentManager.list().find((s) => s.id === input.session_id);
    if (!info?.alive) throw new IpcError("That agent session is not running.");

    const detail = toDetail(this.resolve(input.skill_id));
    const text = toTerminalInput(buildSkillText(detail, input.mode), input.submit === true);
    if (text.length > MAX_TERMINAL_INPUT) {
      throw new IpcError("This skill is too large to paste. Send it by reference instead.");
    }
    agentManager.write(input.session_id, text);
  }

  /** Like `send`, but for a DB-backed custom skill: no file to read, so only "content" mode applies. */
  sendCustom(input: SendCustomSkillInput): void {
    const info = agentManager.list().find((s) => s.id === input.session_id);
    if (!info?.alive) throw new IpcError("That agent session is not running.");

    const text = toTerminalInput(buildSkillText({ name: input.name, kind: input.kind, path: "", body: input.body }, "content"), input.submit === true);
    if (text.length > MAX_TERMINAL_INPUT) {
      throw new IpcError("This skill is too large to paste. Trim it and try again.");
    }
    agentManager.write(input.session_id, text);
  }
}

export const skillManager = new SkillManager();
