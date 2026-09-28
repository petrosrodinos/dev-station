import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
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
import { RequirePermissions } from '@/shared/decorators/access.decorator';
import { CurrentMembership } from '@/shared/decorators/current-membership.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ORGANIZATION_HEADER } from '@/shared/constants/headers';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import {
  ActivitiesQuerySchema,
  ActivitiesQueryType,
} from './dto/activities-query.schema';
import { ActivityEntity } from './entities/activity.entity';

@ApiTags('Activity')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('activities')
@UseGuards(JwtGuard, OrganizationGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @RequirePermissions(PermissionKey.PROJECTS_VIEW)
  @ApiOperation({ summary: 'Activity feed, newest first' })
  @ApiQuery({ name: 'project_id', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentMembership('organization_id') organizationId: string,
    @Query(new ZodValidationPipe(ActivitiesQuerySchema))
    query: ActivitiesQueryType,
  ) {
    return this.activitiesService.findAll(organizationId, query);
  }

  @Post()
  @RequirePermissions(PermissionKey.PROJECTS_VIEW)
  @ApiOperation({
    summary: 'Record a device-originated activity (git push, service crash…)',
  })
  @ApiResponse({ status: 201, type: ActivityEntity })
  create(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activitiesService.create(organizationId, userId, dto);
  }
}
