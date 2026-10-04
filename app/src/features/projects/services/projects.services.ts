import axiosInstance, { getApiErrorMessage } from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type { CreateProjectDto, LinkProjectIssueDto, Project, ProjectIssueLink, ServiceInput, UpdateProjectDto } from "../interfaces/projects.interfaces";

/** Active projects by default; pass `archived` to list the archived ones instead. */
export const getProjects = async (archived = false): Promise<Project[]> => {
    try {
        const response = await axiosInstance.get<Project[]>(ApiRoutes.projects.prefix, { params: archived ? { archived: "true" } : undefined });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load projects."));
    }
};

export const getProject = async (id: string): Promise<Project> => {
    try {
        const response = await axiosInstance.get<Project>(ApiRoutes.projects.by_id(id));
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load the project."));
    }
};

export const createProject = async (dto: CreateProjectDto): Promise<Project> => {
    try {
        const response = await axiosInstance.post<Project>(ApiRoutes.projects.prefix, dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to create the project."));
    }
};

export const updateProject = async ({ id, ...dto }: UpdateProjectDto & { id: string }): Promise<Project> => {
    try {
        const response = await axiosInstance.patch<Project>(ApiRoutes.projects.by_id(id), dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update the project."));
    }
};

export const deleteProject = async (id: string): Promise<void> => {
    try {
        await axiosInstance.delete(ApiRoutes.projects.by_id(id));
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to delete the project."));
    }
};

export const reorderProjects = async (ids: string[]): Promise<void> => {
    try {
        await axiosInstance.post(ApiRoutes.projects.reorder, { ids });
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to reorder projects."));
    }
};

export const replaceProjectServices = async ({ id, services }: { id: string; services: ServiceInput[] }): Promise<Project> => {
    try {
        const response = await axiosInstance.put<Project>(ApiRoutes.projects.services(id), { services });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to save services."));
    }
};

export const getProjectIssues = async (id: string): Promise<ProjectIssueLink[]> => {
    try {
        const response = await axiosInstance.get<ProjectIssueLink[]>(ApiRoutes.projects.issues(id));
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load linked issues."));
    }
};

export const linkProjectIssue = async ({ id, ...dto }: LinkProjectIssueDto & { id: string }): Promise<ProjectIssueLink> => {
    try {
        const response = await axiosInstance.post<ProjectIssueLink>(ApiRoutes.projects.issues(id), dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to link the issue."));
    }
};
