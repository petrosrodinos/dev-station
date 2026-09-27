import axiosInstance, { getApiErrorMessage } from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type { Client, CreateClientDto, UpdateClientDto } from "../interfaces/clients.interfaces";

export const getClients = async (): Promise<Client[]> => {
    try {
        const response = await axiosInstance.get<Client[]>(ApiRoutes.clients.prefix);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load clients."));
    }
};

export const createClient = async (dto: CreateClientDto): Promise<Client> => {
    try {
        const response = await axiosInstance.post<Client>(ApiRoutes.clients.prefix, dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to create the client."));
    }
};

export const updateClient = async ({ id, ...dto }: UpdateClientDto & { id: string }): Promise<Client> => {
    try {
        const response = await axiosInstance.patch<Client>(ApiRoutes.clients.by_id(id), dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update the client."));
    }
};

export const deleteClient = async (id: string): Promise<void> => {
    try {
        await axiosInstance.delete(ApiRoutes.clients.by_id(id));
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to delete the client."));
    }
};
