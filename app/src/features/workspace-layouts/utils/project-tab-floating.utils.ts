export const PROJECT_TAB_FLOATING_COMPONENT = "project-tab";

const PREFIX = PROJECT_TAB_FLOATING_COMPONENT;

export const projectTabFloatingPanelId = (projectId: string, tab: string) => `${PREFIX}:${projectId}:${tab}`;

export const parseProjectTabFloatingPanelId = (panelId: string) => {
  const [prefix, projectId, tab] = panelId.split(":");
  return prefix === PREFIX && projectId && tab ? { projectId, tab } : null;
};
