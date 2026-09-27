import axiosInstance, { getApiErrorMessage } from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
    AgentCatalogItem,
    AgentSession,
    AgentSessionsQuery,
    AgentSessionsResponse,
    CreateAgentSessionDto,
    UpdateAgentSessionDto,
} from "../interfaces/agent-sessions.interfaces";

export const getAgentSessions = async (query: AgentSessionsQuery): Promise<AgentSessionsResponse> => {
    try {
        const response = await axiosInstance.get<AgentSessionsResponse>(ApiRoutes.agent_sessions.prefix, { params: query });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load AI sessions."));
    }
};

export const createAgentSession = async (dto: CreateAgentSessionDto): Promise<AgentSession> => {
    try {
        const response = await axiosInstance.post<AgentSession>(ApiRoutes.agent_sessions.prefix, dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to create the AI session."));
    }
};

export const updateAgentSession = async ({ id, ...dto }: UpdateAgentSessionDto & { id: string }): Promise<AgentSession> => {
    try {
        const response = await axiosInstance.patch<AgentSession>(ApiRoutes.agent_sessions.by_id(id), dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update the AI session."));
    }
};

export const getAgentCatalog = async (): Promise<AgentCatalogItem[]> => {
    try {
        const response = await axiosInstance.get<AgentCatalogItem[]>(ApiRoutes.agents.prefix);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load agents."));
    }
};
