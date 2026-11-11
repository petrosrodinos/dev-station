import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getBranches,
    getFileDiff,
    getGitLog,
    getGitStatus,
    getStashes,
    gitCheckout,
    gitCommit,
    gitCreateBranch,
    gitDiscard,
    gitAddRemote,
    gitFetch, gitInit,
    gitMerge,
    gitMergeInto,
    gitRenameBranch,
    gitPull,
    gitPush,
    gitSync,
    getConflictFile,
    gitAbortOperation,
    gitContinueOperation,
    gitResolveConflict,
    gitTakeSide,
    gitStash,
    gitStashPop,
} from "../services/git.services";
import { createGithubRepository } from "@/features/integrations/services/integrations.services";
import type { CreateGithubRepositoryDto, GithubRepository } from "@/features/integrations/interfaces/integrations.interfaces";
import { updateProject } from "@/features/projects/services/projects.services";
import { RepositoryProviders, type Project } from "@/features/projects/interfaces/projects.interfaces";
import { useRecordActivity } from "@/features/activities/hooks/use-activities";
import { ActivityTypes, type ActivityType } from "@/features/activities/interfaces/activities.interfaces";
import { useProjectLocalState } from "@/features/local-workspace/hooks/use-local-workspace";
import { ProjectLocalStates } from "@shared/contract";
import { toast } from "@/hooks/use-toast";
import { NotificationChannels, NotificationEventTypes, type NotificationEventType, type UserPreference } from "@/features/users/interfaces/users.interfaces";
import { shouldNotify } from "@/features/users/utils/notification-settings.utils";

const GIT_KEYS = ["git-status", "git-branches", "git-log", "git-stashes", "git-diff", "git-conflict"];

const useInvalidateGit = () => {
    const queryClient = useQueryClient();
    return () => GIT_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
};

export const useGitStatus = (projectId: string | null, options: { refetchInterval?: number } = {}) => {
    const localState = useProjectLocalState(projectId);
    return useQuery({
        queryKey: ["git-status", projectId],
        queryFn: () => getGitStatus(projectId!),
        enabled: !!projectId && localState === ProjectLocalStates.LOCAL,
        refetchInterval: options.refetchInterval ?? 8000,
        refetchOnWindowFocus: true,
    });
};

export const useFileDiff = (projectId: string | null, path: string | null) =>
    useQuery({ queryKey: ["git-diff", projectId, path], queryFn: () => getFileDiff(projectId!, path!), enabled: !!projectId && !!path });

export const useBranches = (projectId: string | null, enabled = true) =>
    useQuery({ queryKey: ["git-branches", projectId], queryFn: () => getBranches(projectId!), enabled: !!projectId && enabled });

export const useGitLog = (projectId: string | null) =>
    useQuery({ queryKey: ["git-log", projectId], queryFn: () => getGitLog(projectId!, 15), enabled: !!projectId });

export const useStashes = (projectId: string | null) =>
    useQuery({ queryKey: ["git-stashes", projectId], queryFn: () => getStashes(projectId!), enabled: !!projectId });

/** Shared factory: every Git mutation refreshes Git state, toasts, and records project activity. */
function useGitMutation<TVars extends { projectId: string }, TResult>(options: {
    mutationFn: (vars: TVars) => Promise<TResult>;
    success: (vars: TVars, result: TResult) => string;
    failure: string;
    activity?: ActivityType;
    /** When set, the success toast follows the user's toast setting for this event. Failures always toast. */
    event?: NotificationEventType;
}) {
    const queryClient = useQueryClient();
    const invalidate = useInvalidateGit();
    const record = useRecordActivity();
    return useMutation({
        mutationFn: options.mutationFn,
        onSuccess: (result, vars) => {
            invalidate();
            const message = options.success(vars, result);
            const settings = queryClient.getQueryData<UserPreference>(["preferences"])?.notification_settings;
            if (!options.event || shouldNotify(settings, options.event, NotificationChannels.TOAST)) toast({ title: message, duration: 2000 });
            if (options.activity) record.mutate({ project_id: vars.projectId, type: options.activity, message });
        },
        onError: (error: Error) => {
            invalidate();
            toast({ title: options.failure, description: error.message, variant: "error", duration: 6000 });
        },
    });
}

export const useGitInit = () =>
    useGitMutation({ mutationFn: ({ projectId }: { projectId: string }) => gitInit(projectId), success: () => "Git repository initialized", failure: "Could not initialize Git" });

export type PublishTarget =
    | { type: "create"; connectionId: string; repo: CreateGithubRepositoryDto }
    | { type: "existing"; connectionId: string; repo: GithubRepository }
    | { type: "url"; url: string };

/**
 * Gives a remote-less repository somewhere to push: creates the GitHub repo (or takes an existing one / a URL),
 * adds it as `origin`, records it on the project, and publishes the current branch when there is something to push.
 */
