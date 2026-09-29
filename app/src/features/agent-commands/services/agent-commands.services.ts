import axiosInstance, { getApiErrorMessage } from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type { AgentCommand, CreateAgentCommandDto, UpdateAgentCommandDto } from "../interfaces/agent-commands.interfaces";

export const getAgentCommands = async (): Promise<AgentCommand[]> => {
    try {
        const response = await axiosInstance.get<AgentCommand[]>(ApiRoutes.agentCommands.prefix);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load agent commands."));
    }
};

export const createAgentCommand = async (dto: CreateAgentCommandDto): Promise<AgentCommand> => {
    try {
        const response = await axiosInstance.post<AgentCommand>(ApiRoutes.agentCommands.prefix, dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to create the command."));
    }
};

export const updateAgentCommand = async ({ id, ...dto }: UpdateAgentCommandDto & { id: string }): Promise<AgentCommand> => {
    try {
        const response = await axiosInstance.patch<AgentCommand>(ApiRoutes.agentCommands.byId(id), dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update the command."));
    }
};

export const deleteAgentCommand = async (id: string): Promise<void> => {
    try {
        await axiosInstance.delete(ApiRoutes.agentCommands.byId(id));
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to delete the command."));
    }
};
