import { Injectable } from '@nestjs/common';
import { ComposioService } from '@/integrations/composio/services/composio.service';
import { ComposioTools } from '@/integrations/composio/config/composio.config';
import {
  findArray,
  findObjectWithKey,
} from '@/integrations/composio/utils/composio.utils';
import { GithubRepositoriesQueryType } from '../dto/integrations-query.schema';
import {
  ActiveConnection,
  GithubRepository,
} from '../interfaces/integrations.interface';

const PAGE_SIZE = 100;

@Injectable()
export class GithubIntegrationService {
  constructor(private readonly composio: ComposioService) {}

  async getAccountName(connection: ActiveConnection): Promise<string | null> {
    const data = await this.composio.executeTool({
      tool: ComposioTools.GITHUB_GET_AUTHENTICATED_USER,
      connected_account_id: connection.composio_account_id,
      user_id: connection.composio_user_id,
      arguments: {},
    });
    return findObjectWithKey<{ login?: string }>(data, 'login')?.login ?? null;
  }

  async listRepositories(
    connection: ActiveConnection,
    query: GithubRepositoriesQueryType,
  ): Promise<GithubRepository[]> {
    const data = await this.composio.executeTool({
      tool: ComposioTools.GITHUB_LIST_REPOSITORIES,
      connected_account_id: connection.composio_account_id,
      user_id: connection.composio_user_id,
      arguments: { per_page: PAGE_SIZE, page: query.page, sort: 'updated' },
    });

    const repositories = findArray<Record<string, any>>(data, [
      'repositories',
      'items',
      'repos',
    ]).map(
      (repo): GithubRepository => ({
        id: String(repo.id ?? repo.node_id ?? repo.full_name),
        name: repo.name,
        full_name: repo.full_name,
        clone_url: repo.clone_url ?? `https://github.com/${repo.full_name}.git`,
        ssh_url: repo.ssh_url ?? null,
        default_branch: repo.default_branch ?? null,
        private: Boolean(repo.private),
        description: repo.description ?? null,
        updated_at: repo.pushed_at ?? repo.updated_at ?? null,
      }),
    );

    const search = query.search?.toLowerCase();
    return search
      ? repositories.filter((r) => r.full_name?.toLowerCase().includes(search))
      : repositories;
  }
}
