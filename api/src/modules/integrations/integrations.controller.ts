import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IntegrationProvider, PermissionKey } from 'generated/prisma';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrganizationGuard } from '@/shared/guards/organization.guard';
import { RequirePermissions } from '@/shared/decorators/access.decorator';
import { CurrentMembership } from '@/shared/decorators/current-membership.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ExternalIdValidationPipe } from '@/shared/pipes/external-id.validation.pipe';
import { ORGANIZATION_HEADER } from '@/shared/constants/headers';
import { IntegrationsService } from './integrations.service';
import { GithubIntegrationService } from './services/github-integration.service';
import { LinearIntegrationService } from './services/linear-integration.service';
import { NotionIntegrationService } from './services/notion-integration.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { UpdateLinearIssueDto } from './dto/update-linear-issue.dto';
import {
  GithubRepositoriesQuerySchema,
  GithubRepositoriesQueryType,
  LinearIssuesQuerySchema,
  LinearIssuesQueryType,
  LinearProjectsQuerySchema,
  LinearProjectsQueryType,
  NotionPagesQuerySchema,
  NotionPagesQueryType,
} from './dto/integrations-query.schema';
import {
  ConnectionEntity,
  GithubRepositoryEntity,
  InitiatedConnectionEntity,
  IntegrationEntity,
  LinearProjectEntity,
  LinearTeamEntity,
  NotionPageContentEntity,
  NotionPageEntity,
} from './entities/integration.entity';

