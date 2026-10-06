import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  IntegrationProvider,
  Prisma,
  RepositoryProvider,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ProjectColorPalette } from '@/shared/config/projects';
import { ActivitiesService } from '@/modules/activities/activities.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ServiceInputDto } from './dto/service-input.dto';
import { RepositoryInputDto } from './dto/repository-input.dto';
import { LinkIssueDto } from './dto/link-issue.dto';
import { ProjectsQueryType } from './dto/projects-query.schema';
import { projectInclude, ProjectView } from './interfaces/project.interface';

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: typeof projectInclude;
}>;

const CONNECTION_FIELDS: {
  field:
    | 'github_connection_id'
    | 'linear_connection_id'
    | 'notion_connection_id';
  provider: IntegrationProvider;
}[] = [
  { field: 'github_connection_id', provider: IntegrationProvider.GITHUB },
  { field: 'linear_connection_id', provider: IntegrationProvider.LINEAR },
  { field: 'notion_connection_id', provider: IntegrationProvider.NOTION },
];

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async findAll(
    organizationId: string,
    query: ProjectsQueryType,
  ): Promise<ProjectView[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        organization_id: organizationId,
        archived_at: query.archived === 'true' ? { not: null } : null,
        ...(query.search && {
          name: { contains: query.search, mode: 'insensitive' },
        }),
      },
      include: projectInclude,
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
    });
    return projects.map(this.toView);
  }

  async findOne(organizationId: string, id: string): Promise<ProjectView> {
    return this.toView(await this.findOrThrow(organizationId, id));
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectView> {
    await this.assertReferences(organizationId, dto);

    const project = await this.prisma.$transaction(async (tx) => {
      const [repositoryId, count] = await Promise.all([
        dto.repository
          ? this.upsertRepository(tx, organizationId, dto.repository)
          : Promise.resolve(null),
        tx.project.count({ where: { organization_id: organizationId } }),
      ]);

      return tx.project.create({
        data: {
          organization_id: organizationId,
          created_by: userId,
          name: dto.name.trim(),
          description: dto.description,
          color:
            dto.color ??
            ProjectColorPalette[count % ProjectColorPalette.length],
          avatar_seed: dto.avatar_seed,
          sort_order: count,
          sub_path: this.normalizeSubPath(dto.sub_path),
          preferred_agent: dto.preferred_agent,
          repository_id: repositoryId,
          github_connection_id:
            dto.github_connection_id ?? dto.repository?.connection_id,
          linear_connection_id: dto.linear_connection_id,
          linear_team_id: dto.linear_team_id,
          linear_project_id: dto.linear_project_id,
          notion_connection_id: dto.notion_connection_id,
          notion_root_page_id: dto.notion_root_page_id,
          services: dto.services?.length
            ? { create: dto.services.map((s, i) => this.toServiceData(s, i)) }
            : undefined,
        },
        include: projectInclude,
      });
    });

    setImmediate(async () => {
      try {
        await this.activitiesService.record({
          organization_id: organizationId,
          project_id: project.id,
          user_id: userId,
          type: ActivityType.PROJECT_CREATED,
          message: `Project ${project.name} created`,
        });
      } catch {}
    });

    return this.toView(project);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectView> {
    await this.findOrThrow(organizationId, id);
    await this.assertReferences(organizationId, dto);

    const project = await this.prisma.$transaction(async (tx) => {
      const repositoryId =
        dto.repository === null
          ? null
          : dto.repository
            ? await this.upsertRepository(tx, organizationId, dto.repository)
            : undefined;

      if (dto.services) await this.syncServices(tx, id, dto.services);

      return tx.project.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description,
          color: dto.color,
          avatar_seed: dto.avatar_seed,
          sub_path:
            dto.sub_path === undefined
              ? undefined
              : this.normalizeSubPath(dto.sub_path),
          preferred_agent: dto.preferred_agent,
          repository_id: repositoryId,
          github_connection_id: dto.github_connection_id,
          linear_connection_id: dto.linear_connection_id,
          linear_team_id: dto.linear_team_id,
          linear_project_id: dto.linear_project_id,
          notion_connection_id: dto.notion_connection_id,
          notion_root_page_id: dto.notion_root_page_id,
          archived_at:
            dto.archived === undefined
              ? undefined
              : dto.archived
                ? new Date()
                : null,
        },
        include: projectInclude,
      });
    });

    return this.toView(project);
  }

  async remove(organizationId: string, id: string) {
    await this.findOrThrow(organizationId, id);
    await this.prisma.project.delete({ where: { id } });
    return { id };
  }

  async reorder(organizationId: string, ids: string[]) {
    const count = await this.prisma.project.count({
      where: { organization_id: organizationId, id: { in: ids } },
    });
    if (count !== ids.length)
      throw new BadRequestException(
        'Some projects do not belong to this organization',
      );

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.project.update({
          where: { id },
          data: { sort_order: index },
        }),
      ),
    );
    return this.findAll(organizationId, {});
  }

  async replaceServices(
    organizationId: string,
    id: string,
    services: ServiceInputDto[],
  ) {
    await this.findOrThrow(organizationId, id);
    await this.prisma.$transaction((tx) => this.syncServices(tx, id, services));
    return this.findOne(organizationId, id);
  }

  async findIssues(organizationId: string, id: string) {
    await this.findOrThrow(organizationId, id);
    return this.prisma.projectIssue.findMany({
      where: { project_id: id },
      orderBy: { created_at: 'desc' },
    });
  }

  async linkIssue(organizationId: string, id: string, dto: LinkIssueDto) {
    await this.findOrThrow(organizationId, id);
    return this.prisma.projectIssue.upsert({
      where: {
        project_id_provider_external_id: {
          project_id: id,
          provider: dto.provider,
          external_id: dto.external_id,
        },
      },
      update: { key: dto.key, title: dto.title },
      create: {
        project_id: id,
        provider: dto.provider,
        external_id: dto.external_id,
        key: dto.key,
        title: dto.title,
      },
    });
  }

  private async findOrThrow(
    organizationId: string,
    id: string,
  ): Promise<ProjectWithRelations> {
    const project = await this.prisma.project.findFirst({
      where: { id, organization_id: organizationId },
      include: projectInclude,
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  /** Ensures referenced connections belong to the organization (and to the right provider). */
  private async assertReferences(
    organizationId: string,
    dto: UpdateProjectDto,
  ) {
    const connectionChecks = CONNECTION_FIELDS.filter(
      ({ field }) => dto[field],
    ).map(({ field, provider }) => ({ id: dto[field], provider }));
    if (dto.repository?.connection_id)
      connectionChecks.push({
        id: dto.repository.connection_id,
        provider: IntegrationProvider.GITHUB,
      });

    const connections = connectionChecks.length
      ? await this.prisma.integrationConnection.findMany({
          where: {
            organization_id: organizationId,
            id: { in: connectionChecks.map((c) => c.id) },
          },
        })
      : [];

    for (const check of connectionChecks) {
      const connection = connections.find((c) => c.id === check.id);
      if (!connection || connection.provider !== check.provider) {
        throw new BadRequestException(
          `Invalid ${check.provider.toLowerCase()} connection`,
        );
      }
    }
  }

  private async upsertRepository(
    tx: Prisma.TransactionClient,
    organizationId: string,
    repository: RepositoryInputDto,
  ) {
    const cloneUrl = repository.clone_url.trim();
    const provider = repository.provider ?? this.detectProvider(cloneUrl);
    const data = {
      provider,
      full_name: repository.full_name,
      default_branch: repository.default_branch,
      external_id: repository.external_id,
      connection_id: repository.connection_id,
    };

    const saved = await tx.repository.upsert({
      where: {
        organization_id_clone_url: {
          organization_id: organizationId,
          clone_url: cloneUrl,
        },
      },
      update: data,
      create: { ...data, organization_id: organizationId, clone_url: cloneUrl },
    });
    return saved.id;
  }

  private detectProvider(cloneUrl: string): RepositoryProvider {
    if (/github\.com/i.test(cloneUrl)) return RepositoryProvider.GITHUB;
    if (/gitlab\./i.test(cloneUrl)) return RepositoryProvider.GITLAB;
    if (/bitbucket\./i.test(cloneUrl)) return RepositoryProvider.BITBUCKET;
    return RepositoryProvider.OTHER;
  }

  private normalizeSubPath(subPath?: string | null) {
    const trimmed = subPath
      ?.trim()
      .replace(/\\/g, '/')
      .replace(/^\.\/?/, '')
      .replace(/\/+$/, '');
    return trimmed || null;
  }

  /**
   * Replaces the project's service list. A service that is still in the list keeps its id (matched by the
   * `id` the client sent, and only if it belongs to this project); everything else is removed or created.
   * Ids are what running processes and their ports are attached to, so changing them on every save would
   * detach the services that are still running.
   */
  private async syncServices(
    tx: Prisma.TransactionClient,
    projectId: string,
    services: ServiceInputDto[],
  ) {
    const existing = await tx.projectService.findMany({
      where: { project_id: projectId },
      select: { id: true },
    });
    const known = new Set(existing.map((s) => s.id));
    const kept = new Set<string>();
    for (const s of services) {
      if (s.id && known.has(s.id) && !kept.has(s.id)) kept.add(s.id);
    }

    await tx.projectService.deleteMany({
      where: {
        project_id: projectId,
        ...(kept.size ? { id: { notIn: [...kept] } } : {}),
      },
    });

    const claimed = new Set<string>();
    for (const [i, s] of services.entries()) {
      const data = this.toServiceData(s, i);
      if (s.id && kept.has(s.id) && !claimed.has(s.id)) {
        claimed.add(s.id);
        await tx.projectService.update({ where: { id: s.id }, data });
      } else {
        await tx.projectService.create({
          data: { ...data, project_id: projectId },
        });
      }
    }
  }

  private toServiceData(service: ServiceInputDto, index: number) {
    return {
      name: service.name.trim(),
      kind: service.kind,
      cwd: service.cwd?.trim() || '.',
      package_manager: service.package_manager,
      script: service.script,
      command: service.command,
      port: service.port,
      url: service.url,
      env: service.env,
      auto_detected: service.auto_detected ?? false,
      sort_order: index,
    };
  }

  private toView = (project: ProjectWithRelations): ProjectView => {
    const { repository_id, created_by, ...view } = project;
    return view;
  };
}
