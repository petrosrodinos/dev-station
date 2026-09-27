import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
import { PermissionKey } from 'generated/prisma';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrganizationGuard } from '@/shared/guards/organization.guard';
import { RequirePermissions } from '@/shared/decorators/require-permissions.decorator';
import { CurrentMembership } from '@/shared/decorators/current-membership.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ORGANIZATION_HEADER } from '@/shared/constants/headers';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ReorderProjectsDto } from './dto/reorder-projects.dto';
import { ReplaceServicesDto } from './dto/replace-services.dto';
import { LinkIssueDto } from './dto/link-issue.dto';
import {
  ProjectsQuerySchema,
  ProjectsQueryType,
} from './dto/projects-query.schema';
import { ProjectEntity, ProjectIssueEntity } from './entities/project.entity';

@ApiTags('Projects')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('projects')
@UseGuards(JwtGuard, OrganizationGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermissions(PermissionKey.PROJECTS_VIEW)
  @ApiOperation({ summary: 'All projects of the organization, in rail order' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'client_id', required: false })
  @ApiResponse({ status: 200, type: ProjectEntity, isArray: true })
  findAll(
    @CurrentMembership('organization_id') organizationId: string,
    @Query(new ZodValidationPipe(ProjectsQuerySchema)) query: ProjectsQueryType,
  ) {
    return this.projectsService.findAll(organizationId, query);
  }

  @Post('reorder')
  @RequirePermissions(PermissionKey.PROJECTS_EDIT)
  @ApiOperation({ summary: 'Persist the rail order of projects' })
  @ApiResponse({ status: 201, type: ProjectEntity, isArray: true })
  reorder(
    @CurrentMembership('organization_id') organizationId: string,
    @Body() dto: ReorderProjectsDto,
  ) {
    return this.projectsService.reorder(organizationId, dto.ids);
  }

  @Get(':id')
  @RequirePermissions(PermissionKey.PROJECTS_VIEW)
  @ApiOperation({ summary: 'Get a project' })
  @ApiResponse({ status: 200, type: ProjectEntity })
  findOne(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.findOne(organizationId, id);
  }

  @Post()
  @RequirePermissions(PermissionKey.PROJECTS_CREATE)
  @ApiOperation({
    summary: 'Create a project (optionally with repository and services)',
  })
  @ApiResponse({ status: 201, type: ProjectEntity })
  create(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(organizationId, userId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.PROJECTS_EDIT)
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({ status: 200, type: ProjectEntity })
  update(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PermissionKey.PROJECTS_DELETE)
  @ApiOperation({ summary: 'Delete a project' })
  remove(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.remove(organizationId, id);
  }

  @Put(':id/services')
  @RequirePermissions(PermissionKey.PROJECTS_EDIT)
  @ApiOperation({ summary: 'Replace all service definitions of a project' })
  @ApiResponse({ status: 200, type: ProjectEntity })
  replaceServices(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceServicesDto,
  ) {
    return this.projectsService.replaceServices(
      organizationId,
      id,
      dto.services,
    );
  }

  @Get(':id/issues')
  @RequirePermissions(PermissionKey.PROJECTS_VIEW)
  @ApiOperation({ summary: 'Issues linked to a project' })
  @ApiResponse({ status: 200, type: ProjectIssueEntity, isArray: true })
  findIssues(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.findIssues(organizationId, id);
  }

  @Post(':id/issues')
  @RequirePermissions(PermissionKey.PROJECTS_EDIT)
  @ApiOperation({ summary: 'Link an external issue to a project' })
  @ApiResponse({ status: 201, type: ProjectIssueEntity })
  linkIssue(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkIssueDto,
  ) {
    return this.projectsService.linkIssue(organizationId, id, dto);
  }
}