@ApiTags('Integrations')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('integrations')
@UseGuards(JwtGuard, OrganizationGuard)
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly github: GithubIntegrationService,
    private readonly linear: LinearIntegrationService,
    private readonly notion: NotionIntegrationService,
  ) {}

  @Get()
  @RequirePermissions(PermissionKey.INTEGRATIONS_VIEW)
  @ApiOperation({ summary: 'Integration catalog with connected accounts' })
  @ApiResponse({ status: 200, type: IntegrationEntity, isArray: true })
  findCatalog(@CurrentMembership('organization_id') organizationId: string) {
    return this.integrationsService.findCatalog(organizationId);
  }

  @Post(':provider/connections')
  @RequirePermissions(PermissionKey.INTEGRATIONS_CONNECT)
  @ApiOperation({
    summary: 'Start connecting an account (returns the OAuth URL to open)',
  })
  @ApiResponse({ status: 201, type: InitiatedConnectionEntity })
  initiate(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('provider', new ParseEnumPipe(IntegrationProvider))
    provider: IntegrationProvider,
    @Body() dto: CreateConnectionDto,
  ) {
    return this.integrationsService.initiate(
      organizationId,
      userId,
      provider,
      dto,
    );
  }

  @Post('connections/:id/refresh')
  @RequirePermissions(PermissionKey.INTEGRATIONS_VIEW)
  @ApiOperation({ summary: 'Re-read the connection status from Composio' })
  @ApiResponse({ status: 201, type: ConnectionEntity })
  refresh(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.integrationsService.refresh(organizationId, id);
  }

  @Patch('connections/:id')
  @RequirePermissions(PermissionKey.INTEGRATIONS_MANAGE)
  @ApiOperation({
    summary: 'Rename a connection or make it the default account',
  })
  @ApiResponse({ status: 200, type: ConnectionEntity })
  update(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConnectionDto,
  ) {
    return this.integrationsService.update(organizationId, id, dto);
  }

  @Delete('connections/:id')
  @RequirePermissions(PermissionKey.INTEGRATIONS_DISCONNECT)
  @ApiOperation({ summary: 'Disconnect an account' })
  remove(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.integrationsService.remove(organizationId, userId, id);
  }

  @Get('github/:connectionId/repositories')
  @RequirePermissions(PermissionKey.PROJECTS_VIEW)
  @ApiOperation({ summary: 'Repositories of a connected GitHub account' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiResponse({ status: 200, type: GithubRepositoryEntity, isArray: true })
  async githubRepositories(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @Query(new ZodValidationPipe(GithubRepositoriesQuerySchema))
    query: GithubRepositoriesQueryType,
  ) {
    const connection = await this.integrationsService.getActiveConnection(
      organizationId,
      connectionId,
      IntegrationProvider.GITHUB,
    );
    return this.github.listRepositories(connection, query);
  }

  @Get('linear/:connectionId/teams')
  @RequirePermissions(PermissionKey.PROJECTS_VIEW)
  @ApiOperation({ summary: 'Linear teams' })
  @ApiResponse({ status: 200, type: LinearTeamEntity, isArray: true })
  async linearTeams(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
  ) {
    const connection = await this.integrationsService.getActiveConnection(
      organizationId,
      connectionId,
      IntegrationProvider.LINEAR,
    );
    return this.linear.listTeams(connection);
  }

  @Get('linear/:connectionId/projects')
  @RequirePermissions(PermissionKey.PROJECTS_VIEW)
  @ApiOperation({ summary: 'Linear projects' })
  @ApiQuery({ name: 'team_id', required: false })
  @ApiResponse({ status: 200, type: LinearProjectEntity, isArray: true })
  async linearProjects(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @Query(new ZodValidationPipe(LinearProjectsQuerySchema))
    query: LinearProjectsQueryType,
  ) {
    const connection = await this.integrationsService.getActiveConnection(
      organizationId,
      connectionId,
      IntegrationProvider.LINEAR,
    );
    return this.linear.listProjects(connection, query);
  }

  @Get('linear/:connectionId/issues')
  @RequirePermissions(PermissionKey.PROJECTS_VIEW)
  @ApiOperation({ summary: 'Linear issues (open by default)' })
  @ApiQuery({ name: 'team_id', required: false })
  @ApiQuery({ name: 'project_id', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'include_completed', required: false })
  async linearIssues(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @Query(new ZodValidationPipe(LinearIssuesQuerySchema))
    query: LinearIssuesQueryType,
  ) {
    const connection = await this.integrationsService.getActiveConnection(
      organizationId,
      connectionId,
      IntegrationProvider.LINEAR,
    );
    return this.linear.listIssues(connection, query);
  }

  @Get('linear/:connectionId/issues/:issueId')
  @RequirePermissions(PermissionKey.PROJECTS_VIEW)
  @ApiOperation({ summary: 'Linear issue with comments' })
  async linearIssue(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @Param('issueId', ExternalIdValidationPipe) issueId: string,
  ) {
    const connection = await this.integrationsService.getActiveConnection(
      organizationId,
      connectionId,
      IntegrationProvider.LINEAR,
    );
    return this.linear.getIssue(connection, issueId);
  }

  @Get('linear/:connectionId/teams/:teamId/states')
  @RequirePermissions(PermissionKey.PROJECTS_VIEW)
  @ApiOperation({ summary: 'Workflow states of a Linear team' })
  async linearTeamStates(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @Param('teamId', ExternalIdValidationPipe) teamId: string,
  ) {
    const connection = await this.integrationsService.getActiveConnection(
      organizationId,
      connectionId,
      IntegrationProvider.LINEAR,
    );
    return this.linear.listTeamStates(connection, teamId);
  }

  @Get('linear/:connectionId/teams/:teamId/members')
  @RequirePermissions(PermissionKey.PROJECTS_VIEW)
  @ApiOperation({ summary: 'Members of a Linear team (assignee candidates)' })
  async linearTeamMembers(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @Param('teamId', ExternalIdValidationPipe) teamId: string,
  ) {
    const connection = await this.integrationsService.getActiveConnection(
      organizationId,
      connectionId,
      IntegrationProvider.LINEAR,
    );
    return this.linear.listTeamMembers(connection, teamId);
  }

  @Patch('linear/:connectionId/issues/:issueId')
  @RequirePermissions(PermissionKey.PROJECTS_EDIT)
  @ApiOperation({
    summary: 'Update a Linear issue (status, assignee, priority, title, description)',
  })
  async updateLinearIssue(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @Param('issueId', ExternalIdValidationPipe) issueId: string,
    @Body() dto: UpdateLinearIssueDto,
  ) {
    const connection = await this.integrationsService.getActiveConnection(
      organizationId,
      connectionId,
      IntegrationProvider.LINEAR,
    );
    return this.linear.updateIssue(connection, issueId, dto);
  }

  @Get('notion/:connectionId/pages')
  @RequirePermissions(PermissionKey.PROJECTS_VIEW)
  @ApiOperation({ summary: 'Search Notion pages and databases' })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, type: NotionPageEntity, isArray: true })
  async notionPages(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @Query(new ZodValidationPipe(NotionPagesQuerySchema))
    query: NotionPagesQueryType,
  ) {
    const connection = await this.integrationsService.getActiveConnection(
      organizationId,
      connectionId,
      IntegrationProvider.NOTION,
    );
    return this.notion.searchPages(connection, query);
  }

  @Get('notion/:connectionId/pages/:pageId')
  @RequirePermissions(PermissionKey.PROJECTS_VIEW)
  @ApiOperation({ summary: 'Notion page content as markdown' })
  @ApiResponse({ status: 200, type: NotionPageContentEntity })
  async notionPage(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @Param('pageId', ExternalIdValidationPipe) pageId: string,
  ) {
    const connection = await this.integrationsService.getActiveConnection(
      organizationId,
      connectionId,
      IntegrationProvider.NOTION,
    );
    return this.notion.getPage(connection, pageId);
  }
}
