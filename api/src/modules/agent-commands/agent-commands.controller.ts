import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AgentCommandsService } from './agent-commands.service';
import { CreateAgentCommandDto } from './dto/create-agent-command.dto';
import { UpdateAgentCommandDto } from './dto/update-agent-command.dto';
import { AgentCommandEntity } from './entities/agent-command.entity';

@ApiTags('Agent commands')
@ApiBearerAuth()
@Controller('agent-commands')
@UseGuards(JwtGuard)
export class AgentCommandsController {
  constructor(private readonly agentCommandsService: AgentCommandsService) {}

  @Get()
  @ApiOperation({ summary: 'List custom agent launch commands' })
  @ApiResponse({ status: 200, type: AgentCommandEntity, isArray: true })
  findAll(@CurrentUser('id') userId: string) {
    return this.agentCommandsService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a custom agent launch command' })
  @ApiResponse({ status: 201, type: AgentCommandEntity })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAgentCommandDto,
  ) {
    return this.agentCommandsService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a command or set/unset it as the default' })
  @ApiResponse({ status: 200, type: AgentCommandEntity })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentCommandDto,
  ) {
    return this.agentCommandsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a custom agent launch command' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentCommandsService.remove(userId, id);
  }
}
