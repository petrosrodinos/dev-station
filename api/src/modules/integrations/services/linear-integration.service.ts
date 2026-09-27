import { Injectable, NotFoundException } from '@nestjs/common';
import { ComposioService } from '@/integrations/composio/services/composio.service';
import { ComposioTools } from '@/integrations/composio/config/composio.config';
import { findObjectWithKey } from '@/integrations/composio/utils/composio.utils';
import {
  LinearIssuesQueryType,
  LinearProjectsQueryType,
} from '../dto/integrations-query.schema';
import {
  ActiveConnection,
  LinearIssue,
} from '../interfaces/integrations.interface';
import {
  LINEAR_ISSUE_QUERY,
  LINEAR_ISSUES_QUERY,
  LINEAR_PROJECTS_QUERY,
  LINEAR_TEAMS_QUERY,
  LINEAR_VIEWER_QUERY,
} from '../utils/linear-queries.utils';

const ISSUES_LIMIT = 100;

@Injectable()
export class LinearIntegrationService {
  constructor(private readonly composio: ComposioService) {}

  async getAccountName(connection: ActiveConnection): Promise<string | null> {
    const data = await this.graphql<{
      viewer?: { name?: string; email?: string };
      organization?: { name?: string };
    }>(connection, LINEAR_VIEWER_QUERY, {}, 'viewer');
    const who = data.viewer?.email ?? data.viewer?.name;
    return [data.organization?.name, who].filter(Boolean).join(' · ') || null;
  }

  async listTeams(connection: ActiveConnection) {
    const data = await this.graphql<{
      teams: { nodes: { id: string; key: string; name: string }[] };
    }>(connection, LINEAR_TEAMS_QUERY, {}, 'teams');
    return data.teams?.nodes ?? [];
  }

  async listProjects(
    connection: ActiveConnection,
    query: LinearProjectsQueryType,
  ) {
    const filter = query.team_id
      ? { accessibleTeams: { id: { eq: query.team_id } } }
      : undefined;
    const data = await this.graphql<{
      projects: { nodes: { id: string; name: string; state?: string }[] };
    }>(connection, LINEAR_PROJECTS_QUERY, { filter }, 'projects');
    return (data.projects?.nodes ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      state: p.state ?? null,
    }));
  }

  async listIssues(
    connection: ActiveConnection,
    query: LinearIssuesQueryType,
  ): Promise<LinearIssue[]> {
    const filter: Record<string, unknown> = {};
    if (query.team_id) filter.team = { id: { eq: query.team_id } };
    if (query.project_id) filter.project = { id: { eq: query.project_id } };
    if (!query.include_completed)
      filter.state = { type: { nin: ['completed', 'canceled'] } };
    if (query.search) filter.title = { containsIgnoreCase: query.search };

    const data = await this.graphql<{
      issues: { nodes: Record<string, any>[] };
    }>(
      connection,
      LINEAR_ISSUES_QUERY,
      { filter, first: ISSUES_LIMIT },
      'issues',
    );
    return (data.issues?.nodes ?? []).map((node) => this.toIssue(node));
  }

  async getIssue(
    connection: ActiveConnection,
    issueId: string,
  ): Promise<LinearIssue> {
    const data = await this.graphql<{ issue: Record<string, any> | null }>(
      connection,
      LINEAR_ISSUE_QUERY,
      { id: issueId },
      'issue',
    );
    if (!data.issue) throw new NotFoundException('Linear issue not found');
    return this.toIssue(data.issue, true);
  }

  private async graphql<T>(
    connection: ActiveConnection,
    query: string,
    variables: Record<string, unknown>,
    rootKey: string,
  ): Promise<T> {
    const payload = await this.composio.executeTool({
      tool: ComposioTools.LINEAR_GRAPHQL,
      connected_account_id: connection.composio_account_id,
      user_id: connection.composio_user_id,
      arguments: { query_or_mutation: query, variables },
    });
    return findObjectWithKey<T>(payload, rootKey) ?? ({} as T);
  }

  private toIssue(
    node: Record<string, any>,
    withComments = false,
  ): LinearIssue {
    return {
      id: node.id,
      identifier: node.identifier,
      title: node.title,
      description: node.description ?? null,
      priority: node.priority ?? 0,
      priority_label: node.priorityLabel ?? 'No priority',
      url: node.url,
      state: node.state ?? null,
      assignee: node.assignee
        ? {
            id: node.assignee.id,
            name: node.assignee.name,
            avatar_url: node.assignee.avatarUrl ?? null,
          }
        : null,
      labels: node.labels?.nodes ?? [],
      team: node.team ?? null,
      project: node.project ?? null,
      created_at: node.createdAt,
      updated_at: node.updatedAt,
      ...(withComments && {
        comments: (node.comments?.nodes ?? []).map(
          (c: Record<string, any>) => ({
            id: c.id,
            body: c.body,
            created_at: c.createdAt,
            user: c.user
              ? {
                  id: c.user.id,
                  name: c.user.name,
                  avatar_url: c.user.avatarUrl ?? null,
                }
              : null,
          }),
        ),
      }),
    };
  }
}
