import { AgentRuntimeStatuses, ProcessStatuses, type GitStatus, type ProcessInfo } from "@shared/contract";
import { AttentionKinds, type AttentionAgentInput, type AttentionReason } from "../interfaces/git-attention.interfaces";

/** Why a project needs the developer, most urgent first. Empty means it's all clear. */
export function getAttentionReasons(git: GitStatus | null | undefined, processes: ProcessInfo[], agents: AttentionAgentInput[]): AttentionReason[] {
    const reasons: AttentionReason[] = [];
    if (git?.counts.conflicted) reasons.push({ kind: AttentionKinds.CONFLICTS, count: git.counts.conflicted });
    const crashed = processes.filter((p) => p.status === ProcessStatuses.CRASHED).length;
    if (crashed) reasons.push({ kind: AttentionKinds.SERVICE_CRASHED, count: crashed });
    const waiting = agents.filter((a) => a.alive && a.status === AgentRuntimeStatuses.AWAITING_INPUT).length;
    if (waiting) reasons.push({ kind: AttentionKinds.AGENT_WAITING, count: waiting });
    if (git?.files.length) reasons.push({ kind: AttentionKinds.UNCOMMITTED, count: git.files.length });
    if (git?.ahead) reasons.push({ kind: AttentionKinds.UNPUSHED, count: git.ahead });
    if (git?.behind) reasons.push({ kind: AttentionKinds.BEHIND, count: git.behind });
    return reasons;
}

/** A pull is only safe to automate when it can fast-forward: clean tree, nothing local to merge. */
export const canFastForward = (git: GitStatus | null | undefined): boolean =>
    !!git && git.is_repo && !git.detached && !!git.upstream && git.behind > 0 && git.ahead === 0 && git.files.length === 0;
