import type { AgentType, PackageManager } from "@shared/contract";

export const ServiceKinds = {
    FRONTEND: "FRONTEND",
    API: "API",
    WORKER: "WORKER",
    DATABASE: "DATABASE",
    STORYBOOK: "STORYBOOK",
    OTHER: "OTHER",
} as const;
export type ServiceKind = (typeof ServiceKinds)[keyof typeof ServiceKinds];

export const RepositoryProviders = {
    GITHUB: "GITHUB",
    GITLAB: "GITLAB",
    BITBUCKET: "BITBUCKET",
    OTHER: "OTHER",
} as const;
export type RepositoryProvider = (typeof RepositoryProviders)[keyof typeof RepositoryProviders];

export interface Repository {
    id: string;
    provider: RepositoryProvider;
    clone_url: string;
    full_name: string | null;
    default_branch: string | null;
    external_id: string | null;
    connection_id: string | null;
}

export interface ProjectService {
    id: string;
    project_id: string;
    name: string;
    kind: ServiceKind;
    cwd: string;
    package_manager: PackageManager | null;
    script: string | null;
    command: string | null;
    port: number | null;
    url: string | null;
    env: Record<string, string> | null;
    auto_detected: boolean;
    sort_order: number;
}

export interface Project {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    color: string;
    sort_order: number;
    sub_path: string | null;
    preferred_agent: AgentType | null;
    repository: Repository | null;
    github_connection_id: string | null;
    linear_connection_id: string | null;
    linear_team_id: string | null;
    linear_project_id: string | null;
    notion_connection_id: string | null;
    notion_root_page_id: string | null;
    last_activity_at: string | null;
    created_at: string;
    updated_at: string;
    services: ProjectService[];
}

export interface ServiceInput {
    name: string;
    kind?: ServiceKind;
    cwd?: string;
    package_manager?: PackageManager | null;
    script?: string | null;
    command?: string | null;
    port?: number | null;
    url?: string | null;
    env?: Record<string, string> | null;
    auto_detected?: boolean;
}

export interface RepositoryInput {
    clone_url: string;
    provider?: RepositoryProvider;
    full_name?: string | null;
    default_branch?: string | null;
    external_id?: string | null;
    connection_id?: string | null;
}

export interface CreateProjectDto {
    name: string;
    color?: string;
    description?: string | null;
    sub_path?: string | null;
    repository?: RepositoryInput | null;
    github_connection_id?: string | null;
    services?: ServiceInput[];
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> {
    preferred_agent?: AgentType | null;
    linear_connection_id?: string | null;
    linear_team_id?: string | null;
    linear_project_id?: string | null;
    notion_connection_id?: string | null;
    notion_root_page_id?: string | null;
}

export interface ProjectIssueLink {
    id: string;
    project_id: string;
    provider: string;
    external_id: string;
    key: string | null;
    title: string | null;
    created_at: string;
}

export interface LinkProjectIssueDto {
    provider: string;
    external_id: string;
    key?: string | null;
    title?: string | null;
}
