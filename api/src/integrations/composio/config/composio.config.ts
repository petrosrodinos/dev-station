import { IntegrationProvider } from 'generated/prisma';

export const ComposioConfig = {
  base_url: 'https://backend.composio.dev/api/v3.1',
  timeout_ms: 30000,
} as const;

/** Composio toolkit slug per provider. */
export const ComposioToolkits: Record<IntegrationProvider, string> = {
  [IntegrationProvider.GITHUB]: 'github',
  [IntegrationProvider.LINEAR]: 'linear',
  [IntegrationProvider.NOTION]: 'notion',
  [IntegrationProvider.SLACK]: 'slack',
};

/** Env var holding a pre-created auth config id per provider (optional — otherwise one is found/created). */
export const ComposioAuthConfigEnv: Partial<
  Record<IntegrationProvider, string>
> = {
  [IntegrationProvider.GITHUB]: 'COMPOSIO_AUTH_CONFIG_GITHUB',
  [IntegrationProvider.LINEAR]: 'COMPOSIO_AUTH_CONFIG_LINEAR',
  [IntegrationProvider.NOTION]: 'COMPOSIO_AUTH_CONFIG_NOTION',
};

export const ComposioTools = {
  GITHUB_LIST_REPOSITORIES:
    'GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER',
  GITHUB_GET_AUTHENTICATED_USER: 'GITHUB_GET_THE_AUTHENTICATED_USER',
  LINEAR_GRAPHQL: 'LINEAR_RUN_QUERY_OR_MUTATION',
  NOTION_SEARCH: 'NOTION_SEARCH_NOTION_PAGE',
  NOTION_PAGE_MARKDOWN: 'NOTION_GET_PAGE_MARKDOWN',
  NOTION_RETRIEVE_PAGE: 'NOTION_RETRIEVE_PAGE',
  NOTION_CREATE_PAGE: 'NOTION_CREATE_NOTION_PAGE',
  NOTION_UPDATE_PAGE: 'NOTION_UPDATE_PAGE',
  NOTION_ARCHIVE_PAGE: 'NOTION_ARCHIVE_NOTION_PAGE',
} as const;
