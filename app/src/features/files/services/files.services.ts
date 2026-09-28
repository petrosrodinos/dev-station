import type { EditorTarget, FileContent, FileEntry } from "@shared/contract";
import { getBridge, getErrorMessage } from "@/lib/desktop";

const wrap = async <T>(fn: () => Promise<T>, fallback: string): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        throw new Error(getErrorMessage(error, fallback));
    }
};

export const listDirectory = (projectId: string, relDir: string): Promise<FileEntry[]> => wrap(() => getBridge().files.list(projectId, relDir), "Failed to read the folder.");
export const searchFiles = (projectId: string, query: string): Promise<FileEntry[]> => wrap(() => getBridge().files.search(projectId, query), "File search failed.");
export const revealFile = ({ projectId, path }: { projectId: string; path: string }) => wrap(() => getBridge().files.reveal(projectId, path), "Could not reveal the file.");
export const openFileExternally = ({ projectId, path }: { projectId: string; path: string }) => wrap(() => getBridge().files.openExternal(projectId, path), "Could not open the file.");
export const openInEditor = ({ projectId, editor, path }: { projectId: string; editor: EditorTarget; path?: string }) =>
    wrap(() => getBridge().files.openInEditor(projectId, editor, path), "Could not open the editor.");
export const copyFilePath = ({ projectId, path }: { projectId: string; path: string }) => wrap(() => getBridge().files.copyPath(projectId, path), "Could not copy the path.");
export const readFile = (projectId: string, path: string): Promise<FileContent> => wrap(() => getBridge().files.readFile(projectId, path), "Could not read the file.");
export const writeFile = ({ projectId, path, content }: { projectId: string; path: string; content: string }) =>
    wrap(() => getBridge().files.writeFile(projectId, path, content), "Could not save the file.");