export const useGitPublishToRemote = () => {
    const queryClient = useQueryClient();
    return useGitMutation({
        mutationFn: async ({ projectId, project, target, hasCommits, rename }: { projectId: string; project: Project; target: PublishTarget; hasCommits: boolean; rename?: { from: string; to: string } }) => {
            // First, so the remote starts out with the right branch name (nothing is published yet, so a local rename is safe).
            if (rename && rename.from !== rename.to) await gitRenameBranch({ projectId, ...rename });
            const repo = target.type === "create" ? await createGithubRepository({ connectionId: target.connectionId, ...target.repo }) : target.type === "existing" ? target.repo : null;
            const url = repo ? repo.clone_url : target.type === "url" ? target.url.trim() : "";
            await gitAddRemote(projectId, url);

            // Best effort: the remote is already configured locally, so a failed server-side link must not fail the flow.
            if (repo && !project.repository) {
                const connectionId = target.type === "url" ? null : target.connectionId;
                await updateProject({
                    id: project.id,
                    github_connection_id: connectionId,
                    repository: { clone_url: repo.clone_url, provider: RepositoryProviders.GITHUB, full_name: repo.full_name, default_branch: repo.default_branch, connection_id: connectionId },
                })
                    .then(() => queryClient.invalidateQueries({ queryKey: ["projects"] }))
                    .catch(() => undefined);
            }

            const pushed = hasCommits ? await gitPush(projectId) : null;
            return { url, pushed: !!pushed?.pushed, hasCommits };
        },
        success: (_vars, r) => (r.pushed ? "Remote added and branch published" : r.hasCommits ? "Remote added" : "Remote added — commit your changes, then push"),
        failure: "Could not add the remote",
        activity: ActivityTypes.GIT_PUSH,
    });
};

export const useGitFetch = () =>
    useGitMutation({ mutationFn: ({ projectId }: { projectId: string }) => gitFetch(projectId), success: () => "Fetched from remote", failure: "Fetch failed" });

export const useGitPull = () =>
    useGitMutation({ mutationFn: ({ projectId }: { projectId: string }) => gitPull(projectId), success: () => "Pull completed", failure: "Pull failed", activity: ActivityTypes.GIT_PULL, event: NotificationEventTypes.GIT_PULL });

export const useGitSync = () =>
    useGitMutation({
        mutationFn: ({ projectId }: { projectId: string }) => gitSync(projectId),
        success: (_vars, r) => (r.pulled || r.pushed ? `Synced — pulled ${r.pulled}, pushed ${r.pushed}` : "Already in sync"),
        failure: "Sync failed",
        activity: ActivityTypes.GIT_PUSH,
        event: NotificationEventTypes.GIT_PUSH,
    });

export const useConflictFile = (projectId: string, path: string) =>
    useQuery({ queryKey: ["git-conflict", projectId, path], queryFn: () => getConflictFile(projectId, path), staleTime: Infinity, refetchOnWindowFocus: false });

export const useResolveConflict = () =>
    useGitMutation({ mutationFn: gitResolveConflict, success: (vars) => `Resolved ${vars.path}`, failure: "Could not resolve the file" });

export const useTakeConflictSide = () =>
    useGitMutation({
        mutationFn: gitTakeSide,
        success: (vars) => `Resolved ${vars.path} using ${vars.side === "current" ? "current" : "incoming"} version`,
        failure: "Could not resolve the file",
    });

export const useContinueOperation = () =>
    useGitMutation({
        mutationFn: gitContinueOperation,
        success: (_vars, r) => (r.done ? "Merge completed" : "Continuing — the next commit has conflicts"),
        failure: "Could not continue",
        activity: ActivityTypes.GIT_BRANCH,
    });

export const useAbortOperation = () =>
    useGitMutation({ mutationFn: gitAbortOperation, success: (_vars, message) => message, failure: "Could not abort" });

export const useGitPush = () =>
    useGitMutation({
        mutationFn: ({ projectId }: { projectId: string }) => gitPush(projectId),
        success: (_vars, result) => (result.pushed ? "Push completed" : "Nothing to push — already up to date"),
        failure: "Push failed",
        activity: ActivityTypes.GIT_PUSH,
        event: NotificationEventTypes.GIT_PUSH,
    });

export const useGitCommit = () =>
    useGitMutation({
        mutationFn: gitCommit,
        success: (vars, result) => `Commit created ${result.sha.slice(0, 7)} — ${vars.message.split("\n")[0].slice(0, 60)}`,
        failure: "Commit failed",
        activity: ActivityTypes.GIT_COMMIT,
        event: NotificationEventTypes.GIT_COMMIT,
    });

export const useGitCheckout = () =>
    useGitMutation({ mutationFn: gitCheckout, success: (vars) => `Switched to ${vars.branch}`, failure: "Could not switch branch", activity: ActivityTypes.GIT_BRANCH });

export const useGitCreateBranch = () =>
    useGitMutation({ mutationFn: gitCreateBranch, success: (vars) => `Created branch ${vars.name}`, failure: "Could not create branch", activity: ActivityTypes.GIT_BRANCH });

export const useGitRenameBranch = () =>
    useGitMutation({ mutationFn: gitRenameBranch, success: (vars) => `Renamed ${vars.from} to ${vars.to}`, failure: "Could not rename the branch", activity: ActivityTypes.GIT_BRANCH });

export const useGitMerge = () =>
    useGitMutation({ mutationFn: gitMerge, success: (vars) => `Merged ${vars.branch}`, failure: "Merge failed", activity: ActivityTypes.GIT_BRANCH });

export const useGitMergeInto = () =>
    useGitMutation({ mutationFn: gitMergeInto, success: (vars) => `Merged ${vars.source} into ${vars.target}`, failure: "Merge failed", activity: ActivityTypes.GIT_BRANCH });

export const useGitStash = () =>
    useGitMutation({ mutationFn: gitStash, success: () => "Changes stashed", failure: "Stash failed", activity: ActivityTypes.GIT_STASH });

export const useGitStashPop = () =>
    useGitMutation({ mutationFn: gitStashPop, success: () => "Stash applied", failure: "Could not apply stash", activity: ActivityTypes.GIT_STASH });

export const useGitDiscard = () =>
    useGitMutation({
        mutationFn: gitDiscard,
        success: (vars) => (vars.paths?.length ? `Discarded changes in ${vars.paths.length} file${vars.paths.length === 1 ? "" : "s"}` : "All changes discarded"),
        failure: "Could not discard changes",
        activity: ActivityTypes.GIT_DISCARD,
    });
