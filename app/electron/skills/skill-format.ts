import type { SkillKind, SkillSendMode } from "../shared/contract";

// Builds the text that is typed into an agent terminal when a skill is handed to a session.

const PASTE_START = "\x1b[200~";
const PASTE_END = "\x1b[201~";

/** Terminal control characters must not ride along inside pasted skill text. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

export interface SkillPayloadInput {
  name: string;
  kind: SkillKind;
  path: string;
  body: string;
}

export function buildSkillText(skill: SkillPayloadInput, mode: SkillSendMode): string {
  if (mode === "reference") {
    return `Read the ${skill.kind} "${skill.name}" at ${skill.path} and follow it for this task.`;
  }
  const body = skill.body.replace(/\r\n/g, "\n").replace(CONTROL_CHARS, "").trim();
  return `Follow this ${skill.kind} ("${skill.name}"):\n\n${body}\n`;
}

/**
 * Bracketed paste keeps multi-line text as one input instead of submitting at every newline,
 * and stops the CLI from interpreting characters in the skill as key bindings.
 */
export function toTerminalInput(text: string, submit: boolean): string {
  return `${PASTE_START}${text}${PASTE_END}${submit ? "\r" : ""}`;
}
