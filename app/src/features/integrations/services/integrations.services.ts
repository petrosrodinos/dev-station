import axiosInstance, { getApiErrorMessage } from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
    GithubRepository,
    InitiateConnectionResponse,
    Integration,
    IntegrationConnection,
    IntegrationProvider,
    LinearIssue,
    LinearIssuesQuery,
    LinearMember,
    LinearProject,
    LinearTeam,
    LinearWorkflowState,
    UpdateLinearIssueDto,
    NotionPage,
    NotionPageContent,
    CreateNotionPageDto,
    UpdateNotionPageDto,
} from "../interfaces/integrations.interfaces";

export const getIntegrations = async (): Promise<Integration[]> => {
    try {
        const response = await axiosInstance.get<Integration[]>(ApiRoutes.integrations.prefix);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load integrations."));
    }
};

export const initiateConnection = async ({ provider, label }: { provider: IntegrationProvider; label?: string }): Promise<InitiateConnectionResponse> => {
    try {
        const response = await axiosInstance.post<InitiateConnectionResponse>(ApiRoutes.integrations.connect(provider), { label });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to start the connection."));
    }
};

export const refreshConnection = async (id: string): Promise<IntegrationConnection> => {
    try {
        const response = await axiosInstance.post<IntegrationConnection>(ApiRoutes.integrations.refresh_connection(id));
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to refresh the connection."));
    }
};

export const updateConnection = async ({ id, ...dto }: { id: string; label?: string; is_default?: boolean }): Promise<IntegrationConnection> => {
    try {
        const response = await axiosInstance.patch<IntegrationConnection>(ApiRoutes.integrations.connection(id), dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update the connection."));
    }
};

export const disconnectConnection = async (id: string): Promise<void> => {
    try {
        await axiosInstance.delete(ApiRoutes.integrations.connection(id));
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to disconnect the account."));
    }
};

export const getGithubRepositories = async (connectionId: string, search?: string): Promise<GithubRepository[]> => {
    try {
        const response = await axiosInstance.get<GithubRepository[]>(ApiRoutes.integrations.github_repositories(connectionId), { params: { search: search || undefined } });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load GitHub repositories."));
    }
};

export const getLinearTeams = async (connectionId: string): Promise<LinearTeam[]> => {
    try {
        const response = await axiosInstance.get<LinearTeam[]>(ApiRoutes.integrations.linear_teams(connectionId));
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load Linear teams."));
    }
};

export const getLinearProjects = async (connectionId: string, teamId?: string | null): Promise<LinearProject[]> => {
    try {
        const response = await axiosInstance.get<LinearProject[]>(ApiRoutes.integrations.linear_projects(connectionId), { params: { team_id: teamId || undefined } });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load Linear projects."));
    }
};

export const getLinearIssues = async (connectionId: string, query: LinearIssuesQuery): Promise<LinearIssue[]> => {
    try {
        const response = await axiosInstance.get<LinearIssue[]>(ApiRoutes.integrations.linear_issues(connectionId), {
            params: {
                team_id: query.team_id || undefined,
                project_id: query.project_id || undefined,
                search: query.search || undefined,
                include_completed: query.include_completed ? "true" : undefined,
            },
        });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load Linear issues."));
    }
};

export const getLinearIssue = async (connectionId: string, issueId: string): Promise<LinearIssue> => {
    try {
        const response = await axiosInstance.get<LinearIssue>(ApiRoutes.integrations.linear_issue(connectionId, issueId));
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load the Linear issue."));
    }
};

export const getLinearTeamStates = async (connectionId: string, teamId: string): Promise<LinearWorkflowState[]> => {
    try {
        const response = await axiosInstance.get<LinearWorkflowState[]>(ApiRoutes.integrations.linear_team_states(connectionId, teamId));
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load Linear statuses."));
    }
};

export const getLinearTeamMembers = async (connectionId: string, teamId: string): Promise<LinearMember[]> => {
    try {
        const response = await axiosInstance.get<LinearMember[]>(ApiRoutes.integrations.linear_team_members(connectionId, teamId));
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load Linear team members."));
    }
};

export const updateLinearIssue = async ({ connectionId, issueId, ...dto }: UpdateLinearIssueDto & { connectionId: string; issueId: string }): Promise<LinearIssue> => {
    try {
        const response = await axiosInstance.patch<LinearIssue>(ApiRoutes.integrations.linear_issue(connectionId, issueId), dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update the Linear issue."));
    }
};

export const getNotionPages = async (connectionId: string, search?: string): Promise<NotionPage[]> => {
    try {
        const response = await axiosInstance.get<NotionPage[]>(ApiRoutes.integrations.notion_pages(connectionId), { params: { search: search || undefined } });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load Notion pages."));
    }
};

export const getNotionPage = async (connectionId: string, pageId: string): Promise<NotionPageContent> => {
    try {
        const response = await axiosInstance.get<NotionPageContent>(ApiRoutes.integrations.notion_page(connectionId, pageId));
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load the Notion page."));
    }
};

export const createNotionPage = async ({ connectionId, ...dto }: CreateNotionPageDto & { connectionId: string }): Promise<NotionPageContent> => {
    try {
        const response = await axiosInstance.post<NotionPageContent>(ApiRoutes.integrations.notion_pages(connectionId), dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to create the Notion page."));
    }
};

export const updateNotionPage = async ({ connectionId, pageId, ...dto }: UpdateNotionPageDto & { connectionId: string; pageId: string }): Promise<NotionPageContent> => {
    try {
        const response = await axiosInstance.patch<NotionPageContent>(ApiRoutes.integrations.notion_page(connectionId, pageId), dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to save the Notion page."));
    }
};

export const archiveNotionPage = async ({ connectionId, pageId }: { connectionId: string; pageId: string }): Promise<void> => {
    try {
        await axiosInstance.delete(ApiRoutes.integrations.notion_page(connectionId, pageId));
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to archive the Notion page."));
    }
};
