import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { copyFilePath, copyRelativePath, createFile, createFolder, deleteEntry, importExternal, listDirectory, moveEntry, openFileExternally, openInEditor, readFile, renameEntry, revealFile, searchFiles, writeFile } from "../services/files.services";
import { getEditorTargetLabel } from "@/config/constants/dropdowns/settings/editor-target.options";
import { toast } from "@/hooks/use-toast";

export const useDirectory = (projectId: string | null, relDir: string, enabled = true) =>
    useQuery({ queryKey: ["files", projectId, relDir], queryFn: () => listDirectory(projectId!, relDir), enabled: !!projectId && enabled, staleTime: 10_000 });

export const useFileSearch = (projectId: string | null, query: string) =>
    useQuery({
        queryKey: ["file-search", projectId, query],
        queryFn: () => searchFiles(projectId!, query),
        enabled: !!projectId && query.trim().length > 1,
        placeholderData: keepPreviousData,
    });

export const useRevealFile = () =>
    useMutation({
        mutationFn: revealFile,
        onSuccess: () => toast({ title: "Revealed in file manager", duration: 1200 }),
        onError: (error: Error) => toast({ title: "Could not reveal file", description: error.message, variant: "error" }),
    });

export const useOpenFileExternally = () =>
    useMutation({
        mutationFn: openFileExternally,
        onSuccess: () => toast({ title: "Opened in default app", duration: 1200 }),
        onError: (error: Error) => toast({ title: "Could not open file", description: error.message, variant: "error" }),
    });

export const useOpenInEditor = () =>
    useMutation({
        mutationFn: openInEditor,
        onSuccess: (_r, vars) => toast({ title: `Opening in ${getEditorTargetLabel(vars.editor)}`, duration: 1500 }),
        onError: (error: Error) => toast({ title: "Could not open editor", description: error.message, variant: "error" }),
    });

export const useCopyFilePath = () =>
    useMutation({
        mutationFn: copyFilePath,
        onSuccess: (path) => toast({ title: "Path copied", description: path, duration: 1500 }),
        onError: (error: Error) => toast({ title: "Could not copy path", description: error.message, variant: "error" }),
    });

export const useCopyRelativePath = () =>
    useMutation({
        mutationFn: copyRelativePath,
        onSuccess: (path) => toast({ title: "Relative path copied", description: path, duration: 1500 }),
        onError: (error: Error) => toast({ title: "Could not copy path", description: error.message, variant: "error" }),
    });

export const useFileContent = (projectId: string | null, path: string | null) =>
    useQuery({
        queryKey: ["file-content", projectId, path],
        queryFn: () => readFile(projectId!, path!),
        enabled: !!projectId && !!path,
        staleTime: 0,
        retry: false,
    });

export const useSaveFile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: writeFile,
        onSuccess: (_r, vars) => {
            queryClient.setQueryData(["file-content", vars.projectId, vars.path], { content: vars.content });
            toast({ title: "Saved", duration: 1000 });
        },
        onError: (error: Error) => toast({ title: "Could not save file", description: error.message, variant: "error" }),
    });
};

const useInvalidateTree = () => {
    const queryClient = useQueryClient();
    return (projectId: string) => {
        void queryClient.invalidateQueries({ queryKey: ["files", projectId] });
        void queryClient.invalidateQueries({ queryKey: ["file-search", projectId] });
        void queryClient.invalidateQueries({ queryKey: ["git-status", projectId] });
    };
};

export const useCreateFile = () => {
    const invalidate = useInvalidateTree();
    return useMutation({
        mutationFn: createFile,
        onSuccess: (_r, vars) => invalidate(vars.projectId),
        onError: (error: Error) => toast({ title: "Could not create file", description: error.message, variant: "error" }),
    });
};

export const useCreateFolder = () => {
    const invalidate = useInvalidateTree();
    return useMutation({
        mutationFn: createFolder,
        onSuccess: (_r, vars) => invalidate(vars.projectId),
        onError: (error: Error) => toast({ title: "Could not create folder", description: error.message, variant: "error" }),
    });
};

export const useRenameEntry = () => {
    const invalidate = useInvalidateTree();
    return useMutation({
        mutationFn: renameEntry,
        onSuccess: (_r, vars) => invalidate(vars.projectId),
        onError: (error: Error) => toast({ title: "Could not rename", description: error.message, variant: "error" }),
    });
};

export const useDeleteEntry = () => {
    const invalidate = useInvalidateTree();
    return useMutation({
        mutationFn: deleteEntry,
        onSuccess: (_r, vars) => {
            invalidate(vars.projectId);
            toast({ title: "Moved to trash", description: vars.path, duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not delete", description: error.message, variant: "error" }),
    });
};

export const useMoveEntry = () => {
    const invalidate = useInvalidateTree();
    return useMutation({
        mutationFn: moveEntry,
        onSuccess: (_r, vars) => invalidate(vars.projectId),
        onError: (error: Error) => toast({ title: "Could not move", description: error.message, variant: "error" }),
    });
};

export const useImportFiles = () => {
    const invalidate = useInvalidateTree();
    return useMutation({
        mutationFn: importExternal,
        onSuccess: (created, vars) => {
            invalidate(vars.projectId);
            toast({ title: created.length === 1 ? "Added 1 item" : `Added ${created.length} items`, duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not add files", description: error.message, variant: "error" }),
    });
};
