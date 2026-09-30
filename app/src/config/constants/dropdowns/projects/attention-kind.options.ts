import { AttentionKinds, type AttentionKind } from "@/features/git/interfaces/git-attention.interfaces";

export const AttentionKindOptions: { id: AttentionKind; label: string }[] = [
    { id: AttentionKinds.CONFLICTS, label: "Merge conflicts" },
    { id: AttentionKinds.SERVICE_CRASHED, label: "Service crashed" },
    { id: AttentionKinds.AGENT_WAITING, label: "Agent waiting for you" },
    { id: AttentionKinds.UNCOMMITTED, label: "Uncommitted" },
    { id: AttentionKinds.UNPUSHED, label: "Unpushed" },
    { id: AttentionKinds.BEHIND, label: "Behind remote" },
];
