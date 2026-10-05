import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CloneProgressEvent, DetectionResult } from "@shared/contract";
import { cancelClone, gitClone } from "@/features/git/services/git.services";
import { inspectProject, setProjectPath } from "../services/local-workspace.services";
import { replaceProjectServices } from "@/features/projects/services/projects.services";
import { detectedToServiceInputs } from "@/features/projects/utils/services.utils";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { createActivity } from "@/features/activities/services/activities.services";
import { ActivityTypes } from "@/features/activities/interfaces/activities.interfaces";
import { joinLocalPath } from "@/lib/path";
import { isDesktop } from "@/lib/desktop";
import { toast } from "@/hooks/use-toast";

/** Live clone progress per operation id (git clone --progress, streamed from main). */
export const useCloneProgress = () => {
    const [events, setEvents] = useState<Record<string, CloneProgressEvent>>({});
    useEffect(() => {
        if (!isDesktop()) return;
        return window.devStation!.git.onCloneProgress((e) => setEvents((prev) => ({ ...prev, [e.operation_id]: e })));
    }, []);
    return events;
};

/** Links a project to a local folder, runs detection, and seeds service definitions when none exist. */
const linkAndDetect = async (project: Project, projectPath: string): Promise<DetectionResult> => {
    await setProjectPath({ projectId: project.id, path: projectPath });
    const detection = await inspectProject(project.id);
    if (!project.services.length && detection.services.length) {
        await replaceProjectServices({ id: project.id, services: detectedToServiceInputs(detection.services) });
    }
    return detection;
};

export interface CloneProjectInput {
    project: Project;
    operation_id: string;
    url: string;
    /** Repository root destination; the project path is destination + project.sub_path. */
    destination: string;
    branch?: string | null;
}

/** Clone → link → detect (Spec §7/§8/§26). Each clone is an independent, cancellable operation. */
export const useCloneProject = (options: { silent?: boolean } = {}) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ project, operation_id, url, destination, branch }: CloneProjectInput) => {
            const repoRoot = await gitClone({ operation_id, url, destination, branch });
            const detection = await linkAndDetect(project, joinLocalPath(repoRoot, project.sub_path));
            await createActivity({ project_id: project.id, type: ActivityTypes.REPOSITORY_CLONED, message: `Repository cloned to ${repoRoot}` }).catch(() => undefined);
            return { project, detection };
        },
        onSuccess: ({ project, detection }) => {
            ["projects", "project-local-states", "workspace-config", "project-detection", "activities", "git-status"].forEach((key) =>
                queryClient.invalidateQueries({ queryKey: [key] }),
            );
            if (!options.silent) {
                toast({ title: `${project.name} is ready`, description: `${detection.services.length} service${detection.services.length === 1 ? "" : "s"} detected`, duration: 2500 });
            }
        },
        onError: (error: Error, vars) => {
            toast({ title: `Could not clone ${vars.project.name}`, description: error.message, variant: "error", duration: 7000 });
        },
    });
};

export const useCancelClone = () =>
    useMutation({
        mutationFn: cancelClone,
        onSuccess: () => toast({ title: "Clone cancelled", duration: 1500 }),
        onError: (error: Error) => toast({ title: "Could not cancel clone", description: error.message, variant: "error" }),
    });

/** "Choose local path": point a project at an existing folder on this device. */
export const useLinkProjectFolder = (options: { silent?: boolean } = {}) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ project, path }: { project: Project; path: string }) => ({ project, detection: await linkAndDetect(project, path) }),
        onSuccess: ({ project }) => {
            ["projects", "project-local-states", "workspace-config", "project-detection", "git-status"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
            if (!options.silent) {
                toast({ title: `${project.name} linked to a local folder`, duration: 2000 });
            }
        },
        onError: (error: Error) => toast({ title: "Could not link folder", description: error.message, variant: "error" }),
    });
};
