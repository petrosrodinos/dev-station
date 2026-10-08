import type { EnvFileContent, EnvFileSummary, EnvVariable } from "@shared/contract";
import { getBridge, getErrorMessage } from "@/lib/desktop";

// A project's `.env*` files, read and written by the Electron main process on this device. Values never go to the API.

export const listEnvFiles = async (projectId: string): Promise<EnvFileSummary[]> => {
    try {
        return await getBridge().env.listFiles(projectId);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to list the .env files."));
    }
};

export const readEnvFile = async (projectId: string, path: string): Promise<EnvFileContent> => {
    try {
        return await getBridge().env.readFile(projectId, path);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to read the .env file."));
    }
};

/** Rethrows the bridge error as is, so callers can read its code (FILE_CHANGED) with `getBridgeErrorCode`. */
export const writeEnvFile = async ({
    projectId,
    path,
    variables,
    mtimeMs,
}: {
    projectId: string;
    path: string;
    variables: EnvVariable[];
    mtimeMs: number;
}): Promise<EnvFileContent> => getBridge().env.writeFile(projectId, path, variables, mtimeMs);
