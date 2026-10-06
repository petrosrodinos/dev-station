import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
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
import type {
    CreateProjectDto,
    LinkProjectIssueDto,
    Project,
    ProjectIssueLink,
    ServiceInput,
    UpdateProjectDto,
} from "../interfaces/projects.interfaces";
import { getWorkspaceStoreState, useWorkspaceStore } from "@/stores/workspace";
import { toast } from "@/hooks/use-toast";
import { QUEUED_MUTATION_POLICY } from "@/config/query/offline-policy";

/** Mutation keys only. The functions and callbacks live in registerProjectMutations (see config/query/mutation-defaults). */
export const ProjectMutationKeys = {
    create: ["projects", "create"],
    update: ["projects", "update"],
    archive: ["projects", "archive"],
    delete: ["projects", "delete"],
    reorder: ["projects", "reorder"],
    replaceServices: ["projects", "replace-services"],
    linkIssue: ["projects", "link-issue"],
} as const;

export const useGetProjects = () => {
    const orgId = useWorkspaceStore((s) => s.active_organization_id);
    return useQuery({ queryKey: ["projects", orgId], queryFn: () => getProjects(), enabled: !!orgId });
};

/** Archived projects, listed only where they can be restored (the rail never shows them). */
export const useGetArchivedProjects = () => {
    const orgId = useWorkspaceStore((s) => s.active_organization_id);
    return useQuery({ queryKey: ["projects", orgId, "archived"], queryFn: () => getProjects(true), enabled: !!orgId });
};

/** Single project resolved from the (already loaded) project list so switching is instant. */
export const useProject = (projectId: string | null | undefined): { project: Project | null; isPending: boolean } => {
    const { data, isPending } = useGetProjects();
    return { project: data?.find((p) => p.id === projectId) ?? null, isPending };
};

export const useCreateProject = () => useMutation<Project, Error, CreateProjectDto>({ mutationKey: ProjectMutationKeys.create });

export const useUpdateProject = () => useMutation<Project, Error, UpdateProjectDto & { id: string }>({ mutationKey: ProjectMutationKeys.update });

export const useArchiveProject = () => useMutation<Project, Error, { id: string; archived: boolean }>({ mutationKey: ProjectMutationKeys.archive });

export const useDeleteProject = () => useMutation<void, Error, string>({ mutationKey: ProjectMutationKeys.delete });

export const useReorderProjects = () => useMutation<void, Error, string[]>({ mutationKey: ProjectMutationKeys.reorder });

export const useReplaceProjectServices = () =>
    useMutation<Project, Error, { id: string; services: ServiceInput[] }>({ mutationKey: ProjectMutationKeys.replaceServices });

export const useGetProjectIssues = (projectId: string | null) =>
    useQuery({ queryKey: ["project-issues", projectId], queryFn: () => getProjectIssues(projectId!), enabled: !!projectId });

export const useLinkProjectIssue = () =>
    useMutation<ProjectIssueLink, Error, LinkProjectIssueDto & { id: string }>({ mutationKey: ProjectMutationKeys.linkIssue });

export const registerProjectMutations = (queryClient: QueryClient) => {
    const refreshProjects = () => queryClient.invalidateQueries({ queryKey: ["projects"] });
    const reportFailure = (title: string) => (error: Error) => toast({ title, description: error.message, variant: "error" });

    // Every project write shares one scope so they replay in the order they were made.
    const scope = { id: "projects" };

    queryClient.setMutationDefaults(ProjectMutationKeys.create, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: createProject,
        onSuccess: (project) => {
            refreshProjects();
            toast({ title: "Project created", description: project.name, duration: 2000 });
        },
        onError: reportFailure("Could not create project"),
    });

    queryClient.setMutationDefaults(ProjectMutationKeys.update, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: updateProject,
        onSuccess: () => {
            refreshProjects();
            toast({ title: "Project updated", duration: 1500 });
        },
        onError: reportFailure("Could not update project"),
    });

    queryClient.setMutationDefaults(ProjectMutationKeys.archive, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: updateProject,
        onSuccess: (project) => {
            refreshProjects();
            toast({ title: project.archived_at ? "Project archived" : "Project restored", description: project.name, duration: 2000 });
        },
        onError: reportFailure("Could not update project"),
    });

    queryClient.setMutationDefaults(ProjectMutationKeys.delete, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: deleteProject,
        onSuccess: () => {
            refreshProjects();
            toast({ title: "Project removed", duration: 2000 });
        },
        onError: reportFailure("Could not remove project"),
    });

    queryClient.setMutationDefaults(ProjectMutationKeys.reorder, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: reorderProjects,
        onMutate: async (ids: string[]) => {
            // Optimistic: the rail reorders immediately, including while offline.
            const orgId = getWorkspaceStoreState().active_organization_id;
            await queryClient.cancelQueries({ queryKey: ["projects", orgId] });
            const previous = queryClient.getQueryData<Project[]>(["projects", orgId]);
            if (previous) {
                const byId = new Map(previous.map((p) => [p.id, p]));
                queryClient.setQueryData<Project[]>(
                    ["projects", orgId],
                    ids.map((id, index) => ({ ...byId.get(id)!, sort_order: index })).filter((p) => p.id),
                );
            }
            return { previous, orgId };
        },
        onSuccess: () => {
            refreshProjects();
        },
        onError: (error: Error, _ids, context) => {
            if (context?.previous) queryClient.setQueryData(["projects", context.orgId], context.previous);
            toast({ title: "Could not reorder projects", description: error.message, variant: "error" });
        },
    });

    queryClient.setMutationDefaults(ProjectMutationKeys.replaceServices, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: replaceProjectServices,
        onSuccess: () => {
            refreshProjects();
            toast({ title: "Services saved", duration: 1500 });
        },
        onError: reportFailure("Could not save services"),
    });

    queryClient.setMutationDefaults(ProjectMutationKeys.linkIssue, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: linkProjectIssue,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project-issues"] });
            toast({ title: "Issue linked to project", duration: 1500 });
        },
        onError: reportFailure("Could not link issue"),
    });
};
