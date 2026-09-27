import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, AgentSessionStatus, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AgentCatalog } from '@/shared/config/agents';
import { paginate } from '@/shared/utils/pagination/pagination.utils';
import { ActivitiesService } from '@/modules/activities/activities.service';
import { CreateAgentSessionDto } from './dto/create-agent-session.dto';
import { UpdateAgentSessionDto } from './dto/update-agent-session.dto';
import { AgentSessionsQueryType } from './dto/agent-sessions-query.schema';
import {
  SessionStatusActivity,
  TerminalSessionStatuses,
} from './interfaces/agent-session.interface';

@Injectable()
export class AgentSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async findAll(organizationId: string, query: AgentSessionsQueryType) {
    const where: Prisma.AgentSessionWhereInput = {
      organization_id: organizationId,
      ...(query.project_id && { project_id: query.project_id }),
      ...(query.status && { status: query.status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.agentSession.findMany({
        where,
        orderBy: { started_at: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.agentSession.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findOne(organizationId: string, id: string) {
    const session = await this.prisma.agentSession.findFirst({
      where: { id, organization_id: organizationId },
    });
    if (!session) throw new NotFoundException('Agent session not found');
    return session;
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateAgentSessionDto,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.project_id, organization_id: organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const agentName =
      AgentCatalog.find((a) => a.type === dto.agent_type)?.name ??
      dto.agent_type;

    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.agentSession.create({
        data: {
          ...dto,
          organization_id: organizationId,
          user_id: userId,
          status: AgentSessionStatus.RUNNING,
        },
      });

      if (dto.issue_provider && dto.issue_external_id) {
        await tx.projectIssue.upsert({
          where: {
            project_id_provider_external_id: {
              project_id: project.id,
              provider: dto.issue_provider,
              external_id: dto.issue_external_id,
            },
          },
          update: { key: dto.issue_key, title: dto.issue_title },
          create: {
            project_id: project.id,
            provider: dto.issue_provider,
            external_id: dto.issue_external_id,
            key: dto.issue_key,
            title: dto.issue_title,
          },
        });
      }
      return created;
    });

    await this.activitiesService.record({
      organization_id: organizationId,
      project_id: project.id,
      user_id: userId,
      agent_session_id: session.id,
      type: ActivityType.AGENT_STARTED,
      message: dto.issue_key
        ? `${agentName} started on ${dto.issue_key}`
        : `${agentName} started — ${session.name}`,
    });

    return session;
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    dto: UpdateAgentSessionDto,
  ) {
    const session = await this.findOne(organizationId, id);
    const statusChanged = dto.status && dto.status !== session.status;

    if (dto.ended_at && new Date(dto.ended_at) < session.started_at) {
      throw new BadRequestException(
        'ended_at cannot be before the session started',
      );
    }

    const isEnding =
      statusChanged && TerminalSessionStatuses.includes(dto.status);
    const isRestarting =
      statusChanged && dto.status === AgentSessionStatus.RUNNING;
    const updated = await this.prisma.agentSession.update({
      where: { id },
      data: {
        ...dto,
        // A restarted session clears its end marker; an ending one gets stamped.
        ended_at: dto.ended_at
          ? new Date(dto.ended_at)
          : isEnding
            ? new Date()
            : isRestarting
              ? null
              : undefined,
      },
    });

    const activity = statusChanged
      ? SessionStatusActivity[dto.status]
      : undefined;
    if (activity) {
      const agentName =
        AgentCatalog.find((a) => a.type === updated.agent_type)?.name ??
        updated.agent_type;
      const changes = updated.files_changed
        ? ` · ${updated.files_changed} file${updated.files_changed === 1 ? '' : 's'} changed`
        : '';
      await this.activitiesService.record({
        organization_id: organizationId,
        project_id: updated.project_id,
        user_id: userId,
        agent_session_id: updated.id,
        type: activity.type,
        message: `${agentName} ${activity.verb}: ${updated.name}${changes}`,
        metadata: {
          files_changed: updated.files_changed,
          additions: updated.additions,
          deletions: updated.deletions,
        },
      });
    }

    return updated;
  }
}
