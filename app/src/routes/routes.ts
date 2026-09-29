import type { ProjectIntegration } from "@/config/constants/dropdowns/projects/project-integration.options";
import type { ProjectTab } from "@/config/constants/dropdowns/projects/project-tab.options";
import type { SettingsSection } from "@/config/constants/dropdowns/settings/settings-section.options";

/** Every frontend path. Never hardcode URLs elsewhere. */
export const Routes = {
    root: "/",
    auth: {
        root: "/auth",
        sign_in: "/auth/sign-in",
        sign_up: "/auth/sign-up",
    },
    invitations: {
        accept: (token: string) => `/invite?token=${encodeURIComponent(token)}`,
    },
    /** Bare window a floated dock panel opens into (docking system §C) — no shell chrome. */
    floating: "/floating",
    /** Hidden admin console — never linked from nav; reachable only by direct URL. */
    admin: {
        login: "/ops-console-7f2a",
        root: "/ops-console-7f2a/dashboard",
        overview: "/ops-console-7f2a/dashboard/overview",
        users: "/ops-console-7f2a/dashboard/users",
        releases: "/ops-console-7f2a/dashboard/releases",
    },
    workspace: {
        root: "/workspace",
        project: (id: string) => `/workspace/projects/${id}`,
        project_tab: (id: string, tab: ProjectTab) => `/workspace/projects/${id}/${tab}`,
        project_setup: (id: string) => `/workspace/projects/${id}/setup`,
        project_integration: (id: string, integration: ProjectIntegration) => `/workspace/projects/${id}/integrations?integration=${integration}`,
        project_linear_issue: (id: string, issueId: string) => `/workspace/projects/${id}/integrations?integration=linear&issue=${encodeURIComponent(issueId)}`,
        project_git_file: (id: string, path: string) => `/workspace/projects/${id}/git?file=${encodeURIComponent(path)}`,
        imported: "/workspace/imported",
        integrations: "/workspace/settings/integrations",
        settings: "/workspace/settings",
        settings_section: (section: SettingsSection) => `/workspace/settings/${section}`,
    },
};

/** Route definitions (relative segments) used by <Route path>. */
export const RoutePatterns = {
    auth: "/auth",
    sign_in: "sign-in",
    sign_up: "sign-up",
    invite: "/invite",
    floating: "/floating",
    admin_login: "/ops-console-7f2a",
    admin_dashboard: "/ops-console-7f2a/dashboard",
    admin_overview: "overview",
    admin_users: "users",
    admin_releases: "releases",
    workspace: "/workspace",
    project: "projects/:projectId",
    project_tab: ":tab",
    project_setup: "setup",
    imported: "imported",
    settings: "settings",
    settings_section: "settings/:section",
};
