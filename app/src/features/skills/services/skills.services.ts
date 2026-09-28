import type { SendSkillInput, SkillDetail, SkillListResult } from "@shared/contract";
import { getBridge, getErrorMessage } from "@/lib/desktop";

// Skills live on this device's disk; the Electron main process reads them (any provider format).

const wrap = async <T>(fn: () => Promise<T>, fallback: string): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        throw new Error(getErrorMessage(error, fallback));
    }
};

export const listSkills = (projectId: string | null): Promise<SkillListResult> => wrap(() => getBridge().skills.list(projectId), "Failed to read skills.");
export const readSkill = (skillId: string): Promise<SkillDetail> => wrap(() => getBridge().skills.read(skillId), "Failed to read the skill.");
export const sendSkill = (input: SendSkillInput): Promise<void> => wrap(() => getBridge().skills.send(input), "Failed to send the skill to the session.");
