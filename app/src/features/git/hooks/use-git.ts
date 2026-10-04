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
    gitFetch, gitInit,
    gitMerge,
    gitPull,
    gitPush,
    gitStash,
    gitStashPop,
} from "../services/git.services";
import { useRecordActivity } from "@/features/activities/hooks/use-activities";
import { ActivityTypes, type ActivityType } from "@/features/activities/interfaces/activities.interfaces";
import { useProjectLocalState } from "@/features/local-workspace/hooks/use-local-workspace";
import { ProjectLocalStates } from "@shared/contract";
import { toast } from "@/hooks/use-toast";
import { NotificationChannels, NotificationEventTypes, type NotificationEventType, type UserPreference } from "@/features/users/interfaces/users.interfaces";
import { shouldNotify } from "@/features/users/utils/notification-settings.utils";

const GIT_KEYS = ["git-status", "git-branches", "git-log", "git-stashes", "git-diff"];

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

export const useGitFetch = () =>
    useGitMutation({ mutationFn: ({ projectId }: { projectId: string }) => gitFetch(projectId), success: () => "Fetched from remote", failure: "Fetch failed" });

export const useGitPull = () =>
    useGitMutation({ mutationFn: ({ projectId }: { projectId: string }) => gitPull(projectId), success: () => "Pull completed", failure: "Pull failed", activity: ActivityTypes.GIT_PULL, event: NotificationEventTypes.GIT_PULL });

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

export const useGitMerge = () =>
    useGitMutation({ mutationFn: gitMerge, success: (vars) => `Merged ${vars.branch}`, failure: "Merge failed", activity: ActivityTypes.GIT_BRANCH });

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
