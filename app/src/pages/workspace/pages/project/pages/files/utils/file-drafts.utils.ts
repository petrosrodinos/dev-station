/**
 * Unsaved edits per file, kept for this session. The editor remounts when the shown file changes, so a
 * draft lives here rather than in the editor's own state, and comes back when the file is shown again.
 */
const drafts = new Map<string, string>();

const draftKey = (projectId: string, path: string) => `${projectId}:${path}`;

export const getFileDraft = (projectId: string, path: string) => drafts.get(draftKey(projectId, path));

export const setFileDraft = (projectId: string, path: string, content: string) => {
  drafts.set(draftKey(projectId, path), content);
};
