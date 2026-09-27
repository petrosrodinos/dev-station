import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { paginate } from '@/shared/utils/pagination/pagination.utils';
import { CreateActivityDto } from './dto/create-activity.dto';
import { ActivitiesQueryType } from './dto/activities-query.schema';
import { RecordActivityInput } from './interfaces/activities.interface';

const activityInclude = {
  user: { select: { id: true, email: true, full_name: true } },
} satisfies Prisma.ActivityInclude;

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: ActivitiesQueryType) {
    const where: Prisma.ActivityWhereInput = {
      organization_id: organizationId,
      ...(query.project_id && { project_id: query.project_id }),
    };

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        include: activityInclude,
        orderBy: { created_at: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async create(organizationId: string, userId: string, dto: CreateActivityDto) {
    if (dto.project_id) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.project_id, organization_id: organizationId },
      });
      if (!project) throw new NotFoundException('Project not found');
    }

    return this.record({
      organization_id: organizationId,
      user_id: userId,
      project_id: dto.project_id,
      agent_session_id: dto.agent_session_id,
      type: dto.type,
      message: dto.message,
      metadata: dto.metadata as Prisma.InputJsonValue,
    });
  }

  /** Records an activity and bumps the project's last activity timestamp. */
  async record(input: RecordActivityInput) {
    const now = new Date();
    const [activity] = await this.prisma.$transaction([
      this.prisma.activity.create({
        data: { ...input, created_at: now },
        include: activityInclude,
      }),
      ...(input.project_id
        ? [
            this.prisma.project.update({
              where: { id: input.project_id },
              data: { last_activity_at: now },
            }),
          ]
        : []),
    ]);
    return activity;
  }
}
