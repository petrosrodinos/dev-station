export const ApiRoutes = {
    health: {
        prefix: "/health",
    },
    auth: {
        email: {
            login: "/auth/email/login",
            register: "/auth/email/register",
            refresh_token: "/auth/email/refresh-token",
        },
    },
    users: {
        me: "/users/me",
        preferences: "/users/me/preferences",
    },
    organizations: {
        prefix: "/organizations",
        current: "/organizations/current",
        members: "/organizations/current/members",
        member: (memberId: string) => `/organizations/current/members/${memberId}`,
        invitations: "/organizations/current/invitations",
        invitation: (id: string) => `/organizations/current/invitations/${id}`,
        accept_invitation: "/organizations/invitations/accept",
        roles: "/organizations/current/roles",
        role: (id: string) => `/organizations/current/roles/${id}`,
        permissions: "/organizations/permissions",
    },
    clients: {
        prefix: "/clients",
        by_id: (id: string) => `/clients/${id}`,
    },
    projects: {
        prefix: "/projects",
        by_id: (id: string) => `/projects/${id}`,
        reorder: "/projects/reorder",
        services: (id: string) => `/projects/${id}/services`,
        issues: (id: string) => `/projects/${id}/issues`,
    },
    integrations: {
        prefix: "/integrations",
        connect: (provider: string) => `/integrations/${provider}/connections`,
        connection: (id: string) => `/integrations/connections/${id}`,
        refresh_connection: (id: string) => `/integrations/connections/${id}/refresh`,
        github_repositories: (connectionId: string) => `/integrations/github/${connectionId}/repositories`,
        linear_teams: (connectionId: string) => `/integrations/linear/${connectionId}/teams`,
        linear_projects: (connectionId: string) => `/integrations/linear/${connectionId}/projects`,
        linear_issues: (connectionId: string) => `/integrations/linear/${connectionId}/issues`,
        linear_issue: (connectionId: string, issueId: string) => `/integrations/linear/${connectionId}/issues/${issueId}`,
        notion_pages: (connectionId: string) => `/integrations/notion/${connectionId}/pages`,
        notion_page: (connectionId: string, pageId: string) => `/integrations/notion/${connectionId}/pages/${pageId}`,
    },
    agents: {
        prefix: "/agents",
    },
    agent_sessions: {
        prefix: "/agent-sessions",
        by_id: (id: string) => `/agent-sessions/${id}`,
    },
    activities: {
        prefix: "/activities",
    },
};
