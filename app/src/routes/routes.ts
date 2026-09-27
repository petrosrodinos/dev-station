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
    workspace: {
        root: "/workspace",
        project: (id: string) => `/workspace/projects/${id}`,
        project_tab: (id: string, tab: ProjectTab) => `/workspace/projects/${id}/${tab}`,
        project_setup: (id: string) => `/workspace/projects/${id}/setup`,
        project_linear_issue: (id: string, issueId: string) => `/workspace/projects/${id}/linear?issue=${encodeURIComponent(issueId)}`,
        project_git_file: (id: string, path: string) => `/workspace/projects/${id}/git?file=${encodeURIComponent(path)}`,
        imported: "/workspace/imported",
        integrations: "/workspace/integrations",
        settings: "/workspace/settings",
        settings_section: (section: SettingsSection) => `/workspace/settings/${section}`,
        organization: "/workspace/organization",
    },
};

/** Route definitions (relative segments) used by <Route path>. */
export const RoutePatterns = {
    auth: "/auth",
    sign_in: "sign-in",
    sign_up: "sign-up",
    invite: "/invite",
    workspace: "/workspace",
    project: "projects/:projectId",
    project_tab: ":tab",
    project_setup: "setup",
    imported: "imported",
    integrations: "integrations",
    settings: "settings",
    settings_section: "settings/:section",
    organization: "organization",
};
