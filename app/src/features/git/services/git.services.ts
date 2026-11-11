import type { GitBranch, GitCommitEntry, GitConflictFile, GitConflictSide, GitStashEntry, GitStatus } from "@shared/contract";
import { getBridge, getErrorMessage } from "@/lib/desktop";

// Git operations run in the Electron main process (Git Manager) against the project's local clone.

const wrap = async <T>(fn: () => Promise<T>, fallback: string): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        throw new Error(getErrorMessage(error, fallback));
    }
};

export const getGitStatus = (projectId: string): Promise<GitStatus> => wrap(() => getBridge().git.status(projectId), "Failed to read Git status.");
export const getFileDiff = (projectId: string, path: string): Promise<string> => wrap(() => getBridge().git.fileDiff(projectId, path), "Failed to load the diff.");
export const getBranches = (projectId: string): Promise<GitBranch[]> => wrap(() => getBridge().git.branches(projectId), "Failed to list branches.");
export const getGitLog = (projectId: string, limit = 20): Promise<GitCommitEntry[]> => wrap(() => getBridge().git.log(projectId, limit), "Failed to load commit history.");
export const getStashes = (projectId: string): Promise<GitStashEntry[]> => wrap(() => getBridge().git.stashes(projectId), "Failed to list stashes.");
export const gitInit = (projectId: string) => wrap(() => getBridge().git.init(projectId), "Could not initialize Git.");
export const gitAddRemote = (projectId: string, url: string) => wrap(() => getBridge().git.addRemote(projectId, url), "Could not add the remote.");
export const gitFetch =(projectId: string) => wrap(() => getBridge().git.fetch(projectId), "Fetch failed.");
export const gitPull = (projectId: string) => wrap(() => getBridge().git.pull(projectId), "Pull failed.");
export const getConflictFile = (projectId: string, path: string): Promise<GitConflictFile> => wrap(() => getBridge().git.conflictRead(projectId, path), "Could not read the conflicted file.");
export const gitResolveConflict = ({ projectId, path, content }: { projectId: string; path: string; content: string }) =>
    wrap(() => getBridge().git.conflictResolve(projectId, path, content), "Could not mark the file as resolved.");
export const gitTakeSide = ({ projectId, path, side }: { projectId: string; path: string; side: GitConflictSide }) =>
    wrap(() => getBridge().git.conflictTake(projectId, path, side), "Could not resolve the conflict.");
export const gitContinueOperation = ({ projectId, name, email }: { projectId: string; name?: string | null; email?: string | null }) =>
    wrap(() => getBridge().git.operationContinue(projectId, { name, email }), "Could not continue.");
export const gitAbortOperation = ({ projectId }: { projectId: string }) => wrap(() => getBridge().git.operationAbort(projectId), "Could not abort.");
export const gitSync =(projectId: string) => wrap(() => getBridge().git.sync(projectId), "Sync failed.");
export const gitPush =(projectId: string) => wrap(() => getBridge().git.push(projectId), "Push failed.");
export const gitCommit = ({ projectId, ...input }: { projectId: string; message: string; paths?: string[]; name?: string | null; email?: string | null }) =>
    wrap(() => getBridge().git.commit(projectId, input), "Commit failed.");
export const gitCheckout = ({ projectId, branch }: { projectId: string; branch: string }) => wrap(() => getBridge().git.checkout(projectId, branch), "Could not switch branch.");
export const gitCreateBranch = ({ projectId, name, checkout }: { projectId: string; name: string; checkout: boolean }) =>
    wrap(() => getBridge().git.createBranch(projectId, name, checkout), "Could not create branch.");
export const gitRenameBranch = ({ projectId, from, to }: { projectId: string; from: string; to: string }) =>
    wrap(() => getBridge().git.renameBranch(projectId, from, to), "Could not rename the branch.");
export const gitMerge =({ projectId, branch }: { projectId: string; branch: string }) => wrap(() => getBridge().git.merge(projectId, branch), "Merge failed.");
/** Merges `source` into `target`: switches to `target` first, so the repo is left on `target` (also when the merge conflicts). */
export const gitMergeInto = async ({ projectId, source, target }: { projectId: string; source: string; target: string }) => {
    await gitCheckout({ projectId, branch: target });
    return gitMerge({ projectId, branch: source });
};
export const gitStash = ({ projectId, message }: { projectId: string; message?: string }) => wrap(() => getBridge().git.stash(projectId, message), "Stash failed.");
export const gitStashPop = ({ projectId, ref }: { projectId: string; ref?: string }) => wrap(() => getBridge().git.stashPop(projectId, ref), "Could not apply stash.");
export const gitDiscard = ({ projectId, paths }: { projectId: string; paths?: string[] }) =>
    wrap(() => getBridge().git.discard(projectId, { paths, confirm: true }), "Could not discard changes.");
export const gitClone = (input: { operation_id: string; url: string; destination: string; branch?: string | null }) =>
    wrap(() => getBridge().git.clone(input), "Clone failed.");
export const cancelClone = (operationId: string) => wrap(() => getBridge().git.cancelClone(operationId), "Could not cancel the clone.");
