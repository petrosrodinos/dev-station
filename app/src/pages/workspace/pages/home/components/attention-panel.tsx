import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { useFleetAttention, useFleetSync } from "@/features/git/hooks/use-fleet-sync";
import { AttentionKinds, type AttentionKind } from "@/features/git/interfaces/git-attention.interfaces";
import { canFastForward } from "@/features/git/utils/attention.utils";
import { AttentionKindOptions } from "@/config/constants/dropdowns/projects/attention-kind.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useWorkspaceStore } from "@/stores/workspace";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { ProjectLocalStates } from "@shared/contract";

const KIND_TONE: Record<AttentionKind, string> = {
    [AttentionKinds.CONFLICTS]: "bg-destructive/15 text-destructive",
    [AttentionKinds.SERVICE_CRASHED]: "bg-destructive/15 text-destructive",
    [AttentionKinds.AGENT_WAITING]: "bg-info/15 text-info",
    [AttentionKinds.UNCOMMITTED]: "bg-warning/15 text-warning",
    [AttentionKinds.UNPUSHED]: "bg-success/15 text-success",
    [AttentionKinds.BEHIND]: "bg-info/15 text-info",
};

const URGENCY = AttentionKindOptions.map((o) => o.id);

/** "Needs attention": one triage list across every local project, plus a safe sync-everything action. */
export const AttentionPanel: FC<{ projects: Project[]; localStates: Record<string, string> | undefined }> = ({ projects, localStates }) => {
    const navigate = useNavigate();
    const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
    const items = useFleetAttention(projects, localStates);
    const sync = useFleetSync();
    const localProjects = projects.filter((p) => localStates?.[p.id] === ProjectLocalStates.LOCAL);
    if (localProjects.length === 0) return null;

    const sorted = [...items].sort((a, b) => URGENCY.indexOf(a.reasons[0].kind) - URGENCY.indexOf(b.reasons[0].kind));
    const fastForwardable = items.filter((i) => canFastForward(i.git)).length;

    const open = (id: string) => {
        setActiveProject(id);
        navigate(Routes.workspace.project(id));
    };

    return (
        <Panel>
            <PanelHeader
                title={
                    <>
                        Needs attention
                        {sorted.length > 0 && <span className="rounded-xs bg-surface-elevated px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground">{sorted.length}</span>}
                    </>
                }
                actions={
                    <Button variant="outline" size="sm" className="gap-1.5" disabled={sync.isPending} onClick={() => sync.mutate(localProjects)}>
                        <RefreshCw className={cn("size-3.5", sync.isPending && "animate-spin")} />
                        {sync.isPending ? "Syncing…" : fastForwardable > 0 ? `Sync all (${fastForwardable} to update)` : "Sync all"}
                    </Button>
                }
            />
            {sorted.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-3 text-[0.8125rem] text-muted-foreground">
                    <CheckCircle2 className="size-4 text-success" /> All {localProjects.length} project{localProjects.length === 1 ? " is" : "s are"} clean, pushed and up to date.
                </div>
            ) : (
                <ul className="divide-y divide-hairline-soft">
                    {sorted.map(({ project, reasons }) => (
                        <li key={project.id}>
                            <button type="button" onClick={() => open(project.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-elevated">
                                <ProjectAvatar name={project.name} color={project.color} seed={project.avatar_seed} size="sm" />
                                <span className="w-40 shrink-0 truncate text-[0.8125rem] font-medium">{project.name}</span>
                                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                                    {reasons.map((r) => (
                                        <span key={r.kind} className={cn("rounded-xs px-2 py-0.5 text-[0.6875rem]", KIND_TONE[r.kind])}>
                                            {r.count} · {getDropdownOptionLabel(AttentionKindOptions, r.kind)}
                                        </span>
                                    ))}
                                </span>
                                <ChevronRight className="size-4 shrink-0 text-ash" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
};
