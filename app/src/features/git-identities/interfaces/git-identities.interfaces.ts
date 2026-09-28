export interface GitIdentity {
    id: string;
    label: string;
    name: string;
    email: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateGitIdentityDto {
    label: string;
    name: string;
    email: string;
    is_default?: boolean;
}

export type UpdateGitIdentityDto = Partial<CreateGitIdentityDto>;
