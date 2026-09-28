import { SkillKinds, SkillProviders, SkillScopes, SkillSendModes, type SkillKind, type SkillProvider, type SkillScope, type SkillSendMode } from "@shared/contract";

export const SkillProviderOptions: { id: SkillProvider; label: string }[] = [
    { id: SkillProviders.CLAUDE, label: "Claude Code" },
    { id: SkillProviders.CURSOR, label: "Cursor" },
    { id: SkillProviders.CODEX, label: "Codex" },
    { id: SkillProviders.GEMINI, label: "Gemini CLI" },
    { id: SkillProviders.COPILOT, label: "GitHub Copilot" },
    { id: SkillProviders.GENERIC, label: "Generic / custom" },
];

export const SkillProviderFilterOptions: { id: SkillProvider | "all"; label: string }[] = [{ id: "all", label: "All providers" }, ...SkillProviderOptions];

export const SkillKindOptions: { id: SkillKind; label: string }[] = [
    { id: SkillKinds.SKILL, label: "Skill" },
    { id: SkillKinds.COMMAND, label: "Command" },
    { id: SkillKinds.RULE, label: "Rule" },
    { id: SkillKinds.CONTEXT, label: "Context file" },
    { id: SkillKinds.DOC, label: "Document" },
];

export const SkillScopeOptions: { id: SkillScope; label: string }[] = [
    { id: SkillScopes.USER, label: "User" },
    { id: SkillScopes.PROJECT, label: "Project" },
    { id: SkillScopes.CUSTOM, label: "Custom folder" },
];

export const SkillSendModeOptions: { id: SkillSendMode; label: string; description: string }[] = [
    { id: SkillSendModes.REFERENCE, label: "Reference by path", description: "Tells the agent to read the skill file itself. Keeps supporting files and scripts next to it usable." },
    { id: SkillSendModes.CONTENT, label: "Paste full content", description: "Pastes the skill text into the terminal. Works for any provider, even if the file is not in the agent's project." },
];
