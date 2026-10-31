import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ActivityType, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ActivitiesService } from '@/modules/activities/activities.service';
import { SecretsCryptoService } from '@/shared/services/crypto/secrets-crypto.service';
import { CreateSecretSetDto } from './dto/create-secret-set.dto';
import { UpdateSecretSetDto } from './dto/update-secret-set.dto';
import { SecretVariableDto } from './dto/secret-variable.dto';
import {
  SecretSetSummary,
  SecretSetView,
  SecretVariable,
  secretSetInclude,
} from './interfaces/project-secrets.interface';

type SecretSetRow = Prisma.ProjectSecretSetGetPayload<{
  include: typeof secretSetInclude;
}>;

@Injectable()
export class ProjectSecretsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: SecretsCryptoService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async findAll(
    organizationId: string,
    projectId: string,
  ): Promise<SecretSetSummary[]> {
    await this.assertProject(organizationId, projectId);
    const sets = await this.prisma.projectSecretSet.findMany({
      where: { organization_id: organizationId, project_id: projectId },
      include: secretSetInclude,
      orderBy: { name: 'asc' },
    });
    return sets.map((set) => this.toSummary(set));
  }

  async findOne(
    organizationId: string,
    projectId: string,
    id: string,
  ): Promise<SecretSetView> {
    const set = await this.findOrThrow(organizationId, projectId, id);
    return this.toView(set);
  }

  async create(
    organizationId: string,
    projectId: string,
    userId: string,
    dto: CreateSecretSetDto,
  ): Promise<SecretSetView> {
    const project = await this.assertProject(organizationId, projectId);
    const variables = this.normalizeVariables(dto.variables);
    const name = dto.name.trim();
    await this.assertNameFree(projectId, name);

    const id = randomUUID();
    const set = await this.prisma.projectSecretSet.create({
      data: {
        id,
        organization_id: organizationId,
        project_id: projectId,
        name,
        description: dto.description?.trim() || null,
        payload: this.encryptVariables(variables, organizationId, projectId, id),
        variable_count: variables.length,
        created_by: userId,
        updated_by: userId,
      },
      include: secretSetInclude,
    });

    this.recordActivity(
      organizationId,
      projectId,
      userId,
      ActivityType.SECRET_SET_CREATED,
      `Shared secrets "${name}" created in ${project.name}`,
    );
    return { ...this.toSummary(set), variables };
  }

  async update(
    organizationId: string,
    projectId: string,
    id: string,
    userId: string,
    dto: UpdateSecretSetDto,
  ): Promise<SecretSetView> {
    const existing = await this.findOrThrow(organizationId, projectId, id);
    const name = dto.name?.trim();
    if (name && name !== existing.name)
      await this.assertNameFree(projectId, name);

    const variables = dto.variables
      ? this.normalizeVariables(dto.variables)
      : undefined;
    const set = await this.prisma.projectSecretSet.update({
      where: { id },
      data: {
        name,
        description:
          dto.description === undefined
            ? undefined
            : dto.description.trim() || null,
        ...(variables && {
          payload: this.encryptVariables(
            variables,
            organizationId,
            projectId,
            id,
          ),
          variable_count: variables.length,
        }),
        updated_by: userId,
      },
      include: secretSetInclude,
    });

    this.recordActivity(
      organizationId,
      projectId,
      userId,
      ActivityType.SECRET_SET_UPDATED,
      `Shared secrets "${set.name}" updated`,
    );
    return {
      ...this.toSummary(set),
      variables: variables ?? this.decryptVariables(set),
    };
  }

  async remove(
    organizationId: string,
    projectId: string,
    id: string,
    userId: string,
  ) {
    const existing = await this.findOrThrow(organizationId, projectId, id);
    await this.prisma.projectSecretSet.delete({ where: { id } });
    this.recordActivity(
      organizationId,
      projectId,
      userId,
      ActivityType.SECRET_SET_DELETED,
      `Shared secrets "${existing.name}" deleted`,
    );
    return { id };
  }

  private async assertProject(organizationId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organization_id: organizationId },
      select: { id: true, name: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async findOrThrow(
    organizationId: string,
    projectId: string,
    id: string,
  ): Promise<SecretSetRow> {
    const set = await this.prisma.projectSecretSet.findFirst({
      where: { id, project_id: projectId, organization_id: organizationId },
      include: secretSetInclude,
    });
    if (!set) throw new NotFoundException('Secret set not found');
    return set;
  }

  private async assertNameFree(projectId: string, name: string) {
    const clash = await this.prisma.projectSecretSet.findFirst({
      where: { project_id: projectId, name },
      select: { id: true },
    });
    if (clash)
      throw new ConflictException('A secret set with this name already exists');
  }

  private normalizeVariables(variables: SecretVariableDto[]): SecretVariable[] {
    const seen = new Set<string>();
    return variables.map(({ key, value }) => {
      const trimmed = key.trim();
      if (seen.has(trimmed))
        throw new BadRequestException(`Duplicate variable name: ${trimmed}`);
      seen.add(trimmed);
      return { key: trimmed, value };
    });
  }

  private aad(organizationId: string, projectId: string, id: string) {
    return `${organizationId}:${projectId}:${id}`;
  }

  private encryptVariables(
    variables: SecretVariable[],
    organizationId: string,
    projectId: string,
    id: string,
  ) {
    return this.crypto.encrypt(
      JSON.stringify({ variables }),
      this.aad(organizationId, projectId, id),
    );
  }

  private decryptVariables(set: SecretSetRow): SecretVariable[] {
    const json = this.crypto.decrypt(
      set.payload,
      this.aad(set.organization_id, set.project_id, set.id),
    );
    return (JSON.parse(json) as { variables: SecretVariable[] }).variables;
  }

  private toSummary(set: SecretSetRow): SecretSetSummary {
    return {
      id: set.id,
      project_id: set.project_id,
      name: set.name,
      description: set.description,
      variable_count: set.variable_count,
      created_at: set.created_at,
      updated_at: set.updated_at,
      updated_by: set.updater,
    };
  }

  private toView(set: SecretSetRow): SecretSetView {
    return { ...this.toSummary(set), variables: this.decryptVariables(set) };
  }

  /** Names only, never values. Fire-and-forget: a failed log never fails the request. */
  private recordActivity(
    organizationId: string,
    projectId: string,
    userId: string,
    type: ActivityType,
    message: string,
  ) {
    setImmediate(async () => {
      try {
        await this.activitiesService.record({
          organization_id: organizationId,
          project_id: projectId,
          user_id: userId,
          type,
          message,
        });
      } catch {}
    });
  }
}
