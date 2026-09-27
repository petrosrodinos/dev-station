import {
  Body,
  Controller,
  Get,
  Param,
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
import { PermissionKey } from 'generated/prisma';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrganizationGuard } from '@/shared/guards/organization.guard';
import { RequirePermissions } from '@/shared/decorators/require-permissions.decorator';
import { CurrentMembership } from '@/shared/decorators/current-membership.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ORGANIZATION_HEADER } from '@/shared/constants/headers';
import { AgentSessionsService } from './agent-sessions.service';
import { CreateAgentSessionDto } from './dto/create-agent-session.dto';
import { UpdateAgentSessionDto } from './dto/update-agent-session.dto';
import {
  AgentSessionsQuerySchema,
  AgentSessionsQueryType,
} from './dto/agent-sessions-query.schema';
import { AgentSessionEntity } from './entities/agent-session.entity';

@ApiTags('Agent sessions')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('agent-sessions')
@UseGuards(JwtGuard, OrganizationGuard)
export class AgentSessionsController {
  constructor(private readonly agentSessionsService: AgentSessionsService) {}

  @Get()
  @RequirePermissions(PermissionKey.AI_USE_AGENTS)
  @ApiOperation({ summary: 'Session history, newest first' })
  @ApiQuery({ name: 'project_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentMembership('organization_id') organizationId: string,
    @Query(new ZodValidationPipe(AgentSessionsQuerySchema))
    query: AgentSessionsQueryType,
  ) {
    return this.agentSessionsService.findAll(organizationId, query);
  }

  @Get(':id')
  @RequirePermissions(PermissionKey.AI_USE_AGENTS)
  @ApiOperation({ summary: 'Get a session' })
  @ApiResponse({ status: 200, type: AgentSessionEntity })
  findOne(
    @CurrentMembership('organization_id') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentSessionsService.findOne(organizationId, id);
  }

  @Post()
  @RequirePermissions(PermissionKey.AI_START_AGENTS)
  @ApiOperation({
    summary: 'Register a new agent session started on this device',
  })
  @ApiResponse({ status: 201, type: AgentSessionEntity })
  create(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAgentSessionDto,
  ) {
    return this.agentSessionsService.create(organizationId, userId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.AI_USE_AGENTS)
  @ApiOperation({
    summary:
      'Update session status / produced changes (status changes emit activity)',
  })
  @ApiResponse({ status: 200, type: AgentSessionEntity })
  update(
    @CurrentMembership('organization_id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentSessionDto,
  ) {
    return this.agentSessionsService.update(organizationId, userId, id, dto);
  }
}
