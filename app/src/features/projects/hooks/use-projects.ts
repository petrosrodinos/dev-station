import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createProject,
    deleteProject,
    getProjectIssues,
    getProjects,
    linkProjectIssue,
    reorderProjects,
    replaceProjectServices,
    updateProject,
} from "../services/projects.services";
import type { Project } from "../interfaces/projects.interfaces";
import { useWorkspaceStore } from "@/stores/workspace";
import { toast } from "@/hooks/use-toast";

export const useGetProjects = () => {
    const orgId = useWorkspaceStore((s) => s.active_organization_id);
    return useQuery({ queryKey: ["projects", orgId], queryFn: getProjects, enabled: !!orgId });
};

/** Single project resolved from the (already loaded) project list so switching is instant. */
export const useProject = (projectId: string | null | undefined): { project: Project | null; isPending: boolean } => {
    const { data, isPending } = useGetProjects();
    return { project: data?.find((p) => p.id === projectId) ?? null, isPending };
};

export const useCreateProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createProject,
        onSuccess: (project) => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast({ title: "Project created", description: project.name, duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not create project", description: error.message, variant: "error" }),
    });
};

export const useUpdateProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast({ title: "Project updated", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not update project", description: error.message, variant: "error" }),
    });
};

export const useDeleteProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast({ title: "Project removed", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not remove project", description: error.message, variant: "error" }),
    });
};

export const useReorderProjects = () => {
    const queryClient = useQueryClient();
    const orgId = useWorkspaceStore((s) => s.active_organization_id);
    return useMutation({
        mutationFn: reorderProjects,
        onMutate: async (ids) => {
            // Optimistic: the rail reorders immediately.
            await queryClient.cancelQueries({ queryKey: ["projects", orgId] });
            const previous = queryClient.getQueryData<Project[]>(["projects", orgId]);
            if (previous) {
                const byId = new Map(previous.map((p) => [p.id, p]));
                queryClient.setQueryData<Project[]>(
                    ["projects", orgId],
                    ids.map((id, index) => ({ ...byId.get(id)!, sort_order: index })).filter((p) => p.id),
                );
            }
            return { previous };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast({ title: "Project order saved", duration: 1200 });
        },
        onError: (error: Error, _ids, context) => {
            if (context?.previous) queryClient.setQueryData(["projects", orgId], context.previous);
            toast({ title: "Could not reorder projects", description: error.message, variant: "error" });
        },
    });
};

export const useReplaceProjectServices = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: replaceProjectServices,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast({ title: "Services saved", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not save services", description: error.message, variant: "error" }),
    });
};

export const useGetProjectIssues = (projectId: string | null) =>
    useQuery({ queryKey: ["project-issues", projectId], queryFn: () => getProjectIssues(projectId!), enabled: !!projectId });

export const useLinkProjectIssue = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: linkProjectIssue,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project-issues"] });
            toast({ title: "Issue linked to project", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not link issue", description: error.message, variant: "error" }),
    });
};
