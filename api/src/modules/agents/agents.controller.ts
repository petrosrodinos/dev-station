import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { AgentsService } from './agents.service';
import { AgentEntity } from './entities/agent.entity';

@ApiTags('Agents')
@ApiBearerAuth()
@Controller('agents')
@UseGuards(JwtGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'Supported AI coding agent CLIs' })
  @ApiResponse({ status: 200, type: AgentEntity, isArray: true })
  findAll() {
    return this.agentsService.findAll();
  }
}
