export interface Client {
    id: string;
    organization_id: string;
    name: string;
    color: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface CreateClientDto {
    name: string;
    color?: string;
}

export type UpdateClientDto = Partial<CreateClientDto>;
