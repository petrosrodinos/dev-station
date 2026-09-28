import { ProjectTabOptions } from "@/config/constants/dropdowns/projects/project-tab.options";
import { Routes } from "@/routes/routes";

const PROJECT_PATH_RE = /^\/workspace\/projects\/[^/]+\/([^/?#]+)/;

/** Route for a project that keeps the tab open in `pathname` (falls back to the overview outside a project tab). */
export const projectRouteKeepingTab = (projectId: string, pathname: string) => {
    const tab = PROJECT_PATH_RE.exec(pathname)?.[1];
    const match = ProjectTabOptions.find((t) => t.id === tab);
    return match ? Routes.workspace.project_tab(projectId, match.id) : Routes.workspace.project(projectId);
};
