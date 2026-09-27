export const IntegrationProviders = {
    GITHUB: "GITHUB",
    LINEAR: "LINEAR",
    NOTION: "NOTION",
    SLACK: "SLACK",
} as const;
export type IntegrationProvider = (typeof IntegrationProviders)[keyof typeof IntegrationProviders];

export const ConnectionStatuses = {
    INITIATED: "INITIATED",
    ACTIVE: "ACTIVE",
    FAILED: "FAILED",
    EXPIRED: "EXPIRED",
    DISCONNECTED: "DISCONNECTED",
} as const;
export type ConnectionStatus = (typeof ConnectionStatuses)[keyof typeof ConnectionStatuses];

export interface IntegrationConnection {
    id: string;
    provider: IntegrationProvider;
    label: string;
    external_account: string | null;
    status: ConnectionStatus;
    is_default: boolean;
    created_at: string;
    user: { id: string; full_name: string | null; email: string } | null;
}

export interface Integration {
    provider: IntegrationProvider;
    name: string;
    description: string;
    /** Supported by this Dev Station version (false = coming soon). */
    supported: boolean;
    /** Composio is configured on the server. */
    available: boolean;
    capabilities: string[];
    connections: IntegrationConnection[];
}

export interface InitiateConnectionResponse {
    connection: IntegrationConnection;
    redirect_url: string | null;
}

export interface GithubRepository {
    id: string;
    full_name: string;
    name: string;
    clone_url: string;
    ssh_url: string | null;
    default_branch: string | null;
    private: boolean;
    description: string | null;
    updated_at: string | null;
}

export interface LinearTeam {
    id: string;
    key: string;
    name: string;
}

export interface LinearProject {
    id: string;
    name: string;
    state: string | null;
}

export interface LinearIssueComment {
    id: string;
    body: string;
    user: { id: string; name: string } | null;
    created_at: string;
}

export interface LinearIssue {
    id: string;
    identifier: string;
    title: string;
    description: string | null;
    priority: number;
    priority_label: string | null;
    url: string | null;
    state: { id: string; name: string; type: string; color: string | null } | null;
    assignee: { id: string; name: string; avatar_url: string | null } | null;
    labels: { id: string; name: string; color: string | null }[];
    team: { id: string; key: string; name: string } | null;
    project: { id: string; name: string } | null;
    created_at: string;
    updated_at: string;
    comments?: LinearIssueComment[];
}

export interface LinearIssuesQuery {
    team_id?: string | null;
    project_id?: string | null;
    search?: string;
    include_completed?: boolean;
}

export interface NotionPage {
    id: string;
    title: string;
    url: string | null;
    last_edited_time: string | null;
    object: string;
}

export interface NotionPageContent {
    id: string;
    title: string;
    url: string | null;
    markdown: string;
}
