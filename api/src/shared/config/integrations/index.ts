import { IntegrationProvider } from 'generated/prisma';

/**
 * Integrations offered in the app. Adding a Composio-backed provider = a Prisma enum value, an entry here,
 * a toolkit slug in `integrations/composio/config`, and (optionally) a provider service for its data.
 */
export const IntegrationCatalog: {
  provider: IntegrationProvider;
  name: string;
  description: string;
  capabilities: string[];
  supported: boolean;
}[] = [
  {
    provider: IntegrationProvider.GITHUB,
    name: 'GitHub',
    description: 'Repositories, cloning and account selection per project',
    capabilities: ['repositories.list', 'repositories.clone'],
    supported: true,
  },
  {
    provider: IntegrationProvider.LINEAR,
    name: 'Linear',
    description: 'Teams, projects and issues — hand issues to AI agents',
    capabilities: ['teams.list', 'projects.list', 'issues.list', 'issues.read'],
    supported: true,
  },
  {
    provider: IntegrationProvider.NOTION,
    name: 'Notion',
    description: 'Project documentation and knowledge as agent context',
    capabilities: ['pages.search', 'pages.read'],
    supported: true,
  },
  {
    provider: IntegrationProvider.SLACK,
    name: 'Slack',
    description: 'Team notifications (coming soon)',
    capabilities: [],
    supported: false,
  },
];
