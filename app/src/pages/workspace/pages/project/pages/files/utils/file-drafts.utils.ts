/** An unsaved edit plus the version of the file it was started from, so a later change on disk can be detected. */
export interface FileDraft {
  content: string;
  baseContent: string;
  baseMtime: number;
}

/**
 * Unsaved edits per file, kept for this session. The editor remounts when the shown file changes, so a
 * draft lives here rather than in the editor's own state, and comes back when the file is shown again.
 */
const drafts = new Map<string, FileDraft>();

const draftKey = (projectId: string, path: string) => `${projectId}:${path}`;

export const getFileDraft = (projectId: string, path: string) => drafts.get(draftKey(projectId, path));

export const setFileDraft = (projectId: string, path: string, draft: FileDraft) => {
  drafts.set(draftKey(projectId, path), draft);
};

export const hasFileDraft = (projectId: string, path: string) => drafts.has(draftKey(projectId, path));

/** Forget a file's draft once it is saved, so a later reload shows what is on disk. */
export const clearFileDraft = (projectId: string, path: string) => {
  drafts.delete(draftKey(projectId, path));
};
