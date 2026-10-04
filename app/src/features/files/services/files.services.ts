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
export const createFile = ({ projectId, path }: { projectId: string; path: string }) => wrap(() => getBridge().files.createFile(projectId, path), "Could not create the file.");
export const createFolder = ({ projectId, path }: { projectId: string; path: string }) => wrap(() => getBridge().files.createFolder(projectId, path), "Could not create the folder.");
export const renameEntry = ({ projectId, path, name }: { projectId: string; path: string; name: string }) => wrap(() => getBridge().files.rename(projectId, path, name), "Could not rename it.");
export const deleteEntry = ({ projectId, path }: { projectId: string; path: string }) => wrap(() => getBridge().files.delete(projectId, path), "Could not delete it.");
export const moveEntry = ({ projectId, path, destDir }: { projectId: string; path: string; destDir: string }) => wrap(() => getBridge().files.move(projectId, path, destDir), "Could not move it.");
export const importExternal = ({ projectId, destDir, files }: { projectId: string; destDir: string; files: File[] }) =>
    wrap(() => {
        const bridge = getBridge().files;
        const sources = files.map((f) => bridge.pathForFile(f)).filter(Boolean);
        if (!sources.length) throw new Error("Dropped items have no file path.");
        return bridge.importExternal(projectId, destDir, sources);
    }, "Could not copy the dropped items.");
